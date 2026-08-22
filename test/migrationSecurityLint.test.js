// =============================================================================
// Migration security lint
//
// The 2026-08-15/16 hardening (anon reaches nothing; views run as the caller;
// SECURITY DEFINER functions are an explicit allow-list) used to be enforced
// only by SQL that was run by hand. This test replays supabase/migrations/
// and fails when a migration — including one that hasn't been written yet —
// would leave the database in a state that violates those rules.
//
// Rules:
//   1. every table has RLS enabled
//   2. every view runs with security_invoker = on
//   3. no RPC-callable function is executable by anon or PUBLIC
//   4. every SECURITY DEFINER function states explicitly what
//      `authenticated` may do (GRANT or REVOKE) — Supabase's default grant
//      to authenticated is never allowed to be the deciding factor
//   5. no schema-wide grant (ALL SEQUENCES / TABLES / FUNCTIONS) to anon
//   6. (self-check) the parser sees every CREATE statement in the files
//
// Rule 4 is the one that would have caught 2026-08-22: seven service-role
// RPCs revoked PUBLIC and anon but inherited the default authenticated grant,
// so any logged-in user could read the user directory and trigger a write.
//
// e2e/security.spec.js probes the same surface against the live test
// database — this file is the policy, that one is the behaviour.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  MIGRATIONS_DIR,
  readMigrationSurface,
  canExecute,
  rpcFunctions,
} from '../supabase/migrationSurface.js';

const surface = readMigrationSurface();

function list(items) {
  return items.length ? `\n  - ${items.join('\n  - ')}` : '';
}

describe('migration security lint', () => {
  it('parses the migration directory', () => {
    expect(surface.files.length).toBeGreaterThan(20);
    expect(surface.tables.size).toBeGreaterThan(20);
    expect(surface.views.size).toBe(4);
    expect(surface.functions.size).toBeGreaterThan(25);
  });

  it('self-check: every CREATE TABLE / VIEW / FUNCTION in the SQL is modelled', () => {
    // A parser that silently skips an object would make the rules below
    // vacuous for it. Count the raw statements (comments stripped the same
    // way) and require the model to have seen each name at least once.
    const seen = { tables: new Set(), views: new Set(), functions: new Set() };
    for (const file of surface.files) {
      const sql = fs
        .readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--[^\n]*/g, '');
      for (const m of sql.matchAll(
        /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi,
      ))
        seen.tables.add(m[1].toLowerCase());
      for (const m of sql.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:public\.)?(\w+)/gi))
        seen.views.add(m[1].toLowerCase());
      for (const m of sql.matchAll(
        /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)/gi,
      ))
        seen.functions.add(m[1].toLowerCase());
    }
    // Dropped objects legitimately disappear from the model; everything
    // else must be there.
    const dropped = new Set();
    for (const file of surface.files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      for (const m of sql.matchAll(
        /\bDROP\s+(?:TABLE|VIEW|FUNCTION)\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/gi,
      ))
        dropped.add(m[1].toLowerCase());
    }
    const missing = [];
    for (const t of seen.tables)
      if (!surface.tables.has(t) && !dropped.has(t)) missing.push(`table ${t}`);
    for (const v of seen.views)
      if (!surface.views.has(v) && !dropped.has(v)) missing.push(`view ${v}`);
    for (const f of seen.functions)
      if (!surface.functions.has(f) && !dropped.has(f)) missing.push(`function ${f}`);
    expect(missing, `objects the parser lost:${list(missing)}`).toEqual([]);
  });

  it('1. every table has row level security enabled', () => {
    const open = [...surface.tables.values()].filter((t) => !t.rls).map((t) => t.name);
    expect(open, `tables without RLS:${list(open)}`).toEqual([]);
  });

  it('2. every view runs as the caller (security_invoker = on)', () => {
    const definerViews = [...surface.views.values()]
      .filter((v) => !v.securityInvoker)
      .map((v) => v.name);
    expect(definerViews, `views that bypass the caller's RLS:${list(definerViews)}`).toEqual([]);
  });

  it('3. no RPC is executable by anon or PUBLIC', () => {
    const reachable = rpcFunctions(surface)
      .filter((f) => canExecute(f, 'anon'))
      .map((f) => `${f.name} (${f.definedIn}) — grants: ${[...f.grants].join(', ')}`);
    expect(
      reachable,
      `anon can call these — add "REVOKE EXECUTE ON FUNCTION … FROM anon, public":${list(reachable)}`,
    ).toEqual([]);
  });

  it('4. every SECURITY DEFINER function decides `authenticated` explicitly', () => {
    const implicit = [...surface.functions.values()]
      .filter((f) => f.securityDefiner && !f.explicitRoles.has('authenticated'))
      .map(
        (f) =>
          `${f.name} (${f.definedIn}) — authenticated ${
            canExecute(f, 'authenticated')
              ? 'CAN call it via the Supabase default grant'
              : 'state unclear'
          }`,
      );
    expect(
      implicit,
      `SECURITY DEFINER functions relying on the default grant — add an explicit ` +
        `"GRANT EXECUTE … TO authenticated" or "REVOKE EXECUTE … FROM authenticated":${list(implicit)}`,
    ).toEqual([]);
  });

  it('4b. the service-role-only RPCs are not callable by authenticated', () => {
    // The digest/reconcile functions read across users or write; only the
    // daily job (service_role) may call them. Named here on purpose: a
    // future migration that re-grants one of these should fail loudly.
    const serviceOnly = [
      'get_items_due_soon',
      'get_overdue_items',
      'get_low_stock_items',
      'get_reservations_starting_soon',
      'get_maintenance_due_today',
      'get_notification_recipients',
      'reconcile_reservation_statuses',
      'cleanup_smart_paste_aliases',
    ];
    const leaks = serviceOnly.filter((name) => {
      const fn = surface.functions.get(name);
      return !fn || canExecute(fn, 'authenticated');
    });
    expect(leaks, `callable by any logged-in user:${list(leaks)}`).toEqual([]);
  });

  it('5. no schema-wide grant to anon survives', () => {
    const anonWide = [...surface.schemaGrants.values()]
      .filter((g) => g.grants.has('anon'))
      .map((g) => g.target);
    expect(anonWide, `schema-wide anon grants:${list(anonWide)}`).toEqual([]);
  });

  it('trigger functions are never RPC-callable by clients', () => {
    // PostgREST does not expose trigger functions, so this is belt-and-braces
    // for the SECURITY DEFINER ones (a definer trigger body runs as owner).
    const exposed = [...surface.functions.values()]
      .filter((f) => f.returnsTrigger && f.securityDefiner)
      .filter((f) => canExecute(f, 'authenticated') || canExecute(f, 'anon'))
      .map((f) => f.name);
    expect(exposed, `definer trigger functions with client EXECUTE:${list(exposed)}`).toEqual([]);
  });
});
