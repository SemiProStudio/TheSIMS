// =============================================================================
// E2E Tests - Item Photos
// The image pipeline against the REAL test bucket: a large PNG goes in, two
// JPEG renditions come out (full ≤ 1600px, 480px thumb), the item row points
// at the full one, and Bulk Photos attaches files to items by filename.
// Private "ZZZ E2E" items only; their storage folders are removed afterwards.
// =============================================================================

import { test, expect } from './fixtures.js';
import { adminDb, createTestItem, deleteTestItem, E2E_PREFIX } from './db.js';
import { testPngFile } from './image-fixture.js';

const STORAGE_RE = /\/storage\/v1\/object\/public\/equipment-images\//;

/** Natural size of an image URL as the browser decodes it */
async function imageSize(page, url) {
  return page.evaluate(
    (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error(`could not load ${src}`));
        img.src = src;
      }),
    url,
  );
}

test.describe('Item Photos', () => {
  test('edit: a large photo is downscaled into JPEG renditions and shown on the item', async ({
    page,
    pages,
  }) => {
    const name = `${E2E_PREFIX} Photo ${Date.now()}`;
    const id = await createTestItem({ name });
    try {
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem(id, name);
      await pages.itemDetail.expectItemDetail();
      await page.getByRole('button', { name: 'Edit', exact: true }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByText('Edit Item')).toBeVisible();

      // 3200×2400 — well above both the working (2048) and full (1600) sizes,
      // and far past the old 5 MB-at-the-picker rule's spirit: no size gate
      await modal
        .locator('#item-image-upload')
        .setInputFiles(testPngFile('big-photo.png', 3200, 2400));
      await expect(modal.getByText('Ready — saved when you save the form')).toBeVisible({
        timeout: 15000,
      });

      await modal.getByRole('button', { name: 'Save Changes' }).click();
      await expect(modal).toBeHidden({ timeout: 20000 });

      // The detail view shows the stored full rendition
      const img = page.locator(`img[alt="${name}"]`).first();
      await expect(img).toBeVisible({ timeout: 15000 });
      const src = await img.getAttribute('src');
      expect(src).toMatch(STORAGE_RE);
      expect(src).toMatch(new RegExp(`/${id}/\\d+\\.jpg$`));

      // Full rendition: long edge capped at 1600, aspect preserved (not square)
      const full = await imageSize(page, src);
      expect(full).toEqual({ width: 1600, height: 1200 });

      // Thumb rendition: 480px square, served under the derived _thumb name
      const thumbUrl = src.replace(/\.jpg$/, '_thumb.jpg');
      const thumbResponse = await page.request.get(thumbUrl);
      expect(thumbResponse.status()).toBe(200);
      expect(thumbResponse.headers()['content-type']).toContain('image/jpeg');
      expect(await imageSize(page, thumbUrl)).toEqual({ width: 480, height: 480 });

      // The row holds the URL, never base64
      const db = await adminDb();
      const { data } = await db.from('inventory').select('image').eq('id', id).single();
      expect(data.image).toBe(src);
    } finally {
      await deleteTestItem(id);
    }
  });

  test('bulk photos: files named by item ID attach to their items; strangers are reported', async ({
    page,
    pages,
  }) => {
    const stamp = Date.now();
    const nameA = `${E2E_PREFIX} BulkA ${stamp}`;
    const nameB = `${E2E_PREFIX} BulkB ${stamp}`;
    const idA = await createTestItem({ name: nameA });
    const idB = await createTestItem({ name: nameB });
    try {
      await page.goto('/');
      await pages.dashboard.expectDashboard();
      await pages.dashboard.navigateTo('Admin Panel');
      await page.getByText('Bulk Photos', { exact: true }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByRole('heading', { name: 'Bulk Photos' })).toBeVisible();

      await modal.locator('input[aria-label="Select photos"]').setInputFiles([
        testPngFile(`${idA}.png`, 1200, 900),
        testPngFile(`${idB.toLowerCase()}.PNG`, 900, 1200), // case-insensitive match
        testPngFile('IMG_9999.png', 400, 300), // no such item
      ]);

      // Review table: two matches, one stranger
      const rowA = modal.locator('tr', { hasText: `${idA}.png` });
      const rowB = modal.locator('tr', { hasText: `${idB.toLowerCase()}.PNG` });
      const rowX = modal.locator('tr', { hasText: 'IMG_9999.png' });
      await expect(rowA).toContainText(nameA);
      await expect(rowA).toContainText('Will add');
      await expect(rowB).toContainText(nameB);
      await expect(rowX).toContainText('No matching item');

      await modal.getByRole('button', { name: 'Upload 2 Photos' }).click();
      await expect(modal.getByRole('status')).toContainText('2 uploaded', { timeout: 30000 });
      await expect(rowA).toContainText('Uploaded');
      await expect(rowB).toContainText('Uploaded');

      // Both rows now point at their own folder in the bucket
      const db = await adminDb();
      const { data } = await db.from('inventory').select('id, image').in('id', [idA, idB]);
      const byId = Object.fromEntries(data.map((r) => [r.id, r.image]));
      expect(byId[idA]).toMatch(new RegExp(`equipment-images/${idA}/\\d+\\.jpg$`));
      expect(byId[idB]).toMatch(new RegExp(`equipment-images/${idB}/\\d+\\.jpg$`));
      expect(await imageSize(page, byId[idB])).toEqual({ width: 900, height: 1200 });
    } finally {
      await deleteTestItem(idA);
      await deleteTestItem(idB);
    }
  });
});
