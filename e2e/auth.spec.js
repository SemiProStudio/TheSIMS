// =============================================================================
// E2E Tests - Authentication
// Tests for login, logout, and session management
// =============================================================================

import { test, expect, testUsers } from './fixtures.js';
import { adminDb, createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

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

      // Inputs are disabled while the initial session check runs — wait
      // for them to become interactive before testing focusability
      await expect(page.locator('input[type="email"]')).toBeEnabled();
      await expect(page.locator('input[type="password"]')).toBeEnabled();

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

      // The sidebar user menu carries the Sign Out action
      await page.locator('.sidebar-user-section button').first().click();
      await page.locator('.sidebar-user-menu button', { hasText: 'Sign Out' }).click();

      // Must land back on the login page
      await pages.login.expectLoginPage();
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

// =============================================================================
// Writes after a token refresh
// auth-js runs onAuthStateChange subscribers inside its auth lock when the
// access token refreshes. A Supabase call awaited inside that callback
// deadlocked the client: every session loaded fine, then every save hung
// forever after the hourly refresh (prod 2026-08-22). This forces the
// refresh with a fake clock and then performs a real write.
// =============================================================================
test.describe('Session refresh', () => {
  test('a write still lands after the access token refreshes', async ({ page, pages }) => {
    test.setTimeout(90000);
    const name = `${E2E_PREFIX} AfterRefresh ${Date.now()}`;
    const id = await createTestItem({
      name,
      columns: {
        category_name: 'Audio',
        quantity: 1,
        serial_number: null,
        specs: { 'Audio Type': 'E2E' },
      },
    });
    try {
      // Fake timers must be installed before the app's scripts run so the
      // client's auto-refresh interval is driven by the fake clock
      await page.clock.install();
      await page.goto('/');
      await pages.login.loginAsAdmin();
      await pages.dashboard.expectDashboard();

      // Push past the 1h access-token lifetime; the client refreshes against
      // the real auth server and emits TOKEN_REFRESHED
      const refreshed = page.waitForResponse(
        (r) => r.url().includes('grant_type=refresh_token') && r.request().method() === 'POST',
        { timeout: 30000 },
      );
      await page.clock.fastForward('01:05:00');
      expect((await refreshed).status()).toBe(200);

      // Now a write: toggle the low-stock reminder on a private item
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      // The 65-minute jump fires every pending app timer at once; give the
      // list a real window to settle before the default 5 s row wait
      await pages.gearList.search(id);
      await expect(pages.gearList.itemRow(name, 'available')).toBeVisible({ timeout: 15000 });
      await pages.gearList.openItem(id, name);
      await pages.itemDetail.expectItemDetail();
      await page.getByRole('switch', { name: 'Low stock reminder' }).click();

      const db = await adminDb();
      await expect
        .poll(
          async () => {
            const { data } = await db
              .from('inventory')
              .select('low_stock_alert')
              .eq('id', id)
              .maybeSingle();
            return data?.low_stock_alert ?? null;
          },
          { timeout: 15000 },
        )
        .toBe(true);
    } finally {
      await deleteTestItem(id);
    }
  });
});
