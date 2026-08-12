// =============================================================================
// E2E Tests - Gear List
// Regression guards for the gear-list improvement round: serial-number
// search, sorting, export-scoped-to-selection (was silently exporting
// everything), the Kits filter, and saved views persisted per-user.
// Mutating tests use private ZZZ items / clean up what they save.
// =============================================================================

import fs from 'fs';
import { test, expect } from './fixtures.js';
import { E2E_PREFIX, adminDb, createTestItem, deleteTestItem } from './db.js';

async function openGearList(page, pages) {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Gear List');
  await expect(page.locator('h2:has-text("Gear List")')).toBeVisible({ timeout: 10000 });
}

const searchBox = (page) => page.getByPlaceholder('Search name, ID, brand, serial...');

test.describe('Gear list search and sort', () => {
  test.beforeEach(async ({ page, pages }) => {
    await openGearList(page, pages);
  });

  test('finds items by serial number', async ({ page }) => {
    await searchBox(page).fill('SN-A7S3-001');
    await expect(page.getByText('Sony A7S III').first()).toBeVisible();
    await expect(page.getByText(/1 item \(filtered\)/)).toBeVisible();
  });

  test('sorts by name in both directions', async ({ page }) => {
    // Switch to list view for stable row order reading
    await page.getByRole('button', { name: 'List view' }).click();

    const rowNames = async () =>
      (await page.locator('.card h4, .card div[style*="font-weight"]').allTextContents()).filter(
        Boolean,
      );

    await page.getByLabel('Sort items').click();
    await page.getByRole('option', { name: 'Name A–Z' }).click();
    const asc = await rowNames();
    expect(asc.length).toBeGreaterThan(3);
    expect([...asc].sort((a, b) => a.localeCompare(b))).toEqual(asc);

    await page.getByLabel('Sort items').click();
    await page.getByRole('option', { name: 'Name Z–A' }).click();
    const desc = await rowNames();
    expect([...desc].sort((a, b) => b.localeCompare(a))).toEqual(desc);
  });
});

test.describe('Gear list kits filter', () => {
  test('kits are hidden by default and shown under the Kits filter', async ({ page, pages }) => {
    const kitId = await createTestItem({
      name: `${E2E_PREFIX} Test Kit`,
      columns: { is_kit: true, kit_contents: [] },
    });
    try {
      await openGearList(page, pages);

      // Hidden in normal browsing, even when searched
      await searchBox(page).fill(`${E2E_PREFIX} Test Kit`);
      await expect(page.getByText('No items found matching your criteria')).toBeVisible();
      await searchBox(page).fill('');

      // Visible under the Kits filter with a Kit badge
      await page.getByLabel('Filter by category').click();
      await page.getByRole('option', { name: 'Kits' }).click();
      const kitRow = page.locator('.card').filter({ hasText: `${E2E_PREFIX} Test Kit` });
      await expect(kitRow).toBeVisible();
      await expect(kitRow.getByText('Kit', { exact: true })).toBeVisible();
    } finally {
      await deleteTestItem(kitId);
    }
  });
});

test.describe('Gear list selection export', () => {
  test('Export Data exports exactly the selected items as CSV', async ({ page, pages }) => {
    await openGearList(page, pages);

    await page.getByRole('button', { name: 'Multiple Selection' }).click();
    await page.getByRole('checkbox', { name: 'Select Sony A7S III' }).click();
    await page.getByRole('checkbox', { name: 'Select Sony FX6' }).click();
    await expect(page.getByText('2 of 20 selected')).toBeVisible();

    // Export from the selection toolbar — the modal states the scope
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByText('Exporting 2 selected items')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Export', exact: true })
      .click();
    const download = await downloadPromise;

    const csv = fs.readFileSync(await download.path(), 'utf-8').trim();
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + exactly the 2 selected items
    expect(csv).toContain('Sony A7S III');
    expect(csv).toContain('Sony FX6');
    expect(csv).not.toContain('Canon EOS R5');
  });
});

test.describe('Gear list saved views', () => {
  test('saves, persists across reload (user profile), loads, and deletes a view', async ({
    page,
    pages,
  }) => {
    const viewName = `${E2E_PREFIX} Sony View`;
    await openGearList(page, pages);

    // Apply filters and save them
    await searchBox(page).fill('sony');
    await page.getByRole('button', { name: /Saved Views/ }).click();
    await page.getByRole('button', { name: 'Save Current Filters' }).click();
    await page.getByPlaceholder('View name...').fill(viewName);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Trigger now shows the active view's name
    await expect(page.getByRole('button', { name: viewName, exact: true })).toBeVisible();

    // The profile write is optimistic fire-and-forget — wait for it to land
    // in the DB before reloading, or the reload aborts the in-flight request.
    const db = await adminDb();
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('users')
            .select('profile')
            .eq('email', process.env.E2E_ADMIN_EMAIL)
            .single();
          return (data?.profile?.savedFilterViews || []).some((v) => v.name === viewName);
        },
        { timeout: 10000 },
      )
      .toBe(true);

    // Survives a full reload (persisted in the user profile, not just this tab)
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Gear List');
    await page.getByRole('button', { name: /Saved Views/ }).click();
    await expect(page.getByText(viewName)).toBeVisible();

    // Loading it applies the filters
    await page.getByText(viewName).click();
    await expect(searchBox(page)).toHaveValue('sony');

    // Clean up: delete the view (with confirmation)
    await page.getByRole('button', { name: viewName, exact: true }).click();
    await page.getByRole('button', { name: `Delete saved view ${viewName}` }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: /Saved Views/ }).click();
    await expect(page.getByText(viewName)).not.toBeVisible();
  });
});
