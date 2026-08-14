// =============================================================================
// E2E Tests - Inventory Management
// CRUD, search/filter, and bulk-selection tests. Read-only tests use the
// seeded dataset (20 items, ids CA/LE/LI/AU/SU...); mutating tests create
// private "ZZZ E2E ..." items via db.js and remove them afterwards.
// =============================================================================

import { test, expect } from './fixtures.js';
import { createTestItem, deleteTestItem, deleteItemsByExactName, E2E_PREFIX } from './db.js';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
  });

  test.describe('View Items', () => {
    test('should display gear list', async ({ page, pages }) => {
      await expect(
        page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")'),
      ).toBeVisible();

      // The seeded test project always has inventory — rows must render
      await expect(pages.gearList.itemRows.first()).toBeVisible();
      expect(await pages.gearList.itemRows.count()).toBeGreaterThan(0);
    });

    test('should toggle between grid and list view', async ({ page, pages }) => {
      const gridButton = page.getByRole('button', { name: 'Grid view' });
      const listButton = page.getByRole('button', { name: 'List view' });

      await expect(gridButton).toBeVisible();
      await expect(listButton).toBeVisible();

      await listButton.click();
      await expect(listButton).toHaveAttribute('aria-pressed', 'true');
      await expect(pages.gearList.itemRows.first()).toBeVisible();

      await gridButton.click();
      await expect(gridButton).toHaveAttribute('aria-pressed', 'true');
      await expect(pages.gearList.itemRows.first()).toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('search matches by unique id', async ({ pages }) => {
      // Search matches name, brand, and id — a unique id returns one row
      await pages.gearList.search('LE1002');
      await expect(pages.gearList.itemRows).toHaveCount(1);
      await expect(pages.gearList.itemRow('Canon RF 70-200mm f/2.8L IS')).toBeVisible();
    });

    test('search narrows to the seeded lens set', async ({ pages }) => {
      // The seed contains exactly five lenses with ids LE1001..LE1005
      await pages.gearList.search('LE10');
      await expect(pages.gearList.itemRows).toHaveCount(5);
    });

    test('category filter narrows results', async ({ page, pages }) => {
      // Custom Select component: trigger button + role=option entries
      await page.getByLabel('Filter by category').click();
      await page.getByRole('option', { name: 'Lighting' }).click();
      // Seed has exactly three Lighting items (LI1001..LI1003)
      await expect(pages.gearList.itemRows).toHaveCount(3);
    });

    test('status filter shows the empty state when nothing matches', async ({ page }) => {
      // No seeded (or test-created) item is ever "missing"
      await page.getByLabel('Filter by status').click();
      await page.getByRole('option', { name: 'Missing' }).click();
      await expect(page.getByText('No items found matching your criteria')).toBeVisible();
    });

    test('clearing the search restores the full list', async ({ pages }) => {
      await pages.gearList.search('LE1002');
      await expect(pages.gearList.itemRows).toHaveCount(1);

      await pages.gearList.clearSearch();
      // Search is debounced (200ms) — poll instead of a one-shot count
      await expect.poll(() => pages.gearList.itemRows.count()).toBeGreaterThan(5);
    });
  });

  test.describe('Item Detail', () => {
    test('opens the item detail from the list', async ({ page, pages }) => {
      await pages.gearList.openItem('LE1001', 'Sony 24-70mm f/2.8 GM II');
      await pages.itemDetail.expectItemDetail();
      await expect(
        page.locator('h1').filter({ hasText: 'Sony 24-70mm f/2.8 GM II' }),
      ).toBeVisible();
      await expect(page.getByText('LE1001').first()).toBeVisible();
    });

    test('displays item information and actions', async ({ page, pages }) => {
      await pages.gearList.openItem('AU1001', 'Sennheiser MKH 416');
      await pages.itemDetail.expectItemDetail();

      await expect(page.locator('h1').filter({ hasText: 'Sennheiser MKH 416' })).toBeVisible();
      // Available item: admin sees Check Out, Edit, and QR actions
      await expect(page.getByRole('button', { name: 'Check Out', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'QR Code', exact: true })).toBeVisible();

      // Back returns to the gear list
      await pages.itemDetail.goBack();
      await pages.gearList.expectGearList();
    });
  });

  test.describe('Add Item', () => {
    test('should open add item form', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add Item")').first();
      await expect(addButton).toBeVisible();
      await addButton.click();

      // Add Item is a full page (ItemFormPage), not a modal
      await expect(page.locator('h2:has-text("Add New Item")')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add Item")').first();
      await expect(addButton).toBeVisible();
      await addButton.click();

      await expect(page.locator('h2:has-text("Add New Item")')).toBeVisible();

      // The app gates submission by DISABLING save until required fields are
      // filled — with an empty form the save button must be disabled
      const saveButton = page
        .locator('button:has-text("Save"), button:has-text("Add Item"), button[type="submit"]')
        .last();
      await expect(saveButton).toBeVisible();
      await expect(saveButton).toBeDisabled();
    });

    test('creates a new item through the form', async ({ page, pages }) => {
      const name = `${E2E_PREFIX} Created ${Date.now()}`;
      try {
        await page.locator('button:has-text("Add Item")').first().click();
        await expect(page.locator('h2:has-text("Add New Item")')).toBeVisible();

        await page.locator('input[placeholder="e.g., Alpha a7 IV"]').fill(name);
        await page.locator('input[placeholder="e.g., Sony"]').fill('E2E Test');

        // The default category (Cameras) declares three REQUIRED specs and
        // a required serial number — save stays disabled until all are set
        for (const spec of ['Sensor Type', 'Video Resolution', 'Mount Type']) {
          await page.getByText(spec).locator('..').locator('input').fill('E2E');
        }
        await page.locator('input[placeholder="Required"]').fill(`SN-E2E-${Date.now()}`);

        // Save enables once name, brand, and required specs are present,
        // then navigates back to the gear list
        const saveButton = page.getByRole('button', { name: 'Add Item', exact: true }).last();
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        await expect(page.getByText(`${name} added to inventory`)).toBeVisible();
        await pages.gearList.expectGearList();

        // The new item is findable
        await pages.gearList.search(name);
        await expect(pages.gearList.itemRow(name)).toBeVisible();
      } finally {
        await deleteItemsByExactName(name);
      }
    });
  });

  // The app loads inventory into React state at boot — items created via
  // the db helper AFTER the beforeEach navigation require a fresh load.
  async function reloadIntoGearList(page, pages) {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
  }

  test.describe('Edit Item', () => {
    test('opens the edit form with current values', async ({ page, pages }) => {
      const name = `${E2E_PREFIX} EditOpen ${Date.now()}`;
      const id = await createTestItem({ name });
      try {
        await reloadIntoGearList(page, pages);
        await pages.gearList.openItem(id, name);
        await pages.itemDetail.expectItemDetail();
        await page.getByRole('button', { name: 'Edit', exact: true }).click();

        // Editing from the detail page opens the compact ItemModal
        const modal = page.locator('[role="dialog"]');
        await expect(modal.getByText('Edit Item')).toBeVisible();
        await expect(modal.locator('input[placeholder="e.g., Alpha a7 IV"]')).toHaveValue(name);
      } finally {
        await deleteTestItem(id);
      }
    });

    test('updates an item name', async ({ page, pages }) => {
      const name = `${E2E_PREFIX} EditSave ${Date.now()}`;
      const id = await createTestItem({ name });
      try {
        await reloadIntoGearList(page, pages);
        await pages.gearList.openItem(id, name);
        await pages.itemDetail.expectItemDetail();
        await page.getByRole('button', { name: 'Edit', exact: true }).click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal.getByText('Edit Item')).toBeVisible();

        await modal.locator('input[placeholder="e.g., Alpha a7 IV"]').fill(`${name} Updated`);
        await modal.getByRole('button', { name: 'Save Changes' }).click();

        // The modal closes and the detail heading shows the new name
        await expect(modal).toBeHidden();
        await expect(page.locator('h1').filter({ hasText: `${name} Updated` })).toBeVisible({
          timeout: 10000,
        });
      } finally {
        await deleteTestItem(id);
      }
    });
  });

  test.describe('Bulk Selection', () => {
    test('selects items and shows the selection toolbar', async ({ page, pages }) => {
      const stamp = Date.now();
      const nameA = `${E2E_PREFIX} Bulk ${stamp} A`;
      const nameB = `${E2E_PREFIX} Bulk ${stamp} B`;
      const idA = await createTestItem({ name: nameA });
      const idB = await createTestItem({ name: nameB });
      try {
        await reloadIntoGearList(page, pages);
        await pages.gearList.search(`${E2E_PREFIX} Bulk ${stamp}`);

        await page.getByRole('button', { name: 'Multiple Selection' }).click();
        await pages.gearList.itemRow(nameA).click();
        await expect(page.getByText(/1 of \d+ selected/)).toBeVisible();
        await pages.gearList.itemRow(nameB).click();
        await expect(page.getByText(/2 of \d+ selected/)).toBeVisible();

        // Bulk action buttons appear with a selection
        for (const action of ['Change Status', 'Update Location', 'Change Category', 'Delete']) {
          await expect(page.getByRole('button', { name: action, exact: true })).toBeVisible();
        }

        await page.getByRole('button', { name: 'Exit Selection' }).click();
        await expect(page.getByText(/of \d+ selected/)).toBeHidden();
      } finally {
        await deleteTestItem(idA);
        await deleteTestItem(idB);
      }
    });

    test('bulk delete asks for typed confirmation and cancel keeps the item', async ({
      page,
      pages,
    }) => {
      const name = `${E2E_PREFIX} Bulk Delete ${Date.now()}`;
      const id = await createTestItem({ name });
      try {
        await reloadIntoGearList(page, pages);
        await pages.gearList.search(name);

        await page.getByRole('button', { name: 'Multiple Selection' }).click();
        await pages.gearList.itemRow(name).click();
        await expect(page.getByText(/1 of \d+ selected/)).toBeVisible();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();

        // The bulk-delete modal demands typing DELETE before enabling
        const modal = page.locator('[role="dialog"]');
        await expect(modal.getByText('Delete Items')).toBeVisible();
        await expect(modal.getByText('Type DELETE to confirm')).toBeVisible();
        await expect(modal.getByRole('button', { name: /Delete \d+ Item/ })).toBeDisabled();

        // Cancel out — the item must survive
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
        await expect(pages.gearList.itemRow(name)).toBeVisible();
      } finally {
        await deleteTestItem(id);
      }
    });
  });
});
