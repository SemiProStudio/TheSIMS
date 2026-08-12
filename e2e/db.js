// =============================================================================
// E2E Database Helpers
// Direct Supabase access (as the admin test user) for deterministic test
// state: private per-test items, checked-out fixtures, and cleanup.
//
// RULES:
// - Tests must NEVER mutate the seeded rows (CA1001..SU1002, CL001..CL005,
//   pkg-*) — visual baselines and read-only assertions depend on them.
//   Mutating tests create PRIVATE items here (named "ZZZ E2E ...") and
//   delete them when done.
// - Everything created through these helpers carries E2E_PREFIX in its
//   name/project so cleanupTestData() can find strays from crashed runs.
// =============================================================================

import { createClient } from '@supabase/supabase-js';

export const E2E_PREFIX = 'ZZZ E2E';

// Production project ref — these helpers must never touch it. The E2E env
// points at the dedicated test project (thesims-test); this is a backstop.
const PRODUCTION_PROJECT_REF = 'smcenkniztqzkgsamvsc';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. E2E db helpers need the test-project credentials ` +
        `from .env.e2e (copy .env.e2e.example) or CI secrets — see e2e/README.md.`,
    );
  }
  return value;
}

let clientPromise = null;

/** Supabase client signed in as the admin E2E user (cached per process). */
export function adminDb() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const url = requireEnv('VITE_SUPABASE_URL');
      if (url.includes(PRODUCTION_PROJECT_REF)) {
        throw new Error(
          'Refusing to run E2E db helpers against the PRODUCTION Supabase project. ' +
            'Point VITE_SUPABASE_URL at the dedicated test project.',
        );
      }
      const client = createClient(url, requireEnv('VITE_SUPABASE_ANON_KEY'), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.auth.signInWithPassword({
        email: requireEnv('E2E_ADMIN_EMAIL'),
        password: requireEnv('E2E_ADMIN_PASSWORD'),
      });
      if (error) throw new Error(`E2E db helper: admin sign-in failed: ${error.message}`);
      return client;
    })();
  }
  return clientPromise;
}

function isoDate(daysFromToday = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().split('T')[0];
}

let seq = 0;

// Two parallel Playwright workers calling createTestItem within the same
// millisecond used to mint identical ids (timestamp + per-process seq) and
// hit inventory_pkey. Fold the worker's pid in so ids differ across workers.
const WORKER_TOKEN = (process.pid % 1296).toString(36).toUpperCase().padStart(2, '0');

/**
 * Insert a private inventory item for one test. Returns its id.
 * The name MUST start with E2E_PREFIX (enforced) so cleanup can find it.
 */
export async function createTestItem({ name, status = 'available', columns = {} }) {
  if (!name || !name.startsWith(E2E_PREFIX)) {
    throw new Error(`Test items must be named "${E2E_PREFIX} ..." (got: ${name})`);
  }
  const db = await adminDb();
  seq += 1;
  const id = `ZZE2E${Date.now().toString(36).slice(-6).toUpperCase()}${WORKER_TOKEN}${seq}`;
  const { error } = await db.from('inventory').insert({
    id,
    name,
    brand: 'E2E Test',
    category_name: 'Cameras',
    status,
    condition: 'excellent',
    location_display: 'E2E Shelf',
    // Cameras declare required specs and a required serial number — fill
    // them so the EDIT form validates (its save button stays disabled on
    // items with missing required fields)
    serial_number: `SN-${id}`,
    specs: { 'Sensor Type': 'E2E', 'Video Resolution': 'E2E', 'Mount Type': 'E2E' },
    ...columns,
  });
  if (error) throw new Error(`createTestItem failed: ${error.message}`);
  return id;
}

/** Put an item into checked-out state directly (for check-in flow tests). */
export async function checkOutTestItem(
  id,
  { borrower = `${E2E_PREFIX} Holder`, dueInDays = 3 } = {},
) {
  const db = await adminDb();
  const { error } = await db
    .from('inventory')
    .update({
      status: 'checked-out',
      checked_out_to_name: borrower,
      checked_out_date: isoDate(0),
      due_back: isoDate(dueInDays),
    })
    .eq('id', id);
  if (error) throw new Error(`checkOutTestItem failed: ${error.message}`);
}

/** Attach a reminder to a private item (dashboard Due Reminders fixtures). */
export async function addTestReminder(itemId, { title, dueInDays = 0, completed = false } = {}) {
  const db = await adminDb();
  const { error } = await db.from('item_reminders').insert({
    item_id: itemId,
    title: title || `${E2E_PREFIX} Reminder`,
    due_date: isoDate(dueInDays),
    completed,
  });
  if (error) throw new Error(`addTestReminder failed: ${error.message}`);
}

/** Attach a maintenance record to a private item (dashboard fixtures). */
export async function addTestMaintenance(
  itemId,
  { type, status = 'scheduled', inDays = 3 } = {},
) {
  const db = await adminDb();
  const { error } = await db.from('maintenance_records').insert({
    item_id: itemId,
    type: type || `${E2E_PREFIX} Service`,
    status,
    scheduled_date: isoDate(inDays),
  });
  if (error) throw new Error(`addTestMaintenance failed: ${error.message}`);
}

/** Delete one private item and its dependent rows. Safe to call twice. */
export async function deleteTestItem(id) {
  if (!id) return;
  const db = await adminDb();
  await db.from('checkout_history').delete().eq('item_id', id);
  await db.from('reservations').delete().eq('item_id', id);
  await db.from('item_reminders').delete().eq('item_id', id);
  await db.from('maintenance_records').delete().eq('item_id', id);
  const { error } = await db.from('inventory').delete().eq('id', id);
  if (error) throw new Error(`deleteTestItem(${id}) failed: ${error.message}`);
}

/** Delete items created through the UI (their ids are auto-generated). */
export async function deleteItemsByExactName(name) {
  const db = await adminDb();
  const { data } = await db.from('inventory').select('id').eq('name', name);
  for (const row of data || []) {
    await deleteTestItem(row.id);
  }
}

/**
 * Remove every trace of E2E-created data from the test project and restore
 * any seed item a crashed run left checked out to an E2E holder. Runs in
 * global setup (self-healing) and global teardown (hygiene).
 */
export async function cleanupTestData() {
  const db = await adminDb();

  // Private items (created by db helpers or through the UI) + their children
  const { data: items } = await db.from('inventory').select('id').ilike('name', `${E2E_PREFIX}%`);
  const ids = (items || []).map((r) => r.id);
  if (ids.length > 0) {
    await db.from('checkout_history').delete().in('item_id', ids);
    await db.from('reservations').delete().in('item_id', ids);
    await db.from('item_reminders').delete().in('item_id', ids);
    await db.from('maintenance_records').delete().in('item_id', ids);
    await db.from('inventory').delete().in('id', ids);
  }

  // Reservations/clients/pack lists/packages created against seed items.
  // package_items / package_notes / pack_list_packages all cascade on
  // package delete, so removing the package row is enough.
  await db.from('reservations').delete().ilike('project', `${E2E_PREFIX}%`);
  await db.from('clients').delete().ilike('name', `${E2E_PREFIX}%`);
  await db.from('pack_lists').delete().ilike('name', `${E2E_PREFIX}%`);
  await db.from('packages').delete().ilike('name', `${E2E_PREFIX}%`);

  // E2E-created saved filter views left in user profiles (gear list persists
  // them per-user; a crashed run can strand one, which changes the Saved
  // Views trigger label whenever its filters match)
  const { data: userRows } = await db.from('users').select('id, profile');
  for (const row of userRows || []) {
    const views = row.profile?.savedFilterViews;
    if (Array.isArray(views) && views.some((v) => v.name?.startsWith(E2E_PREFIX))) {
      await db
        .from('users')
        .update({
          profile: {
            ...row.profile,
            savedFilterViews: views.filter((v) => !v.name?.startsWith(E2E_PREFIX)),
          },
        })
        .eq('id', row.id);
    }
  }

  // Seed items a crashed run left checked out to an E2E borrower
  await db
    .from('inventory')
    .update({
      status: 'available',
      checked_out_to_user_id: null,
      checked_out_to_name: null,
      checkout_client_id: null,
      checked_out_date: null,
      due_back: null,
      checkout_project: null,
    })
    .ilike('checked_out_to_name', `${E2E_PREFIX}%`);

  return ids.length;
}
