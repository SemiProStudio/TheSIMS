// =============================================================================
// Reports — E2E
// Covers the reports visualization round against the real DB:
//   - hub renders every card with live chart visuals and consistent numbers
//   - card-level Export downloads that report's CSV (Activity used to open
//     the generic inventory export instead)
//   - each detail report renders: maintenance waits for the FULL record set,
//     activity loads checkout_history and re-buckets on range change
//   - report table rows are keyboard-activatable
// Read-only: no ZZZ data is created, nothing to clean up.
// =============================================================================
import { test, expect } from './fixtures.js';

test.describe('reports hub', () => {
  test('renders all six cards with chart visuals', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Reports');
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 15000 });

    for (const card of [
      'Inventory Summary',
      'Activity',
      'Alerts',
      'Maintenance Report',
      'Insurance Report',
      'Client Report',
    ]) {
      await expect(page.locator(`h4:has-text("${card}")`)).toBeVisible();
    }

    // The inventory status donut is a real labeled image
    await expect(page.getByRole('img', { name: /Inventory by status/ }).first()).toBeVisible();

    // Maintenance card resolves its lazy full-history load (no stuck spinner)
    await expect(page.getByText('Loading history…')).toHaveCount(0, { timeout: 15000 });
  });

  test('Activity card Export downloads the activity CSV, not the inventory export', async ({
    page,
    pages,
  }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Reports');
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 15000 });

    const activityCard = page
      .locator('div:has(h4:has-text("Activity")):has(button:has-text("Export"))')
      .last();
    const downloadPromise = page.waitForEvent('download');
    await activityCard.getByRole('button', { name: 'Export' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^activity-report-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

test.describe('detail reports', () => {
  test('every report renders its charts and honest data states', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Reports');
    await expect(page.locator('h2:has-text("Reports")')).toBeVisible({ timeout: 15000 });

    // --- Inventory Summary ---
    await page
      .locator('div:has(h4:has-text("Inventory Summary")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Inventory Summary")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('CA1001').first()).toBeVisible();
    await expect(page.getByRole('img', { name: /Items by status/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /value per category/ })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Reports' }).click();

    // --- Activity: trend loads from checkout_history, range buttons re-bucket ---
    await page
      .locator('div:has(h4:has-text("Activity")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Activity Report")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Loading checkout history…')).toHaveCount(0, { timeout: 15000 });
    await expect(page.getByText(/Checkout Trend — \d+ in the last 90 days/)).toBeVisible();
    const btn30 = page.getByRole('button', { name: '30 days' });
    await btn30.click();
    await expect(btn30).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Checkout Trend — \d+ in the last 30 days/)).toBeVisible();
    await expect(page.getByRole('img', { name: /day of week/ })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Reports' }).click();

    // --- Alerts: derived-status assembly renders ---
    await page
      .locator('div:has(h4:has-text("Alerts")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Alerts Report")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Alert Breakdown')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Reports' }).click();

    // --- Maintenance: waits for the FULL record set, then shows cost stats ---
    await page
      .locator('div:has(h4:has-text("Maintenance Report")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Maintenance Report")')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Loading full maintenance history…')).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(page.getByText('Total Records')).toBeVisible();
    await expect(page.getByText('Warranty Savings')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Reports' }).click();

    // --- Insurance: depreciation pairs + value distribution ---
    await page
      .locator('div:has(h4:has-text("Insurance Report")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Insurance Report")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Current vs. Purchase by Category')).toBeVisible();
    await expect(page.getByRole('img', { name: /value band/ })).toBeVisible();
    await page.getByRole('button', { name: 'Back to Reports' }).click();

    // --- Clients: grouped bookings table with seed clients ---
    await page
      .locator('div:has(h4:has-text("Client Report")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Client Report")')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Clients by Booking Count')).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('report table rows open items from the keyboard', async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
    await pages.dashboard.navigateTo('Reports');
    await page
      .locator('div:has(h4:has-text("Inventory Summary")):has(button:has-text("View"))')
      .last()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page.locator('h2:has-text("Inventory Summary")')).toBeVisible({ timeout: 15000 });

    const firstRow = page.locator('tbody tr.report-tr').first();
    await firstRow.focus();
    await page.keyboard.press('Enter');
    // Row activation navigates to the item detail — the report header is gone
    await expect(page.locator('h2:has-text("Inventory Summary")')).toHaveCount(0, {
      timeout: 10000,
    });
  });
});
