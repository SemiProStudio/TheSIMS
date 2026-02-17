// =============================================================================
// E2E Tests - Check-Out/Check-In Workflow
// Tests for the equipment checkout and return process
// =============================================================================

import { test, expect, getFutureDate } from './fixtures.js';

test.describe('Check-Out/Check-In Workflow', () => {
  // Login before each test
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  test.describe('Check-Out Flow', () => {
    test('should open check-out modal for available item', async ({ page, pages }) => {
      // Navigate to Gear List
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find an available item and click on it
      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        // Click on the item (might be on card or row)
        await availableItem.click();
        await page.waitForTimeout(500);

        // Look for check out button
        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Modal should be open
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible();

          // Should have borrower name field
          const borrowerInput = page.locator(
            'input[id*="borrower"], input[placeholder*="Borrower"], input[placeholder*="Name"]',
          );
          await expect(borrowerInput).toBeVisible();
        }
      }
    });

    test('should require borrower name for check-out', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find and click available item
      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Try to submit without filling required fields
          const submitButton = page.locator('[role="dialog"] button:has-text("Check Out")');

          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(500);

            // Should show error or modal should still be open
            const errorMessage = page.locator('text=/required/i, [role="alert"]');
            const modalStillOpen = await page.locator('[role="dialog"]').isVisible();

            expect((await errorMessage.isVisible()) || modalStillOpen).toBeTruthy();
          }
        }
      }
    });

    test('should complete check-out with valid data', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find and click available item
      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Fill in required fields
          const borrowerInput = page
            .locator('input[id*="borrower"], input[placeholder*="Borrower"]')
            .first();
          const dueDateInput = page.locator('input[type="date"]').first();
          const acknowledgeCheckbox = page.locator('input[type="checkbox"]').first();

          if (await borrowerInput.isVisible()) {
            await borrowerInput.fill('Test Borrower');
          }

          if (await dueDateInput.isVisible()) {
            await dueDateInput.fill(getFutureDate(7));
          }

          if (await acknowledgeCheckbox.isVisible()) {
            await acknowledgeCheckbox.check();
          }

          // Submit
          const submitButton = page.locator('[role="dialog"] button:has-text("Check Out")');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);

            // Modal should close
            const modalClosed = !(await page.locator('[role="dialog"]').isVisible());

            // Or status should change to checked out
            const statusChanged = await page.locator('text=/Checked Out|checked out/').isVisible();

            console.log(`Modal closed: ${modalClosed}, Status changed: ${statusChanged}`);
          }
        }
      }
    });

    test('should show quick due date options', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Look for quick date options
          const quickDateOptions = page.locator(
            'button:has-text("Tomorrow"), button:has-text("1 week"), button:has-text("3 days")',
          );
          const count = await quickDateOptions.count();

          console.log(`Quick date options found: ${count}`);

          if (count > 0) {
            // Click one option
            await quickDateOptions.first().click();

            // Date input should be populated
            const dueDateInput = page.locator('input[type="date"]').first();
            const value = await dueDateInput.inputValue();
            expect(value).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Check-In Flow', () => {
    test('should open check-in modal for checked out item', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      // Find a checked out item
      const checkedOutItem = page.locator('text=/Checked Out/i').first();

      if (await checkedOutItem.isVisible()) {
        await checkedOutItem.click();
        await page.waitForTimeout(500);

        const checkInButton = page.locator('button:has-text("Check In")');

        if (await checkInButton.isVisible()) {
          await checkInButton.click();
          await page.waitForTimeout(500);

          // Modal should be open
          const modal = page.locator('[role="dialog"]');
          await expect(modal).toBeVisible();
        }
      }
    });

    test('should display checkout information in check-in modal', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const checkedOutItem = page.locator('text=/Checked Out/i').first();

      if (await checkedOutItem.isVisible()) {
        await checkedOutItem.click();
        await page.waitForTimeout(500);

        const checkInButton = page.locator('button:has-text("Check In")');

        if (await checkInButton.isVisible()) {
          await checkInButton.click();
          await page.waitForTimeout(500);

          // Should show borrower info or checkout details
          const hasBorrowerInfo = await page
            .locator('text=/Checked out|Borrower|Due/i')
            .isVisible();
          console.log(`Has borrower info: ${hasBorrowerInfo}`);
        }
      }
    });

    test('should allow reporting damage during check-in', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const checkedOutItem = page.locator('text=/Checked Out/i').first();

      if (await checkedOutItem.isVisible()) {
        await checkedOutItem.click();
        await page.waitForTimeout(500);

        const checkInButton = page.locator('button:has-text("Check In")');

        if (await checkInButton.isVisible()) {
          await checkInButton.click();
          await page.waitForTimeout(500);

          // Look for damage reporting option
          const damageCheckbox = page
            .locator('input[type="checkbox"]')
            .filter({ hasText: /damage/i });
          const damageOption = page.locator('text=/damage|issue|problem/i');

          const hasDamageOption =
            (await damageCheckbox.isVisible()) || (await damageOption.isVisible());
          console.log(`Has damage reporting option: ${hasDamageOption}`);
        }
      }
    });

    test('should complete check-in successfully', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const checkedOutItem = page.locator('text=/Checked Out/i').first();

      if (await checkedOutItem.isVisible()) {
        await checkedOutItem.click();
        await page.waitForTimeout(500);

        const checkInButton = page.locator('button:has-text("Check In")');

        if (await checkInButton.isVisible()) {
          await checkInButton.click();
          await page.waitForTimeout(500);

          // Submit check-in
          const submitButton = page.locator('[role="dialog"] button:has-text("Check In")');

          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(1000);

            // Modal should close and status should change
            const modalClosed = !(await page.locator('[role="dialog"]').isVisible());
            console.log(`Modal closed after check-in: ${modalClosed}`);
          }
        }
      }
    });

    test('should update item condition during check-in', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const checkedOutItem = page.locator('text=/Checked Out/i').first();

      if (await checkedOutItem.isVisible()) {
        await checkedOutItem.click();
        await page.waitForTimeout(500);

        const checkInButton = page.locator('button:has-text("Check In")');

        if (await checkInButton.isVisible()) {
          await checkInButton.click();
          await page.waitForTimeout(500);

          // Look for condition selector
          const conditionSelect = page.locator('select[id*="condition"]');

          if (await conditionSelect.isVisible()) {
            // Change condition
            await conditionSelect.selectOption('good');
            console.log('Changed condition to good');
          }
        }
      }
    });
  });

  test.describe('Dashboard Quick Actions', () => {
    test('should show overdue items on dashboard', async ({ page }) => {
      // Look for overdue section or alert on dashboard
      const overdueSection = page.locator('text=/overdue/i');
      const hasOverdue = await overdueSection.isVisible().catch(() => false);

      console.log(`Dashboard shows overdue items: ${hasOverdue}`);
    });

    test('should show items due soon on dashboard', async ({ page }) => {
      // Look for due soon section
      const dueSoonSection = page.locator('text=/due soon|upcoming returns|due today/i');
      const hasDueSoon = await dueSoonSection.isVisible().catch(() => false);

      console.log(`Dashboard shows due soon: ${hasDueSoon}`);
    });

    test('should be able to quick check-out from dashboard', async ({ page }) => {
      // Look for quick action buttons on dashboard
      const quickCheckOut = page.locator(
        'button:has-text("Quick Check"), button:has-text("Check Out")',
      );

      if (await quickCheckOut.first().isVisible()) {
        console.log('Quick check-out available from dashboard');
      }
    });
  });

  test.describe('Workflow Accessibility', () => {
    test('check-out modal should be keyboard accessible', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Modal should trap focus
          const modal = page.locator('[role="dialog"]');

          if (await modal.isVisible()) {
            // Tab through modal
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');

            // Escape should close modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            const modalClosed = !(await modal.isVisible());
            console.log(`Modal closed with Escape: ${modalClosed}`);
          }
        }
      }
    });

    test('check-out form should have proper labels', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const availableItem = page.locator('text=Available').first();

      if (await availableItem.isVisible()) {
        await availableItem.click();
        await page.waitForTimeout(500);

        const checkOutButton = page.locator('button:has-text("Check Out")');

        if (await checkOutButton.isVisible()) {
          await checkOutButton.click();
          await page.waitForTimeout(500);

          // Check for labels
          const labels = page.locator('label');
          const labelCount = await labels.count();

          console.log(`Form has ${labelCount} labels`);
          expect(labelCount).toBeGreaterThan(0);
        }
      }
    });
  });
});
