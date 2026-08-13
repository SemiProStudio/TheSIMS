// =============================================================================
// E2E Tests - Global Search
// Covers the global-search round: one query spans gear, clients, packages,
// and reservations (seeded rows only — read-only, no ZZZ data needed), the
// back button returns to the search exactly as it was left, sidebar re-click
// starts fresh, and the status filter speaks human ("Checked Out", not
// 'checked-out').
// =============================================================================
import { test, expect } from './fixtures.js';

const searchBox = (page) => page.getByPlaceholder(/Search gear, clients/);

test.describe('Global search', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Search');
    await expect(page.locator('h2:has-text("Search")')).toBeVisible({ timeout: 10000 });
  });

  test('starts with a prompt instead of dumping the inventory', async ({ page }) => {
    await expect(page.getByText('Search everything in SIMS')).toBeVisible();
  });

  test('finds gear by serial number and shows it in the row', async ({ page }) => {
    await searchBox(page).fill('SN-A7S3-001');
    await expect(page.getByText('Sony A7S III')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/SN-A7S3-001/)).toBeVisible();
  });

  test('matches multi-word queries across fields', async ({ page }) => {
    await searchBox(page).fill('sony a7s');
    await expect(page.getByText('Sony A7S III')).toBeVisible({ timeout: 10000 });
  });

  test('finds packages', async ({ page }) => {
    await searchBox(page).fill('interview');
    await expect(
      page.getByRole('button', { name: 'View package Interview Kit - 2 Person' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('finds clients and opens the client detail', async ({ page }) => {
    await searchBox(page).fill('acme');
    await page
      .getByRole('button', { name: 'View client Acme Productions' })
      .click({ timeout: 10000 });
    await expect(page.locator('h2:has-text("Acme Productions")')).toBeVisible({ timeout: 15000 });
  });

  test('finds a seeded reservation and returns to the search on back', async ({ page }) => {
    await searchBox(page).fill('wedding');
    await page
      .getByRole('button', { name: 'View reservation Wedding - Smith/Jones' })
      .click({ timeout: 10000 });

    // Reservation detail
    await expect(page.locator('h1:has-text("Wedding - Smith/Jones")')).toBeVisible({
      timeout: 15000,
    });

    // Back returns to the search, query intact
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('h2:has-text("Search")')).toBeVisible({ timeout: 10000 });
    await expect(searchBox(page)).toHaveValue('wedding');
  });

  test('item detail back button returns to the search as it was left', async ({ page }) => {
    await searchBox(page).fill('SN-A7S3-001');
    await page.getByRole('button', { name: 'View Sony A7S III' }).click({ timeout: 10000 });

    // Item detail with the search-aware back label
    await expect(page.locator('h1:has-text("Sony A7S III")')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Back to Search' }).click();

    // The search survives the round-trip
    await expect(page.locator('h2:has-text("Search")')).toBeVisible({ timeout: 10000 });
    await expect(searchBox(page)).toHaveValue('SN-A7S3-001');
    await expect(page.getByText('Sony A7S III')).toBeVisible();
  });

  test('sidebar re-entry starts a fresh search', async ({ page, pages }) => {
    await searchBox(page).fill('sony');
    await expect(page.getByText('Sony A7S III')).toBeVisible({ timeout: 10000 });

    await pages.dashboard.navigateTo('Dashboard');
    await pages.dashboard.navigateTo('Search');

    await expect(page.getByText('Search everything in SIMS')).toBeVisible({ timeout: 10000 });
    await expect(searchBox(page)).toHaveValue('');
  });

  test('status filter speaks human labels including the computed states', async ({ page }) => {
    await page.getByLabel('Gear Status').click();
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    await expect(listbox.getByRole('option', { name: 'Checked Out' })).toBeVisible();
    await expect(listbox.getByRole('option', { name: 'Overdue' })).toBeVisible();
    await expect(listbox.getByRole('option', { name: 'Low Stock' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(listbox).toBeHidden();
  });
});
