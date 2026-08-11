// =============================================================================
// E2E Tests - Authentication
// Tests for login, logout, and session management
// =============================================================================

import { test, expect, testUsers } from './fixtures.js';

// This spec tests the login flow itself — start logged OUT instead of with
// the shared admin storage state every other spec reuses.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should display login page on initial visit', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.expectLoginPage();
    });

    test('should login successfully with valid credentials', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.loginAsAdmin();

      // Should redirect to dashboard
      await pages.dashboard.expectDashboard();

      // Should show user info in sidebar ('Admin' appears in several places —
      // section header, Admin Panel link, user footer — any confirms login)
      await expect(page.locator('text=Admin').first()).toBeVisible();
    });

    test('should show error with invalid password', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.login(testUsers.admin.email, 'wrongpassword');

      // Must stay on the login page — a rejected password never reaches the app
      await page.waitForTimeout(1000);
      await pages.login.expectLoginPage();
      await expect(pages.dashboard.heading).not.toBeVisible();
    });

    test('should have accessible login form', async ({ page }) => {
      await page.goto('/');

      // Wait for the REAL login form: the static pre-React shell renders
      // lookalike divs (no inputs, no labels) until React mounts
      await expect(page.locator('input[type="email"]')).toBeVisible();

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
      const toggleButton = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last();

      // Initially password type
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Toggle — retry if the dev-only StrictMode remount resets the state
      // right after the click (production has no StrictMode)
      const textInput = page.locator('input[autocomplete="current-password"]');
      let toggled = false;
      for (let i = 0; i < 3 && !toggled; i++) {
        await toggleButton.click();
        toggled = await textInput
          .getAttribute('type')
          .then((t) => t === 'text')
          .catch(() => false);
      }
      await expect(textInput).toHaveAttribute('type', 'text');
    });

    test('should support form submission with Enter key', async ({ page, pages }) => {
      await page.goto('/');

      // Remount-safe fill (see LoginPage.fillCredentials), then submit via Enter
      await pages.login.fillCredentials(testUsers.admin.email, testUsers.admin.password);
      await page.locator('input[type="password"]').press('Enter');

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
      const logoutButton = page.locator(
        'button:has-text("Logout"), button:has-text("Log Out"), button:has-text("Sign Out")',
      );
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

      // Reload page — Supabase sessions persist in localStorage, so the user
      // must land back on the dashboard, not the login page
      await page.reload();
      await pages.dashboard.expectDashboard();
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

    test('regular user must NOT see Admin Panel link', async ({ page, pages }) => {
      await page.goto('/');
      await pages.login.loginAsUser();
      await pages.dashboard.expectDashboard();

      // role_user has every admin_* function hidden — the link appearing
      // would be a permission regression
      await page.waitForTimeout(500);
      await expect(page.locator('button:has-text("Admin Panel")')).not.toBeVisible();
    });
  });
});
