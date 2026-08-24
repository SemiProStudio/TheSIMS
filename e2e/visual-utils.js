// =============================================================================
// Visual Regression Test Utilities
// Helpers for screenshot comparison testing
// =============================================================================

import { test as base, expect } from '@playwright/test';

// =============================================================================
// Visual Test Helpers
// =============================================================================

/**
 * Wait until the page has genuinely settled before a capture — the replacement
 * for the fixed `waitForTimeout` sleeps the visual specs used to carry.
 * "Settled" means: no in-flight network, web fonts ready, no image still
 * decoding, no spinner (anything animating `spin`), and two consecutive
 * layout snapshots `settleMs` apart that are identical. A mid-load capture
 * leaked into a linux baseline once because a sleep happened to be shorter
 * than that run's tier-2 fetch; this waits for the condition instead.
 */
export async function waitForStable(page, { timeout = 10000, settleMs = 150 } = {}) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});

  const snapshot = () =>
    page.evaluate(() => {
      const all = document.querySelectorAll('body *');
      let sum = 0;
      let spinning = false;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        sum += r.x + r.y + r.width + r.height;
        if (!spinning && el.tagName === 'svg' && getComputedStyle(el).animationName === 'spin') {
          spinning = true;
        }
      }
      const imagesPending = Array.from(document.images).some((img) => !img.complete);
      return JSON.stringify({
        busy: spinning || imagesPending,
        count: all.length,
        sum: Math.round(sum),
        text: document.body.innerText.length,
        scroll: document.documentElement.scrollHeight,
      });
    });

  const deadline = Date.now() + timeout;
  let previous = null;
  while (Date.now() < deadline) {
    const current = await snapshot();
    if (current === previous && !JSON.parse(current).busy) return;
    previous = current;
    await page.waitForTimeout(settleMs);
  }
  // Time out quietly: the capture that follows will show what was unstable
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
 * Aug 19 2026 is the seeded data's quiet dashboard day: the Wedding
 * reservation (Aug 16–18) has fully ended — note the upcoming panel keeps a
 * reservation through its END day, so Aug 18 still shows it — and the URSA
 * one (Aug 21–25) hasn't started. This matches the state the linux
 * dashboard baselines captured. (The Schedule spec pins Aug 16 instead
 * because it needs those reservations inside the visible week.) If seed.sql
 * is ever re-applied, its CURRENT_DATE-relative rows shift and both pinned
 * dates must be re-derived.
 */
export async function pinVisualClock(page) {
  await page.clock.setFixedTime(new Date('2026-08-19T12:00:00'));
}

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
