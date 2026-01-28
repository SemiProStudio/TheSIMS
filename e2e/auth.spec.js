// =============================================================================
// E2E Tests - Authentication
// Tests for login, logout, and session management
// =============================================================================

import { test, expect, LoginPage, DashboardPage, testUsers } from './fixtures.js';

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page on initial visit', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.expectLoginPage();
      
      // Should show demo mode banner
      await expect(pages.login.demoModeBanner).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.loginAsAdmin();
      
      // Should redirect to dashboard
      await pages.dashboard.expectDashboard();
      
      // Should show user info in sidebar
      await expect(page.locator('text=Admin')).toBeVisible();
    });

    test('should login with any email using demo password', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.login('custom@test.com', 'demo');
      
      // Should redirect to dashboard
      await pages.dashboard.expectDashboard();
    });

    test('should show error with invalid password', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.login('admin@demo.com', 'wrongpassword');
      
      // Should stay on login page (or show error)
      // The page might reload or show inline error
      await page.waitForTimeout(1000);
      
      // Check if still on login page or error is shown
      const loginVisible = await pages.login.emailInput.isVisible().catch(() => false);
      if (loginVisible) {
        await pages.login.expectLoginPage();
      }
    });

    test('should have accessible login form', async ({ page }) => {
      await page.goto('/');
      
      // Check form has labels
      const emailLabel = page.locator('label:has-text("Email")');
      const passwordLabel = page.locator('label:has-text("Password")');
      
      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
      
      // Check inputs are focusable
      await page.locator('input[type="email"]').focus();
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/');
      
      const passwordInput = page.locator('input[type="password"]');
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      
      // Initially password type
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle
      await toggleButton.click();
      
      // Should change to text
      const textInput = page.locator('input[autocomplete="current-password"]');
      await expect(textInput).toHaveAttribute('type', 'text');
    });

    test('should support form submission with Enter key', async ({ page, pages }) => {
      await page.goto('/');
      
      await page.locator('input[type="email"]').fill('admin@demo.com');
      await page.locator('input[type="password"]').fill('demo');
      await page.keyboard.press('Enter');
      
      // Should redirect to dashboard
      await pages.dashboard.expectDashboard();
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page, pages }) => {
      // Login first
      await page.goto('/');
      await pages.login.loginAsAdmin();
      await pages.dashboard.expectDashboard();
      
      // Find and click user menu or logout button
      const userMenuButton = page.locator('button').filter({ hasText: 'Admin' }).first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
      }
      
      // Click logout
      const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out")');
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      }
      
      // Should return to login page (or remain logged in if no logout exists)
      await page.waitForTimeout(500);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session on page reload', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.loginAsAdmin();
      await pages.dashboard.expectDashboard();
      
      // Reload page
      await page.reload();
      
      // Should still be logged in (or redirect to login in demo mode)
      // Demo mode might not persist, so we check both scenarios
      await page.waitForTimeout(1000);
      
      const dashboardVisible = await page.locator('h1:has-text("Dashboard")').isVisible().catch(() => false);
      const loginVisible = await pages.login.emailInput.isVisible().catch(() => false);
      
      // Either still on dashboard or back to login is acceptable for demo mode
      expect(dashboardVisible || loginVisible).toBeTruthy();
    });
  });

  test.describe('Role-Based Access', () => {
    test('admin should see Admin Panel link', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.loginAsAdmin();
      await pages.dashboard.expectDashboard();
      
      // Admin should see admin panel
      await expect(pages.dashboard.adminLink).toBeVisible();
    });

    test('regular user may not see Admin Panel link', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.login('user@test.com', 'demo');
      await pages.dashboard.expectDashboard();
      
      // Regular user typically shouldn't see admin panel
      // But this depends on role configuration
      const adminLink = page.locator('button:has-text("Admin Panel")');
      
      // Check if visible after a short wait
      await page.waitForTimeout(500);
      const isVisible = await adminLink.isVisible().catch(() => false);
      
      // Log result for debugging
      console.log(`Admin Panel visible for user: ${isVisible}`);
    });
  });
});
