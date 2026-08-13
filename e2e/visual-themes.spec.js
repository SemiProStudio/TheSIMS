// =============================================================================
// Visual Regression Tests - Themes
// Screenshot comparison tests for different theme variations
// =============================================================================

import { test, expect } from './visual-utils.js';
import { DashboardPage, GearListPage } from './fixtures.js';

test.describe('Visual Regression - Themes', () => {
  test.describe('Theme Variations', () => {
    // Real theme ids from themes-data.js. The previous list (ocean/forest/
    // sunset/neon) named themes that DON'T EXIST — every one of those
    // baselines was just a screenshot of the fallback theme.
    const themesToTest = ['dark', 'light', 'darker', 'terminal', 'pastel', 'vibrant'];

    for (const theme of themesToTest) {
      test(`${theme} theme dashboard should match baseline`, async ({ page }) => {
        await page.goto('/');

        const dashboard = new DashboardPage(page);
        await dashboard.expectDashboard();

        // Set theme via localStorage and reload
        await page.evaluate((themeName) => {
          localStorage.setItem('sims-theme', themeName);
          // Device override: the profile theme is applied at login and would
          // repaint over the test's choice without this
          localStorage.setItem('sims-theme-override', themeName);
        }, theme);

        await page.reload();
        await page.waitForTimeout(1000);
        // Let the theme-change toast dismiss before capturing (it skews diffs)
        await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

        // Take screenshot
        await expect(page).toHaveScreenshot(`theme-${theme}-dashboard.png`, {
          maxDiffPixels: 300,
          mask: [page.locator('time'), page.locator('.timestamp')],
        });
      });
    }
  });

  test.describe('Dark Theme', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
        localStorage.setItem('sims-theme-override', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    });

    test('dark theme gear list should match baseline', async ({ page }) => {
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('theme-dark-gear-list.png', {
        maxDiffPixels: 300,
      });
    });

    test('dark theme modal should match baseline', async ({ page }) => {
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      const gearList = new GearListPage(page);
      await gearList.expectGearList();

      // Check-out modal on a fixed seeded item (read-only — never submitted)
      await gearList.openItem('CA1007', 'Panasonic GH6');
      await page.getByRole('button', { name: 'Check Out', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await page.waitForTimeout(300);

      await expect(modal).toHaveScreenshot('theme-dark-modal.png', {
        maxDiffPixels: 200,
      });
    });
  });

  test.describe('Light Theme', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
        localStorage.setItem('sims-theme-override', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    });

    test('light theme gear list should match baseline', async ({ page }) => {
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('theme-light-gear-list.png', {
        maxDiffPixels: 300,
      });
    });

    test('light theme modal should match baseline', async ({ page }) => {
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      const gearList = new GearListPage(page);
      await gearList.expectGearList();

      await gearList.openItem('CA1007', 'Panasonic GH6');
      await page.getByRole('button', { name: 'Check Out', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await page.waitForTimeout(300);

      await expect(modal).toHaveScreenshot('theme-light-modal.png', {
        maxDiffPixels: 200,
      });
    });
  });

  test.describe('Theme Selector', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');

      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await page.waitForTimeout(500);
    });

    test('theme selector page should match baseline', async ({ page }) => {
      // The Theme Selector lives behind the sidebar user menu
      await page.locator('.sidebar-user-section button').first().click();
      await page.locator('.sidebar-user-menu button', { hasText: 'Theme' }).click();
      await expect(page.locator('h2:has-text("Theme Selector")')).toBeVisible();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('theme-selector.png', {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Focus Ring Styling', () => {
    test('focus ring should be visible in dark theme', async ({ page }) => {
      await page.goto('/');

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
        localStorage.setItem('sims-theme-override', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

      // Tab to a button
      const button = page.locator('button:has-text("Gear List")');
      await button.focus();
      await page.waitForTimeout(200);

      await expect(button).toHaveScreenshot('focus-ring-dark.png', {
        maxDiffPixels: 50,
      });
    });

    test('focus ring should be visible in light theme', async ({ page }) => {
      await page.goto('/');

      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
        localStorage.setItem('sims-theme-override', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

      // Tab to a button
      const button = page.locator('button:has-text("Gear List")');
      await button.focus();
      await page.waitForTimeout(200);

      await expect(button).toHaveScreenshot('focus-ring-light.png', {
        maxDiffPixels: 50,
      });
    });
  });

  test.describe('High Contrast Themes', () => {
    test('black & white theme should match baseline', async ({ page }) => {
      await page.goto('/');

      // 'blackwhite' is the real high-contrast theme (the old 'neon' id
      // never existed and silently rendered the fallback theme)
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'blackwhite');
        localStorage.setItem('sims-theme-override', 'blackwhite');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

      await expect(page).toHaveScreenshot('theme-blackwhite-contrast.png', {
        maxDiffPixels: 300,
      });
    });
  });
});

test.describe('Visual Regression - Responsive Themes', () => {
  const viewports = [
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
  ];

  for (const viewport of viewports) {
    test(`dark theme on ${viewport.name} should match baseline`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto('/');

      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
        localStorage.setItem('sims-theme-override', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

      await expect(page).toHaveScreenshot(`theme-dark-${viewport.name}.png`, {
        maxDiffPixels: 300,
      });
    });

    test(`light theme on ${viewport.name} should match baseline`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto('/');

      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
        localStorage.setItem('sims-theme-override', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      // Let the theme-change toast dismiss before capturing (it skews diffs)
      await page.getByRole("status").first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

      await expect(page).toHaveScreenshot(`theme-light-${viewport.name}.png`, {
        maxDiffPixels: 300,
      });
    });
  }
});
