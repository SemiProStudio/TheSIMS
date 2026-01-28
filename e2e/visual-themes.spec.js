// =============================================================================
// Visual Regression Tests - Themes
// Screenshot comparison tests for different theme variations
// =============================================================================

import { test, expect, setTheme, availableThemes } from './visual-utils.js';
import { LoginPage, DashboardPage } from './fixtures.js';

test.describe('Visual Regression - Themes', () => {
  test.describe('Theme Variations', () => {
    // Test each major theme
    const themesToTest = ['dark', 'light', 'ocean', 'forest', 'sunset', 'neon'];
    
    for (const theme of themesToTest) {
      test(`${theme} theme dashboard should match baseline`, async ({ page }) => {
        // Login first
        const loginPage = new LoginPage(page);
        await page.goto('/');
        await loginPage.loginAsAdmin();
        
        const dashboard = new DashboardPage(page);
        await dashboard.expectDashboard();
        
        // Set theme via localStorage and reload
        await page.evaluate((themeName) => {
          localStorage.setItem('sims-theme', themeName);
        }, theme);
        
        await page.reload();
        await page.waitForTimeout(1000);
        
        // Take screenshot
        await expect(page).toHaveScreenshot(`theme-${theme}-dashboard.png`, {
          maxDiffPixels: 300,
          mask: [
            page.locator('time'),
            page.locator('.timestamp'),
          ],
        });
      });
    }
  });

  test.describe('Dark Theme', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
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
      await page.waitForTimeout(1000);
      
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          await expect(modal).toHaveScreenshot('theme-dark-modal.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });
  });

  test.describe('Light Theme', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
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
      await page.waitForTimeout(1000);
      
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          await expect(modal).toHaveScreenshot('theme-light-modal.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });
  });

  test.describe('Theme Selector', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      const dashboard = new DashboardPage(page);
      await dashboard.expectDashboard();
      await page.waitForTimeout(500);
    });

    test('theme selector page should match baseline', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page.locator('button').filter({ hasText: /Admin|User|Profile/ }).first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }
      
      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('theme-selector.png', {
          maxDiffPixels: 300,
        });
      }
    });

    test('theme card grid should match baseline', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page.locator('button').filter({ hasText: /Admin|User|Profile/ }).first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }
      
      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);
        
        // Capture theme cards
        const themeGrid = page.locator('[data-testid="theme-grid"], .theme-grid').first();
        if (await themeGrid.isVisible()) {
          await expect(themeGrid).toHaveScreenshot('theme-cards.png', {
            maxDiffPixels: 300,
          });
        }
      }
    });
  });

  test.describe('Focus Ring Styling', () => {
    test('focus ring should be visible in dark theme', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Tab to a button
      const button = page.locator('button:has-text("Gear List")');
      await button.focus();
      await page.waitForTimeout(200);
      
      await expect(button).toHaveScreenshot('focus-ring-dark.png', {
        maxDiffPixels: 50,
      });
    });

    test('focus ring should be visible in light theme', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      
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
    test('neon theme should have high contrast', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set neon theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'neon');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('theme-neon-contrast.png', {
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
      
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set dark theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'dark');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`theme-dark-${viewport.name}.png`, {
        maxDiffPixels: 300,
      });
    });

    test(`light theme on ${viewport.name} should match baseline`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      const loginPage = new LoginPage(page);
      await page.goto('/');
      await loginPage.loginAsAdmin();
      
      // Set light theme
      await page.evaluate(() => {
        localStorage.setItem('sims-theme', 'light');
      });
      await page.reload();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`theme-light-${viewport.name}.png`, {
        maxDiffPixels: 300,
      });
    });
  }
});
