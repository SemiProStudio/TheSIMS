// =============================================================================
// migrationSurface parser — the model behind the migration security lint and
// the E2E anon/user probes. If this model is wrong the lint passes for the
// wrong reasons, so the grant semantics are pinned here with synthetic SQL.
// =============================================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import {
  readMigrationSurface,
  canExecute,
  rpcFunctions,
  placeholderArgs,
  DEFAULT_FUNCTION_GRANTS,
} from '../supabase/migrationSurface.js';

const dirs = [];

/** Write the given {filename: sql} set to a fresh directory and parse it. */
function surfaceOf(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sims-migrations-'));
  dirs.push(dir);
  for (const [name, sql] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), sql);
  return readMigrationSurface(dir);
}

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const BASE = `
  -- a comment with CREATE TABLE decoy inside it
  CREATE TABLE IF NOT EXISTS public.widgets (id uuid PRIMARY KEY, name text);
  CREATE TABLE gadgets (id uuid PRIMARY KEY);
  CREATE TABLE storage.not_ours (id int);
  ALTER TABLE widgets ENABLE ROW LEVEL SECURITY;

  CREATE OR REPLACE VIEW widget_view AS SELECT id FROM widgets;
  CREATE VIEW gadget_view WITH (security_invoker = on) AS SELECT id FROM gadgets;

  CREATE OR REPLACE FUNCTION reader(p_id character varying, p_limit integer DEFAULT 5)
  RETURNS SETOF widgets AS $$
    -- body comment; SECURITY DEFINER mentioned here must not count
    SELECT * FROM widgets;
  $$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

  CREATE OR REPLACE FUNCTION helper() RETURNS text AS $$ SELECT 'x' $$ LANGUAGE sql;

  CREATE OR REPLACE FUNCTION on_change() RETURNS TRIGGER AS $body$
  BEGIN RETURN NEW; END;
  $body$ LANGUAGE plpgsql SECURITY DEFINER;

  GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
`;

const HARDEN = `
  ALTER VIEW public.widget_view SET (security_invoker = on);
  REVOKE EXECUTE ON FUNCTION public.reader(character varying, integer) FROM anon;
  REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM anon;
`;

describe('migrationSurface', () => {
  it('models tables and RLS, ignoring other schemas and comments', () => {
    const s = surfaceOf({ '0001.sql': BASE });
    expect([...s.tables.keys()].sort()).toEqual(['gadgets', 'widgets']);
    expect(s.tables.get('widgets').rls).toBe(true);
    expect(s.tables.get('gadgets').rls).toBe(false);
  });

  it('tracks security_invoker from the WITH clause and from a later ALTER VIEW', () => {
    const before = surfaceOf({ '0001.sql': BASE });
    expect(before.views.get('gadget_view').securityInvoker).toBe(true);
    expect(before.views.get('widget_view').securityInvoker).toBe(false);

    const after = surfaceOf({ '0001.sql': BASE, '0002.sql': HARDEN });
    expect(after.views.get('widget_view').securityInvoker).toBe(true);
  });

  it('reads function properties from the header/trailer, not the body', () => {
    const s = surfaceOf({ '0001.sql': BASE });
    const reader = s.functions.get('reader');
    expect(reader.securityDefiner).toBe(true);
    expect(reader.returnsTrigger).toBe(false);
    expect(reader.args).toEqual([
      { name: 'p_id', type: 'character varying', hasDefault: false },
      { name: 'p_limit', type: 'integer', hasDefault: true },
    ]);
    expect(s.functions.get('helper').securityDefiner).toBe(false);
    expect(s.functions.get('on_change').returnsTrigger).toBe(true);
    expect(
      rpcFunctions(s)
        .map((f) => f.name)
        .sort(),
    ).toEqual(['helper', 'reader']);
  });

  it('starts every new function with the Supabase default grants', () => {
    const s = surfaceOf({ '0001.sql': BASE });
    const helper = s.functions.get('helper');
    expect([...helper.grants].sort()).toEqual([...DEFAULT_FUNCTION_GRANTS].sort());
    expect(canExecute(helper, 'anon')).toBe(true);
    expect(canExecute(helper, 'authenticated')).toBe(true);
    expect(helper.explicitRoles.size).toBe(0);
  });

  it('REVOKE FROM anon alone is not enough while PUBLIC still holds EXECUTE', () => {
    const s = surfaceOf({ '0001.sql': BASE, '0002.sql': HARDEN });
    const reader = s.functions.get('reader');
    expect(reader.grants.has('anon')).toBe(false);
    expect(reader.grants.has('public')).toBe(true);
    expect(canExecute(reader, 'anon')).toBe(true);
    expect(reader.explicitRoles.has('anon')).toBe(true);
    expect(reader.explicitRoles.has('authenticated')).toBe(false);
  });

  it('REVOKE FROM PUBLIC, anon closes it; explicit authenticated/service_role decisions stick', () => {
    const s = surfaceOf({
      '0001.sql': BASE,
      '0002.sql': `
        REVOKE ALL ON FUNCTION public.reader(character varying, integer) FROM PUBLIC, anon;
        REVOKE EXECUTE ON FUNCTION reader(character varying, integer) FROM authenticated;
        GRANT EXECUTE ON FUNCTION reader(character varying, integer) TO service_role;
      `,
    });
    const reader = s.functions.get('reader');
    expect(canExecute(reader, 'anon')).toBe(false);
    expect(canExecute(reader, 'authenticated')).toBe(false);
    expect(canExecute(reader, 'service_role')).toBe(true);
    expect(reader.explicitRoles.has('authenticated')).toBe(true);
  });

  it('CREATE OR REPLACE keeps grants; DROP + CREATE resets to the defaults', () => {
    const revoke = `REVOKE ALL ON FUNCTION reader(character varying, integer) FROM PUBLIC, anon, authenticated;`;
    const replace = `CREATE OR REPLACE FUNCTION reader(p_id character varying, p_limit integer DEFAULT 5)
      RETURNS SETOF widgets AS $$ SELECT * FROM widgets $$ LANGUAGE sql SECURITY DEFINER;`;
    const kept = surfaceOf({ '0001.sql': BASE, '0002.sql': revoke, '0003.sql': replace });
    expect(canExecute(kept.functions.get('reader'), 'anon')).toBe(false);
    expect(kept.functions.get('reader').explicitRoles.has('authenticated')).toBe(true);

    const recreate = `DROP FUNCTION IF EXISTS reader(character varying, integer);
      CREATE OR REPLACE FUNCTION reader(p_id character varying)
      RETURNS SETOF widgets AS $$ SELECT * FROM widgets $$ LANGUAGE sql SECURITY DEFINER;`;
    const reset = surfaceOf({ '0001.sql': BASE, '0002.sql': revoke, '0003.sql': recreate });
    const reader = reset.functions.get('reader');
    expect(canExecute(reader, 'anon')).toBe(true);
    expect(reader.explicitRoles.size).toBe(0);
    expect(reader.args.map((a) => a.name)).toEqual(['p_id']);
  });

  it('tracks schema-wide grants to anon and their revocation', () => {
    const open = surfaceOf({ '0001.sql': BASE });
    expect(open.schemaGrants.get('all sequences in schema public').grants.has('anon')).toBe(true);
    const closed = surfaceOf({ '0001.sql': BASE, '0002.sql': HARDEN });
    expect(closed.schemaGrants.get('all sequences in schema public').grants.has('anon')).toBe(
      false,
    );
  });

  it('builds resolvable placeholder arguments by type', () => {
    const s = surfaceOf({ '0001.sql': BASE });
    expect(placeholderArgs(s.functions.get('reader'))).toEqual({
      p_id: 'ZZZ-E2E-PROBE',
      p_limit: 1,
    });
    expect(placeholderArgs(s.functions.get('helper'))).toEqual({});
  });

  it('throws rather than silently skipping a function it cannot delimit', () => {
    expect(() =>
      surfaceOf({
        '0001.sql': `CREATE OR REPLACE FUNCTION broken(a text) RETURNS text AS 'select 1' LANGUAGE sql;`,
      }),
    ).toThrow(/broken/);
  });
});
