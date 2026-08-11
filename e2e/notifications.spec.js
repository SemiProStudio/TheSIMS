// =============================================================================
// E2E Tests - Notification Settings
// The settings view is reached through the sidebar user menu. Assertions
// use the REAL section/row titles from views/NotificationSettings.jsx —
// the previous version of this spec tested labels that never existed and
// silently skipped every body.
// =============================================================================

import { test, expect, DashboardPage, STORAGE_STATE } from './fixtures.js';

// Toggles are proper switches (role="switch", aria-checked, named after
// their row title).
function rowToggle(page, rowTitle) {
  return page.getByRole('switch', { name: rowTitle });
}

async function openNotificationSettings(page, pages) {
  await pages.dashboard.openUserMenuItem('Notification Settings');
  await expect(page.locator('h2:has-text("Notification Settings")')).toBeVisible();
}

test.describe('Notification Settings', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test('opens from the sidebar user menu and closes back to the dashboard', async ({
    page,
    pages,
  }) => {
    await openNotificationSettings(page, pages);

    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await pages.dashboard.expectDashboard();
  });

  test('displays every section and setting row', async ({ page, pages }) => {
    await openNotificationSettings(page, pages);

    // Master toggle card
    await expect(page.getByText('Email Notifications', { exact: true })).toBeVisible();

    // Sections
    for (const section of ['Due Date Reminders', 'Reservations', 'Checkout & Returns', 'Maintenance']) {
      await expect(page.getByText(section, { exact: true })).toBeVisible();
    }

    // Setting rows (default-open sections)
    for (const row of [
      'Remind me before due dates',
      'Overdue notifications',
      'Reservation confirmations',
      'Reservation reminders',
      'Checkout confirmations',
      'Return confirmations',
      'Maintenance reminders',
    ]) {
      await expect(page.getByText(row, { exact: true })).toBeVisible();
    }
  });

  test('admin sees the collapsed Admin Notifications section', async ({ page, pages }) => {
    await openNotificationSettings(page, pages);

    // Section exists but is collapsed by default — expand it
    const adminSection = page.getByText('Admin Notifications', { exact: true });
    await expect(adminSection).toBeVisible();
    await adminSection.click();

    for (const row of ['Damage reports', 'Overdue summary', 'Low stock alerts']) {
      await expect(page.getByText(row, { exact: true })).toBeVisible();
    }
  });

  test('save is disabled until something changes, then persists', async ({ page, pages }) => {
    await openNotificationSettings(page, pages);

    const saveButton = page.getByRole('button', { name: /Save Preferences|Saving\.\.\./ });
    await expect(saveButton).toBeDisabled();

    // Change something → switch state flips, dirty indicator + enabled save
    const toggle = rowToggle(page, 'Overdue notifications');
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
    await expect(page.getByText('You have unsaved changes')).toBeVisible();
    await expect(saveButton).toBeEnabled();

    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 10000 });
    await expect(page.getByText('You have unsaved changes')).toBeHidden();

    // Restore the original value the same way (round-trip also re-verifies
    // the save path with the opposite value)
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', before);
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 10000 });
  });

  test('due-date reminder day chips toggle the dirty state', async ({ page, pages }) => {
    await openNotificationSettings(page, pages);

    // Scope to the day selector (the reservation section renders its own
    // "1 day" label inside a Select)
    const daySelector = page.getByText('Send reminders:').locator('..');
    for (const chip of ['1 day', '2 days', '3 days', '5 days', '1 week']) {
      await expect(daySelector.getByRole('button', { name: chip, exact: true })).toBeVisible();
    }

    await daySelector.getByRole('button', { name: '1 week', exact: true }).click();
    await expect(page.getByText('You have unsaved changes')).toBeVisible();

    // Leave without saving — nothing persists
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await pages.dashboard.expectDashboard();
  });

  test('is keyboard reachable', async ({ page, pages }) => {
    await openNotificationSettings(page, pages);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(focused);
  });
});

test.describe('Notification Settings for Non-Admin', () => {
  // Reuse the standard user's saved session instead of the default admin one
  test.use({ storageState: STORAGE_STATE.user });

  test('regular users do not see the admin section', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await page.goto('/');
    await dashboardPage.expectDashboard();

    await dashboardPage.openUserMenuItem('Notification Settings');
    await expect(page.locator('h2:has-text("Notification Settings")')).toBeVisible();

    // Regular sections are there…
    await expect(page.getByText('Due Date Reminders', { exact: true })).toBeVisible();
    // …but the admin section must NOT be
    await expect(page.getByText('Admin Notifications', { exact: true })).not.toBeVisible();
  });
});
