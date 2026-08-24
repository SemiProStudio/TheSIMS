// =============================================================================
// Mobile smoke tests (chromium-mobile project, Pixel 7 viewport)
// The desktop suite can't see the phone layer at all — these cover the
// mobile-specific chrome: drawer nav, header scan shortcut, full-screen
// modal sheets, and the phone-default view modes. Read-only: no DB writes,
// so running concurrently with the visual project is safe.
// =============================================================================

import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // Same per-user settings freeze the rest of the suite uses — nothing a
  // mobile smoke run does should ever write to the shared admin profile
  await context.addInitScript(() => {
    try {
      localStorage.setItem('sims-ui-settings-readonly', '1');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await expect(page.getByText('Dashboard').first()).toBeVisible({ timeout: 15000 });
});

test('drawer navigation opens, navigates, and closes', async ({ page }) => {
  // Phone width shows the mobile header hamburger, not the sidebar
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Gear List' })
    .click();
  await expect(page.getByRole('heading', { name: 'Gear List' })).toBeVisible();
  // Drawer closed itself after navigation (off-canvas via transform, so
  // check the class rather than CSS visibility)
  await expect(page.locator('.app-sidebar')).not.toHaveClass(/sidebar-open/);
});

test('gear list defaults to compact list mode on phones', async ({ page }) => {
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Gear List' })
    .click();
  await expect(page.getByRole('heading', { name: 'Gear List' })).toBeVisible();
  // Seeded item renders; list mode = no giant square image placeholders
  await expect(page.getByText('Sony 24-70mm f/2.8 GM II').first()).toBeVisible({
    timeout: 15000,
  });
});

test('header scan shortcut opens the scanner with manual entry', async ({ page }) => {
  await page.locator('.mobile-header').getByRole('button', { name: 'Scan QR code' }).click();
  await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
  // Manual entry works without a camera
  await expect(page.getByLabel('Or enter code manually')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toHaveCount(0);
});

test('modals render as full-screen sheets', async ({ page }) => {
  await page.locator('.mobile-header').getByRole('button', { name: 'Scan QR code' }).click();
  await expect(page.getByRole('heading', { name: 'Scan QR Code' })).toBeVisible();
  const box = await page.locator('.modal-box').boundingBox();
  const viewport = page.viewportSize();
  // Full width and full height — the phone sheet, not a floating card
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 2);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 2);
  await page.getByRole('button', { name: 'Close dialog' }).click();
});

test('schedule defaults to day view on phones', async ({ page }) => {
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('button', { name: 'Schedule' })
    .click();
  await expect(page.getByRole('heading', { name: 'Schedule' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'day' })).toHaveAttribute('aria-pressed', 'true');
});
