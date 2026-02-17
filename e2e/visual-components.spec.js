// =============================================================================
// Visual Regression Tests - Components
// Screenshot comparison tests for UI components
// =============================================================================

import { test, expect, componentSelectors } from './visual-utils.js';
import { LoginPage, DashboardPage } from './fixtures.js';

test.describe('Visual Regression - Components', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await page.goto('/');
    await loginPage.loginAsAdmin();

    const dashboard = new DashboardPage(page);
    await dashboard.expectDashboard();
    await page.waitForTimeout(1000);
  });

  test.describe('Sidebar', () => {
    test('sidebar should match baseline', async ({ page }) => {
      const sidebar = page.locator(componentSelectors.sidebar);

      if (await sidebar.isVisible()) {
        await expect(sidebar).toHaveScreenshot('sidebar.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('sidebar collapsed should match baseline', async ({ page }) => {
      // Find collapse button
      const collapseButton = page.locator(
        'button[aria-label*="collapse"], button[aria-label*="toggle"]',
      );

      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        await page.waitForTimeout(500);

        const sidebar = page.locator(componentSelectors.sidebar);
        await expect(sidebar).toHaveScreenshot('sidebar-collapsed.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('sidebar active item should match baseline', async ({ page }) => {
      // Navigate to gear list
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
    test('add item modal should match baseline', async ({ page }) => {
      // Navigate to gear list
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Open add modal
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible()) {
          await expect(modal).toHaveScreenshot('modal-add-item.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });

    test('check-out modal should match baseline', async ({ page }) => {
      // Navigate to gear list
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find an available item
      const availableItem = page.locator('text=Available').first();
      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');
        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          const modal = page.locator('[role="dialog"]');
          if (await modal.isVisible()) {
            await expect(modal).toHaveScreenshot('modal-check-out.png', {
              maxDiffPixels: 200,
            });
          }
        }
      }
    });

    test('confirm dialog should match baseline', async ({ page }) => {
      // Navigate to gear list and try to delete
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Click on first item
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(500);

        const deleteButton = page.locator('button:has-text("Delete")');
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);

          const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]');
          if (await confirmDialog.isVisible()) {
            await expect(confirmDialog).toHaveScreenshot('confirm-dialog.png', {
              maxDiffPixels: 100,
            });

            // Cancel to not delete
            const cancelButton = page.locator('button:has-text("Cancel")');
            if (await cancelButton.isVisible()) {
              await cancelButton.click();
            }
          }
        }
      }
    });
  });

  test.describe('Forms', () => {
    test('login form should match baseline', async ({ page }) => {
      // Go back to login
      await page.goto('/');
      await page.waitForTimeout(500);

      const form = page.locator('form');
      await expect(form).toHaveScreenshot('form-login.png', {
        maxDiffPixels: 100,
      });
    });

    test('form with validation errors should match baseline', async ({ page }) => {
      // Navigate to gear list and open add form
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Try to submit empty form
        const submitButton = page.locator(
          '[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]',
        );
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(500);

          // Check for validation errors
          const modal = page.locator('[role="dialog"]');
          if (await modal.isVisible()) {
            await expect(modal).toHaveScreenshot('form-validation-errors.png', {
              maxDiffPixels: 200,
            });
          }
        }
      }
    });
  });

  test.describe('Buttons', () => {
    test('primary button should match baseline', async ({ page }) => {
      const primaryButton = page
        .locator('button')
        .filter({ hasText: /Save|Submit|Add/ })
        .first();

      if (await primaryButton.isVisible()) {
        await expect(primaryButton).toHaveScreenshot('button-primary.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('button hover state should match baseline', async ({ page }) => {
      const button = page.locator('button:has-text("Gear List")');

      if (await button.isVisible()) {
        await button.hover();
        await page.waitForTimeout(200);

        await expect(button).toHaveScreenshot('button-hover.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('button focus state should match baseline', async ({ page }) => {
      const button = page.locator('button:has-text("Gear List")');

      if (await button.isVisible()) {
        await button.focus();
        await page.waitForTimeout(200);

        await expect(button).toHaveScreenshot('button-focus.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Status Badges', () => {
    test('status badges should match baseline', async ({ page }) => {
      // Navigate to gear list
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find status badges
      const availableBadge = page.locator('text=Available').first();
      if (await availableBadge.isVisible()) {
        await expect(availableBadge).toHaveScreenshot('badge-available.png', {
          maxDiffPixels: 30,
        });
      }

      const checkedOutBadge = page.locator('text=/Checked Out/i').first();
      if (await checkedOutBadge.isVisible()) {
        await expect(checkedOutBadge).toHaveScreenshot('badge-checked-out.png', {
          maxDiffPixels: 30,
        });
      }
    });
  });

  test.describe('Cards', () => {
    test('item card should match baseline', async ({ page }) => {
      // Navigate to gear list in grid view
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Ensure grid view
      const gridButton = page.locator('button[aria-label*="grid"]');
      if (await gridButton.isVisible()) {
        await gridButton.click();
        await page.waitForTimeout(500);
      }

      const firstCard = page.locator('[data-testid="item-card"]').first();
      if (await firstCard.isVisible()) {
        await expect(firstCard).toHaveScreenshot('card-item.png', {
          maxDiffPixels: 100,
        });
      }
    });

    test('dashboard stats card should match baseline', async ({ page }) => {
      // Look for stats cards on dashboard
      const statsCard = page.locator('[data-testid="stats-card"], .stats-card').first();

      if (await statsCard.isVisible()) {
        await expect(statsCard).toHaveScreenshot('card-stats.png', {
          maxDiffPixels: 100,
        });
      }
    });
  });

  test.describe('Tables', () => {
    test('data table should match baseline', async ({ page }) => {
      // Navigate to gear list in table view
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Ensure list/table view
      const listButton = page.locator('button[aria-label*="list"]');
      if (await listButton.isVisible()) {
        await listButton.click();
        await page.waitForTimeout(500);
      }

      const table = page.locator('table').first();
      if (await table.isVisible()) {
        await expect(table).toHaveScreenshot('table-data.png', {
          maxDiffPixels: 300,
        });
      }
    });
  });

  test.describe('Empty States', () => {
    test('empty search results should match baseline', async ({ page }) => {
      // Navigate to gear list
      const dashboard = new DashboardPage(page);
      await dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Search for something that won't exist
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('xyznonexistent123');
        await page.waitForTimeout(500);

        // Capture empty state
        const emptyState = page.locator('text=/No items|No results|Nothing found/i');
        if (await emptyState.isVisible()) {
          const mainContent = page.locator('main, [role="main"]');
          await expect(mainContent).toHaveScreenshot('empty-state-search.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });
  });
});
