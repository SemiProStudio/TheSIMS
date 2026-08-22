// =============================================================================
// Smart Paste — the 1k-item import path, end to end.
//
// The parser has a deep unit suite; until this file nothing drove the modal
// that orchestrates it (tabs, parse, review, alternatives, batch selection,
// apply) through the real Edit form to the real row. Each test pastes text
// into a private item's Edit modal and asserts what the DATABASE holds
// after Save Changes — the review UI is checked along the way, but the
// proof is the row.
//
// Text is pasted via fill() (the paste handler only intercepts text/html
// clipboards; plain text goes through the textarea like a keyboard paste).
// No manual mapping is exercised here on purpose: mapping an unmatched pair
// records a community alias through a SECURITY DEFINER RPC that nothing
// can delete from the client, so it would accumulate in the test project.
// That path is unit-tested in test/smartPasteModalFlow.test.jsx.
// =============================================================================

import { test, expect } from './fixtures.js';
import { adminDb, createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';

const PRODUCT_TEXT = `Sony Alpha 7 IV Mirrorless Camera
Brand: Sony
Sensor Type: Full-Frame Exmor R CMOS
Effective Pixels: 33 MP
Lens Mount: Sony E
Video Resolution: 4K 60p
ISO Range: 100-51200
Bit Depth: 10-bit
Weight: 1.4 lb
Body Colour: Black
Warranty Period: 2 years`;

const BATCH_TEXT = `Sony Alpha 7 IV
Sensor Type: Full-Frame CMOS
Lens Mount: Sony E
Video Resolution: 4K 60p

Canon EOS R6 Mark II
Sensor Type: Full-Frame CMOS
Lens Mount: Canon RF
Video Resolution: 4K 60p`;

test.describe('Smart Paste', () => {
  let itemId;
  let itemName;

  const smartPaste = (page) =>
    page.getByRole('dialog').filter({ hasText: 'Smart Paste — Import Product Info' });
  const editModal = (page) => page.getByRole('dialog').filter({ hasText: 'Edit Item' }).first();

  async function openSmartPaste(page, pages) {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    await pages.gearList.openItem(itemId, itemName);
    await pages.itemDetail.expectItemDetail();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editModal(page).getByText('Edit Item')).toBeVisible();
    await editModal(page)
      .getByRole('button', { name: /Smart Paste - Update from Product Page/ })
      .click();
    const modal = smartPaste(page);
    await expect(modal).toBeVisible();
    return modal;
  }

  async function rowSpecs() {
    const db = await adminDb();
    const { data } = await db
      .from('inventory')
      .select('name, brand, category_name, specs')
      .eq('id', itemId)
      .single();
    return data;
  }

  test.beforeEach(async () => {
    // Parallel workers can share a millisecond — the name must be unique
    // per test or openItem() matches two rows
    itemName = `${E2E_PREFIX} SmartPaste ${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    itemId = await createTestItem({ name: itemName });
  });

  test.afterEach(async () => {
    await deleteTestItem(itemId);
  });

  test('paste → parse → review → apply → save writes the parsed specs to the row', async ({
    page,
    pages,
  }) => {
    const modal = await openSmartPaste(page, pages);

    // Parse is disabled until there is text
    const parseButton = modal.getByRole('button', { name: 'Parse Text' });
    await expect(parseButton).toBeDisabled();
    await modal.locator('textarea').fill(PRODUCT_TEXT);
    await expect(parseButton).toBeEnabled();
    await parseButton.click();

    // Summary reflects the parse: 10 pairs, 7 matched to Cameras fields,
    // one with alternatives (Body Colour fuzzy-hit Bit Depth), 2 unmatched
    const summary = modal.getByText(/Extracted/);
    await expect(summary).toContainText('10');
    await expect(summary).toContainText('7 matched');
    await expect(summary).toContainText('1 with alternatives');
    await expect(summary).toContainText('2 unmatched');

    // The review is scoped to the item's category, not the parser's guess
    await expect(modal.getByRole('button', { name: 'Category' })).toHaveText('Cameras');

    // Alternatives picker: the fuzzy hit is offered, the direct hit is kept
    // (the textarea also contains "Body Colour", so match the option row)
    await modal.getByRole('button', { name: /2 options/ }).click();
    const fuzzyOption = modal.getByRole('button', { name: /Black.*Body Colour/ });
    await expect(fuzzyOption).toBeVisible();
    await fuzzyOption.click();
    await modal.getByRole('button', { name: /2 options/ }).click();
    await modal.getByRole('button', { name: /10-bit.*Bit Depth/ }).click();

    // Clear one matched field: the count drops and it must not be written
    await expect(modal.getByRole('button', { name: /Apply 7 Fields to Form/ })).toBeEnabled();
    await modal.getByTitle('Clear this field').last().click();
    await expect(modal.getByRole('button', { name: /Apply 6 Fields to Form/ })).toBeEnabled();

    await modal.getByRole('button', { name: /Apply 6 Fields to Form/ }).click();
    await expect(modal).toBeHidden();

    // The host form received the payload
    const form = editModal(page);
    await expect(form.locator('input[placeholder="e.g., Alpha a7 IV"]')).toHaveValue(
      'Sony Alpha 7 IV Mirrorless Camera',
    );
    await expect(form.locator('input[placeholder="e.g., Sony"]')).toHaveValue('Sony');

    await form.getByRole('button', { name: 'Save Changes' }).click();
    await expect(form).toBeHidden();

    await expect
      .poll(async () => (await rowSpecs()).name, { timeout: 10000 })
      .toBe('Sony Alpha 7 IV Mirrorless Camera');
    const row = await rowSpecs();
    expect(row.brand).toBe('Sony');
    expect(row.category_name).toBe('Cameras');
    expect(row.specs).toMatchObject({
      'Sensor Type': 'Full-Frame Exmor R CMOS',
      'Effective Pixels': '33 MP',
      'Lens Mount': 'Sony E',
      'Video Resolution': '4K 60p',
      'ISO Range': '100-51200',
      'Bit Depth': '10-bit',
    });
    // Cleared in the review → not written (Weight was the last matched row)
    expect(row.specs).not.toHaveProperty('Weight');
    // Unmatched pairs never leak into specs
    expect(row.specs).not.toHaveProperty('Warranty Period');
    expect(row.specs).not.toHaveProperty('Brand');
  });

  test('metric normalization and the confidence threshold change what is applied', async ({
    page,
    pages,
  }) => {
    const modal = await openSmartPaste(page, pages);
    await modal.locator('textarea').fill(PRODUCT_TEXT);
    await modal.getByRole('button', { name: 'Parse Text' }).click();
    await expect(modal.getByText(/Extracted/)).toContainText('7 matched');

    // Strict keeps everything here (all direct hits are 100) — the summary
    // does not change, proving the toggle is wired without losing fields
    await modal.getByRole('button', { name: 'Strict' }).click();
    await expect(modal.getByText(/Extracted/)).toContainText('7 matched');
    await modal.getByRole('button', { name: 'Balanced' }).click();

    // Weight is shown as a metric conversion by default (1.4 lb → 635 g)
    await expect(modal.getByText('635 g')).toBeVisible();
    // …and turning normalization off applies the source value instead
    await modal.getByTitle('Showing metric conversions').click();
    await expect(modal.getByTitle('Unit normalization off')).toBeVisible();

    await modal.getByRole('button', { name: /Apply 7 Fields to Form/ }).click();
    await editModal(page).getByRole('button', { name: 'Save Changes' }).click();
    await expect(editModal(page)).toBeHidden();

    await expect
      .poll(async () => (await rowSpecs()).specs?.Weight, { timeout: 10000 })
      .toBe('1.4 lb');
  });

  test('a multi-product paste must be narrowed to one product before it applies', async ({
    page,
    pages,
  }) => {
    const modal = await openSmartPaste(page, pages);
    await modal.locator('textarea').fill(BATCH_TEXT);
    await modal.getByRole('button', { name: 'Parse Text' }).click();

    await expect(modal.getByText('2 products detected')).toBeVisible();
    await expect(modal.getByText('Canon EOS R6 Mark II', { exact: true })).toBeVisible();
    // Both selected → the import is refused, with the reason on screen
    await expect(modal.getByText('This form imports one product at a time')).toBeVisible();
    const importButton = modal.getByRole('button', { name: 'Import Selected Product' });
    await expect(importButton).toBeDisabled();

    // Keep only the Canon
    await modal.getByRole('checkbox').first().uncheck();
    await expect(importButton).toBeEnabled();
    await importButton.click();
    await expect(modal).toBeHidden();

    const form = editModal(page);
    await expect(form.locator('input[placeholder="e.g., Alpha a7 IV"]')).toHaveValue(
      'Canon EOS R6 Mark II',
    );
    await form.getByRole('button', { name: 'Save Changes' }).click();
    await expect(form).toBeHidden();

    await expect
      .poll(async () => (await rowSpecs()).specs?.['Lens Mount'], { timeout: 10000 })
      .toBe('Canon RF');
    const row = await rowSpecs();
    expect(row.name).toBe('Canon EOS R6 Mark II');
    expect(row.brand).toBe('Canon');
  });

  test('Edit on a batch entry drills into that product for review', async ({ page, pages }) => {
    const modal = await openSmartPaste(page, pages);
    await modal.locator('textarea').fill(BATCH_TEXT);
    await modal.getByRole('button', { name: 'Parse Text' }).click();
    await expect(modal.getByText('2 products detected')).toBeVisible();

    await modal.getByRole('button', { name: 'Edit', exact: true }).last().click();
    await expect(modal.getByText('Viewing: Canon EOS R6 Mark II')).toBeVisible();
    await expect(modal.getByText('2 products detected')).toHaveCount(0);
    await expect(modal.getByText(/Extracted/)).toContainText('3 matched');
    await expect(modal.getByRole('button', { name: /Apply 3 Fields to Form/ })).toBeEnabled();

    // Cancel leaves the form untouched
    await modal.getByRole('button', { name: 'Cancel' }).click();
    await expect(modal).toBeHidden();
    await expect(editModal(page).locator('input[placeholder="e.g., Alpha a7 IV"]')).toHaveValue(
      itemName,
    );
  });
});
