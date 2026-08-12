// =============================================================================
// E2E Tests - QR Codes & Labels
// Labels view (format picker, preview, download), QR modal, scanner manual
// entry, and the /?item= deep link that printed QR labels encode.
// Read-only against seed data — no DB mutation, nothing to clean up.
// =============================================================================

import fs from 'fs';
import { test, expect } from './fixtures.js';

test.describe('Labels view', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Labels');
    await expect(page.locator('h2:has-text("Labels")')).toBeVisible({ timeout: 10000 });
  });

  test('format picker is a keyboard-accessible radio group', async ({ page }) => {
    const group = page.getByRole('radiogroup', { name: 'Label format' });
    await expect(group).toBeVisible();

    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(5); // LABEL_FORMATS on the items tab

    // Medium is the default selection
    await expect(group.getByRole('radio', { name: /Medium - QR \+ Info/ })).toBeChecked();

    // Mouse: clicking an option's label selects it (the input itself is
    // visually hidden behind the custom radio indicator)
    await group.locator('label', { hasText: 'Small - QR Only' }).click();
    await expect(group.getByRole('radio', { name: /Small - QR Only/ })).toBeChecked();
    await expect(group.getByRole('radio', { name: /Medium - QR \+ Info/ })).not.toBeChecked();

    // Keyboard: arrow keys move the selection (native radio semantics)
    await page.keyboard.press('ArrowDown');
    await expect(group.getByRole('radio', { name: /Medium - QR \+ Info/ })).toBeChecked();
  });

  test('selecting an item renders a label preview with a QR image', async ({ page }) => {
    await page.getByPlaceholder('Search items...').fill('LE1002');
    const row = page.locator('label', { hasText: 'LE1002' }).first();
    await row.getByRole('checkbox').check();

    // Preview renders the shared ItemLabel with a generated QR data URL
    const previewQR = page.locator('img[src^="data:image/png"]').first();
    await expect(previewQR).toBeVisible({ timeout: 10000 });

    // Print button reflects the selection count
    await expect(page.getByRole('button', { name: 'Print (1)' })).toBeVisible();
  });

  test('Select All while filtered adds to the existing selection', async ({ page }) => {
    // Select one item under a filter
    await page.getByPlaceholder('Search items...').fill('LE1002');
    await page.locator('label', { hasText: 'LE1002' }).first().getByRole('checkbox').check();

    // Change the filter and Select All — the first selection must survive
    await page.getByPlaceholder('Search items...').fill('CA10');
    await page.getByRole('button', { name: 'Select All' }).click();

    const printButton = page.getByRole('button', { name: /Print \(\d+\)/ });
    const label = await printButton.textContent();
    const count = Number(label.match(/\((\d+)\)/)[1]);
    expect(count).toBeGreaterThan(1); // LE1002 + the CA10* matches
  });

  test('download produces a 300-DPI Cricut Print-Then-Cut PNG sheet', async ({ page }) => {
    await page.getByPlaceholder('Search items...').fill('LE1002');
    await page.locator('label', { hasText: 'LE1002' }).first().getByRole('checkbox').check();
    await expect(page.locator('img[src^="data:image/png"]').first()).toBeVisible({
      timeout: 10000,
    });

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PNG' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^labels-medium-sheet1of1-\d{4}-\d{2}-\d{2}\.png$/,
    );

    const buf = fs.readFileSync(await download.path());
    // PNG signature + IHDR dimensions: 6.75in x 9.25in at 300 DPI
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buf.readUInt32BE(16)).toBe(2025);
    expect(buf.readUInt32BE(20)).toBe(2775);

    // The QR must actually be IN the pixels. QRs are composited onto the
    // canvas after SVG rasterization (WebKit ignores foreignObject <img>s);
    // if that compositing step regresses, the sheet is text-only and the
    // near-black pixel count collapses to ~4k.
    const blackPixels = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let black = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 200 && d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60) black++;
      }
      return black;
    }, buf.toString('base64'));
    expect(blackPixels).toBeGreaterThan(12000); // one medium QR ≈ 18-24k

    // The Design Space sizing hint appears
    await expect(page.getByText(/6\.75" × 9\.25"/)).toBeVisible();
  });
});

test.describe('QR deep link (/?item=<id>)', () => {
  test('lands directly on the item detail view and cleans the URL', async ({ page, pages }) => {
    await page.goto('/?item=LE1002');
    await pages.itemDetail.expectItemDetail();

    // The item's QR modal button confirms we're on a detail view; the badge
    // confirms it's the right item.
    await expect(page.getByRole('button', { name: 'QR Code', exact: true })).toBeVisible();
    await expect(page.getByText('LE1002').first()).toBeVisible();

    // Param is removed after handling
    await expect(page).not.toHaveURL(/item=/);
  });

  test('unknown item id shows a toast instead of navigating', async ({ page, pages }) => {
    await page.goto('/?item=ZZNOPE99');
    await pages.dashboard.expectDashboard();
    await expect(page.getByText(/No item found for code "ZZNOPE99"/)).toBeVisible();
  });
});

test.describe('QR modal', () => {
  test('shows a labeled QR canvas encoding the deep link', async ({ page, pages }) => {
    await page.goto('/?item=LE1002');
    await pages.itemDetail.expectItemDetail();

    await page.getByRole('button', { name: 'QR Code', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'QR Code' })).toBeVisible();

    // Accessible, rendered QR
    await expect(dialog.getByRole('img', { name: 'QR code for LE1002' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Download QR Code/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('QR scanner manual entry', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await page.getByRole('button', { name: 'Scan QR Code' }).click();
    await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
  });

  test('finds an item by id and navigates to its details', async ({ page, pages }) => {
    await page.getByLabel('Or enter code manually').fill('LE1002');
    await page.getByRole('button', { name: 'Lookup' }).click();

    // Found card with quick actions
    await expect(page.getByRole('button', { name: 'View Full Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Another Item' })).toBeVisible();

    await page.getByRole('button', { name: 'View Full Details' }).click();
    await pages.itemDetail.expectItemDetail();
    await expect(page.getByText('LE1002').first()).toBeVisible();
  });

  test('accepts a pasted deep-link URL', async ({ page }) => {
    const origin = new URL(page.url()).origin;
    await page.getByLabel('Or enter code manually').fill(`${origin}/?item=LE1002`);
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByRole('button', { name: 'View Full Details' })).toBeVisible();
  });

  test('shows an error for unknown codes', async ({ page }) => {
    await page.getByLabel('Or enter code manually').fill('ZZNOPE99');
    await page.getByRole('button', { name: 'Lookup' }).click();
    await expect(page.getByText(/No item found with code "ZZNOPE99"/)).toBeVisible();
  });
});
