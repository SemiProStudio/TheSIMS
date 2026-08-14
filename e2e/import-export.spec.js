// =============================================================================
// Import/Export — E2E
// Covers the import/export honesty round against the real DB:
//   - CSV import PERSISTS: items exist in the database and survive a reload
//     (the old handler patched local state; imports vanished on refresh),
//     notes land in item_notes, Excel quirks (BOM, labeled headers, quoted
//     newlines, currency) parse
//   - database export downloads a COMPLETE backup: lazy tables (clients) and
//     never-in-memory tables (item_notes, checkout_history) included
//   - the inventory export modal downloads and closes
//   - Export Data is admin-gated: the standard user doesn't see it
// Only ZZZ E2E data is created; scoped afterAll cleans exactly our rows.
// =============================================================================
import { readFile } from 'fs/promises';
import { test, expect, STORAGE_STATE } from './fixtures.js';
import { adminDb, deleteItemsByExactName, E2E_PREFIX } from './db.js';

const STAMP = Date.now();
const NAME_A = `${E2E_PREFIX} Import A ${STAMP}`;
const NAME_B = `${E2E_PREFIX} Import B ${STAMP}`;

test.describe.serial('csv import', () => {
  test.afterAll(async () => {
    await deleteItemsByExactName(NAME_A);
    await deleteItemsByExactName(NAME_B);
  });

  test('imported items persist to the database and survive a reload', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    // Excel-flavored on purpose: BOM, labeled headers, lowercase category,
    // currency price, quoted multi-line note
    const csv =
      '﻿' +
      'Name,Category,Serial #,Purchase Price,notes\n' +
      `"${NAME_A}",cameras,ZZZ-SN-${STAMP},"$1,234","line one\nline two"\n` +
      `"${NAME_B}",Lenses,,,\n`;

    await pages.dashboard.sidebar.locator('button:has-text("Import CSV")').click();
    await expect(page.getByText('Import from CSV')).toBeVisible();
    await page.setInputFiles('input[type="file"]', {
      name: 'import.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv, 'utf-8'),
    });

    await expect(page.getByText('Preview (2 importable items)')).toBeVisible();
    await page.getByRole('button', { name: 'Import 2 Items' }).click();

    // Success closes the modal and toasts the real created count
    await expect(page.getByText('Imported 2 items')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Import from CSV')).toHaveCount(0);

    // DB truth: rows exist with parsed values
    const db = await adminDb();
    const { data: rows } = await db
      .from('inventory')
      .select('id, name, status, purchase_price, serial_number, category_name')
      .in('name', [NAME_A, NAME_B]);
    expect(rows).toHaveLength(2);
    const itemA = rows.find((r) => r.name === NAME_A);
    expect(itemA.category_name).toBe('Cameras'); // matched case-insensitively
    expect(Number(itemA.purchase_price)).toBe(1234); // "$1,234" parsed, not 0 or 3
    expect(itemA.serial_number).toBe(`ZZZ-SN-${STAMP}`);
    expect(itemA.status).toBe('available');

    // The note landed in item_notes with the newline intact
    await expect
      .poll(
        async () => {
          const { data } = await db.from('item_notes').select('text').eq('item_id', itemA.id);
          return data?.[0]?.text ?? null;
        },
        { timeout: 10000 },
      )
      .toBe('line one\nline two');

    // Survives a full reload — the regression that motivated this round
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await page.locator('input[placeholder*="Search"]').first().fill(NAME_A);
    await expect(page.getByText(NAME_A).first()).toBeVisible({ timeout: 15000 });
  });
});

test.describe('database export', () => {
  test('downloads a complete backup including lazy and never-in-memory tables', async ({
    page,
    pages,
  }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();

    await pages.dashboard.sidebar.locator('button:has-text("Export Data")').click();
    await expect(page.getByText('Export Database')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^sims-backup-\d{4}-\d{2}-\d{2}\.json$/);

    const backup = JSON.parse(await readFile(await download.path(), 'utf-8'));
    expect(backup.version).toBe('3.0');
    expect(backup.format).toBe('tables');
    // Lazy table: seed clients are in the file even though the UI never
    // loaded them this session
    expect(backup.tables.clients.length).toBeGreaterThan(0);
    // Never-in-memory tables ride along with the inventory section
    expect(Array.isArray(backup.tables.item_notes)).toBe(true);
    expect(Array.isArray(backup.tables.checkout_history)).toBe(true);
    expect(Array.isArray(backup.tables.reservations)).toBe(true);
    // Users and audit log stay out unless opted in
    expect(backup.tables.users).toBeUndefined();
    expect(backup.tables.audit_log).toBeUndefined();
    // Counts match contents
    expect(backup.counts.clients).toBe(backup.tables.clients.length);
  });
});

test.describe('inventory export modal', () => {
  test('exports labeled CSV and closes the modal', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Reports');
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Export All' }).click();
    await expect(page.getByRole('heading', { name: 'Export Data' })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page
      .locator('.modal-backdrop')
      .getByRole('button', { name: 'Export', exact: true })
      .click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^inventory-\d{4}-\d{2}-\d{2}\.csv$/);

    const firstLine = (await readFile(await download.path(), 'utf-8')).split('\n')[0];
    expect(firstLine).toContain('"ID"');
    expect(firstLine).toContain('"Name"');

    // Modal closes itself after exporting
    await expect(page.getByRole('heading', { name: 'Export Data' })).toHaveCount(0, {
      timeout: 5000,
    });
  });
});

test.describe('permission gating', () => {
  test.use({ storageState: STORAGE_STATE.user });

  test('standard user does not see the database export', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await expect(
      pages.dashboard.sidebar.locator('button:has-text("Export Data")'),
    ).toHaveCount(0);
  });
});
