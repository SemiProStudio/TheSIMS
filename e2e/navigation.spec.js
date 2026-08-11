// =============================================================================
// E2E Tests - Navigation
// Tests for app navigation and routing
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test.describe('Sidebar Navigation', () => {
    test('should navigate to Gear List', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');

      // Should show gear list
      await expect(page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should navigate to Packages', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Packages');

      // Should show packages view
      await expect(page.locator('h2:has-text("Packages")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Pack Lists', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Pack Lists');

      // Should show pack lists view
      await expect(page.locator('h2:has-text("Pack Lists")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Schedule', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Schedule');

      // Should show schedule view
      await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Labels', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Labels');

      // Should show labels view
      await expect(page.locator('h2:has-text("Labels")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Clients', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Clients');

      // Should show clients view
      await expect(page.locator('h2:has-text("Clients")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Search', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Search');

      // Should show search view
      await expect(page.locator('h2:has-text("Search")')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to Admin Panel', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Admin Panel');

      // Should show admin panel
      await expect(page.locator('h2:has-text("Admin")')).toBeVisible({ timeout: 10000 });
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
      // App.jsx renders a SkipLink targeting #main-content; it must exist
      // and be the first tab stop
      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);

      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
    });
  });

  test.describe('Browser Navigation', () => {
    test('should support browser back button', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await expect(
        page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")'),
      ).toBeVisible();

      // Navigate to Packages
      await pages.dashboard.navigateTo('Packages');
      await expect(page.locator('h2:has-text("Packages")')).toBeVisible();

      // Go back
      await page.goBack();

      // Should be on Gear List
      await expect(page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should support browser forward button', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await expect(
        page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")'),
      ).toBeVisible();

      // Navigate to Packages
      await pages.dashboard.navigateTo('Packages');
      await expect(page.locator('h2:has-text("Packages")')).toBeVisible();

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Go forward
      await page.goForward();

      // Should be on Packages
      await expect(page.locator('h2:has-text("Packages")')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Item Detail Navigation', () => {
    test('should navigate to item detail and back', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();

      // Open a seeded item deterministically
      await pages.gearList.openItem('CA1001', 'Sony A7S III');
      await pages.itemDetail.expectItemDetail();
      await expect(page.locator('h1').filter({ hasText: 'Sony A7S III' })).toBeVisible();

      await pages.itemDetail.goBack();
      await expect(
        page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")'),
      ).toBeVisible();
    });
  });

  test.describe('Responsive Sidebar', () => {
    test('should collapse on mobile viewport', async ({ page, pages }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // The mobile header shows a hamburger button (aria-label "Open menu")
      const hamburgerButton = page.getByRole('button', { name: 'Open menu' });
      await expect(hamburgerButton).toBeVisible();

      // Click to open sidebar
      await hamburgerButton.click();
      await page.waitForTimeout(300);

      // Sidebar content should be visible
      await expect(page.locator('button:has-text("Dashboard")').first()).toBeVisible();
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
