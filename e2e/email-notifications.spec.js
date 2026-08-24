// =============================================================================
// E2E Tests - Email Notifications (visibility + recipient resolution)
// The TEST project deliberately has no RESEND_API_KEY, so these tests prove
// the honest-failure path end to end: the operator sees WHY an email did not
// go out, the admin Email Log records it, and checkout stores the BORROWER
// (never the operator) as the reminder recipient.
// =============================================================================

import { test, expect } from './fixtures.js';
import { adminDb, createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

async function openCheckOutModal(page, pages, id, name) {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Gear List');
  await pages.gearList.expectGearList();
  await pages.gearList.openItem(id, name, 'available');
  await pages.itemDetail.expectItemDetail();
  await page.getByRole('button', { name: 'Check Out', exact: true }).click();
  const modal = page.locator('[role="dialog"]');
  await expect(modal.getByText('Check Out Item')).toBeVisible();
  return modal;
}

test.describe('Email Notifications', () => {
  test('settings: "Send me a test email" reports the real outcome', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.openUserMenuItem('Notification Settings');
    await expect(page.locator('h2:has-text("Notification Settings")')).toBeVisible();

    await page.getByRole('button', { name: 'Send me a test email' }).click();
    // No Resend key on the test project → an honest, specific failure
    await expect(
      page.getByRole('status').filter({ hasText: 'Not sent: Email service not configured' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('admin Email Log lists the attempt with its failure reason', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Admin Panel');
    await page.getByText('Email Log', { exact: true }).click();
    await expect(page.locator('h2:has-text("Email Log")')).toBeVisible();

    const row = page.locator('tr', { hasText: 'Test email' }).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row).toContainText('Failed');
    await expect(row).toContainText('RESEND_API_KEY not configured');
  });

  test('checkout to an address not on record warns the operator and stores no borrower user', async ({
    page,
    pages,
  }) => {
    const name = `${E2E_PREFIX} EmailWarn ${Date.now()}`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);
      await modal.locator('input[placeholder="Who is taking this item?"]').fill('Walk-in Renter');
      await modal.locator('input[placeholder="email@example.com"]').fill('walkin@example.com');
      await modal.getByRole('button', { name: '1 week', exact: true }).click();
      await modal.locator('input[type="checkbox"]').check();
      await modal.getByRole('button', { name: 'Confirm Check Out' }).click();
      await expect(modal).toBeHidden();

      // The checkout succeeded AND the operator learns the email did not
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'Checkout confirmation email could not be sent' }),
      ).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page
          .getByRole('alert')
          .filter({ hasText: 'Recipient must be a registered user or client' }),
      ).toBeVisible();

      // Borrower is not a SIMS user → no user id (the old code stored the operator's)
      const db = await adminDb();
      const { data } = await db
        .from('inventory')
        .select('checked_out_to_user_id, checked_out_to_name')
        .eq('id', id)
        .single();
      expect(data.checked_out_to_name).toBe('Walk-in Renter');
      expect(data.checked_out_to_user_id).toBeNull();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('checkout to yourself resolves the borrower to your own user', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} EmailSelf ${Date.now()}`;
    const id = await createTestItem({ name });
    try {
      const modal = await openCheckOutModal(page, pages, id, name);
      // The form defaults borrower name + email to the signed-in user
      await expect(modal.locator('input[placeholder="email@example.com"]')).not.toHaveValue('');
      await modal.getByRole('button', { name: '1 week', exact: true }).click();
      await modal.locator('input[type="checkbox"]').check();
      await modal.getByRole('button', { name: 'Confirm Check Out' }).click();
      await expect(modal).toBeHidden();

      // Toast first — it auto-dismisses, so it must be asserted before the DB
      // round-trips. A registered recipient passes the allow-list; the only
      // failure left is the (deliberately) unconfigured Resend key on TEST
      await expect(
        page.getByRole('alert').filter({ hasText: 'Email service not configured' }),
      ).toBeVisible({
        timeout: 15000,
      });

      // The confirmation email goes out alongside the inventory write, so the
      // toast can beat the commit — poll the row rather than read it once
      const db = await adminDb();
      // The signed-in session already carries the user id. getUser() is
      // validated against the auth server and fails once another spec's
      // logout (global scope) revokes this helper's session mid-run.
      const { data: sessionData } = await db.auth.getSession();
      const me = { user: sessionData.session.user };
      await expect
        .poll(
          async () => {
            const { data } = await db
              .from('inventory')
              .select('checked_out_to_user_id')
              .eq('id', id)
              .maybeSingle();
            return data?.checked_out_to_user_id ?? null;
          },
          { timeout: 15000 },
        )
        .toBe(me.user.id);
    } finally {
      await deleteTestItem(id);
    }
  });
});
