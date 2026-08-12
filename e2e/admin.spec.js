// =============================================================================
// E2E Tests - Admin Panel
// Regression guards for the admin hardening round:
// - category rename keeps focus across keystrokes (per-keystroke remount
//   used to drop focus after one character) — tested WITHOUT saving
// - unsaved category edits prompt before discarding
// - role lifecycle: create → assign the standard user → delete reassigns
//   them back (the old delete-first order was rejected by the users FK)
// - users panel: inline role select, self-protection
// Seed categories/locations/users are never saved-over; the only mutations
// are a private "ZZZ E2E" role and the standard user's role_id, which the
// delete flow itself restores (afterEach is a safety net).
// =============================================================================

import { test, expect } from './fixtures.js';
import { E2E_PREFIX, adminDb } from './db.js';

async function openAdmin(page, pages) {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Admin Panel');
  await expect(page.locator('h2:has-text("Admin Panel")')).toBeVisible({ timeout: 10000 });
}

test.describe('Categories editor', () => {
  test('rename keeps focus across keystrokes and Back asks before discarding', async ({
    page,
    pages,
  }) => {
    await openAdmin(page, pages);
    await page.getByText('Edit Categories', { exact: true }).click();
    await expect(page.locator('h2:has-text("Edit Categories")')).toBeVisible();

    const firstInput = page.locator('input[aria-label^="Category name"]').first();
    const original = await firstInput.inputValue();
    await firstInput.click();
    await firstInput.press('End');
    // One character per keystroke — the old name-as-key rows remounted per
    // keystroke, so only the first character ever landed
    await page.keyboard.type('XYZ', { delay: 80 });
    await expect(firstInput).toHaveValue(`${original}XYZ`);

    // Leave WITHOUT saving — must prompt, and Cancel keeps us on the page
    await page.getByText('Back to Admin').click();
    await expect(page.getByText('Discard Changes?')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('h2:has-text("Edit Categories")')).toBeVisible();

    // Discard for real → back on the hub, nothing saved
    await page.getByText('Back to Admin').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
    await expect(page.locator('h2:has-text("Admin Panel")')).toBeVisible();
  });
});

test.describe('Roles lifecycle', () => {
  const roleName = `${E2E_PREFIX} Producer`;

  test.afterEach(async () => {
    // Safety net: restore the standard user's role and drop the E2E role
    const db = await adminDb();
    const { data: e2eRoles } = await db.from('roles').select('id').ilike('name', `${E2E_PREFIX}%`);
    const ids = (e2eRoles || []).map((r) => r.id);
    if (ids.length > 0) {
      await db.from('users').update({ role_id: 'role_user' }).in('role_id', ids);
      await db.from('roles').delete().in('id', ids);
    }
  });

  test('create, assign the standard user, delete reassigns them back', async ({ page, pages }) => {
    await openAdmin(page, pages);
    await page.getByText('Roles & Permissions', { exact: true }).first().click();
    await expect(page.locator('h2:has-text("Roles & Permissions")')).toBeVisible();

    // The page now has a back path (it used to be a dead end) — verify but stay
    await expect(page.getByText('Back to Admin')).toBeVisible();

    // ---- Create ----
    await page.getByRole('button', { name: 'Create Role' }).click();
    await page.getByPlaceholder('e.g., Equipment Manager').fill(roleName);
    await page.getByRole('button', { name: 'Create Role' }).click();
    await expect(page.getByText(roleName)).toBeVisible();

    const db = await adminDb();
    await expect
      .poll(async () => {
        const { data } = await db.from('roles').select('id').eq('name', roleName);
        return data?.length || 0;
      })
      .toBe(1);

    // ---- Assign the standard user ----
    const roleCard = page.locator('.card', { hasText: roleName }).first();
    await roleCard.getByRole('button', { name: 'Assign' }).click();
    const modal = page.locator('[role="dialog"]');
    await modal.locator('label', { hasText: process.env.E2E_USER_EMAIL }).locator('input').check();
    await modal.getByRole('button', { name: 'Save Assignments' }).click();

    await expect
      .poll(async () => {
        const { data } = await db
          .from('users')
          .select('role_id')
          .eq('email', process.env.E2E_USER_EMAIL)
          .single();
        return data?.role_id;
      })
      .not.toBe('role_user');

    // ---- Delete: must reassign the user, then remove the role ----
    await roleCard.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(roleName)).toHaveCount(0);
    await expect
      .poll(async () => {
        const { data } = await db
          .from('users')
          .select('role_id')
          .eq('email', process.env.E2E_USER_EMAIL)
          .single();
        return data?.role_id;
      })
      .toBe('role_user');
    await expect
      .poll(async () => {
        const { data } = await db.from('roles').select('id').eq('name', roleName);
        return data?.length || 0;
      })
      .toBe(0);
  });
});

test.describe('Users panel', () => {
  test('roles are editable in place and the current user is protected', async ({ page, pages }) => {
    await openAdmin(page, pages);
    await page.getByText('Manage Users', { exact: true }).click();
    await expect(page.locator('h2:has-text("Manage Users")')).toBeVisible();

    // Every user row has an inline role selector; the admin's own row is
    // locked against self-demotion and self-deletion
    await expect(page.getByText('(you)')).toBeVisible();
    const selfRole = page.getByLabel(/Role for Admin/);
    await expect(selfRole).toBeDisabled();
    const otherRole = page.getByLabel(/Role for user/);
    await expect(otherRole).toBeEnabled();
  });
});
