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
import { createTestItem, deleteTestItem, adminDb, E2E_PREFIX } from './db.js';

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

  // Scoped cleanup — see auth.setup for the run-start global purge; a
  // mid-run cleanupTestData here wiped other specs' live ZZZ data
  test.afterAll(async () => {
    const db = await adminDb();
    await db.from('pack_lists').delete().eq('name', LIST_NAME);
    await deleteTestItem(itemAId);
    await deleteTestItem(itemBId);
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

// =============================================================================
// Scan-to-Pack package units (QR round)
// Packages on a list are physical cases — scanning their label packs them.
// Requires the pack_list_packages.is_packed migration; on a DB that hasn't
// run it yet these tests SKIP loudly instead of failing.
// =============================================================================
test.describe.serial('scan-to-pack package units', () => {
  const PKG_LIST_NAME = `${E2E_PREFIX} PackList ScanPkg`;
  let migrated = false;
  let itemCId;
  let listId;

  test.beforeAll(async () => {
    const db = await adminDb();
    const probe = await db.from('pack_list_packages').select('is_packed').limit(1);
    migrated = !probe.error;
    if (!migrated) return;

    itemCId = await createTestItem({ name: `${E2E_PREFIX} ScanPkgItem` });
    const { data: list, error } = await db
      .from('pack_lists')
      .insert({ id: crypto.randomUUID(), name: PKG_LIST_NAME })
      .select()
      .single();
    if (error) throw error;
    listId = list.id;
    // Seed package pkg-doc rides along as a unit; only OUR list row gains
    // packed state — the package itself is never mutated
    const { error: syncError } = await db.rpc('sync_pack_list_children', {
      p_pack_list_id: listId,
      p_items: [{ id: itemCId, quantity: 1, is_packed: false }],
      p_package_ids: ['pkg-doc'],
    });
    if (syncError) throw syncError;
  });

  test.afterAll(async () => {
    const db = await adminDb();
    if (listId) await db.from('pack_lists').delete().eq('id', listId);
    if (itemCId) await deleteTestItem(itemCId);
  });

  test('scanning a package label packs it; contained items point to the package', async ({
    page,
    pages,
  }) => {
    test.skip(!migrated, 'pack_list_packages.is_packed migration not applied to this DB yet');

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Pack Lists');
    await page.getByText(PKG_LIST_NAME).first().click();
    await expect(page.locator(`h2:has-text("${PKG_LIST_NAME}")`)).toBeVisible({ timeout: 15000 });

    // Item + package both count toward progress
    await expect(page.locator('text=0/2 packed')).toBeVisible();

    await page.getByRole('button', { name: 'Scan to Pack' }).click();
    const manual = page.getByPlaceholder('Item ID or Serial Number');

    // Package label → packed
    await manual.fill('pkg-doc');
    await page.getByRole('button', { name: 'Pack', exact: true }).click();
    await expect(page.getByText('1/2 packed', { exact: true })).toBeVisible();

    // DB truth: OUR list's junction row is packed
    await expect
      .poll(
        async () => {
          const db = await adminDb();
          const { data } = await db
            .from('pack_list_packages')
            .select('is_packed')
            .eq('pack_list_id', listId)
            .eq('package_id', 'pkg-doc');
          return data?.[0]?.is_packed ?? null;
        },
        { timeout: 10000 },
      )
      .toBe(true);

    // Scanning an item that lives INSIDE the listed package: acknowledged,
    // not "Not in List", and nothing toggles
    await manual.fill('CA1004');
    await page.getByRole('button', { name: 'Pack', exact: true }).click();
    await expect(page.getByText('Scan the package label')).toBeVisible();
    await expect(page.getByText('1/2 packed', { exact: true })).toBeVisible();

    // Re-scanning the packed package reports Already Packed
    await manual.fill('pkg-doc');
    await page.getByRole('button', { name: 'Pack', exact: true }).click();
    await expect(page.getByText('Already packed').first()).toBeVisible();

    // Close the overlay — the detail toggle shows the packed pill state too
    await page.locator('.modal-backdrop button.btn-icon').first().click();
    await expect(
      page.getByRole('button', { name: /Documentary Run & Gun — mark unpacked/ }),
    ).toBeVisible();
  });
});
