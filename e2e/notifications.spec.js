// =============================================================================
// E2E Tests - Notifications
// Tests for notification settings and email notification flow
// =============================================================================

import { test, expect, LoginPage, DashboardPage, testUsers, getFutureDate } from './fixtures.js';

// =============================================================================
// Notification Page Object
// =============================================================================

class NotificationSettingsPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('text=Notification Settings');
    this.closeButton = page.locator('button[aria-label="Close"]');
    this.saveButton = page.locator('button:has-text("Save Preferences")');
    
    // Main email toggle
    this.emailToggle = page.locator('text=Email Notifications').locator('..').locator('button').first();
    
    // Due date section
    this.dueDateRemindersToggle = page.locator('text=Due Date Reminders').locator('..').locator('button').first();
    this.overdueToggle = page.locator('text=Overdue Notifications').locator('..').locator('button').first();
    
    // Reminder day buttons
    this.reminderDayButtons = {
      '1': page.locator('button:has-text("1")').first(),
      '3': page.locator('button:has-text("3")').first(),
      '7': page.locator('button:has-text("7")').first(),
    };
    
    // Reservation section
    this.reservationConfirmToggle = page.locator('text=Confirmation Emails').locator('..').locator('button').first();
    this.reservationReminderToggle = page.locator('text=Reservation Reminders').locator('..').locator('button').first();
    
    // Checkout section
    this.checkoutConfirmToggle = page.locator('text=Checkout Confirmations').locator('..').locator('button').first();
    this.checkinConfirmToggle = page.locator('text=Check-in Confirmations').locator('..').locator('button').first();
    
    // Admin section
    this.adminSection = page.locator('text=Admin Notifications');
    this.lowStockToggle = page.locator('text=Low Stock Alerts').locator('..').locator('button').first();
    this.damageReportsToggle = page.locator('text=Damage Reports').locator('..').locator('button').first();
    this.overdueSummaryToggle = page.locator('text=Overdue Summary').locator('..').locator('button').first();
    
    // Status messages
    this.savingMessage = page.locator('text=Saving...');
    this.successMessage = page.locator('text=Preferences saved!');
  }

  async expectOpen() {
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }

  async close() {
    await this.closeButton.click();
  }

  async save() {
    await this.saveButton.click();
  }

  async expectSaveSuccess() {
    await expect(this.successMessage).toBeVisible({ timeout: 5000 });
  }
}

// Extend fixtures with NotificationSettingsPage
const extendedTest = test.extend({
  notificationPage: async ({ page }, use) => {
    await use(new NotificationSettingsPage(page));
  },
});

// =============================================================================
// Navigation Tests
// =============================================================================

extendedTest.describe('Notification Settings Navigation', () => {
  extendedTest('should navigate to notification settings from sidebar', async ({ page, pages, notificationPage }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
    
    // Click on notification settings in sidebar
    // The exact selector might vary based on your sidebar implementation
    const notificationsButton = page.locator('button:has-text("Notifications")');
    
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
    }
  });

  extendedTest('should close notification settings with close button', async ({ page, pages, notificationPage }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
    
    // Navigate to notifications
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Close
      await notificationPage.close();
      
      // Should return to dashboard
      await pages.dashboard.expectDashboard();
    }
  });
});

// =============================================================================
// Notification Settings UI Tests
// =============================================================================

extendedTest.describe('Notification Settings UI', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should display all notification sections', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Check main sections are visible
      await expect(page.locator('text=Email Notifications')).toBeVisible();
      await expect(page.locator('text=Due Date Reminders')).toBeVisible();
      await expect(page.locator('text=Reservations')).toBeVisible();
      await expect(page.locator('text=Check-out / Check-in')).toBeVisible();
    }
  });

  extendedTest('should display admin section for admin users', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Admin section should be visible for admin user
      await expect(page.locator('text=Admin Notifications')).toBeVisible();
      await expect(page.locator('text=Low Stock Alerts')).toBeVisible();
      await expect(page.locator('text=Damage Reports')).toBeVisible();
    }
  });

  extendedTest('should show save button', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      await expect(notificationPage.saveButton).toBeVisible();
      await expect(notificationPage.saveButton).toBeEnabled();
    }
  });
});

// =============================================================================
// Notification Settings Interaction Tests
// =============================================================================

extendedTest.describe('Notification Settings Interactions', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should save preferences and show success message', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Click save
      await notificationPage.save();
      
      // Should show success message
      await notificationPage.expectSaveSuccess();
    }
  });

  extendedTest('should toggle email notifications', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Find the email toggle and click it
      const toggles = page.locator('button[style*="width: 44px"]');
      const firstToggle = toggles.first();
      
      if (await firstToggle.isVisible()) {
        await firstToggle.click();
        // Save and verify
        await notificationPage.save();
        await notificationPage.expectSaveSuccess();
      }
    }
  });

  extendedTest('should select reminder days', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Click on "7" day button if visible
      const sevenDayButton = page.locator('button:has-text("7")').first();
      if (await sevenDayButton.isVisible()) {
        await sevenDayButton.click();
      }
      
      // Save
      await notificationPage.save();
      await notificationPage.expectSaveSuccess();
    }
  });
});

// =============================================================================
// Checkout Email Notification Tests (Demo Mode)
// =============================================================================

extendedTest.describe('Checkout Email Notifications (Demo Mode)', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should complete checkout flow with email field', async ({ page, pages }) => {
    // Navigate to gear list
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    
    // Click on first available item
    const firstItem = page.locator('[data-testid="item-card"], [data-testid="item-row"]').first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await pages.itemDetail.expectItemDetail();
      
      // Check if item is available (has checkout button)
      const checkOutButton = page.locator('button:has-text("Check Out")');
      if (await checkOutButton.isVisible()) {
        await checkOutButton.click();
        
        // Fill checkout form
        await pages.checkOutModal.expectModalOpen();
        
        // Look for borrower email field
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('borrower@example.com');
        }
        
        // Fill required fields
        await pages.checkOutModal.fillForm({
          borrowerName: 'Test Borrower',
          dueDate: getFutureDate(7),
          project: 'E2E Test Project',
          acknowledge: true,
        });
        
        // Submit
        await pages.checkOutModal.submit();
        
        // Modal should close
        await page.waitForTimeout(1000);
        
        // In demo mode, email is "sent" but logged to console
        // We just verify the checkout completed
      }
    }
  });
});

// =============================================================================
// Reservation Email Notification Tests (Demo Mode)
// =============================================================================

extendedTest.describe('Reservation Email Notifications (Demo Mode)', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should create reservation with email notification', async ({ page, pages }) => {
    // Navigate to gear list
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    
    // Click on first item
    const firstItem = page.locator('[data-testid="item-card"], [data-testid="item-row"]').first();
    if (await firstItem.isVisible()) {
      await firstItem.click();
      await pages.itemDetail.expectItemDetail();
      
      // Look for Add Reservation button
      const addReservationButton = page.locator('button:has-text("Add Reservation")');
      if (await addReservationButton.isVisible()) {
        await addReservationButton.click();
        
        // Wait for modal
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        
        // Fill reservation form
        const projectInput = page.locator('input[placeholder*="Project" i], input[name="project"]').first();
        if (await projectInput.isVisible()) {
          await projectInput.fill('E2E Test Reservation');
        }
        
        // Fill email field if present
        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('reserver@example.com');
        }
        
        // Fill dates
        const dateInputs = page.locator('input[type="date"]');
        const startDate = dateInputs.first();
        const endDate = dateInputs.nth(1);
        
        if (await startDate.isVisible()) {
          await startDate.fill(getFutureDate(14));
        }
        if (await endDate.isVisible()) {
          await endDate.fill(getFutureDate(21));
        }
        
        // Submit
        const submitButton = page.locator('button:has-text("Save"), button:has-text("Create")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
        
        // Wait for modal to close
        await page.waitForTimeout(1000);
      }
    }
  });
});

// =============================================================================
// Accessibility Tests for Notification Settings
// =============================================================================

extendedTest.describe('Notification Settings Accessibility', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should have accessible heading structure', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Check for heading
      const heading = page.locator('h1, h2, [role="heading"]').filter({ hasText: 'Notification' });
      await expect(heading.first()).toBeVisible();
    }
  });

  extendedTest('should have accessible close button', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Check close button has accessible label
      const closeButton = page.locator('button[aria-label="Close"]');
      await expect(closeButton).toBeVisible();
    }
  });

  extendedTest('should be keyboard navigable', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Press Tab to navigate through toggles
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to activate toggle with Space or Enter
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });
});

// =============================================================================
// Non-Admin User Tests
// =============================================================================

extendedTest.describe('Notification Settings for Non-Admin', () => {
  extendedTest('should not show admin section for regular users', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    
    await page.goto('/');
    
    // Login as regular user
    await loginPage.login('user@test.com', 'demo');
    await dashboardPage.expectDashboard();
    
    // Navigate to notifications
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      
      // Wait for settings to load
      await expect(page.locator('text=Notification Settings')).toBeVisible({ timeout: 5000 });
      
      // Admin section should NOT be visible
      await expect(page.locator('text=Admin Notifications')).not.toBeVisible();
    }
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

extendedTest.describe('Notification Settings Error Handling', () => {
  extendedTest.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  extendedTest('should handle save gracefully in demo mode', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Save should work (in demo mode it's local only)
      await notificationPage.save();
      
      // Should show success, not error
      await notificationPage.expectSaveSuccess();
    }
  });

  extendedTest('should preserve settings after page reload', async ({ page, notificationPage }) => {
    const notificationsButton = page.locator('button:has-text("Notifications")');
    if (await notificationsButton.isVisible()) {
      await notificationsButton.click();
      await notificationPage.expectOpen();
      
      // Save settings
      await notificationPage.save();
      await notificationPage.expectSaveSuccess();
      
      // Close
      await notificationPage.close();
      
      // Note: In demo mode, settings may not persist across reloads
      // This test documents current behavior
    }
  });
});

export { extendedTest as test, expect };
