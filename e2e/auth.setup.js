// =============================================================================
// Auth setup — runs ONCE before the browser projects (see playwright.config).
// Logs in as each test user and saves the session storage state; all other
// specs start already authenticated from these files instead of logging in
// per test (which is slow and trips Supabase's per-IP auth rate limit).
// =============================================================================

import { test as setup } from '@playwright/test';
import { LoginPage, DashboardPage, testUsers, STORAGE_STATE } from './fixtures.js';
import { cleanupTestData, resetTestUserSettings } from './db.js';

// SERIAL: the cleanup/reset must fully finish BEFORE the logins below.
// When these ran on parallel workers, the login applied a previous run's
// leftover profile settings (e.g. sidebar collapsed) to localStorage and
// baked them into the captured storage state — poisoning every context of
// the run even though the DB reset itself succeeded.
setup.describe.configure({ mode: 'serial' });

// Self-healing: remove any "ZZZ E2E ..." rows a previous (crashed) run left
// behind, BEFORE tests assert against the seeded dataset. Also reset the
// test users' persisted UI settings (theme/sidebar/layout/sort now follow
// the account) — leftovers from a crashed run would otherwise change what
// every login in THIS run looks like.
setup('clean stray E2E data from previous runs', async () => {
  await cleanupTestData();
  await resetTestUserSettings();
});

// These logins must not SEED the freshly-reset profiles with device values
// (this file uses the base test, so the fixtures' freeze flag doesn't apply
// here automatically).
const freezeSettings = (page) =>
  page.addInitScript(() => {
    try {
      localStorage.setItem('sims-ui-settings-readonly', '1');
    } catch {
      /* ignore */
    }
  });

// Volatile per-device UI keys — and the freeze flag itself — must not ride
// along in the captured state: every spec context inherits this localStorage
// verbatim, and profile.spec needs to start unfrozen (the fixtures re-add
// the flag per-context for everything else).
const scrubUiState = (page) =>
  page.evaluate(() => {
    localStorage.removeItem('sims-sidebar-collapsed');
    localStorage.removeItem('sims-ui-settings-readonly');
  });

setup('authenticate as admin', async ({ page }) => {
  await freezeSettings(page);
  const login = new LoginPage(page);
  await page.goto('/');
  await login.login(testUsers.admin.email, testUsers.admin.password);
  await new DashboardPage(page).expectDashboard();
  await scrubUiState(page);
  await page.context().storageState({ path: STORAGE_STATE.admin });
});

setup('authenticate as standard user', async ({ page }) => {
  await freezeSettings(page);
  const login = new LoginPage(page);
  await page.goto('/');
  await login.login(testUsers.user.email, testUsers.user.password);
  await new DashboardPage(page).expectDashboard();
  await scrubUiState(page);
  await page.context().storageState({ path: STORAGE_STATE.user });
});
