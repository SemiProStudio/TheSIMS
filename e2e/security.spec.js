// =============================================================================
// Security regression suite
//
// The 2026-08-15/16 hardening turned the database into an allow-list: the
// anon key (which ships in the public bundle) reaches nothing, views run as
// the caller, SECURITY DEFINER RPCs are granted explicitly, and RLS keys
// every write on the caller's role permissions. Until this file, all of that
// was enforced by SQL run once by hand. These tests hit the live TEST project
// the way an attacker would — raw REST with the anon key, a signed-in
// standard user, and the browser as that user — so a future migration or
// policy edit that re-opens a path fails CI instead of shipping.
//
// The probe list is NOT hand-maintained: tables, views and RPCs come from
// supabase/migrationSurface.js, which replays supabase/migrations/. Add a
// table or function in a migration and it is probed on the next run.
// test/migrationSecurityLint.test.js checks the same model offline (policy);
// this file checks behaviour.
//
// Safety: anon/user probes target a private "ZZZ E2E" item or ids that cannot
// exist, so even a regression cannot damage seeded rows. Nothing here is
// ever pointed at production (db.js refuses the prod project ref).
// =============================================================================

import { test, expect, STORAGE_STATE } from './fixtures.js';
import { adminDb, userDb, anonRequest, createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';
import { makeTestPng } from './image-fixture.js';
import {
  readMigrationSurface,
  rpcFunctions,
  canExecute,
  placeholderArgs,
} from '../supabase/migrationSurface.js';

const surface = readMigrationSurface();
const relations = [...surface.tables.keys(), ...surface.views.keys()];
const rpcs = rpcFunctions(surface);

const PERMISSION_DENIED = '42501';
const NO_SUCH_RPC = 'PGRST202';

function summarize(failures) {
  return failures.length ? `\n  - ${failures.join('\n  - ')}` : '';
}

// =============================================================================
// 1. The anon key reaches nothing
// =============================================================================

test.describe('anonymous key', () => {
  let itemId;

  test.beforeAll(async () => {
    itemId = await createTestItem({ name: `${E2E_PREFIX} Security anon target` });
  });

  test.afterAll(async () => {
    await deleteTestItem(itemId);
  });

  test('reads zero rows from every table and view', async () => {
    const failures = [];
    for (const name of relations) {
      const { status, body } = await anonRequest(`/rest/v1/${name}?select=*&limit=1`);
      const denied = status === 401 || status === 403;
      const empty = status === 200 && Array.isArray(body) && body.length === 0;
      if (!denied && !empty) {
        failures.push(`${name}: HTTP ${status} ${JSON.stringify(body).slice(0, 120)}`);
      }
    }
    expect(failures, `anon read something:${summarize(failures)}`).toEqual([]);
  });

  test('cannot insert into any table', async () => {
    const failures = [];
    for (const name of surface.tables.keys()) {
      // An empty row: if anon got past RLS the constraints would answer
      // (400/409/201) instead of 42501 — any non-42501 answer is a finding.
      const { status, body } = await anonRequest(`/rest/v1/${name}`, {
        method: 'POST',
        body: {},
        headers: { Prefer: 'return=minimal' },
      });
      if (!(status === 401 || status === 403) || body?.code !== PERMISSION_DENIED) {
        failures.push(`${name}: HTTP ${status} ${JSON.stringify(body).slice(0, 120)}`);
      }
    }
    expect(failures, `anon INSERT was not refused by RLS:${summarize(failures)}`).toEqual([]);
  });

  test('cannot update or delete an existing item', async () => {
    const db = await adminDb();

    const patch = await anonRequest(`/rest/v1/inventory?id=eq.${itemId}`, {
      method: 'PATCH',
      body: { name: `${E2E_PREFIX} TAMPERED` },
      headers: { Prefer: 'return=representation' },
    });
    expect(patch.status, 'PATCH must not fail loudly in a way that leaks existence').toBeLessThan(
      500,
    );
    expect(Array.isArray(patch.body) ? patch.body : []).toEqual([]);

    const del = await anonRequest(`/rest/v1/inventory?id=eq.${itemId}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    expect(Array.isArray(del.body) ? del.body : []).toEqual([]);

    const { data } = await db.from('inventory').select('name').eq('id', itemId).single();
    expect(data.name).toBe(`${E2E_PREFIX} Security anon target`);
  });

  test('cannot call any RPC', async () => {
    const failures = [];
    for (const fn of rpcs) {
      const { status, body } = await anonRequest(`/rest/v1/rpc/${fn.name}`, {
        method: 'POST',
        body: placeholderArgs(fn),
      });
      if (body?.code === NO_SUCH_RPC) {
        failures.push(
          `${fn.name}: the probe could not resolve the function (${body.message}) — ` +
            `placeholderArgs() needs a value for its signature`,
        );
      } else if (!(status === 401 || status === 403) || body?.code !== PERMISSION_DENIED) {
        failures.push(`${fn.name}: HTTP ${status} ${JSON.stringify(body).slice(0, 120)}`);
      }
    }
    expect(failures, `anon executed an RPC:${summarize(failures)}`).toEqual([]);
  });

  test('cannot write to the image bucket', async () => {
    const png = makeTestPng(4, 4);
    const upload = await anonRequest(`/storage/v1/object/equipment-images/${itemId}/anon.png`, {
      method: 'POST',
      body: png,
      headers: { 'content-type': 'image/png' },
    });
    expect(upload.status).toBeGreaterThanOrEqual(400);
    expect(upload.status).toBeLessThan(500);

    const db = await adminDb();
    const { data } = await db.storage.from('equipment-images').list(itemId);
    expect((data || []).filter((f) => f.name === 'anon.png')).toEqual([]);
  });
});

// =============================================================================
// 2. Standard user (role_user): row-level matrix
//    schedule + pack_lists: edit · gear_list/item_details/clients: view ·
//    every admin_* : hide
// =============================================================================

test.describe('standard user — database', () => {
  let itemId;
  let user;
  let adminUserId;

  test.beforeAll(async () => {
    itemId = await createTestItem({ name: `${E2E_PREFIX} Security user target` });
    const udb = await userDb();
    user = (await udb.auth.getSession()).data.session.user;
    const adb = await adminDb();
    adminUserId = (await adb.auth.getSession()).data.session.user.id;
  });

  test.afterAll(async () => {
    await deleteTestItem(itemId);
  });

  test('positive control: the session is real and its EDIT permissions work', async () => {
    const db = await userDb();
    const { data: items, error: readErr } = await db.from('inventory').select('id').limit(1);
    expect(readErr).toBeNull();
    expect(items.length).toBe(1);

    // schedule: edit → may create a reservation
    const { data: res, error: resErr } = await db
      .from('reservations')
      .insert({
        item_id: itemId,
        project: `${E2E_PREFIX} user reservation`,
        start_date: '2000-01-01',
        end_date: '2000-01-02',
        status: 'confirmed',
      })
      .select('id')
      .single();
    expect(resErr).toBeNull();
    await db.from('reservations').delete().eq('id', res.id);

    // pack_lists: edit → may create a pack list
    const { data: pl, error: plErr } = await db
      .from('pack_lists')
      .insert({ name: `${E2E_PREFIX} user pack list` })
      .select('id')
      .single();
    expect(plErr).toBeNull();
    await db.from('pack_lists').delete().eq('id', pl.id);
  });

  test('cannot create, edit or delete inventory (gear_list: view)', async () => {
    const db = await userDb();
    const { error: insErr } = await db
      .from('inventory')
      .insert({
        id: 'ZZE2E-USER-INSERT',
        name: `${E2E_PREFIX} user insert`,
        category_name: 'Cameras',
      });
    expect(insErr?.code).toBe(PERMISSION_DENIED);

    const { data: upd } = await db
      .from('inventory')
      .update({ name: `${E2E_PREFIX} TAMPERED` })
      .eq('id', itemId)
      .select('id');
    expect(upd).toEqual([]);

    const { data: del } = await db.from('inventory').delete().eq('id', itemId).select('id');
    expect(del).toEqual([]);

    const adb = await adminDb();
    const { data: row } = await adb.from('inventory').select('name').eq('id', itemId).single();
    expect(row.name).toBe(`${E2E_PREFIX} Security user target`);
  });

  test('sees only their own user row and cannot touch another', async () => {
    const db = await userDb();
    const { data: users } = await db.from('users').select('id');
    expect(users.map((u) => u.id)).toEqual([user.id]);

    const { data: upd } = await db
      .from('users')
      .update({ name: `${E2E_PREFIX} TAMPERED` })
      .eq('id', adminUserId)
      .select('id');
    expect(upd).toEqual([]);
  });

  test('cannot promote themselves', async () => {
    const db = await userDb();
    const { error } = await db.from('users').update({ role_id: 'role_admin' }).eq('id', user.id);
    expect(error?.code).toBe(PERMISSION_DENIED);

    const adb = await adminDb();
    const { data } = await adb.from('users').select('role_id').eq('id', user.id).single();
    expect(data.role_id).toBe('role_user');
  });

  test('admin-only data is invisible or read-only', async () => {
    const db = await userDb();
    const { data: audit } = await db.from('audit_log').select('id').limit(1);
    expect(audit).toEqual([]);

    const { data: log } = await db.from('notification_log').select('user_id');
    expect(log.filter((r) => r.user_id !== user.id)).toEqual([]);

    const { data: prefs } = await db.from('notification_preferences').select('user_id');
    expect(prefs.filter((r) => r.user_id !== user.id)).toEqual([]);

    const blockedInserts = {
      roles: { id: 'zzz_e2e_role', name: `${E2E_PREFIX} role`, permissions: {} },
      categories: { name: `${E2E_PREFIX} Category` },
      specs: { category_name: 'Cameras', name: `${E2E_PREFIX} Spec` },
      locations: { name: `${E2E_PREFIX} Location` },
      clients: { id: 'ZZE2E-CLIENT', name: `${E2E_PREFIX} Client` },
      item_notes: { item_id: itemId, text: `${E2E_PREFIX} note`, user_name: 'user' },
      item_reminders: { item_id: itemId, title: `${E2E_PREFIX} reminder`, due_date: '2000-01-01' },
      maintenance_records: {
        item_id: itemId,
        type: `${E2E_PREFIX} service`,
        scheduled_date: '2000-01-01',
      },
      packages: { id: 'ZZE2E-PKG', name: `${E2E_PREFIX} package` },
      email_templates: { template_key: 'zzz_e2e', subject: 'x', body_html: 'x' },
    };
    const failures = [];
    for (const [table, row] of Object.entries(blockedInserts)) {
      const { error } = await db.from(table).insert(row);
      if (error?.code !== PERMISSION_DENIED) {
        failures.push(`${table}: ${error ? `${error.code} ${error.message}` : 'INSERT SUCCEEDED'}`);
      }
    }
    expect(failures, `writes the standard user must not have:${summarize(failures)}`).toEqual([]);
  });

  test('service-role-only RPCs refuse every logged-in user, admin included', async () => {
    // The migration model says which functions `authenticated` may NOT
    // execute; the live database must agree for the standard user AND the
    // admin (both are just `authenticated` to Postgres). Allowed functions
    // are not invoked here — the app's own specs exercise them, and calling
    // write RPCs with placeholder arguments is not worth the side effects.
    const denied = rpcs.filter((fn) => !canExecute(fn, 'authenticated'));
    expect(denied.map((f) => f.name)).toEqual(
      expect.arrayContaining(['get_notification_recipients', 'reconcile_reservation_statuses']),
    );

    const failures = [];
    for (const [label, client] of [
      ['user', await userDb()],
      ['admin', await adminDb()],
    ]) {
      for (const fn of denied) {
        const { error } = await client.rpc(fn.name, placeholderArgs(fn));
        if (error?.code === NO_SUCH_RPC) {
          failures.push(
            `${label} → ${fn.name}: probe could not resolve the function (${error.message})`,
          );
        } else if (error?.code !== PERMISSION_DENIED) {
          failures.push(
            `${label} → ${fn.name}: ${error ? `${error.code} ${error.message}` : 'EXECUTED'}`,
          );
        }
      }
    }
    expect(failures, `RPCs executable by a client session:${summarize(failures)}`).toEqual([]);
  });

  test('storage: own profile folder only', async () => {
    const db = await userDb();
    const png = makeTestPng(4, 4);
    const upload = (path) =>
      db.storage
        .from('equipment-images')
        .upload(path, png, { contentType: 'image/png', upsert: true });

    const item = await upload(`${itemId}/user.png`);
    expect(item.error, 'equipment photos need gear_list edit').toBeTruthy();

    const other = await upload(`profiles/${adminUserId}/user.png`);
    expect(other.error, "another user's profile folder").toBeTruthy();

    const own = await upload(`profiles/${user.id}/${E2E_PREFIX.replace(/\s/g, '-')}-probe.png`);
    expect(own.error).toBeNull();
    await db.storage.from('equipment-images').remove([own.data.path]);
  });
});

// =============================================================================
// 3. Standard user: the UI refuses admin views, even when forced
// =============================================================================

test.describe('standard user — interface', () => {
  test.use({ storageState: STORAGE_STATE.user });

  // NavigationContext restores `history.state.view` on popstate — the same
  // path a stale tab, a deep link or a QR scan takes. Push the target view,
  // push a decoy, go back: the app lands on the target without any sidebar
  // button existing for it.
  const forceView = async (page, view) => {
    await page.evaluate((v) => {
      window.history.pushState({ view: v }, '', window.location.pathname);
      window.history.pushState({ view: 'dashboard' }, '', window.location.pathname);
      window.history.back();
    }, view);
  };

  test('no admin or reports entry points in the sidebar', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await expect(pages.dashboard.sidebar.locator('button:has-text("Admin Panel")')).toHaveCount(0);
    await expect(pages.dashboard.sidebar.locator('button:has-text("Reports")')).toHaveCount(0);
  });

  test('forced navigation to a restricted view shows "Access restricted"', async ({
    page,
    pages,
  }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    // Positive control: the forcing mechanism itself works for a view the
    // role may see.
    await forceView(page, 'schedule');
    await expect(page.locator('h2:has-text("Schedule")')).toBeVisible();

    const restricted = [
      'admin',
      'users',
      'roles-manage',
      'auditlog',
      'changelog',
      'email-log',
      'edit-categories',
      'edit-specs',
      'locations-manage',
      'reports',
      'inventory-report',
      'add-item',
    ];
    for (const view of restricted) {
      await forceView(page, view);
      await expect(
        page.getByRole('alert').filter({ hasText: 'Access restricted' }),
        `view "${view}" rendered for a standard user`,
      ).toBeVisible();
      // Reset so the next iteration's alert is a fresh render, not the
      // previous one still on screen.
      await forceView(page, 'dashboard');
      await pages.dashboard.expectDashboard();
    }
  });
});
