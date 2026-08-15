// =============================================================================
// E2E Tests - Theme and Accessibility
// Theme switching (user menu → Theme Selector) and WCAG-relevant behavior.
// All tests here are read-only against the database; theme choices live in
// localStorage, which is per-test-context and cannot leak.
// =============================================================================

import { test, expect } from './fixtures.js';

// The Theme Selector is reached through the sidebar's user menu.
async function openThemeSelector(page, pages) {
  await pages.dashboard.openUserMenuItem('Theme');
  await expect(page.locator('h2:has-text("Theme Selector")')).toBeVisible();
}

// A theme card is the preview button whose name element matches exactly
// (plain hasText would confuse "Dark" with "Darker").
function themeCard(page, themeName) {
  return page
    .getByRole('button')
    .filter({ has: page.getByText(themeName, { exact: true }) })
    .first();
}

test.describe('Theme System', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test('user menu opens the theme selector', async ({ page, pages }) => {
    await openThemeSelector(page, pages);
  });

  test('displays the available theme cards', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    // A sample of the built-in themes from themes-data.js must be present
    for (const name of ['Dark', 'Light', 'Darker', 'Terminal', 'Pastel', 'Vibrant']) {
      await expect(themeCard(page, name)).toBeVisible();
    }
  });

  test('switches to the light theme', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    await themeCard(page, 'Light').click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('sims-theme')))
      .toBe('light');
  });

  test('switches to the dark theme', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    // Start from light so selecting dark is an actual change
    await themeCard(page, 'Light').click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('sims-theme')))
      .toBe('light');

    await themeCard(page, 'Dark').click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('sims-theme')))
      .toBe('dark');
  });

  test('theme selection survives a reload', async ({ page, pages }) => {
    await openThemeSelector(page, pages);
    await themeCard(page, 'Light').click();
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('sims-theme')))
      .toBe('light');

    await page.reload();
    await pages.dashboard.expectDashboard();
    expect(await page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('light');
  });

  test('custom theme editor opens with a contrast checker', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    // The custom theme card carries a dedicated "Customize Colors" button
    await page.getByRole('button', { name: 'Customize Colors' }).first().click();

    // Editor shows color inputs and the accessibility/contrast panel
    await expect(page.locator('input[type="color"]').first()).toBeVisible();
    await expect(page.getByText('Accessibility Check')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test.describe('Keyboard Navigation', () => {
    test('Tab moves focus through interactive elements', async ({ page }) => {
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(first);

      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }
      const later = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(later);
    });

    test('focused elements show a visible focus indicator', async ({ page }) => {
      // Focus a known control and check its computed focus styles
      const button = page.locator('button:has-text("Gear List")');
      await button.focus();

      const styles = await button.evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { outline: s.outlineStyle, boxShadow: s.boxShadow };
      });
      expect(styles.outline !== 'none' || styles.boxShadow !== 'none').toBeTruthy();
    });

    test('Enter activates a focused navigation button', async ({ page }) => {
      const gearListButton = page.locator('button:has-text("Gear List")');
      await gearListButton.focus();
      await page.keyboard.press('Enter');

      await expect(
        page.locator('h2:has-text("Gear List"), h2:has-text("Inventory")'),
      ).toBeVisible();
    });

    test('Escape closes an open modal', async ({ page, pages }) => {
      // The QR modal is read-only and always available on an item detail
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem('CA1002', 'Canon EOS R5');
      await pages.itemDetail.expectItemDetail();

      await page.getByRole('button', { name: 'QR Code', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
    });
  });

  test.describe('ARIA Attributes', () => {
    test('navigation landmark is labeled', async ({ page, pages }) => {
      await expect(pages.dashboard.sidebar).toBeVisible();
      await expect(pages.dashboard.sidebar).toHaveAttribute('aria-label', 'Main navigation');
    });

    test('sidebar buttons have accessible names', async ({ page, pages }) => {
      const buttons = pages.dashboard.sidebar.locator('button');
      const count = await buttons.count();
      expect(count).toBeGreaterThan(5);

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);
        const text = (await button.textContent())?.trim();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text || ariaLabel, `sidebar button #${i} needs an accessible name`).toBeTruthy();
      }
    });

    test('modals expose dialog semantics', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem('CA1002', 'Canon EOS R5');
      await pages.itemDetail.expectItemDetail();

      await page.getByRole('button', { name: 'QR Code', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    test('check-out modal inputs are labeled', async ({ page, pages }) => {
      await pages.dashboard.navigateTo('Gear List');
      await pages.gearList.expectGearList();
      await pages.gearList.openItem('CA1002', 'Canon EOS R5');
      await pages.itemDetail.expectItemDetail();

      await page.getByRole('button', { name: 'Check Out', exact: true }).click();
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Labeled sections/fields (visible <label> elements) plus explicitly
      // aria-labeled controls
      expect(await modal.locator('label').count()).toBeGreaterThanOrEqual(5);
      await expect(modal.locator('[aria-label="Due date"]')).toBeVisible();
      await expect(modal.locator('[aria-label="Client"]')).toBeVisible();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('page has a skip link and a main landmark', async ({ page }) => {
      await expect(page.locator('main#main-content')).toBeVisible();

      const skipLink = page.locator('a[href="#main-content"]');
      await expect(skipLink).toHaveCount(1);

      // The skip link is the first tab stop from a fresh load
      await page.reload();
      await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible({ timeout: 30000 });
      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
    });

    test('exactly one h1 per page, with h2 page titles', async ({ page }) => {
      // The sidebar brand is the app-wide h1; every view (including detail
      // pages) renders an h2 title. Detail pages carried a SECOND h1 entity
      // name until the 2026-08-15 heading-hierarchy pass.
      expect(await page.locator('h1').count()).toBe(1);
      await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();

      // Item detail — the historical double-h1 offender
      await page.getByRole('button', { name: 'Gear List' }).click();
      await page.getByText('LE1001').first().click();
      await expect(
        page.locator('h2').filter({ hasText: 'Sony 24-70mm f/2.8 GM II' }),
      ).toBeVisible();
      expect(await page.locator('h1').count()).toBe(1);
    });
  });

  test.describe('Color and Contrast', () => {
    test('focus ring color is defined', async ({ page }) => {
      const focusRingColor = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--focus-ring-color').trim(),
      );
      expect(focusRingColor).toBeTruthy();
    });

    test('theme text and background variables are defined', async ({ page }) => {
      const colors = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          textPrimary: root.getPropertyValue('--text-primary').trim(),
          bgDark: root.getPropertyValue('--bg-dark').trim(),
        };
      });
      expect(colors.textPrimary).toBeTruthy();
      expect(colors.bgDark).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('mobile viewport shows the mobile header and content', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
      await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();

      // Tap targets stay reasonably sized
      const box = await page.getByRole('button', { name: 'Open menu' }).boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(30);
      expect(box.height).toBeGreaterThanOrEqual(30);
    });

    test('no horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('h2:has-text("Dashboard")')).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
