// =============================================================================
// Visual Regression Tests - Pages
// Screenshot comparison tests for main application pages
// =============================================================================

import { test, expect } from './visual-utils.js';
import { DashboardPage, LoginPage } from './fixtures.js';

test.describe('Visual Regression - Pages', () => {
  test.describe('Login Page', () => {
    // Screenshots of the login page need a logged-out session
    test.use({ storageState: { cookies: [], origins: [] } });

    test('login page should match baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

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
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('login-page-error.png', {
        maxDiffPixels: 100,
      });
    });

    test('login page on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-page-mobile.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await page.waitForTimeout(1000);
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
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        maxDiffPixels: 200,
      });
    });

    test('dashboard on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

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
      await page.waitForTimeout(1000);
    });

    test('gear list should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('gear-list.png', {
        maxDiffPixels: 300,
      });
    });

    test('gear list grid view should match baseline', async ({ page }) => {
      await page.getByRole('button', { name: 'Grid view' }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('gear-list-grid.png', {
        maxDiffPixels: 300,
      });
    });

    test('gear list with search should match baseline', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Sony');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('gear-list-search.png', {
        maxDiffPixels: 300,
      });
    });

    test('gear list on mobile should match baseline', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('gear-list-mobile.png', {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Schedule View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Schedule');
      await page.waitForTimeout(1000);
    });

    test('schedule view should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('schedule.png', {
        maxDiffPixels: 400,
        mask: [page.locator('time'), page.locator('.date'), page.locator('[data-date]')],
      });
    });
  });

  test.describe('Clients View', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await dashboard.navigateTo('Clients');
      await page.waitForTimeout(1000);
    });

    test('clients view should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('clients.png', {
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
      await page.waitForTimeout(1000);
    });

    test('admin panel should match baseline', async ({ page }) => {
      await expect(page).toHaveScreenshot('admin-panel.png', {
        maxDiffPixels: 300,
      });
    });
  });
});
