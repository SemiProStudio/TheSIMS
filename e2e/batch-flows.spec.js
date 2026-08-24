// =============================================================================
// E2E Tests - Batch checkout, bulk check-in, maintenance modal lifecycle
// These three flows shipped broken on 2026-08-18 (handlers returned by
// useCheckoutHandlers but never forwarded through App.jsx's viewHandlers/
// modalHandlers — every confirm threw "not a function") precisely because
// nothing end-to-end exercised them. Each test here pins the full wiring:
// UI → App.jsx handler object → hook → DB.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  createTestItem,
  checkOutTestItem,
  addTestReservation,
  deleteTestItem,
  adminDb,
  E2E_PREFIX,
} from './db.js';

// Uncaught page errors, minus Chrome's benign ResizeObserver-loop noise.
// The A3 regression surfaced exactly here: a TypeError thrown from the
// modal-close click handler that no assertion was listening for.
function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => {
    if (!String(err?.message || err).includes('ResizeObserver loop')) errors.push(err);
  });
  return errors;
}

async function openItemDetail(page, pages, id, name, status = 'available') {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Gear List');
  await pages.gearList.expectGearList();
  await pages.gearList.openItem(id, name, status);
  await pages.itemDetail.expectItemDetail();
}

test.describe('Batch checkout from a reservation', () => {
  test('Check Out Items checks out the reservation gear', async ({ page, pages }) => {
    const stamp = Date.now();
    const name = `${E2E_PREFIX} BatchOut ${stamp}`;
    const project = `${E2E_PREFIX} Load-out ${stamp}`;
    const id = await createTestItem({ name });
    const db = await adminDb();
    try {
      await addTestReservation(id, { startInDays: 0, endInDays: 2, project });

      // Schedule → the reservation's detail page
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Schedule');
      await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 15000 });
      await page.locator(`text=${project}`).first().click();
      await expect(page.locator(`h2:has-text("${project}")`)).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: 'Check Out Items' }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(name)).toBeVisible();

      await modal
        .locator('input[placeholder="Who is taking the gear"]')
        .fill(`${E2E_PREFIX} Loader`);
      // Due date is prefilled from the reservation end; acknowledge and go
      await modal.locator('input[type="checkbox"]').check();
      await modal.getByRole('button', { name: /^Check Out 1 Item/ }).click();

      await expect(modal).toBeHidden({ timeout: 10000 });
      await expect
        .poll(
          async () => {
            const { data } = await db.from('inventory').select('status').eq('id', id).single();
            return data?.status;
          },
          { timeout: 10000 },
        )
        .toBe('checked-out');
    } finally {
      await deleteTestItem(id);
    }
  });
});

test.describe('Bulk check-in from the gear list', () => {
  test('selected checked-out items return to available in one pass', async ({ page, pages }) => {
    const stamp = Date.now();
    const nameA = `${E2E_PREFIX} BulkIn ${stamp} A`;
    const nameB = `${E2E_PREFIX} BulkIn ${stamp} B`;
    const idA = await createTestItem({ name: nameA });
    const idB = await createTestItem({ name: nameB });
    const db = await adminDb();
    try {
      await checkOutTestItem(idA);
      await checkOutTestItem(idB);

      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.search(`BulkIn ${stamp}`);

      await page.getByRole('button', { name: 'Multiple Selection' }).click();
      await page.getByRole('checkbox', { name: `Select ${nameA}` }).click();
      await page.getByRole('checkbox', { name: `Select ${nameB}` }).click();
      await expect(page.getByText(/2 of \d+ selected/)).toBeVisible();

      await page.getByRole('button', { name: 'Check In', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(nameA)).toBeVisible();
      await expect(modal.getByText(nameB)).toBeVisible();

      await modal.getByRole('button', { name: 'Check In 2 Items' }).click();

      await expect(modal).toBeHidden({ timeout: 10000 });
      await expect
        .poll(
          async () => {
            const { data } = await db
              .from('inventory')
              .select('id, status')
              .in('id', [idA, idB]);
            return data?.map((r) => r.status).join(',');
          },
          { timeout: 10000 },
        )
        .toBe('available,available');
    } finally {
      await deleteTestItem(idA);
      await deleteTestItem(idB);
    }
  });
});

test.describe('Maintenance modal lifecycle', () => {
  test('opens from item detail and closes without a page error', async ({ page, pages }) => {
    // Closing MODALS.MAINTENANCE runs setMaintenancePrefill(null); when that
    // setter was missing from modalHandlers, every close threw a TypeError.
    const errors = collectPageErrors(page);

    const name = `${E2E_PREFIX} MaintClose ${Date.now()}`;
    const id = await createTestItem({ name });
    try {
      await openItemDetail(page, pages, id, name);

      await page.getByRole('button', { name: 'Add Record' }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Add Maintenance Record')).toBeVisible();

      await modal.getByRole('button', { name: 'Cancel' }).click();
      await expect(modal).toBeHidden();

      expect(errors).toEqual([]);
    } finally {
      await deleteTestItem(id);
    }
  });

  test('damage reported at check-in prefills the repair record', async ({ page, pages }) => {
    const errors = collectPageErrors(page);

    const stamp = Date.now();
    const name = `${E2E_PREFIX} DamageFlow ${stamp}`;
    const damageText = `${E2E_PREFIX} cracked filter thread ${stamp}`;
    const id = await createTestItem({ name });
    try {
      await checkOutTestItem(id);
      await openItemDetail(page, pages, id, name, 'checked-out');

      await page.getByRole('button', { name: 'Check In', exact: true }).click();
      const checkinModal = page.locator('[role="dialog"]');
      await expect(checkinModal).toBeVisible();

      await checkinModal.getByText('Report damage or issue').click();
      await checkinModal
        .locator('textarea[placeholder="Describe what\'s damaged and how it happened..."]')
        .fill(damageText);
      await checkinModal.getByRole('button', { name: 'Confirm Check In' }).click();

      // The damage→repair handoff opens a NEW maintenance record with the
      // just-typed description carried over (the prefill that was silently
      // dropped while maintenancePrefill wasn't wired through)
      const maintModal = page.locator('[role="dialog"]');
      await expect(maintModal.getByText('Add Maintenance Record')).toBeVisible({ timeout: 10000 });
      await expect(
        maintModal.locator('textarea[placeholder="Describe the maintenance work..."]'),
      ).toHaveValue(damageText);

      await maintModal.getByRole('button', { name: 'Cancel' }).click();
      await expect(maintModal).toBeHidden();

      expect(errors).toEqual([]);
    } finally {
      await deleteTestItem(id);
    }
  });
});
