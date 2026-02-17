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
  // Fixture that provides authenticated page for visual tests
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAsAdmin();

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
export const availableThemes = [
  'dark',
  'light',
  'darker',
  'ocean',
  'forest',
  'sunset',
  'neon',
  'muted',
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
