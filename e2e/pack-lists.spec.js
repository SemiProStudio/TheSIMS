// =============================================================================
// Pack Lists — E2E lifecycle
// Covers the pack-lists hardening round against the real DB + RPC:
//   - create → detail (created-by recorded)
//   - packed toggle persists as a single-row update AND bumps the parent
//     updated_at so the freshness watermark sees it (cross-device refresh)
//   - packed state survives a reload and an edit's child-table rewrite
//   - sidebar re-click while in the detail view returns to the overview
//   - fulfillability banner appears for unavailable items
//   - reset clears packed state (persist-first)
//   - delete removes the list from the DB
// Only ZZZ E2E data is created; cleanupTestData purges it.
// =============================================================================
import { test, expect } from './fixtures.js';
import { createTestItem, cleanupTestData, adminDb, E2E_PREFIX } from './db.js';

const LIST_NAME = `${E2E_PREFIX} PackList Lifecycle`;
const ITEM_A = `${E2E_PREFIX} PackItemA`;
const ITEM_B = `${E2E_PREFIX} PackItemB`;

test.describe.serial('pack lists lifecycle', () => {
  let itemAId;
  let itemBId;

  test.beforeAll(async () => {
    itemAId = await createTestItem({ name: ITEM_A });
    // Checked out on purpose: the detail view must flag it as unavailable
    itemBId = await createTestItem({ name: ITEM_B, status: 'checked-out' });
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('create, pack, watermark, reload, sidebar reset, edit, reset, delete', async ({
    page,
    pages,
  }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Pack Lists');
    await expect(page.locator('h2:has-text("Pack Lists")')).toBeVisible({ timeout: 15000 });

    // --- Create with both items ---
    await page.locator('button:has-text("Create Pack List")').click();
    await page.locator('input[placeholder*="Smith Wedding"]').fill(LIST_NAME);
    await page.locator('button:has-text("Continue")').click();
    await page.locator('input[placeholder="Search items..."]').fill(`${E2E_PREFIX} PackItem`);
    await page.locator(`.selection-item:has-text("${ITEM_A}")`).click();
    await page.locator(`.selection-item:has-text("${ITEM_B}")`).click();
    await expect(page.locator('text=2 items selected')).toBeVisible();
    await page.locator('button:has-text("Create Pack List")').last().click();

    await expect(page.locator(`h2:has-text("${LIST_NAME}")`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=0/2 packed')).toBeVisible();

    // Fulfillability banner: item B is checked out
    await expect(page.locator('text=1 item on this list may not be available')).toBeVisible();
    await expect(page.locator('text=1 checked out')).toBeVisible();

    // created-by was recorded
    const db = await adminDb();
    const { data: listRow } = await db
      .from('pack_lists')
      .select('id, created_by_name, updated_at')
      .eq('name', LIST_NAME)
      .single();
    expect(listRow).toBeTruthy();
    expect(listRow.created_by_name).toBeTruthy();

    // --- Toggle packed on item A: child row persists, parent watermark bumps ---
    const updatedAtBeforeToggle = listRow.updated_at;
    await page.locator(`.list-item:has-text("${ITEM_A}") button[title="Mark as packed"]`).click();
    await expect(page.locator('text=1/2 packed')).toBeVisible();

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('pack_list_items')
            .select('is_packed')
            .eq('pack_list_id', listRow.id)
            .eq('item_id', itemAId)
            .single();
          return data?.is_packed;
        },
        { timeout: 10000 },
      )
      .toBe(true);

    // Freshness watermark: MAX(pack_lists.updated_at) must move on a packed
    // toggle, or other devices never refresh pack progress
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('pack_lists')
            .select('updated_at')
            .eq('id', listRow.id)
            .single();
          return data?.updated_at > updatedAtBeforeToggle;
        },
        { timeout: 10000 },
      )
      .toBe(true);

    // --- Sidebar re-click from the detail view lands on the overview ---
    await pages.dashboard.navigateTo('Pack Lists');
    await expect(page.locator('h2:has-text("Pack Lists")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`h2:has-text("${LIST_NAME}")`)).toHaveCount(0);

    // --- Reload: packed state survives a full refetch ---
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Pack Lists');
    await page.locator(`.card-clickable:has-text("${LIST_NAME}")`).click();
    await expect(page.locator(`h2:has-text("${LIST_NAME}")`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=1/2 packed')).toBeVisible({ timeout: 10000 });

    // --- Edit: remove item B; item A's packed state survives the rewrite ---
    await page.locator('button:has-text("Edit")').first().click();
    await expect(page.locator(`text=Edit Pack List: ${LIST_NAME}`)).toBeVisible();
    await page.locator('input[placeholder="Search items..."]').fill(ITEM_B);
    await page.locator(`.selection-item:has-text("${ITEM_B}")`).click();
    await expect(page.locator('text=1 items selected')).toBeVisible();
    await page.locator('button:has-text("Save Changes")').click();

    await expect(page.locator(`h2:has-text("${LIST_NAME}")`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Items (1)')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=1/1 packed')).toBeVisible();

    // --- Reset packed (confirm button is labeled Reset, not Delete) ---
    await page.locator('button:has-text("Reset")').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('text=0/1 packed')).toBeVisible({ timeout: 10000 });

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('pack_list_items')
            .select('is_packed')
            .eq('pack_list_id', listRow.id)
            .eq('item_id', itemAId)
            .single();
          return data?.is_packed;
        },
        { timeout: 10000 },
      )
      .toBe(false);

    // --- Delete ---
    await page.locator(`.detail-header-actions button[aria-label="Delete ${LIST_NAME}"]`).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('h2:has-text("Pack Lists")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`.card-clickable:has-text("${LIST_NAME}")`)).toHaveCount(0);

    await expect
      .poll(async () => {
        const { data } = await db.from('pack_lists').select('id').eq('name', LIST_NAME);
        return data?.length ?? -1;
      })
      .toBe(0);
  });
});
