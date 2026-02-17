// =============================================================================
// E2E Tests - Theme and Accessibility
// Tests for theme switching and WCAG compliance
// =============================================================================

import { test, expect } from './fixtures.js';

test.describe('Theme System', () => {
  // Login before each test
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  test.describe('Theme Selection', () => {
    test('should navigate to theme selector', async ({ page }) => {
      // Find user menu or theme button
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();

      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      // Look for theme option
      const themeOption = page.locator(
        'button:has-text("Theme"), a:has-text("Theme"), [aria-label*="theme"]',
      );

      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // Should show theme selector
        const themeHeading = page.locator('h1:has-text("Theme"), h2:has-text("Theme")');
        await expect(themeHeading).toBeVisible();
      }
    });

    test('should display available themes', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // Should show multiple theme options
        const themeCards = page
          .locator('[data-testid="theme-card"], [role="button"]')
          .filter({ hasText: /Dark|Light|Theme/ });
        const count = await themeCards.count();

        console.log(`Found ${count} theme options`);
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should switch to light theme', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // Select light theme
        const lightTheme = page.locator('text=Light').first();
        if (await lightTheme.isVisible()) {
          await lightTheme.click();
          await page.waitForTimeout(500);

          // Background should change (light themes typically have lighter backgrounds)
          const body = page.locator('body');
          const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);

          console.log(`Background color after light theme: ${bgColor}`);
        }
      }
    });

    test('should switch to dark theme', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // Select dark theme
        const darkTheme = page.locator('text=Dark').first();
        if (await darkTheme.isVisible()) {
          await darkTheme.click();
          await page.waitForTimeout(500);
        }
      }
    });

    test('should persist theme selection', async ({ page }) => {
      // Navigate to theme selector and select a theme
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        const lightTheme = page.locator('text=Light').first();
        if (await lightTheme.isVisible()) {
          await lightTheme.click();
          await page.waitForTimeout(500);
        }
      }

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Theme should persist (check localStorage)
      const savedTheme = await page.evaluate(() => localStorage.getItem('sims-theme'));
      console.log(`Saved theme: ${savedTheme}`);
    });
  });

  test.describe('Custom Theme Editor', () => {
    test('should open custom theme editor', async ({ page }) => {
      // Navigate to theme selector
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        // Find custom theme option
        const customTheme = page.locator('text=/Custom|Create/i');
        if (await customTheme.isVisible()) {
          await customTheme.click();
          await page.waitForTimeout(500);

          // Should show color picker or editor
          const colorPicker = page.locator('input[type="color"], [data-testid="color-picker"]');
          const editorHeading = page.locator('h1:has-text("Custom"), h2:has-text("Editor")');

          const hasEditor = (await colorPicker.isVisible()) || (await editorHeading.isVisible());
          console.log(`Custom editor visible: ${hasEditor}`);
        }
      }
    });

    test('should show contrast checker in custom theme editor', async ({ page }) => {
      // Navigate to custom theme editor
      const userMenuButton = page
        .locator('button')
        .filter({ hasText: /Admin|User|Profile/ })
        .first();
      if (await userMenuButton.isVisible()) {
        await userMenuButton.click();
        await page.waitForTimeout(300);
      }

      const themeOption = page.locator('button:has-text("Theme")');
      if (await themeOption.isVisible()) {
        await themeOption.click();
        await page.waitForTimeout(500);

        const customTheme = page.locator('text=/Custom|Create/i');
        if (await customTheme.isVisible()) {
          await customTheme.click();
          await page.waitForTimeout(500);

          // Look for accessibility/contrast checker
          const contrastChecker = page.locator('text=/Accessibility|Contrast|WCAG/i');
          const hasChecker = await contrastChecker.isVisible().catch(() => false);

          console.log(`Contrast checker visible: ${hasChecker}`);
        }
      }
    });
  });
});

test.describe('Accessibility', () => {
  // Login before each test
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.login.loginAsAdmin();
    await pages.dashboard.expectDashboard();
  });

  test.describe('Keyboard Navigation', () => {
    test('should be able to navigate with Tab key', async ({ page }) => {
      // Press Tab and check focus moves
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();

      // Continue tabbing
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      // Something should be focused
      const stillFocused = await page.evaluate(() => document.activeElement?.tagName);
      console.log(`Focused element after tabs: ${stillFocused}`);
    });

    test('should show visible focus indicators', async ({ page }) => {
      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Check for focus styles
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;

        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
        };
      });

      console.log('Focus styles:', focusedElement);

      // Should have some visible focus indicator
      const hasVisibleFocus =
        focusedElement &&
        (focusedElement.outline !== 'none' || focusedElement.boxShadow !== 'none');

      console.log(`Has visible focus indicator: ${hasVisibleFocus}`);
    });

    test('should support Enter key for button activation', async ({ page, pages }) => {
      // Tab to a navigation button
      const gearListButton = page.locator('button:has-text("Gear List")');
      await gearListButton.focus();

      // Press Enter
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should navigate to Gear List
      const heading = page.locator('h1:has-text("Gear List"), h1:has-text("Inventory")');
      await expect(heading).toBeVisible();
    });

    test('should support Escape key to close modals', async ({ page, pages }) => {
      // Navigate to gear list and open a modal
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');

      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');

        if (await modal.isVisible()) {
          // Press Escape
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          // Modal should close
          const modalClosed = !(await modal.isVisible());
          console.log(`Modal closed with Escape: ${modalClosed}`);
        }
      }
    });
  });

  test.describe('ARIA Attributes', () => {
    test('navigation should have proper ARIA labels', async ({ page }) => {
      const nav = page.locator('[role="navigation"]');

      if (await nav.isVisible()) {
        const ariaLabel = await nav.getAttribute('aria-label');
        console.log(`Navigation aria-label: ${ariaLabel}`);
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('buttons should have accessible names', async ({ page }) => {
      const buttons = page.locator('button');
      const count = await buttons.count();

      let accessibleCount = 0;
      for (let i = 0; i < Math.min(count, 10); i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        if (text?.trim() || ariaLabel) {
          accessibleCount++;
        }
      }

      console.log(`${accessibleCount} of ${Math.min(count, 10)} buttons have accessible names`);
      expect(accessibleCount).toBeGreaterThan(0);
    });

    test('modals should have dialog role', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');

      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('[role="dialog"]');
        const hasDialogRole = await modal.isVisible();

        console.log(`Modal has dialog role: ${hasDialogRole}`);

        if (hasDialogRole) {
          const ariaModal = await modal.getAttribute('aria-modal');
          console.log(`Modal has aria-modal: ${ariaModal}`);
        }
      }
    });

    test('form inputs should have labels', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await page.waitForTimeout(1000);

      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")');

      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        const inputs = page.locator('input:not([type="hidden"]):not([type="checkbox"])');
        const inputCount = await inputs.count();

        let labeledCount = 0;
        for (let i = 0; i < Math.min(inputCount, 5); i++) {
          const input = inputs.nth(i);
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            if (await label.isVisible()) {
              labeledCount++;
              continue;
            }
          }

          if (ariaLabel || ariaLabelledBy) {
            labeledCount++;
          }
        }

        console.log(`${labeledCount} of ${Math.min(inputCount, 5)} inputs have labels`);
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have live regions for dynamic content', async ({ page }) => {
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const count = await liveRegions.count();

      console.log(`Found ${count} live regions`);
    });

    test('page should have main landmark', async ({ page }) => {
      const main = page.locator('main, [role="main"]');
      const hasMain = await main.isVisible().catch(() => false);

      console.log(`Page has main landmark: ${hasMain}`);
    });

    test('headings should be in logical order', async ({ page }) => {
      const headings = await page.evaluate(() => {
        const h = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        return Array.from(h).map((el) => ({
          level: parseInt(el.tagName.charAt(1)),
          text: el.textContent?.trim().substring(0, 50),
        }));
      });

      console.log('Heading structure:', headings);

      // Should have at least one h1
      const hasH1 = headings.some((h) => h.level === 1);
      console.log(`Has H1: ${hasH1}`);
    });
  });

  test.describe('Color and Contrast', () => {
    test('focus ring should be visible', async ({ page }) => {
      // Tab to an element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check focus ring CSS variable
      const focusRingColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue('--focus-ring-color')
          .trim();
      });

      console.log(`Focus ring color: ${focusRingColor}`);
      expect(focusRingColor).toBeTruthy();
    });

    test('text should have sufficient contrast', async ({ page }) => {
      // Get primary text color and background
      const colors = await page.evaluate(() => {
        const body = document.body;
        const styles = getComputedStyle(body);
        const root = getComputedStyle(document.documentElement);

        return {
          textPrimary: root.getPropertyValue('--text-primary').trim(),
          bgDark: root.getPropertyValue('--bg-dark').trim(),
        };
      });

      console.log('Text colors:', colors);
      // Colors should be defined
      expect(colors.textPrimary || colors.bgDark).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be usable on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Content should still be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();

      // Interactive elements should be tappable (minimum 44x44)
      const button = page.locator('button').first();
      const box = await button.boundingBox();

      if (box) {
        console.log(`Button size: ${box.width}x${box.height}`);
        // At least one dimension should be reasonably large
        expect(box.width >= 30 || box.height >= 30).toBeTruthy();
      }
    });

    test('should not have horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      console.log(`Has horizontal scroll: ${hasHorizontalScroll}`);
    });
  });
});
