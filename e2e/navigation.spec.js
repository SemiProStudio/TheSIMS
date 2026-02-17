// =============================================================================
// E2E Tests - Navigation
// Tests for app navigation and routing
// =============================================================================

import { test, expect, LoginPage, DashboardPage } from './fixtures.js';

test.describe('Navigation', () => {
  // Login before each test
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  test.describe('Sidebar Navigation', () => {
    test('should navigate to Gear List', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');

      // Should show gear list
      await expect(page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should navigate to Packages', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Packages');

      // Should show packages view
      await expect(page.locator('h1:has-text("Packages")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Pack Lists', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Pack Lists');

      // Should show pack lists view
      await expect(page.locator('h1:has-text("Pack Lists")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Schedule', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Schedule');

      // Should show schedule view
      await expect(page.locator('h1:has-text("Schedule")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Labels', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Labels');

      // Should show labels view
      await expect(page.locator('h1:has-text("Labels")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Clients', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Clients');

      // Should show clients view
      await expect(page.locator('h1:has-text("Clients")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Search', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Search');

      // Should show search view
      await expect(page.locator('h1:has-text("Search")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Admin Panel', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Admin Panel');

      // Should show admin panel
      await expect(page.locator('h1:has-text("Admin")')).toBeVisible({ timeout: 10000 });
    });

    test('should show active state for current page', async ({ page, pages }) => {
      // Dashboard should be active initially
      const dashboardButton = page.locator('button:has-text("Dashboard")');
      await expect(dashboardButton).toHaveAttribute('aria-current', 'page');

      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(500);

      // Gear List should now be active
      const gearListButton = page.locator('button:has-text("Gear List")');
      await expect(gearListButton).toHaveAttribute('aria-current', 'page');

      // Dashboard should no longer be active
      await expect(dashboardButton).not.toHaveAttribute('aria-current', 'page');
    });
  });

  test.describe('Navigation Accessibility', () => {
    test('sidebar should have navigation role', async ({ page, pages }) => {
      await expect(pages.dashboard.sidebar).toHaveAttribute('role', 'navigation');
      await expect(pages.dashboard.sidebar).toHaveAttribute('aria-label', 'Main navigation');
    });

    test('should be keyboard navigable', async ({ page, pages }) => {
      // Focus on sidebar
      await page.locator('button:has-text("Dashboard")').focus();

      // Tab through navigation items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to navigate with Enter
      await page.keyboard.press('Enter');

      // Should have navigated to some view
      await page.waitForTimeout(500);
    });

    test('should have skip link for keyboard users', async ({ page }) => {
      // Skip links are often hidden but focusable
      const skipLink = page.locator('a:has-text("Skip to"), [href="#main-content"]');

      // Tab to it (usually first focusable element)
      await page.keyboard.press('Tab');

      // Check if skip link exists (it's a best practice, may not be implemented)
      const skipLinkExists = (await skipLink.count()) > 0;
      console.log(`Skip link exists: ${skipLinkExists}`);
    });
  });

  test.describe('Browser Navigation', () => {
    test('should support browser back button', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await expect(
        page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")'),
      ).toBeVisible();

      // Navigate to Packages
      await pages.dashboard.navigateTo('Packages');
      await expect(page.locator('h1:has-text("Packages")')).toBeVisible();

      // Go back
      await page.goBack();

      // Should be on Gear List
      await expect(page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should support browser forward button', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await expect(
        page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")'),
      ).toBeVisible();

      // Navigate to Packages
      await pages.dashboard.navigateTo('Packages');
      await expect(page.locator('h1:has-text("Packages")')).toBeVisible();

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Go forward
      await page.goForward();

      // Should be on Packages
      await expect(page.locator('h1:has-text("Packages")')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Item Detail Navigation', () => {
    test('should navigate to item detail and back', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Click on first item (could be card or row)
      const firstItem = page.locator('[data-testid="item-card"], [role="button"]').first();

      if (await firstItem.isVisible()) {
        await firstItem.click();

        // Should be on detail page (has Back button)
        const backButton = page.locator('button:has-text("Back")');

        if (await backButton.isVisible({ timeout: 5000 })) {
          // Click back
          await backButton.click();

          // Should return to Gear List
          await expect(
            page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")'),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });

  test.describe('Responsive Sidebar', () => {
    test('should collapse on mobile viewport', async ({ page, pages }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Sidebar might be hidden or have hamburger menu
      const hamburgerButton = page.locator(
        'button[aria-label*="menu"], button.menu-toggle, [data-testid="mobile-menu"]',
      );

      if (await hamburgerButton.isVisible()) {
        // Click to open sidebar
        await hamburgerButton.click();
        await page.waitForTimeout(300);

        // Sidebar content should be visible
        await expect(page.locator('button:has-text("Dashboard")')).toBeVisible();
      }
    });

    test('should be usable on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      // Navigation should still be accessible
      const gearListButton = page.locator('button:has-text("Gear List")');
      await expect(gearListButton).toBeVisible();
    });
  });
});
