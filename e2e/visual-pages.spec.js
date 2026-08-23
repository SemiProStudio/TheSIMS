// =============================================================================
// Visual Regression Tests - Pages
// Screenshot comparison tests for main application pages
// =============================================================================

import { test, expect, pinVisualClock, waitForStable } from './visual-utils.js';
import { DashboardPage, LoginPage } from './fixtures.js';

// Capture policy (2026-08-23 rebalance): the four CORE captures — dashboard,
// gear list, item detail (plus the theme selector in visual-themes) — are
// full-viewport and include the navigation chrome. Every other page capture
// MASKS the sidebar: those pages exist to catch regressions in their own
// content, and a sidebar tweak used to invalidate all 22 page baselines on
// two platforms. The sidebar itself has a dedicated capture in
// visual-components.spec.js. Mobile/tablet captures keep the shell — the
// responsive shell is what they test.
const sidebar = (page) => page.locator('[role="navigation"][aria-label="Main navigation"]');

test.describe('Visual Regression - Pages', () => {
  test.describe('Login Page', () => {
    // Screenshots of the login page need a logged-out session
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page should match baseline', async ({ page }) => {
      await page.goto('/');
      await waitForStable(page);

      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 100,
      });
    });

    test('login page with error should match baseline', async ({ page }) => {
      await page.goto('/');

      // Trigger an error by submitting invalid credentials.
      // fillCredentials is remount-safe — the login card can remount right
      // after first paint and wipe directly-filled inputs.
      const loginPage = new LoginPage(page);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await loginPage.fillCredentials('test@test.com', 'wrongpassword');
      await page.locator('button[type="submit"]').click();

      // The error banner must appear before capturing
      await expect(page.locator('text=/invalid|error|incorrect/i').first()).toBeVisible({
        timeout: 10000,
      });
      await waitForStable(page);

      await expect(page).toHaveScreenshot('login-page-error.png', {
        maxDiffPixels: 100,
      });
    });

    test('login page on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await waitForStable(page);

      await expect(page).toHaveScreenshot('login-page-mobile.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // The Today panel and reservation rows are date-relative — see
      // pinVisualClock for why unpinned dashboards rot as days pass
      await pinVisualClock(page);
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await waitForStable(page);
    });

    test('dashboard should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('dashboard.png', {
        maxDiffPixels: 200,
        mask: [
          page.locator('time'),
          page.locator('.timestamp'),
          page.locator('[data-testid="current-date"]'),
        ],
      });
    });

    test('dashboard on tablet should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await waitForStable(page);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        maxDiffPixels: 200,
      });
    });

    test('dashboard on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForStable(page);

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        maxDiffPixels: 200,
      });
    });
  });

  test.describe('Gear List', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Gear List');
      await waitForStable(page);
    });

    test('gear list should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('gear-list.png', {
        maxDiffPixels: 300,
      });
    });

    test('gear list grid view should match baseline', async ({ page }) => {
      await page.getByRole('button', { name: 'Grid view' }).click();
      await waitForStable(page);

      await expect(page).toHaveScreenshot('gear-list-grid.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });

    test('gear list with search should match baseline', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Sony');
      await waitForStable(page);

      await expect(page).toHaveScreenshot('gear-list-search.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });

    test('gear list on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      // Longer settle than desktop: the ≤640px media query re-renders the
      // list into compact rows after the resize event fires
      await waitForStable(page);

      // Higher tolerance than desktop: the compact-row stack lands with ±1px
      // vertical rounding between runs, which alone is ~1000 differing pixels
      // of text. Real regressions (layout, color, missing rows) are far above
      // this threshold.
      await expect(page).toHaveScreenshot('gear-list-mobile.png', {
        maxDiffPixels: 2500,
      });
    });

    test('item detail should match baseline', async ({ page }) => {
      // Seeded lens LE1001 — stable fields, no drifting relative dates in
      // the top viewport (the depreciation age sits below the fold)
      await page.getByText('LE1001').first().click();
      await expect(
        page.locator('h2').filter({ hasText: 'Sony 24-70mm f/2.8 GM II' }),
      ).toBeVisible();
      // Detail hydration (notes/reservations/history) must settle first
      await waitForStable(page);

      await expect(page).toHaveScreenshot('item-detail.png', {
        maxDiffPixels: 300,
      });
    });

    test('item detail on mobile should match baseline', async ({ page }) => {
      await page.getByText('LE1001').first().click();
      await expect(
        page.locator('h2').filter({ hasText: 'Sony 24-70mm f/2.8 GM II' }),
      ).toBeVisible();
      await waitForStable(page);
      // Below the 900px breakpoint the sections must render as one column
      // in the configured order (the two-column stack used to scramble it)
      await page.setViewportSize({ width: 375, height: 667 });
      await waitForStable(page);

      // Same ±1px vertical rounding tolerance as gear-list-mobile
      await expect(page).toHaveScreenshot('item-detail-mobile.png', {
        maxDiffPixels: 2500,
      });
    });
  });

  test.describe('Schedule View', () => {
    test.beforeEach(async ({ page }) => {
      // Pin the clock so the calendar's current-week grid (and the seeded
      // reservations' column positions) are deterministic — otherwise the
      // baseline drifts every day as real "today" advances. setFixedTime only
      // fixes Date.now(); timers still run (so the app loads normally) and the
      // stored session stays valid (fixed time precedes its expiry). Aug 16
      // 2026 is a Sunday, so the week grid starts cleanly on the seeded
      // reservations' week.
      await page.clock.setFixedTime(new Date('2026-08-16T12:00:00'));
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Schedule');
      await waitForStable(page);
    });

    test('schedule view should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('schedule.png', {
        maxDiffPixels: 400,
        mask: [
          sidebar(page),
          page.locator('time'),
          page.locator('.date'),
          page.locator('[data-date]'),
        ],
      });
    });
  });

  test.describe('Clients View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Clients');
      await waitForStable(page);
    });

    test('clients view should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('clients.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Search View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Search');
      await waitForStable(page);
    });

    test('search prompt state should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('search-view-prompt.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });

    test('search results should match baseline', async ({ page }) => {
      // Deterministic single gear result from the seeded rows — no dates in
      // frame, so the CURRENT_DATE-relative seed reservations can't drift it
      const searchInput = page.getByPlaceholder(/Search gear, clients/);
      await searchInput.fill('sony a7s');
      await expect(page.getByText('Sony A7S III')).toBeVisible({ timeout: 10000 });
      await waitForStable(page);

      await expect(page).toHaveScreenshot('search-view-results.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Admin Panel', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Admin Panel');
      await waitForStable(page);
    });

    test('admin panel should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('admin-panel.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Labels', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Labels');
      await expect(page.locator('h2:has-text("Labels")')).toBeVisible();
      await waitForStable(page);
    });

    test('labels view should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('labels-view.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });

    test('labels view with a selected preview should match baseline', async ({ page }) => {
      // Pins the pane-fill fix (no dead zone under the item list) and the
      // preview scaling (wide formats fit the panel instead of clipping)
      await page.getByText('With Branding - Text', { exact: true }).click();
      await page.getByPlaceholder('Search items...').fill('LE1002');
      await page.locator('label', { hasText: 'LE1002' }).first().getByRole('checkbox').check();
      await expect(page.locator('img[src^="data:image/png"]').first()).toBeVisible({
        timeout: 10000,
      });
      await waitForStable(page);

      await expect(page).toHaveScreenshot('labels-view-preview.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Packages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Packages');
      await expect(page.locator('h2:has-text("Packages")')).toBeVisible();
      // Packages load lazily — a CI capture once caught the empty state with
      // the progress bar still showing. Wait for the seeded cards.
      await expect(page.getByText('Corporate Video Kit')).toBeVisible({ timeout: 10000 });
      await waitForStable(page);
    });

    test('packages list should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('packages-list.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });

    test('package detail should match baseline', async ({ page }) => {
      await page.getByText('Corporate Video Kit').first().click();
      await expect(page.locator('h2:has-text("Corporate Video Kit")')).toBeVisible();
      // Notes hydrate lazily — wait for the section to settle before capture
      await expect(page.getByText('No notes yet')).toBeVisible();
      await waitForStable(page);

      await expect(page).toHaveScreenshot('package-detail.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Pack Lists', () => {
    test('pack lists overview should match baseline', async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Pack Lists');
      await expect(page.locator('h2:has-text("Pack Lists")')).toBeVisible();
      // The lazy load must settle — the seeded test DB has no pack lists, so
      // the stable state is the empty state, never the loading indicator
      await expect(page.locator('text=Loading pack lists...')).toHaveCount(0);
      await expect(page.locator('text=No pack lists yet')).toBeVisible();
      await waitForStable(page);

      await expect(page).toHaveScreenshot('pack-lists-overview.png', {
        mask: [sidebar(page)],
        maxDiffPixels: 300,
      });
    });
  });
});
