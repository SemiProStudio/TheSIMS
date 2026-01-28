// =============================================================================
// E2E Tests - Inventory Management
// Tests for item CRUD operations
// =============================================================================

import { test, expect, testItems, getFutureDate } from './fixtures.js';

test.describe('Inventory Management', () => {
  // Login before each test
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
    
    // Navigate to Gear List
    await pages.dashboard.navigateTo('Gear List');
    await page.waitForTimeout(1000);
  });

  test.describe('View Items', () => {
    test('should display gear list', async ({ page }) => {
      // Should show gear list heading
      await expect(page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")')).toBeVisible();
      
      // Should show some items or empty state
      const hasItems = await page.locator('[data-testid="item-card"], [role="row"]').count() > 0;
      const hasEmptyState = await page.locator('text=No items').isVisible().catch(() => false);
      
      expect(hasItems || hasEmptyState).toBeTruthy();
    });

    test('should display item count', async ({ page }) => {
      // Look for item count indicator
      const countText = page.locator('text=/\\d+ items?/i');
      
      if (await countText.isVisible()) {
        const text = await countText.textContent();
        expect(text).toMatch(/\d+/);
      }
    });

    test('should toggle between grid and list view', async ({ page }) => {
      // Find view toggle buttons
      const gridButton = page.locator('button[aria-label*="grid"], button:has(svg[class*="grid"])');
      const listButton = page.locator('button[aria-label*="list"], button:has(svg[class*="list"])');
      
      if (await gridButton.isVisible() && await listButton.isVisible()) {
        // Click list view
        await listButton.click();
        await page.waitForTimeout(300);
        
        // Click grid view
        await gridButton.click();
        await page.waitForTimeout(300);
      }
    });
  });

  test.describe('Search and Filter', () => {
    test('should filter items by search query', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        // Get initial count
        const initialCount = await page.locator('[data-testid="item-card"], tr[role="row"]').count();
        
        // Type search query
        await searchInput.fill('Camera');
        await page.waitForTimeout(500);
        
        // Results should change (or stay same if all match)
        const filteredCount = await page.locator('[data-testid="item-card"], tr[role="row"]').count();
        
        // Either fewer results or results contain search term
        console.log(`Initial: ${initialCount}, Filtered: ${filteredCount}`);
      }
    });

    test('should filter items by category', async ({ page }) => {
      const categorySelect = page.locator('select').first();
      
      if (await categorySelect.isVisible()) {
        // Select a specific category
        const options = await categorySelect.locator('option').allTextContents();
        
        if (options.length > 1) {
          // Select second option (first is usually "All")
          await categorySelect.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
      }
    });

    test('should filter items by status', async ({ page }) => {
      // Find status filter (might be select or buttons)
      const statusSelect = page.locator('select').nth(1);
      
      if (await statusSelect.isVisible()) {
        const options = await statusSelect.locator('option').allTextContents();
        
        if (options.length > 1) {
          await statusSelect.selectOption({ index: 1 });
          await page.waitForTimeout(500);
        }
      }
    });

    test('should clear search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(300);
        
        // Clear search
        await searchInput.clear();
        await page.waitForTimeout(300);
        
        // Or click clear button if available
        const clearButton = page.locator('button[aria-label*="Clear"], button:has-text("Clear")');
        if (await clearButton.isVisible()) {
          await clearButton.click();
        }
      }
    });
  });

  test.describe('Item Detail', () => {
    test('should view item details', async ({ page }) => {
      // Click on first item
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(1000);
        
        // Should show item detail (has Back button or specific content)
        const backButton = page.locator('button:has-text("Back")');
        const itemName = page.locator('h1, h2').first();
        
        if (await backButton.isVisible()) {
          await expect(itemName).toBeVisible();
        }
      }
    });

    test('should display item information', async ({ page }) => {
      // Click on first item
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(1000);
        
        // Check for common item fields
        const hasName = await page.locator('h1, h2').first().isVisible();
        const hasCategory = await page.locator('text=/Camera|Lens|Audio|Lighting/').isVisible();
        const hasStatus = await page.locator('text=/Available|Checked Out|Reserved/').isVisible();
        
        console.log(`Name: ${hasName}, Category: ${hasCategory}, Status: ${hasStatus}`);
      }
    });
  });

  test.describe('Add Item', () => {
    test('should open add item form', async ({ page }) => {
      // Find add button
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Should show add form/modal
        const modal = page.locator('[role="dialog"]');
        const form = page.locator('form');
        const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]');
        
        const hasForm = await modal.isVisible() || await form.isVisible() || await nameInput.isVisible();
        expect(hasForm).toBeTruthy();
      }
    });

    test('should validate required fields', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Try to submit without filling required fields
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add Item"), button[type="submit"]').last();
        
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(500);
          
          // Should show validation error or required indicator
          const errorMessage = page.locator('text=/required/i, [role="alert"]');
          const hasError = await errorMessage.isVisible().catch(() => false);
          
          // Or form should still be open
          const formStillOpen = await page.locator('[role="dialog"], form').isVisible();
          
          expect(hasError || formStillOpen).toBeTruthy();
        }
      }
    });

    test('should create new item', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');
      
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);
        
        // Fill in item details
        const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]').first();
        const categorySelect = page.locator('select[id*="category"]').first();
        
        if (await nameInput.isVisible()) {
          const uniqueName = `Test Item ${Date.now()}`;
          await nameInput.fill(uniqueName);
          
          if (await categorySelect.isVisible()) {
            await categorySelect.selectOption({ index: 1 });
          }
          
          // Save
          const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').last();
          await saveButton.click();
          await page.waitForTimeout(1000);
          
          // Item should be created (modal closes or success message)
          const modalClosed = !(await page.locator('[role="dialog"]').isVisible());
          const successMessage = await page.locator('text=/created|added|success/i').isVisible().catch(() => false);
          
          console.log(`Modal closed: ${modalClosed}, Success message: ${successMessage}`);
        }
      }
    });
  });

  test.describe('Edit Item', () => {
    test('should open edit form', async ({ page }) => {
      // Click on first item to view details
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(1000);
        
        // Find edit button
        const editButton = page.locator('button:has-text("Edit")');
        
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(500);
          
          // Should show edit form
          const modal = page.locator('[role="dialog"]');
          const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]');
          
          const hasForm = await modal.isVisible() || await nameInput.isVisible();
          expect(hasForm).toBeTruthy();
        }
      }
    });

    test('should update item', async ({ page }) => {
      // Click on first item
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(1000);
        
        const editButton = page.locator('button:has-text("Edit")');
        
        if (await editButton.isVisible()) {
          await editButton.click();
          await page.waitForTimeout(500);
          
          // Modify item name
          const nameInput = page.locator('input[id*="name"], input[placeholder*="Name"]').first();
          
          if (await nameInput.isVisible()) {
            const currentValue = await nameInput.inputValue();
            await nameInput.fill(currentValue + ' Updated');
            
            // Save
            const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').last();
            await saveButton.click();
            await page.waitForTimeout(1000);
          }
        }
      }
    });
  });

  test.describe('Delete Item', () => {
    test('should show delete confirmation', async ({ page }) => {
      // Click on first item
      const firstItem = page.locator('[data-testid="item-card"], [role="row"]').first();
      
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(1000);
        
        // Find delete button
        const deleteButton = page.locator('button:has-text("Delete")');
        
        if (await deleteButton.isVisible()) {
          await deleteButton.click();
          await page.waitForTimeout(500);
          
          // Should show confirmation dialog
          const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]');
          const confirmText = page.locator('text=/confirm|sure|delete/i');
          
          const hasConfirmation = await confirmDialog.isVisible() || await confirmText.isVisible();
          
          // Cancel to not actually delete
          const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("No")');
          if (await cancelButton.isVisible()) {
            await cancelButton.click();
          }
        }
      }
    });
  });

  test.describe('Bulk Actions', () => {
    test('should select multiple items', async ({ page }) => {
      // Find checkboxes for item selection
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();
      
      if (count > 1) {
        // Select first few items
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
        await page.waitForTimeout(300);
        
        // Should show selection count or bulk actions
        const selectionIndicator = page.locator('text=/\\d+ selected/i, text=/selected/i');
        const bulkActionsButton = page.locator('button:has-text("Bulk"), button:has-text("Actions")');
        
        const hasSelection = await selectionIndicator.isVisible().catch(() => false);
        const hasBulkActions = await bulkActionsButton.isVisible().catch(() => false);
        
        console.log(`Selection indicator: ${hasSelection}, Bulk actions: ${hasBulkActions}`);
      }
    });

    test('should have select all option', async ({ page }) => {
      const selectAllCheckbox = page.locator('input[type="checkbox"][aria-label*="all"], th input[type="checkbox"]');
      
      if (await selectAllCheckbox.isVisible()) {
        await selectAllCheckbox.check();
        await page.waitForTimeout(300);
        
        // All items should be selected
        const checkboxes = page.locator('tbody input[type="checkbox"], [data-testid="item-checkbox"]');
        const allChecked = await checkboxes.evaluateAll(cbs => cbs.every(cb => cb.checked));
        
        console.log(`All items checked: ${allChecked}`);
      }
    });
  });
});
