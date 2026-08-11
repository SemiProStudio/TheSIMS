// =============================================================================
// E2E Tests - Reservations
// Creates a reservation through the item-detail flow on a PRIVATE item.
// (Unit tests cover createReservation's mapping/validation; this exercises
// the modal UI end to end: DatePicker popups, required fields, persistence.)
// =============================================================================

import { test, expect, pickDate } from './fixtures.js';
import { createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

test.describe('Reservation Creation', () => {
  test('creates a reservation from the item detail', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} Reservation Target`;
    const id = await createTestItem({ name });
    try {
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem(id, name);
      await pages.itemDetail.expectItemDetail();

      // The Reservations section header carries an icon-only add button
      await page.getByRole('button', { name: 'Add reservation' }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Add Reservation').first()).toBeVisible();

      // Save must be gated until item, project, dates, and contact are set
      const saveButton = modal.getByRole('button', { name: /^Add Reservation/ });
      await expect(saveButton).toBeDisabled();

      // The modal does NOT preselect the item it was opened from — pick it
      // in the item search
      await modal.locator('input[placeholder="Search items by name, ID, or brand..."]').fill(id);
      await modal.getByText(name).first().click();

      await modal
        .locator('input[placeholder="e.g., Wedding - Smith/Jones"]')
        .fill(`${E2E_PREFIX} Reservation`);
      await modal.locator('input[placeholder="e.g., John Smith"]').fill(`${E2E_PREFIX} Contact`);
      await pickDate(page, modal.locator('input[placeholder="Select start date"]'), 30);
      await pickDate(page, modal.locator('input[placeholder="Select end date"]'), 32);

      await expect(saveButton).toBeEnabled();
      await saveButton.click();
      await expect(modal).toBeHidden();

      // The reservation shows up on the item's detail page
      await expect(page.getByText(`${E2E_PREFIX} Reservation`).first()).toBeVisible();
    } finally {
      await deleteTestItem(id); // also removes the reservation row
    }
  });

  test('auto-corrects the end date when the start moves past it', async ({ page, pages }) => {
    const name = `${E2E_PREFIX} Reservation Snap`;
    const id = await createTestItem({ name });
    try {
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem(id, name);
      await pages.itemDetail.expectItemDetail();

      await page.getByRole('button', { name: 'Add reservation' }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Pick the end date FIRST, then a start date AFTER it. The form
      // cannot hold an invalid range: it snaps end = start (and the end
      // picker's min also blocks pre-start days). This pins the invariant
      // that end >= start always holds when saving.
      const endInput = modal.locator('input[placeholder="Select end date"]');
      const startInput = modal.locator('input[placeholder="Select start date"]');
      await pickDate(page, endInput, 30);
      await pickDate(page, startInput, 32);

      const startValue = await startInput.inputValue();
      expect(startValue).toBeTruthy();
      await expect(endInput).toHaveValue(startValue);
    } finally {
      await deleteTestItem(id);
    }
  });
});
