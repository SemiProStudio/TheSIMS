// =============================================================================
// Migration surface — a static model of what supabase/migrations/ exposes.
//
// Replays every migration file in order and tracks, per object, the state the
// SQL leaves behind: tables (RLS on?), views (security_invoker on?), and
// functions (SECURITY DEFINER? which roles hold EXECUTE?). Two consumers:
//
//   test/migrationSecurityLint.test.js  — the grant POLICY (vitest, offline)
//   e2e/security.spec.js                — the live behaviour (anon / user /
//                                         admin probes against the test DB)
//
// Deriving the probe list from the migrations is the point: a table, view or
// RPC added by a future migration is linted and probed automatically, with
// no list to remember to update.
//
// GRANT MODEL. A Supabase project ships with default privileges that grant
// EXECUTE on every new public function to anon, authenticated and
// service_role — on top of Postgres's own grant to PUBLIC. So a freshly
// created function starts out callable by EVERY role, and "REVOKE … FROM
// PUBLIC, anon" still leaves the direct authenticated grant in place. That
// exact gap is why the service-role-only notification RPCs were callable by
// any logged-in user until 2026-08-22. Postgres resolves a role's access as
// (direct grant) OR (PUBLIC grant), which `canExecute` mirrors.
//
// This is a pragmatic regex pass over the SQL the repo actually writes, not
// a SQL parser: one object per CREATE statement, comments stripped, bodies
// dollar-quoted. It errs loud (a CREATE FUNCTION it cannot delimit throws)
// rather than silently skipping an object.
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

// Roles that hold EXECUTE on a brand-new function (see GRANT MODEL above).
export const DEFAULT_FUNCTION_GRANTS = ['public', 'anon', 'authenticated', 'service_role'];

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
}

function bareName(qualified) {
  return qualified
    .replace(/^public\./i, '')
    .replace(/"/g, '')
    .toLowerCase();
}

/** Only public-schema objects are part of the app's surface. */
function isPublic(qualified) {
  const m = qualified.match(/^(\w+)\./);
  return !m || m[1].toLowerCase() === 'public';
}

function roleList(text) {
  return text
    .split(',')
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
}

/** Index of the matching close paren for the open paren at `start`. */
function matchParen(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** `p_name TEXT DEFAULT 'x'` → { name: 'p_name', type: 'text', hasDefault: true } */
function parseArg(raw) {
  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ');
  if (/^(in|inout|variadic)$/i.test(tokens[0])) tokens.shift();
  if (/^out$/i.test(tokens[0])) return null; // OUT params are not inputs
  const name = tokens.shift();
  const rest = tokens.join(' ');
  const defaultIdx = rest.search(/\s*(default\s|=)/i);
  const type = (defaultIdx >= 0 ? rest.slice(0, defaultIdx) : rest).trim().toLowerCase();
  return { name, type, hasDefault: defaultIdx >= 0 };
}

function newFunction(name) {
  return {
    name,
    args: [],
    securityDefiner: false,
    returnsTrigger: false,
    grants: new Set(DEFAULT_FUNCTION_GRANTS),
    // Roles the migrations mention explicitly (GRANT or REVOKE) since the
    // function was last created — the lint requires `authenticated` here
    // for every SECURITY DEFINER function, so the default grant can never
    // be the only thing deciding who may call a definer.
    explicitRoles: new Set(),
    definedIn: null,
  };
}

/** Parse one migration file's statements into the running surface. */
function applyMigration(surface, file, rawSql) {
  const sql = stripComments(rawSql);

  // ---- tables -------------------------------------------------------------
  for (const m of sql.matchAll(
    /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:\w+\.)?"?\w+"?)/gi,
  )) {
    if (!isPublic(m[1])) continue; // storage.*, auth.*, cron.* are not ours
    const name = bareName(m[1]);
    if (!surface.tables.has(name)) surface.tables.set(name, { name, rls: false, definedIn: file });
  }
  for (const m of sql.matchAll(/\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?((?:public\.)?"?\w+"?)/gi)) {
    surface.tables.delete(bareName(m[1]));
  }
  for (const m of sql.matchAll(
    /\bALTER\s+TABLE\s+(?:ONLY\s+)?((?:public\.)?"?\w+"?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
  )) {
    const t = surface.tables.get(bareName(m[1]));
    if (t) t.rls = true;
  }
  for (const m of sql.matchAll(
    /\bALTER\s+TABLE\s+(?:ONLY\s+)?((?:public\.)?"?\w+"?)\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY/gi,
  )) {
    const t = surface.tables.get(bareName(m[1]));
    if (t) t.rls = false;
  }

  // ---- views --------------------------------------------------------------
  for (const m of sql.matchAll(
    /\bCREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+((?:public\.)?"?\w+"?)(\s+WITH\s*\(([^)]*)\))?\s+AS\b/gi,
  )) {
    const name = bareName(m[1]);
    const existing = surface.views.get(name);
    const invokerInClause = /security_invoker\s*=\s*(on|true)/i.test(m[3] || '');
    surface.views.set(name, {
      name,
      // CREATE OR REPLACE keeps the reloption; a WITH clause sets it.
      securityInvoker: invokerInClause || (existing ? existing.securityInvoker : false),
      definedIn: file,
    });
  }
  for (const m of sql.matchAll(/\bDROP\s+VIEW\s+(?:IF\s+EXISTS\s+)?((?:public\.)?"?\w+"?)/gi)) {
    surface.views.delete(bareName(m[1]));
  }
  for (const m of sql.matchAll(
    /\bALTER\s+VIEW\s+((?:public\.)?"?\w+"?)\s+SET\s*\(\s*security_invoker\s*=\s*(on|true|off|false)\s*\)/gi,
  )) {
    const v = surface.views.get(bareName(m[1]));
    if (v) v.securityInvoker = /^(on|true)$/i.test(m[2]);
  }

  // ---- functions ----------------------------------------------------------
  for (const m of sql.matchAll(/\bDROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?((?:public\.)?"?\w+"?)/gi)) {
    surface.functions.delete(bareName(m[1]));
  }

  const createRe = /\bCREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+((?:public\.)?"?\w+"?)\s*\(/gi;
  let cm;
  while ((cm = createRe.exec(sql)) !== null) {
    const name = bareName(cm[2]);
    const argsOpen = createRe.lastIndex - 1;
    const argsClose = matchParen(sql, argsOpen);
    if (argsClose < 0) throw new Error(`${file}: cannot delimit arguments of ${name}()`);
    const argsText = sql.slice(argsOpen + 1, argsClose);

    // Body: the first dollar-quote after the header, closed by the same tag.
    const tagMatch = /\$[A-Za-z_]*\$/g;
    tagMatch.lastIndex = argsClose;
    const open = tagMatch.exec(sql);
    if (!open) throw new Error(`${file}: cannot find the dollar-quoted body of ${name}()`);
    const closeIdx = sql.indexOf(open[0], open.index + open[0].length);
    if (closeIdx < 0) throw new Error(`${file}: unterminated body of ${name}()`);
    const header = sql.slice(argsClose + 1, open.index);
    const stmtEnd = sql.indexOf(';', closeIdx + open[0].length);
    const trailer = sql.slice(closeIdx + open[0].length, stmtEnd < 0 ? sql.length : stmtEnd);
    const props = `${header} ${trailer}`;

    // CREATE OR REPLACE on an existing function keeps its grants; a fresh
    // CREATE (or a re-create after DROP) starts from the defaults.
    const fn = surface.functions.get(name) || newFunction(name);
    fn.args = splitTopLevel(argsText).map(parseArg).filter(Boolean);
    fn.securityDefiner = /\bSECURITY\s+DEFINER\b/i.test(props);
    fn.returnsTrigger = /\bRETURNS\s+TRIGGER\b/i.test(header);
    fn.definedIn = file;
    if (!surface.functions.has(name)) surface.functions.set(name, fn);

    createRe.lastIndex = stmtEnd < 0 ? sql.length : stmtEnd;
  }

  // ---- grants / revokes ---------------------------------------------------
  const grantRe =
    /\b(GRANT|REVOKE)\s+([\w\s,]+?)\s+ON\s+(?:(FUNCTION|PROCEDURE|ROUTINE|TABLE)\s+)?((?:ALL\s+\w+\s+IN\s+SCHEMA\s+\w+)|(?:(?:public\.)?"?\w+"?))\s*(\([^)]*\))?\s+(TO|FROM)\s+([\w\s,]+?)\s*;/gi;
  for (const m of sql.matchAll(grantRe)) {
    const verb = m[1].toUpperCase();
    const kind = (m[3] || '').toUpperCase();
    const target = m[4];
    const roles = roleList(m[7]);
    const isAll = /^ALL\s/i.test(target);

    if (isAll) {
      const key = target.replace(/\s+/g, ' ').toLowerCase();
      const entry = surface.schemaGrants.get(key) || { target: key, grants: new Set() };
      for (const r of roles) verb === 'GRANT' ? entry.grants.add(r) : entry.grants.delete(r);
      surface.schemaGrants.set(key, entry);
      continue;
    }

    const name = bareName(target);
    const fn = kind === 'FUNCTION' || kind === 'ROUTINE' ? surface.functions.get(name) : null;
    if (fn) {
      for (const r of roles) {
        fn.explicitRoles.add(r);
        if (verb === 'GRANT') fn.grants.add(r);
        else fn.grants.delete(r);
      }
      continue;
    }
    const table = surface.tables.get(name);
    if (table) {
      table.grantsTouched = table.grantsTouched || new Map();
      for (const r of roles) table.grantsTouched.set(r, verb);
    }
  }
}

/**
 * Replay every migration (sorted by filename = timestamp order) and return
 * the resulting surface.
 */
export function readMigrationSurface(dir = MIGRATIONS_DIR) {
  const surface = {
    tables: new Map(),
    views: new Map(),
    functions: new Map(),
    schemaGrants: new Map(),
    files: [],
  };
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    surface.files.push(file);
    applyMigration(surface, file, fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  return surface;
}

/** Postgres semantics: a role may execute if it or PUBLIC holds EXECUTE. */
export function canExecute(fn, role) {
  return fn.grants.has(role.toLowerCase()) || fn.grants.has('public');
}

/** Functions PostgREST exposes as RPC (trigger functions are not callable). */
export function rpcFunctions(surface) {
  return [...surface.functions.values()].filter((f) => !f.returnsTrigger);
}

// Placeholder argument values by Postgres type, for probes that must
// RESOLVE a function (PostgREST matches RPC calls by argument names) without
// touching real rows: ids that cannot exist, dates in the past, empty sets.
export function placeholderArg(type) {
  const t = type.toLowerCase();
  if (/\[\]$/.test(t)) return [];
  if (/uuid/.test(t)) return '00000000-0000-0000-0000-000000000000';
  if (/json/.test(t)) return {};
  if (/bool/.test(t)) return false;
  if (/int|numeric|decimal|real|double|serial/.test(t)) return 1;
  if (/timestamp/.test(t)) return '2000-01-01T00:00:00Z';
  if (/date/.test(t)) return '2000-01-01';
  return 'ZZZ-E2E-PROBE';
}

export function placeholderArgs(fn) {
  return Object.fromEntries(fn.args.map((a) => [a.name, placeholderArg(a.type)]));
}
