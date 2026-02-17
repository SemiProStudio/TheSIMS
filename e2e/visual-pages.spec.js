// =============================================================================
// Visual Regression Tests - Pages
// Screenshot comparison tests for main application pages
// =============================================================================

import { test, expect, compareSnapshot, setTheme, availableThemes } from './visual-utils.js';
import { LoginPage, DashboardPage } from './fixtures.js';

test.describe('Visual Regression - Pages', () => {
  test.describe('Login Page', () => {
    test('login page should match baseline', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('login-page.png', {
        maxDiffPixels: 100,
      });
    });

    test('login page with error should match baseline', async ({ page }) => {
      await page.goto('/');

      // Trigger an error by submitting invalid credentials
      await page.locator('input[type="email"]').fill('test@test.com');
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();

      await page.waitForTimeout(1000);

      // Only capture if there's an error visible
      const hasError = await page
        .locator('text=/invalid|error|incorrect/i')
        .isVisible()
        .catch(() => false);
      if (hasError) {
        await expect(page).toHaveScreenshot('login-page-error.png', {
          maxDiffPixels: 100,
        });
      }
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
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();

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
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();

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
      // Click grid view if available
      const gridButton = page.locator('button[aria-label*="grid"]');
      if (await gridButton.isVisible()) {
        await gridButton.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot('gear-list-grid.png', {
        maxDiffPixels: 300,
      });
    });

    test('gear list with search should match baseline', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('Camera');
        await page.waitForTimeout(500);
      }

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
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();

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
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();

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
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();

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
