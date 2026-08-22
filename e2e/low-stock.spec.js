// =============================================================================
// E2E — Low-stock reminders are a per-item opt-in (2026-08-21)
// Audio tracks quantity in the seed; Cameras does not. Items created here
// carry E2E_PREFIX and are deleted in finally.
// =============================================================================

import { test, expect } from './fixtures.js';
import { E2E_PREFIX, adminDb, createTestItem, deleteTestItem } from './db.js';

async function openItem(page, pages, id, name) {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Gear List');
  await pages.gearList.expectGearList();
  await pages.gearList.openItem(id, name);
  await pages.itemDetail.expectItemDetail();
}

const audioItem = (name) =>
  createTestItem({
    name,
    columns: {
      category_name: 'Audio',
      quantity: 1,
      reorder_point: 0,
      serial_number: null,
      specs: { 'Audio Type': 'E2E' },
    },
  });

test.describe('Low-stock reminder (per item)', () => {
  test('off by default; the Item Details switch opts the item in; the threshold is set in Edit; the dashboard lists it', async ({
    page,
    pages,
  }) => {
    const name = `${E2E_PREFIX} LowStock ${Date.now()}`;
    const id = await audioItem(name);
    try {
      await openItem(page, pages, id, name);

      // Off by default, no threshold row, nothing on the dashboard yet
      const sw = page.getByRole('switch', { name: 'Low stock reminder' });
      await expect(sw).toHaveAttribute('aria-checked', 'false');
      await expect(page.getByText('Alert At Or Below')).toBeHidden();

      // Opt in from Item Details → persisted
      await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', 'true');
      const db = await adminDb();
      await expect
        .poll(async () => {
          const { data } = await db.from('inventory').select('low_stock_alert').eq('id', id).maybeSingle();
          return data?.low_stock_alert ?? null;
        })
        .toBe(true);
      // On, but no threshold yet — the row says so instead of silently never firing
      await expect(page.getByText('Alert At Or Below')).toBeVisible();
      await expect(page.getByText(/Not set/)).toBeVisible();

      // Set the threshold in the edit form (fields only exist because Audio tracks quantity)
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByText('Edit Item')).toBeVisible();
      const box = modal.getByRole('checkbox', { name: /Low stock reminder/ });
      await expect(box).toBeChecked();
      await modal.getByLabel('Alert when quantity is at or below').fill('3');
      await modal.getByRole('button', { name: 'Save Changes' }).click();
      await expect(modal).toBeHidden();

      await expect(page.getByText('On — low now')).toBeVisible({ timeout: 10000 });
      await expect
        .poll(async () => {
          const { data } = await db.from('inventory').select('reorder_point').eq('id', id).maybeSingle();
          return data?.reorder_point ?? null;
        })
        .toBe(3);

      // Dashboard Low Stock panel lists it (quantity 1 ≤ 3)
      await pages.dashboard.navigateTo('Dashboard');
      await pages.dashboard.expectDashboard();
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('1 remaining (min: 3)').first()).toBeVisible();

      // Switch it off again → gone from the dashboard, numbers unchanged
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem(id, name);
      await pages.itemDetail.expectItemDetail();
      await page.getByRole('switch', { name: 'Low stock reminder' }).click();
      await expect
        .poll(async () => {
          const { data } = await db.from('inventory').select('low_stock_alert').eq('id', id).maybeSingle();
          return data?.low_stock_alert ?? null;
        })
        .toBe(false);
      await pages.dashboard.navigateTo('Dashboard');
      await pages.dashboard.expectDashboard();
      await expect(page.getByText('1 remaining (min: 3)')).toBeHidden();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('is not offered in categories that do not track quantity', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} NoQty ${Date.now()}`;
    const id = await createTestItem({ name }); // Cameras
    try {
      await openItem(page, pages, id, name);
      await expect(page.getByText('Low Stock Reminder')).toBeHidden();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByText('Edit Item')).toBeVisible();
      await expect(modal.getByRole('checkbox', { name: /Low stock reminder/ })).toBeHidden();
    } finally {
      await deleteTestItem(id);
    }
  });

  test('the Categories editor no longer carries a threshold', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Admin Panel');
    await page.getByText('Edit Categories', { exact: true }).click();
    await expect(page.locator('h2:has-text("Edit Categories")')).toBeVisible();
    await expect(page.getByText('Low stock alert:')).toBeHidden();
    await expect(page.getByText(/low.stock/i)).toBeHidden();
  });
});
