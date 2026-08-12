// =============================================================================
// E2E Tests - Dashboard
// Regression guards for the dashboard audit: the Due Reminders and Upcoming
// Maintenance panels render inventory-wide data (they used to be dead — the
// list load has no reminders/maintenance and only visited items ever showed),
// the Overdue stat card counts and filters, and quick search works from the
// keyboard. Mutating tests use private ZZZ-prefixed items, deleted in finally.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  E2E_PREFIX,
  createTestItem,
  checkOutTestItem,
  addTestReminder,
  addTestMaintenance,
  deleteTestItem,
} from './db.js';

test.describe('Dashboard data panels', () => {
  test('shows due reminders inventory-wide without visiting the item', async ({ page, pages }) => {
    const itemId = await createTestItem({ name: `${E2E_PREFIX} Reminder Item` });
    try {
      await addTestReminder(itemId, { title: `${E2E_PREFIX} Clean sensor`, dueInDays: -1 });

      await page.goto('/');
      await pages.dashboard.expectDashboard();

      await expect(page.getByText(`${E2E_PREFIX} Clean sensor`)).toBeVisible({ timeout: 15000 });

      // Row navigates to the item
      await page.getByText(`${E2E_PREFIX} Clean sensor`).click();
      await pages.itemDetail.expectItemDetail();
      await expect(page.getByText(`${E2E_PREFIX} Reminder Item`).first()).toBeVisible();
    } finally {
      await deleteTestItem(itemId);
    }
  });

  test('shows scheduled maintenance and counts it in the stat card', async ({ page, pages }) => {
    const itemId = await createTestItem({ name: `${E2E_PREFIX} Maintenance Item` });
    try {
      await addTestMaintenance(itemId, { type: `${E2E_PREFIX} Shutter service`, inDays: 5 });

      await page.goto('/');
      await pages.dashboard.expectDashboard();

      await expect(page.getByText(`${E2E_PREFIX} Shutter service`)).toBeVisible({
        timeout: 15000,
      });
      // Stat card reflects the pending record (≥1 in case of strays)
      const maintenanceCard = page
        .locator('button.stat-card-button')
        .filter({ hasText: 'Maintenance' });
      await expect(maintenanceCard).toBeVisible();
      await expect(maintenanceCard).not.toContainText('0Maintenance');
    } finally {
      await deleteTestItem(itemId);
    }
  });

  test('Overdue stat card counts overdue items and opens the filtered list', async ({
    page,
    pages,
  }) => {
    const itemId = await createTestItem({ name: `${E2E_PREFIX} Overdue Item` });
    try {
      await checkOutTestItem(itemId, { dueInDays: -3 });

      await page.goto('/');
      await pages.dashboard.expectDashboard();

      const overdueCard = page.locator('button.stat-card-button').filter({ hasText: 'Overdue' });
      await expect(overdueCard).toBeVisible({ timeout: 15000 });
      await expect(overdueCard).not.toContainText('0Overdue'); // count is rendered above the label
      await overdueCard.click();

      // Lands on the gear list filtered to overdue — our item is there
      await expect(page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByText(`${E2E_PREFIX} Overdue Item`).first()).toBeVisible();
    } finally {
      await deleteTestItem(itemId);
    }
  });
});

test.describe('Dashboard quick search', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test('finds items and opens the first result with Enter', async ({ page, pages }) => {
    const input = page.getByPlaceholder('Search by name, ID, brand, or serial...');
    await input.fill('LE1002');
    await expect(page.getByRole('button', { name: /LE1002/ }).first()).toBeVisible();

    await input.press('Enter');
    await pages.itemDetail.expectItemDetail();
    await expect(page.getByText('LE1002').first()).toBeVisible();
  });

  test('offers View all N results for broad queries', async ({ page }) => {
    const input = page.getByPlaceholder('Search by name, ID, brand, or serial...');
    await input.fill('a'); // matches nearly everything in the seed set

    const viewAll = page.getByRole('button', { name: /View all \d+ results/ });
    await expect(viewAll).toBeVisible();
    await viewAll.click();

    // Gear list opens with the query applied
    await expect(page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")')).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe('Dashboard accessibility', () => {
  test('section headers expose and toggle aria-expanded', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    const statsToggle = page.getByRole('button', { name: /Statistics/ });
    await expect(statsToggle).toHaveAttribute('aria-expanded', 'true');
    await statsToggle.click();
    await expect(statsToggle).toHaveAttribute('aria-expanded', 'false');
    // Restore for other tests (collapse state persists per user)
    await statsToggle.click();
    await expect(statsToggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('stat cards are keyboard-activatable buttons', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    const availableCard = page.getByRole('button', { name: /\d+ Available/ });
    await availableCard.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")')).toBeVisible({
      timeout: 10000,
    });
  });
});
