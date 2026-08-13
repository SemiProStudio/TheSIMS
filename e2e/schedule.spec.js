// =============================================================================
// E2E Tests - Schedule / multi-item reservations
// Covers the schedule hardening round against the real DB:
//   - creating a multi-item reservation stamps one shared group_id and the
//     creator, and reconciles item status to 'reserved' (starts today)
//   - the schedule shows the group as ONE entry
//   - editing the group renames EVERY row (the old name-matched edit updated
//     only the first row and silently split the group)
//   - checkout warns when a reservation overlaps the checkout window
//   - cancelling soft-cancels all rows (history kept) and returns items to
//     'available'
// REQUIRES the reservations.group_id migration on the test project.
// =============================================================================
import { test, expect, pickDate } from './fixtures.js';
import { createTestItem, cleanupTestData, adminDb, E2E_PREFIX } from './db.js';

const PROJECT = `${E2E_PREFIX} Sched Group`;
const ITEM_A = `${E2E_PREFIX} SchedItemA`;
const ITEM_B = `${E2E_PREFIX} SchedItemB`;

test.describe.serial('multi-item reservation lifecycle', () => {
  let itemAId;
  let itemBId;

  test.beforeAll(async () => {
    itemAId = await createTestItem({ name: ITEM_A });
    itemBId = await createTestItem({ name: ITEM_B });
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('create → group entry → edit updates all rows → checkout warns → cancel releases', async ({
    page,
    pages,
  }) => {
    const db = await adminDb();

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Schedule');
    await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 15000 });

    // --- Create a 2-item reservation starting today ---
    await page.getByRole('button', { name: 'New' }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const search = modal.locator('input[placeholder="Search items by name, ID, or brand..."]');
    await search.fill(itemAId);
    await modal.getByText(ITEM_A).first().click();
    await search.fill(itemBId);
    await modal.getByText(ITEM_B).first().click();

    await modal.locator('input[placeholder="e.g., Wedding - Smith/Jones"]').fill(PROJECT);
    await modal.locator('input[placeholder="e.g., John Smith"]').fill(`${E2E_PREFIX} Contact`);
    await pickDate(page, modal.locator('input[placeholder="Select start date"]'), 0);
    await pickDate(page, modal.locator('input[placeholder="Select end date"]'), 2);

    await modal.getByRole('button', { name: /^Add Reservation/ }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    // Lands on the reservation detail
    await expect(page.locator(`h1:has-text("${PROJECT}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=2 items reserved')).toBeVisible();

    // DB truth: two rows, one shared group_id, creator recorded
    const { data: rows } = await db
      .from('reservations')
      .select('id, item_id, group_id, created_by_name, status')
      .eq('project', PROJECT);
    expect(rows).toHaveLength(2);
    expect(rows[0].group_id).toBeTruthy();
    expect(rows[0].group_id).toBe(rows[1].group_id);
    expect(rows[0].created_by_name).toBeTruthy();

    // Starts today → items reconcile to 'reserved'
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('inventory')
            .select('id, status')
            .in('id', [itemAId, itemBId]);
          return data?.map((r) => r.status).join(',');
        },
        { timeout: 10000 },
      )
      .toBe('reserved,reserved');

    // --- One grouped entry on the schedule ---
    await page.locator('button:has-text("Back")').first().click();
    await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${PROJECT}`)).toHaveCount(1);
    await expect(page.locator('text=2 items').first()).toBeVisible();

    // --- Edit the group: rename must hit BOTH rows ---
    await page.locator(`text=${PROJECT}`).first().click();
    await expect(page.locator(`h1:has-text("${PROJECT}")`)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Edit Reservation' }).click();
    await expect(modal).toBeVisible();
    await modal
      .locator('input[placeholder="e.g., Wedding - Smith/Jones"]')
      .fill(`${PROJECT} RENAMED`);
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('reservations')
            .select('project')
            .in('item_id', [itemAId, itemBId]);
          return data?.filter((r) => r.project === `${PROJECT} RENAMED`).length;
        },
        { timeout: 10000 },
      )
      .toBe(2);

    // --- Checkout warns about the active reservation ---
    // The item is 'reserved' now — the status reconciliation put it there
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    await pages.gearList.openItem(itemAId, ITEM_A, 'reserved');
    await pages.itemDetail.expectItemDetail();
    await page.getByRole('button', { name: 'Check Out', exact: true }).click();
    await expect(page.locator('text=reserved during the checkout period')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(`text=${PROJECT} RENAMED`).first()).toBeVisible();
    await page.keyboard.press('Escape');

    // --- Cancel the group from the reservation detail ---
    await pages.dashboard.navigateTo('Schedule');
    await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 10000 });
    await page.locator(`text=${PROJECT} RENAMED`).first().click();
    await expect(page.locator(`h1:has-text("${PROJECT} RENAMED")`)).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: 'Cancel Reservation' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Cancel Reservation' })
      .click();

    // Soft-cancel: rows keep history with status='cancelled'
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('reservations')
            .select('status')
            .in('item_id', [itemAId, itemBId]);
          return data?.filter((r) => r.status === 'cancelled').length;
        },
        { timeout: 10000 },
      )
      .toBe(2);

    // Items are released back to available
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('inventory')
            .select('status')
            .in('id', [itemAId, itemBId]);
          return data?.map((r) => r.status).join(',');
        },
        { timeout: 10000 },
      )
      .toBe('available,available');
  });
});
