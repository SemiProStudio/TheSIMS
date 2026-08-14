// =============================================================================
// E2E Tests - Clients
// Covers the clients hardening round against the real DB. The headline test
// is the CREATE regression: the old payload carried camelCase timestamps
// that PostgREST rejected (PGRST204), so no client created through the UI
// ever reached the database — and edits silently reverted on reload.
// Only ZZZ E2E data is created; cleanupTestData purges it.
// =============================================================================
import { test, expect, STORAGE_STATE } from './fixtures.js';
import { adminDb, E2E_PREFIX } from './db.js';

const CREATED_NAME = `${E2E_PREFIX} Created Client`;
const RENAMED_NAME = `${E2E_PREFIX} Renamed Client`;

test.describe.serial('client lifecycle', () => {
  // Scoped cleanup: the global cleanupTestData purge runs at run START in
  // auth.setup; calling it here mid-run deletes OTHER specs' live ZZZ data
  // on parallel workers (client_notes cascade on client delete)
  test.afterAll(async () => {
    const db = await adminDb();
    await db.from('clients').delete().in('name', [CREATED_NAME, RENAMED_NAME]);
  });

  test('create persists with a DB-generated id', async ({ page, pages }) => {
    const db = await adminDb();

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await expect(page.locator('h2:has-text("Clients")')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Add Client' }).first().click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await modal.locator('input[placeholder="Client name"]').fill(CREATED_NAME);
    await modal.locator('input[placeholder="email@example.com"]').fill('created@example.com');
    await modal.getByRole('button', { name: 'Add Client' }).click();

    // Success lands on the new client's detail view
    await expect(page.locator(`h2:has-text("${CREATED_NAME}")`)).toBeVisible({ timeout: 10000 });

    // DB truth: the row exists with a generated CL### id
    await expect
      .poll(
        async () => {
          const { data } = await db.from('clients').select('id').eq('name', CREATED_NAME);
          return data?.[0]?.id ?? null;
        },
        { timeout: 10000 },
      )
      .toMatch(/^CL/);
  });

  test('edit persists across a full reload', async ({ page, pages }) => {
    const db = await adminDb();

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await page.locator(`text=${CREATED_NAME}`).first().click();
    await expect(page.locator(`h2:has-text("${CREATED_NAME}")`)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Edit' }).first().click();
    const modal = page.locator('[role="dialog"]');
    await modal.locator('input[placeholder="Client name"]').fill(RENAMED_NAME);
    await modal.getByRole('button', { name: 'Save Changes' }).click();
    await expect(modal).toBeHidden({ timeout: 10000 });

    await expect
      .poll(
        async () => {
          const { data } = await db.from('clients').select('name').eq('name', RENAMED_NAME);
          return data?.length;
        },
        { timeout: 10000 },
      )
      .toBe(1);

    // Survives a reload — the old code showed the rename locally and lost it
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await expect(page.locator(`text=${RENAMED_NAME}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('notes persist to client_notes and survive a reload', async ({ page, pages }) => {
    const db = await adminDb();

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await page.locator(`text=${RENAMED_NAME}`).first().click();
    await expect(page.locator(`h2:has-text("${RENAMED_NAME}")`)).toBeVisible({ timeout: 15000 });

    await page.locator('input[placeholder="Add a note..."]').fill('ZZZ E2E persistent note');
    await page.keyboard.press('Enter');
    await expect(page.locator('text=ZZZ E2E persistent note')).toBeVisible();

    // DB row lands (temp id swapped for the UUID)
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('client_notes')
            .select('id')
            .eq('text', 'ZZZ E2E persistent note');
          return data?.length;
        },
        { timeout: 10000 },
      )
      .toBe(1);

    // The note is still there after a reload (hydrated from client_notes —
    // notes used to be local-only and vanished here)
    await page.reload();
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await page.locator(`text=${RENAMED_NAME}`).first().click();
    await expect(page.locator('text=ZZZ E2E persistent note')).toBeVisible({ timeout: 10000 });
  });

  test('delete removes the client after its warning', async ({ page, pages }) => {
    const db = await adminDb();

    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await page.locator(`text=${RENAMED_NAME}`).first().click();
    await expect(page.locator(`h2:has-text("${RENAMED_NAME}")`)).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: `Delete ${RENAMED_NAME}` }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('h2:has-text("Clients")')).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => {
        const { data } = await db.from('clients').select('id').eq('name', RENAMED_NAME);
        return data?.length ?? -1;
      })
      .toBe(0);
  });
});

test.describe('view-only access', () => {
  // Standard users ship with clients: VIEW — they must not see edit UI
  test.use({ storageState: STORAGE_STATE.user });

  test('standard user gets a read-only clients view', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Clients');
    await expect(page.locator('h2:has-text("Clients")')).toBeVisible({ timeout: 15000 });

    await expect(page.locator('text=/view.only/i').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Client' })).toHaveCount(0);
  });
});
