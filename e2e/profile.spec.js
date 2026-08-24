// =============================================================================
// E2E Tests - Per-user profile settings
// The round-trip suite the profile-persistence round was missing: save a
// setting → reload → it's still there. Runs as the STANDARD user so the
// admin account (which the visual project logs in as) is never touched.
// The user's profile row is snapshotted in beforeAll and restored in
// afterAll, so this spec leaves no trace.
// =============================================================================
import { createClient } from '@supabase/supabase-js';
import { test, expect, STORAGE_STATE } from './fixtures.js';
import { adminDb } from './db.js';

const USER_EMAIL = 'user@test.sims';

let userId;
let savedProfile;
let savedNotificationRow;

const readProfile = async () => {
  const db = await adminDb();
  const { data } = await db.from('users').select('profile').eq('id', userId).single();
  return data?.profile || {};
};

// notification_preferences is own-row RLS in every direction — even the
// admin can't read another user's row, so DB-truth checks for it must run
// as the standard user
let userClientPromise = null;
const userDb = () => {
  if (!userClientPromise) {
    userClientPromise = (async () => {
      const client = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.VITE_SUPABASE_ANON_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error } = await client.auth.signInWithPassword({
        email: process.env.E2E_USER_EMAIL,
        password: process.env.E2E_USER_PASSWORD,
      });
      if (error) throw new Error(`profile spec: user sign-in failed: ${error.message}`);
      return client;
    })();
  }
  return userClientPromise;
};

const openUserMenu = async (page) => {
  await page.getByRole('button', { name: /Standard User/ }).click();
};

test.describe.serial('per-user settings round-trips', () => {
  // The one suite that runs with LIVE settings persistence (every other
  // spec freezes it — see the persistUserSettings fixture)
  test.use({ storageState: STORAGE_STATE.user, persistUserSettings: true });

  test.beforeAll(async () => {
    const db = await adminDb();
    const { data, error } = await db
      .from('users')
      .select('id, profile')
      .eq('email', USER_EMAIL)
      .single();
    if (error) throw error;
    userId = data.id;
    savedProfile = data.profile;
    const udb = await userDb();
    const { data: prefs } = await udb
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId);
    savedNotificationRow = prefs?.[0] || null;
  });

  test.afterAll(async () => {
    const db = await adminDb();
    await db
      .from('users')
      .update({ profile: savedProfile ?? {} })
      .eq('id', userId);
    // No DELETE policy exists on notification_preferences — restore by
    // upserting the snapshot (or defaults when no row existed before)
    const udb = await userDb();
    const restore = savedNotificationRow
      ? { ...savedNotificationRow, updated_at: new Date().toISOString() }
      : { user_id: userId, overdue_notifications: true, updated_at: new Date().toISOString() };
    await udb.from('notification_preferences').upsert(restore, { onConflict: 'user_id' });
  });

  test('theme choice is stored in the profile and reapplied at login', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    await openUserMenu(page);
    await page.getByRole('button', { name: /^Theme/ }).click();

    // Pick the Light theme card
    await page.getByText('Light', { exact: true }).click();

    // DB truth: the pick landed in the user's profile
    await expect
      .poll(async () => (await readProfile()).uiPrefs?.themeId ?? null, { timeout: 10000 })
      .toBe('light');

    // Wipe the device cache — after reload, ONLY the profile can know the
    // theme. Before this round the choice was device-scoped and lost.
    await page.evaluate(() => localStorage.removeItem('sims-theme'));
    await page.reload();
    await pages.dashboard.expectDashboard();

    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('sims-theme')), { timeout: 10000 })
      .toBe('light');
    await openUserMenu(page);
    await expect(page.getByRole('button', { name: /^Theme/ })).toContainText('Light');
  });

  test('dashboard layout collapse survives a reload', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    const statsToggle = page.getByRole('button', { name: /Statistics/ }).first();
    await expect(statsToggle).toHaveAttribute('aria-expanded', 'true');
    await statsToggle.click();
    await expect(statsToggle).toHaveAttribute('aria-expanded', 'false');

    // DB truth — persisted into profile.layoutPrefs
    await expect
      .poll(
        async () =>
          (await readProfile()).layoutPrefs?.dashboard?.sections?.stats?.collapsed ?? null,
        { timeout: 10000 },
      )
      .toBe(true);

    // The reload is what used to reset everything to defaults
    await page.reload();
    await pages.dashboard.expectDashboard();
    await expect(page.getByRole('button', { name: /Statistics/ }).first()).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  test('gear list sort follows the user', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');

    await page.getByLabel('Sort items').click();
    await page.getByRole('option', { name: 'Name A–Z' }).click();

    await expect
      .poll(async () => (await readProfile()).uiPrefs?.gearListSort ?? null, { timeout: 10000 })
      .toBe('name-asc');

    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await expect(page.getByLabel('Sort items')).toContainText('Name A–Z');
  });

  test('gear list saved views follow the user across reloads', async ({ page, pages }) => {
    const viewName = 'ZZZ E2E Profile View';
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');

    await page.getByPlaceholder('Search name, ID, brand, serial...').fill('sony');
    await page.getByRole('button', { name: /Saved Views/ }).click();
    await page.getByRole('button', { name: 'Save Current Filters' }).click();
    await page.getByPlaceholder('View name...').fill(viewName);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // DB truth: stored in the profile, not a device store
    await expect
      .poll(
        async () => ((await readProfile()).savedFilterViews || []).some((v) => v.name === viewName),
        { timeout: 10000 },
      )
      .toBe(true);

    // Survives a full reload
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await page.getByRole('button', { name: /Saved Views/ }).click();
    await expect(page.getByText(viewName)).toBeVisible();
  });

  test('grid mode, schedule period/mode, and label format follow the user', async ({
    page,
    pages,
  }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    // Gear list: switch to list view
    await pages.dashboard.navigateTo('Gear List');
    await page.getByRole('button', { name: 'List view' }).click();
    await expect
      .poll(async () => (await readProfile()).uiPrefs?.gearListGridView ?? null, {
        timeout: 10000,
      })
      .toBe(false);

    // Schedule: month period + list mode
    await pages.dashboard.navigateTo('Schedule');
    await page.getByRole('button', { name: 'month' }).click();
    await page.getByTitle('List View').click();
    await expect
      .poll(
        async () => {
          const ui = (await readProfile()).uiPrefs || {};
          return `${ui.scheduleView}/${ui.scheduleMode}`;
        },
        { timeout: 10000 },
      )
      .toBe('month/list');

    // Labels: pick the Small format (custom-styled radio — click its label)
    await pages.dashboard.navigateTo('Labels');
    await page.getByText('Small - QR Only').click();
    await expect
      .poll(async () => (await readProfile()).uiPrefs?.labelFormat ?? null, { timeout: 10000 })
      .toBe('small');

    // One reload restores all three surfaces
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await expect(page.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await pages.dashboard.navigateTo('Schedule');
    await expect(page.getByTitle('List View')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await pages.dashboard.navigateTo('Labels');
    await expect(page.locator('input[name="label-format"][value="small"]')).toBeChecked();
  });

  test('notification preferences persist AND load back', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    await openUserMenu(page);
    await page.getByRole('button', { name: /Notification Settings/ }).click();

    // State-agnostic: flip whatever the current value is, then verify the
    // flip persisted AND loads back (the row may exist from earlier runs)
    const overdue = page.getByRole('switch', { name: 'Overdue notifications' });
    const initiallyChecked = await overdue.isChecked();
    await overdue.click();
    await page.getByRole('button', { name: 'Save Preferences' }).click();

    // DB truth — read as the user (own-row RLS blocks everyone else)
    await expect
      .poll(
        async () => {
          const udb = await userDb();
          const { data } = await udb
            .from('notification_preferences')
            .select('overdue_notifications')
            .eq('user_id', userId);
          return data?.[0]?.overdue_notifications ?? null;
        },
        { timeout: 10000 },
      )
      .toBe(!initiallyChecked);

    // Reload and reopen — the stored row must be LOADED, not defaults
    // (before this round the screen always showed defaults after login)
    await page.reload();
    await pages.dashboard.expectDashboard();
    await openUserMenu(page);
    await page.getByRole('button', { name: /Notification Settings/ }).click();
    // The stored row is fetched after login and resynced into the form when
    // it arrives — on a loaded CI runner that can take longer than the
    // default 5s expect timeout, so wait for the real value, not the default
    const after = page.getByRole('switch', { name: 'Overdue notifications' });
    if (initiallyChecked) {
      await expect(after).not.toBeChecked({ timeout: 20000 });
    } else {
      await expect(after).toBeChecked({ timeout: 20000 });
    }
  });

  test('saving Profile Settings preserves every other stored setting', async ({ page, pages }) => {
    // Preconditions from the earlier serial tests: theme, layout collapse,
    // and sort are all in the profile
    const before = await readProfile();
    expect(before.uiPrefs?.themeId).toBe('light');
    expect(before.layoutPrefs?.dashboard?.sections?.stats?.collapsed).toBe(true);

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await openUserMenu(page);
    await page.getByRole('button', { name: /Profile Settings/ }).click();

    await page.getByPlaceholder('Your name or alias').fill('ZZZ E2E Display');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    // The old code replaced the whole profile JSON with the modal's branding
    // fields — wiping layoutPrefs/savedFilterViews/uiPrefs from the DB
    await expect
      .poll(async () => (await readProfile()).displayName ?? null, { timeout: 10000 })
      .toBe('ZZZ E2E Display');
    const after = await readProfile();
    expect(after.uiPrefs?.themeId).toBe('light');
    expect(after.uiPrefs?.gearListSort).toBe('name-asc');
    expect(after.layoutPrefs?.dashboard?.sections?.stats?.collapsed).toBe(true);
    expect((after.savedFilterViews || []).some((v) => v.name === 'ZZZ E2E Profile View')).toBe(
      true,
    );
  });
});
