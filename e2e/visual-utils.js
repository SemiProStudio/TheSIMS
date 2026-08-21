// =============================================================================
// Visual Regression Test Utilities
// Helpers for screenshot comparison testing
// =============================================================================

import { test as base, expect } from '@playwright/test';
import { LoginPage, DashboardPage } from './fixtures.js';

// =============================================================================
// Visual Test Configuration
// =============================================================================

export const visualConfig = {
  // Threshold for pixel difference (0-1, lower = stricter)
  threshold: 0.2,

  // Maximum allowed different pixels
  maxDiffPixels: 100,

  // Screenshot options
  screenshotOptions: {
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  },

  // Mask dynamic content (timestamps, random data)
  maskSelectors: [
    '[data-testid="timestamp"]',
    '[data-testid="random-id"]',
    'time',
    '.timestamp',
    '.date-display',
  ],
};

// =============================================================================
// Visual Test Helpers
// =============================================================================

/**
 * Take a screenshot with consistent settings
 */
export async function takeSnapshot(page, name, options = {}) {
  // Wait for any animations to complete
  await page.waitForTimeout(500);

  // Wait for network to be idle
  await page.waitForLoadState('networkidle').catch(() => {});

  // Mask dynamic elements
  const masks = [];
  for (const selector of visualConfig.maskSelectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    for (let i = 0; i < count; i++) {
      masks.push(elements.nth(i));
    }
  }

  return page.screenshot({
    ...visualConfig.screenshotOptions,
    ...options,
    mask: masks,
  });
}

/**
 * Compare screenshot against baseline
 */
export async function compareSnapshot(page, name, options = {}) {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    threshold: visualConfig.threshold,
    maxDiffPixels: visualConfig.maxDiffPixels,
    ...options,
  });
}

/**
 * Compare element screenshot against baseline
 */
export async function compareElementSnapshot(locator, name, options = {}) {
  await expect(locator).toHaveScreenshot(`${name}.png`, {
    threshold: visualConfig.threshold,
    maxDiffPixels: visualConfig.maxDiffPixels,
    ...options,
  });
}

// =============================================================================
// Extended Test with Visual Fixtures
// =============================================================================

export const test = base.extend({
  // Freeze per-user settings persistence, exactly like e2e/fixtures.js does
  // for functional specs. Without this, the 'sidebar collapsed' visual test
  // persisted its collapse into the shared admin PROFILE and every later
  // visual context logged in with a collapsed sidebar — failing every
  // full-page baseline.
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('sims-ui-settings-readonly', '1');
      } catch {
        /* ignore */
      }
    });
    await use(context);
  },

  // Fixture that provides authenticated page for visual tests. The project's
  // storageState (written by auth.setup.js) already carries the admin
  // session — just load the app and wait for the dashboard.
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/');
    const dashboard = new DashboardPage(page);
    await dashboard.expectDashboard();

    // Wait for initial load
    await page.waitForTimeout(1000);

    await use(page);
  },

  // Fixture for consistent viewport
  standardViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await use(page);
  },

  // Fixture for mobile viewport
  mobileViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await use(page);
  },

  // Fixture for tablet viewport
  tabletViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await use(page);
  },
});

export { expect };

// =============================================================================
// Theme Test Helpers
// =============================================================================

/**
 * Pin the page clock for captures that render date-relative content.
 *
 * The dashboard's Today panel and reservation rows compare seeded dates
 * (frozen at seed time) against "today" — so unpinned captures change state
 * as real days pass. CI runners sit in UTC, which is why baselines generated
 * during a US afternoon broke that same evening. Same rationale as the
 * Schedule visual spec's pinned clock: fixed time only freezes Date.now(),
 * timers still run, and the stored session stays valid. Call BEFORE the
 * first page.goto().
 *
 * Aug 18 2026 is the seeded data's quiet dashboard day — the Wedding
 * reservation (Aug 16–18) no longer lists as upcoming and the URSA one
 * (Aug 21–25) hasn't started — matching the state the current dashboard
 * baselines captured. (The Schedule spec pins Aug 16 instead because it
 * needs those reservations inside the visible week.) If seed.sql is ever
 * re-applied, its CURRENT_DATE-relative rows shift and both pinned dates
 * must be re-derived.
 */
export async function pinVisualClock(page) {
  await page.clock.setFixedTime(new Date('2026-08-18T12:00:00'));
}

/**
 * Set theme and wait for it to apply
 */
export async function setTheme(page, themeName) {
  await page.evaluate((theme) => {
    localStorage.setItem('sims-theme', theme);
  }, themeName);

  await page.reload();
  await page.waitForTimeout(500);
}

/**
 * Get list of available themes
 */
// Keep in sync with themes-data.js `themes` (static, non-generated ids only)
export const availableThemes = [
  'dark',
  'light',
  'darker',
  'primaries',
  'pastel',
  'terminal',
  'blackwhite',
  'vibrant',
  'muted',
  'xp',
  'cheese',
  'cats',
  'dogs',
];

// =============================================================================
// Component Selectors for Visual Testing
// =============================================================================

export const componentSelectors = {
  sidebar: '[role="navigation"][aria-label="Main navigation"]',
  header: 'header, [role="banner"]',
  mainContent: 'main, [role="main"]',
  modal: '[role="dialog"]',
  card: '[data-testid="card"], .card',
  button: 'button',
  input: 'input',
  select: 'select',
  badge: '[data-testid="badge"], .badge',
  statusBadge: '[data-testid="status-badge"]',
  table: 'table',
  form: 'form',
};
