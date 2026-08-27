// =============================================================================
// E2E Tests - Theme and Accessibility
// Theme switching (user menu → Theme Selector) and WCAG-relevant behavior.
// All tests here are read-only against the database; theme choices live in
// localStorage, which is per-test-context and cannot leak.
// =============================================================================

import AxeBuilder from '@axe-core/playwright';
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
    for (const name of ['Dark', 'Light', 'Darker', 'Terminal', 'Pastel', 'Vibrant', 'Midnight']) {
      await expect(themeCard(page, name)).toBeVisible();
    }
  });

  test('groups themes into Modern, Legacy and Custom & Random sections', async ({
    page,
    pages,
  }) => {
    await openThemeSelector(page, pages);

    const section = (label) =>
      page.locator('section', { has: page.locator(`h3:text-is("${label}")`) });
    await expect(section('Modern')).toBeVisible();
    await expect(section('Legacy')).toBeVisible();
    await expect(section('Custom & Random')).toBeVisible();

    // The original catalogue lives under Legacy, the new set under Modern
    for (const name of ['Dark', 'Light', 'Cheese', 'Cats', 'Dogs', 'XP']) {
      await expect(section('Legacy').getByText(name, { exact: true })).toBeVisible();
    }
    for (const name of ['Midnight', 'Paper', 'Darkroom', 'Aurora']) {
      await expect(section('Modern').getByText(name, { exact: true })).toBeVisible();
    }
    await expect(section('Custom & Random').getByText('Random', { exact: true })).toBeVisible();

    // Modern is listed first
    const headings = await page.locator('section > h3').allTextContents();
    expect(headings).toEqual(['Modern', 'Legacy', 'Custom & Random']);
  });

  test('novelty theme applies its background tile and themed cursor', async ({ page, pages }) => {
    await openThemeSelector(page, pages);
    await themeCard(page, 'Cheese').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('cheese');

    // The tile is painted by html.theme-tile .app-wrapper::before from
    // --theme-bg-image (the pseudo-element only exists for tile themes)
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-tile')))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            getComputedStyle(document.querySelector('.app-wrapper'), '::before').backgroundImage,
        ),
      )
      .toContain('cheese-bg.svg');

    // The cursor must win over the inline `cursor: pointer` buttons carry —
    // that is the bug this guards against (it used to revert to the hand)
    const cursorOn = (selector) =>
      page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).cursor, selector);
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('theme-cursor')),
    ).toBe(true);
    expect(await cursorOn('.app-wrapper')).toContain('cheese-cursor.svg');
    expect(await cursorOn('nav button')).toContain('cheese-cursor.svg');

    // Switching to a theme without a cursor restores the defaults
    await themeCard(page, 'Dark').click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-cursor')))
      .toBe(false);
    expect(await cursorOn('nav button')).toBe('pointer');
    expect(
      await page.evaluate(
        () => getComputedStyle(document.querySelector('.app-wrapper'), '::before').backgroundImage,
      ),
    ).toBe('none');
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('theme-tile')),
    ).toBe(false);
  });

  test('modern theme applies shape and type tokens, and they reset on switch', async ({
    page,
    pages,
  }) => {
    await openThemeSelector(page, pages);
    const rootVar = (name) =>
      page.evaluate(
        (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
        name,
      );

    await themeCard(page, 'Ledger').click();
    await expect.poll(() => rootVar('--radius-lg')).toBe('0px');
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
      'Helvetica',
    );
    // Structural variant reaches the DOM: uppercase titles, 2px rules
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.themeVariant))
      .toBe('ledger');
    await expect.poll(() => rootVar('--border-width')).toBe('2px');
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('h2')).textTransform),
    ).toBe('uppercase');
    // Real rendered radius, not just the variable (theme cards use
    // borderRadius.lg and animate `all 150ms`, hence the polls)
    const cardRadius = () =>
      page.evaluate(
        () =>
          getComputedStyle(document.querySelector('[aria-labelledby="theme-group-modern"] button'))
            .borderRadius,
      );
    await expect.poll(cardRadius).toBe('0px');

    await themeCard(page, 'Paper').click();
    await expect.poll(() => rootVar('--font-heading')).toContain('Georgia');
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('h2')).fontFamily),
    ).toContain('Georgia');

    // Back to a theme with no overrides: every token returns to its default
    // and the variant attribute is gone
    await themeCard(page, 'Dark').click();
    await expect.poll(() => rootVar('--radius-lg')).toBe('10px');
    await expect.poll(() => rootVar('--border-width')).toBe('1px');
    expect(
      await page.evaluate(() => document.documentElement.dataset.themeVariant),
    ).toBeUndefined();
    await expect.poll(cardRadius).toBe('10px');
    expect(await rootVar('--font-heading')).toContain('system-ui'); // back to the body face
    expect(
      await page.evaluate(() => getComputedStyle(document.querySelector('h2')).fontFamily),
    ).not.toContain('Georgia');
  });

  test('switches to the light theme', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    await themeCard(page, 'Light').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('light');
  });

  test('switches to the dark theme', async ({ page, pages }) => {
    await openThemeSelector(page, pages);

    // Start from light so selecting dark is an actual change
    await themeCard(page, 'Light').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('light');

    await themeCard(page, 'Dark').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('dark');
  });

  test('theme selection survives a reload', async ({ page, pages }) => {
    await openThemeSelector(page, pages);
    await themeCard(page, 'Light').click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('sims-theme'))).toBe('light');

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

// =============================================================================
// Automated WCAG checks (axe-core)
// The hand-written checks above cover landmarks, labels and focus rings;
// axe catches what they don't — contrast, ARIA misuse, missing names on new
// controls — across the five main views in the default theme. Any
// violation fails; do not add to `disableRules` without a comment that says
// why the rule cannot apply here.
// =============================================================================
test.describe('Automated accessibility scan (axe, default theme)', () => {
  // Every rule is enforced, colour contrast included: the default theme
  // (Midnight) and every modern theme clear AA wherever an accent is
  // rendered as text (test/theme-contrast.test.js pins that offline).
  const scan = (page) =>
    new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Toasts are transient
      .exclude('.toast-container')
      .analyze();

  const describeViolations = (violations) =>
    violations
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.help}\n` +
          v.nodes
            .slice(0, 5)
            .map(
              (n) =>
                `    ${n.target.join(' ')}\n      ${n.html.slice(0, 140)}\n      ${
                  n.failureSummary?.split('\n')[1] || ''
                }`,
            )
            .join('\n'),
      )
      .join('\n');

  async function expectNoViolations(page, view) {
    const results = await scan(page);
    expect(
      results.violations,
      `axe violations on ${view}:\n${describeViolations(results.violations)}`,
    ).toEqual([]);
  }

  test.beforeEach(async ({ page, pages }) => {
    await page.goto('/');
    await pages.dashboard.expectDashboard();
  });

  test('Dashboard', async ({ page }) => {
    await expectNoViolations(page, 'Dashboard');
  });

  test('Gear List', async ({ page, pages }) => {
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    await expectNoViolations(page, 'Gear List');
  });

  test('Item Detail', async ({ page, pages }) => {
    await pages.dashboard.navigateTo('Gear List');
    await pages.gearList.expectGearList();
    await pages.gearList.openItem('CA1001', 'Sony A7S III');
    await pages.itemDetail.expectItemDetail();
    await expectNoViolations(page, 'Item Detail');
  });

  test('Schedule', async ({ page, pages }) => {
    await pages.dashboard.navigateTo('Schedule');
    await expect(page.locator('h2:has-text("Schedule")')).toBeVisible({ timeout: 10000 });
    await expectNoViolations(page, 'Schedule');
  });

  test('Packages', async ({ page, pages }) => {
    await pages.dashboard.navigateTo('Packages');
    await expect(page.locator('h2:has-text("Packages")')).toBeVisible({ timeout: 10000 });
    await expectNoViolations(page, 'Packages');
  });
});
