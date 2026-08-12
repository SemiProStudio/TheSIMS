// =============================================================================
// E2E Tests - Packages
// Regression guards for the packages improvement round: metadata editing
// (rename via the details modal — previously impossible), persisted package
// notes, delete with DB verification, and Reserve-from-package prefilling
// the multi-item reservation modal.
// Mutating tests create a private "ZZZ E2E" package (seed pkg-* rows are
// never modified) and reservations cleaned up by project prefix.
// =============================================================================

import { test, expect, pickDate } from './fixtures.js';
import { E2E_PREFIX, adminDb } from './db.js';

async function openPackages(page, pages) {
  await page.goto('/');
  await pages.dashboard.expectDashboard();
  await pages.dashboard.navigateTo('Packages');
  await expect(page.locator('h2:has-text("Packages")')).toBeVisible({ timeout: 10000 });
}

test.describe('Package lifecycle', () => {
  const baseName = `${E2E_PREFIX} Package`;
  const renamedName = `${E2E_PREFIX} Package Renamed`;

  test.afterEach(async () => {
    const db = await adminDb();
    await db.from('packages').delete().ilike('name', `${E2E_PREFIX}%`);
  });

  test('create, rename via details modal, persist a note, delete', async ({ page, pages }) => {
    await openPackages(page, pages);

    // ---- Create ----
    await page.getByRole('button', { name: 'Create Package' }).click();
    const modal = page.locator('[role="dialog"]');
    await expect(modal.getByText('New Package')).toBeVisible();
    await modal.getByPlaceholder('e.g., Wedding Photography Package').fill(baseName);
    await modal.getByPlaceholder('Describe what this package is for...').fill('Created by E2E');
    await modal.getByRole('button', { name: 'Continue to Select Items' }).click();

    // Item selection: pick one seed item (selection does not mutate the item)
    await page.getByPlaceholder('Search items...').fill('Sony A7S III');
    await page.getByRole('checkbox', { name: 'Select Sony A7S III' }).check();
    await page.getByRole('button', { name: 'Create Package', exact: true }).click();

    // Lands on the detail view
    await expect(page.locator(`h2:has-text("${baseName}")`)).toBeVisible();
    await expect(page.getByRole('button', { name: /Reserve/ })).toBeVisible();

    // ---- Rename through the details modal (was impossible before) ----
    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByText('Edit Package Details')).toBeVisible();
    const nameInput = page.getByPlaceholder('e.g., Wedding Photography Package');
    await expect(nameInput).toHaveValue(baseName);
    await nameInput.fill(renamedName);
    await page.getByRole('button', { name: 'Continue to Select Items' }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator(`h2:has-text("${renamedName}")`)).toBeVisible();

    // ---- Note persists to package_notes ----
    await page.getByPlaceholder('Add a note...').fill('E2E package note');
    await page.getByPlaceholder('Add a note...').press('Enter');
    await expect(page.getByText('E2E package note')).toBeVisible();

    // Wait for the optimistic write to land server-side before reloading
    const db = await adminDb();
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from('package_notes')
            .select('id')
            .eq('text', 'E2E package note');
          return data?.length || 0;
        },
        { timeout: 10000 },
      )
      .toBe(1);

    // Survives a full reload (note came back from the DB, not local state)
    await openPackages(page, pages);
    await page.getByText(renamedName).first().click();
    await expect(page.getByText('E2E package note')).toBeVisible({ timeout: 10000 });

    // ---- Delete, verified server-side ----
    await page.getByTitle('Delete package').click();
    await expect(page.getByText(/Are you sure you want to delete/)).toBeVisible();
    // Scoped to the confirm dialog — the notes section has Delete buttons too
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.locator('h2:has-text("Packages")')).toBeVisible();
    await expect(page.getByText(renamedName)).toHaveCount(0);
    await expect
      .poll(async () => {
        const { data } = await db.from('packages').select('id').eq('name', renamedName);
        return data?.length || 0;
      })
      .toBe(0);
  });
});

test.describe('Reserve from package', () => {
  test.afterEach(async () => {
    const db = await adminDb();
    await db.from('reservations').delete().ilike('project', `${E2E_PREFIX}%`);
  });

  test('prefills the reservation modal with every package item', async ({ page, pages }) => {
    const project = `${E2E_PREFIX} Package Reservation`;
    await openPackages(page, pages);

    // Seed package (read-only here: reserving creates reservation rows only)
    await page.getByText('Corporate Video Kit').first().click();
    await expect(page.locator('h2:has-text("Corporate Video Kit")')).toBeVisible();
    await page.getByRole('button', { name: /Reserve/ }).click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    // All package items arrive preselected — the save button counts them
    const saveButton = modal.getByRole('button', { name: /^(Add Reservation|Save Anyway)/ });
    await expect(saveButton).toContainText(/\(\d+ items\)|Save Anyway|Add Reservation/);

    await modal.locator('input[placeholder="e.g., Wedding - Smith/Jones"]').fill(project);
    await modal.locator('input[placeholder="e.g., John Smith"]').fill(`${E2E_PREFIX} Contact`);
    // Far-future dates to stay clear of seed reservations
    await pickDate(page, modal.locator('input[placeholder="Select start date"]'), 90);
    await pickDate(page, modal.locator('input[placeholder="Select end date"]'), 92);

    // Acknowledge conflicts if any seed reservation overlaps anyway
    const conflictBanner = modal.getByText('Scheduling Conflicts Detected');
    if (await conflictBanner.isVisible().catch(() => false)) {
      await modal.getByText('I understand and want to proceed anyway').click();
    }

    await expect(saveButton).toBeEnabled();
    const itemCountLabel = await saveButton.textContent();
    await saveButton.click();
    await expect(modal).toBeHidden();

    // One reservation row per package item lands in the DB
    const expectedCount = parseInt(itemCountLabel.match(/\((\d+) items\)/)?.[1] || '1', 10);
    const db = await adminDb();
    await expect
      .poll(
        async () => {
          const { data } = await db.from('reservations').select('id').eq('project', project);
          return data?.length || 0;
        },
        { timeout: 10000 },
      )
      .toBe(expectedCount);
  });
});
