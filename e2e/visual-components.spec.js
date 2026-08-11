// =============================================================================
// Visual Regression Tests - Components
// Screenshot comparison tests for UI components.
//
// READ-ONLY by design: these run in the 'chromium-visual' project AFTER all
// functional tests finished and deleted their private data, so every
// screenshot sees the pristine seeded dataset. Do not mutate database state
// here — opening modals and toggling client-side view state is fine.
// =============================================================================

import { test, expect, componentSelectors } from './visual-utils.js';
import { DashboardPage, GearListPage, ItemDetailPage } from './fixtures.js';

async function gotoGearList(page) {
  const dashboard = new DashboardPage(page);
  const gearList = new GearListPage(page);
  await dashboard.expectDashboard();
  await dashboard.navigateTo('Gear List');
  await gearList.expectGearList();
  return gearList;
}

test.describe('Visual Regression - Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    const dashboard = new DashboardPage(page);
    await dashboard.expectDashboard();
    await page.waitForTimeout(1000);
  });

  test.describe('Sidebar', () => {
    test('sidebar should match baseline', async ({ page }) => {
      const sidebar = page.locator(componentSelectors.sidebar);
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toHaveScreenshot('sidebar.png', {
        maxDiffPixels: 100,
      });
    });

    test('sidebar collapsed should match baseline', async ({ page }) => {
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      // Width transition is 0.3s
      await page.waitForTimeout(600);

      const sidebar = page.locator(componentSelectors.sidebar);
      await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', {
        maxDiffPixels: 100,
      });
    });

    test('sidebar active item should match baseline', async ({ page }) => {
      const gearListButton = page.locator('button:has-text("Gear List")');
      await gearListButton.click();
      await page.waitForTimeout(500);

      const sidebar = page.locator(componentSelectors.sidebar);
      await expect(sidebar).toHaveScreenshot('sidebar-active.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Modals', () => {
    test('check-out modal should match baseline', async ({ page }) => {
      const gearList = await gotoGearList(page);
      await gearList.openItem('CA1002', 'Canon EOS R5');
      await new ItemDetailPage(page).expectItemDetail();

      await page.getByRole('button', { name: 'Check Out', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await page.waitForTimeout(300);

      await expect(modal).toHaveScreenshot('modal-check-out.png', {
        maxDiffPixels: 200,
      });
    });

    test('check-out validation errors should match baseline', async ({ page }) => {
      const gearList = await gotoGearList(page);
      await gearList.openItem('CA1005', 'Canon C70');
      await new ItemDetailPage(page).expectItemDetail();

      await page.getByRole('button', { name: 'Check Out', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Submit with the open requirements missing (borrower is prefilled
      // with the current user) → validation messages render
      await modal.getByRole('button', { name: 'Confirm Check Out' }).click();
      await expect(modal.getByText('Due date is required')).toBeVisible();
      await page.waitForTimeout(300);

      await expect(modal).toHaveScreenshot('form-validation-errors.png', {
        maxDiffPixels: 200,
      });
    });

    test('bulk delete confirmation should match baseline', async ({ page }) => {
      const gearList = await gotoGearList(page);
      await gearList.search('LE1005');

      await page.getByRole('button', { name: 'Multiple Selection' }).click();
      await gearList.itemRow('Canon RF 15-35mm f/2.8L IS').click();
      await expect(page.getByText(/1 of \d+ selected/)).toBeVisible();
      await page.getByRole('button', { name: 'Delete', exact: true }).click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal.getByText('Delete Items')).toBeVisible();
      await page.waitForTimeout(300);

      await expect(modal).toHaveScreenshot('bulk-delete-dialog.png', {
        maxDiffPixels: 100,
      });

      // Cancel — nothing is deleted (the confirm stays disabled anyway)
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    });
  });

  test.describe('Pages', () => {
    test('add item page should match baseline', async ({ page }) => {
      await gotoGearList(page);
      await page.locator('button:has-text("Add Item")').first().click();
      await expect(page.locator('h2:has-text("Add New Item")')).toBeVisible();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('add-item-page.png', {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Buttons', () => {
    test('primary button should match baseline', async ({ page }) => {
      await gotoGearList(page);
      const addButton = page.locator('button:has-text("Add Item")').first();
      await expect(addButton).toBeVisible();

      await expect(addButton).toHaveScreenshot('button-primary.png', {
        maxDiffPixels: 50,
      });
    });

    test('button hover state should match baseline', async ({ page }) => {
      const button = page.locator('button:has-text("Gear List")');
      await expect(button).toBeVisible();
      await button.hover();
      await page.waitForTimeout(200);

      await expect(button).toHaveScreenshot('button-hover.png', {
        maxDiffPixels: 50,
      });
    });

    test('button focus state should match baseline', async ({ page }) => {
      const button = page.locator('button:has-text("Gear List")');
      await expect(button).toBeVisible();
      await button.focus();
      await page.waitForTimeout(200);

      await expect(button).toHaveScreenshot('button-focus.png', {
        maxDiffPixels: 50,
      });
    });
  });

  test.describe('Status Badges', () => {
    test('available badge should match baseline', async ({ page }) => {
      await gotoGearList(page);

      const availableBadge = page.locator('text=Available').first();
      await expect(availableBadge).toBeVisible();
      await expect(availableBadge).toHaveScreenshot('badge-available.png', {
        maxDiffPixels: 30,
      });
    });
  });

  test.describe('Cards', () => {
    test('item card should match baseline', async ({ page }) => {
      const gearList = await gotoGearList(page);

      await page.getByRole('button', { name: 'Grid view' }).click();
      await page.waitForTimeout(500);

      const card = gearList.itemRow('Sony A7S III', 'available');
      await expect(card).toBeVisible();
      await expect(card).toHaveScreenshot('card-item.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('List View', () => {
    test('gear list list-view should match baseline', async ({ page }) => {
      await gotoGearList(page);

      await page.getByRole('button', { name: 'List view' }).click();
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('gear-list-list-view.png', {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe('Empty States', () => {
    test('empty search results should match baseline', async ({ page }) => {
      const gearList = await gotoGearList(page);

      await gearList.search('xyznonexistent123');
      await expect(page.getByText('No items found matching your criteria')).toBeVisible();

      const mainContent = page.locator('main');
      await expect(mainContent).toHaveScreenshot('empty-state-search.png', {
        maxDiffPixels: 200,
      });
    });
  });
});

// =============================================================================
// Logged-out components (outside the authenticated describe above)
// =============================================================================

test.describe('Visual Regression - Login Form', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login form should match baseline', async ({ page }) => {
    await page.goto('/');
    // Wait for the REAL React form — the static pre-React shell has no <form>
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await page.waitForTimeout(500);

    const form = page.locator('form');
    await expect(form).toHaveScreenshot('form-login.png', {
      maxDiffPixels: 100,
    });
  });
});
