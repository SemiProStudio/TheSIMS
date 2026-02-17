// =============================================================================
// Accessibility Utilities Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  checkContrast,
  getContrastStatus,
  validateThemeContrast,
  getContrastSummary,
  CONTRAST_PAIRS,
  announce,
  announceAssertive,
  announceAdded,
  announceRemoved,
  announceLoading,
  announceLoaded,
  announceError,
  announceSuccess,
  announcePageChange,
  announceModal,
  announceSelection,
  announceFilterChange,
  focusAndAnnounce,
  trapFocus,
} from '../utils/accessibility.js';

// =============================================================================
// Color Conversion Tests
// =============================================================================

describe('hexToRgb', () => {
  it('should convert 6-digit hex to RGB', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ff5500')).toEqual({ r: 255, g: 85, b: 0 });
  });

  it('should convert 3-digit hex to RGB', () => {
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#f50')).toEqual({ r: 255, g: 85, b: 0 });
  });

  it('should handle hex without #', () => {
    expect(hexToRgb('ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('should return null for invalid input', () => {
    expect(hexToRgb(null)).toBeNull();
    expect(hexToRgb(undefined)).toBeNull();
    expect(hexToRgb('')).toBeNull();
    expect(hexToRgb('invalid')).toBeNull();
    expect(hexToRgb('#gg0000')).toBeNull();
  });
});

// =============================================================================
// Luminance Tests
// =============================================================================

describe('getLuminance', () => {
  it('should return 1 for white', () => {
    const luminance = getLuminance({ r: 255, g: 255, b: 255 });
    expect(luminance).toBeCloseTo(1, 2);
  });

  it('should return 0 for black', () => {
    const luminance = getLuminance({ r: 0, g: 0, b: 0 });
    expect(luminance).toBeCloseTo(0, 2);
  });

  it('should return correct luminance for gray', () => {
    const luminance = getLuminance({ r: 128, g: 128, b: 128 });
    expect(luminance).toBeGreaterThan(0);
    expect(luminance).toBeLessThan(1);
  });
});

// =============================================================================
// Contrast Ratio Tests
// =============================================================================

describe('getContrastRatio', () => {
  it('should return 21 for black on white', () => {
    const ratio = getContrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should return 21 for white on black', () => {
    const ratio = getContrastRatio('#ffffff', '#000000');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('should return 1 for same colors', () => {
    const ratio = getContrastRatio('#ff5500', '#ff5500');
    expect(ratio).toBeCloseTo(1, 2);
  });

  it('should return 1 for invalid colors', () => {
    expect(getContrastRatio('invalid', '#ffffff')).toBe(1);
    expect(getContrastRatio('#ffffff', 'invalid')).toBe(1);
  });
});

// =============================================================================
// WCAG Compliance Tests
// =============================================================================

describe('checkContrast', () => {
  it('should pass AAA for black on white', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.passes).toBe(true);
    expect(result.level).toBe('AAA');
    expect(result.ratio).toBeGreaterThan(7);
  });

  it('should fail for low contrast', () => {
    const result = checkContrast('#777777', '#888888');
    expect(result.passes).toBe(false);
    expect(result.level).toBe('Fail');
    expect(result.ratio).toBeLessThan(4.5);
  });

  it('should pass AA for moderate contrast', () => {
    const result = checkContrast('#1a1a1a', '#ffffff');
    expect(result.passes).toBe(true);
    expect(result.level).toBe('AAA');
  });

  it('should use lower threshold for large text', () => {
    // A ratio of 3.5 fails for normal text but passes for large text
    const normalResult = checkContrast('#666666', '#e0e0e0', false);
    const largeResult = checkContrast('#666666', '#e0e0e0', true);

    // Both should have the same ratio
    expect(normalResult.ratio).toEqual(largeResult.ratio);

    // Large text has lower threshold
    if (normalResult.ratio >= 3 && normalResult.ratio < 4.5) {
      expect(normalResult.passes).toBe(false);
      expect(largeResult.passes).toBe(true);
    }
  });
});

describe('getContrastStatus', () => {
  it('should return excellent for ratio >= 7', () => {
    const status = getContrastStatus(7.5);
    expect(status.status).toBe('excellent');
    expect(status.description).toContain('AAA');
  });

  it('should return good for ratio >= 4.5', () => {
    const status = getContrastStatus(5);
    expect(status.status).toBe('good');
    expect(status.description).toContain('AA');
  });

  it('should return warning for ratio >= 3', () => {
    const status = getContrastStatus(3.5);
    expect(status.status).toBe('warning');
    expect(status.description).toContain('Large text');
  });

  it('should return fail for ratio < 3', () => {
    const status = getContrastStatus(2);
    expect(status.status).toBe('fail');
    expect(status.description).toContain('Insufficient');
  });
});

// =============================================================================
// Theme Validation Tests
// =============================================================================

describe('validateThemeContrast', () => {
  const mockTheme = {
    '--text-primary': '#e2e6ea',
    '--text-secondary': '#a0a0a0',
    '--text-muted': '#707070',
    '--bg-dark': '#1a1d21',
    '--bg-medium': '#22262b',
    '--bg-light': '#2a2f36',
    '--primary': '#5d8aa8',
    '--primary-light': '#7ba3be',
    '--status-available': '#6b9e78',
    '--status-needs-attention': '#b58f6b',
    '--danger': '#b56b6b',
    '--success': '#6b9e78',
    '--warning': '#b5a56b',
    '--focus-ring-color': '#8bb5cc',
  };

  it('should return results for all contrast pairs', () => {
    const results = validateThemeContrast(mockTheme);
    expect(results.length).toBe(CONTRAST_PAIRS.length);
  });

  it('should include pair info and result for each check', () => {
    const results = validateThemeContrast(mockTheme);
    results.forEach((result) => {
      expect(result).toHaveProperty('pair');
      expect(result).toHaveProperty('result');
      expect(result.pair).toHaveProperty('fg');
      expect(result.pair).toHaveProperty('bg');
      expect(result.pair).toHaveProperty('label');
    });
  });

  it('should skip non-hex colors', () => {
    const themeWithRgba = {
      ...mockTheme,
      '--text-secondary': 'rgba(226, 230, 234, 0.65)',
    };
    const results = validateThemeContrast(themeWithRgba);
    const secondaryResult = results.find((r) => r.pair.fg === '--text-secondary');
    expect(secondaryResult.result.skipped).toBe(true);
  });
});

describe('getContrastSummary', () => {
  it('should calculate correct summary', () => {
    const mockResults = [
      { pair: {}, result: { passes: true } },
      { pair: {}, result: { passes: true } },
      { pair: {}, result: { passes: false } },
      { pair: {}, result: { passes: false, skipped: true } },
    ];

    const summary = getContrastSummary(mockResults);
    expect(summary.passing).toBe(2);
    expect(summary.failing).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.score).toBe(67); // 2 passing out of 3 (excluding skipped)
  });

  it('should handle empty results', () => {
    const summary = getContrastSummary([]);
    expect(summary.passing).toBe(0);
    expect(summary.failing).toBe(0);
    expect(summary.score).toBe(0);
  });

  it('should handle all passing', () => {
    const mockResults = [
      { pair: {}, result: { passes: true } },
      { pair: {}, result: { passes: true } },
    ];

    const summary = getContrastSummary(mockResults);
    expect(summary.score).toBe(100);
  });
});

// =============================================================================
// CONTRAST_PAIRS Configuration Tests
// =============================================================================

describe('CONTRAST_PAIRS', () => {
  it('should have required color pairs', () => {
    const fgColors = CONTRAST_PAIRS.map((p) => p.fg);
    const bgColors = CONTRAST_PAIRS.map((p) => p.bg);

    // Check essential text colors are tested
    expect(fgColors).toContain('--text-primary');
    expect(fgColors).toContain('--text-secondary');
    expect(fgColors).toContain('--text-muted');

    // Check all test against background
    expect(bgColors).toContain('--bg-dark');

    // Check focus ring is tested
    expect(fgColors).toContain('--focus-ring-color');
  });

  it('should have labels for all pairs', () => {
    CONTRAST_PAIRS.forEach((pair) => {
      expect(pair.label).toBeDefined();
      expect(pair.label.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Screen Reader Announcement Tests
// =============================================================================

// NOTE: The announce module keeps a module-level `announcerElement` reference.
// Once created, the element persists across calls. We do NOT remove it from the
// DOM between tests — we just mock rAF and check textContent.

describe('announce', () => {
  let rAF;

  beforeEach(() => {
    rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    rAF.mockRestore();
  });

  it('should create announcer element with aria-live', () => {
    announce('test');
    const announcer = document.querySelector('[role="status"]');
    expect(announcer).not.toBeNull();
    expect(announcer.getAttribute('aria-live')).toBe('polite');
    expect(announcer.getAttribute('aria-atomic')).toBe('true');
  });

  it('should set message text', () => {
    announce('Hello world');
    const announcer = document.querySelector('[role="status"]');
    expect(announcer).not.toBeNull();
    expect(announcer.textContent).toBe('Hello world');
  });

  it('should reuse existing announcer', () => {
    announce('First');
    announce('Second');
    const announcers = document.querySelectorAll('[role="status"]');
    expect(announcers.length).toBe(1);
    expect(announcers[0].textContent).toBe('Second');
  });
});

describe('announceAssertive', () => {
  let rAF;

  beforeEach(() => {
    rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    rAF.mockRestore();
  });

  it('should set aria-live to assertive', () => {
    announceAssertive('Urgent');
    const announcer = document.querySelector('[role="status"]');
    expect(announcer).not.toBeNull();
    expect(announcer.getAttribute('aria-live')).toBe('assertive');
  });
});

// =============================================================================
// Announcement Helper Tests
// =============================================================================

describe('announcement helpers', () => {
  let rAF;

  beforeEach(() => {
    rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    rAF.mockRestore();
  });

  it('announceAdded with context', () => {
    announceAdded('Canon R5', 'inventory');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Canon R5 added to inventory');
  });

  it('announceAdded without context', () => {
    announceAdded('Canon R5');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Canon R5 added');
  });

  it('announceRemoved with context', () => {
    announceRemoved('Lens', 'cart');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Lens removed from cart');
  });

  it('announceRemoved without context', () => {
    announceRemoved('Lens');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Lens removed');
  });

  it('announceLoading default', () => {
    announceLoading();
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Content loading');
  });

  it('announceLoading custom', () => {
    announceLoading('Items');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Items loading');
  });

  it('announceLoaded with count', () => {
    announceLoaded('Items', 42);
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toContain('42 items found');
  });

  it('announceLoaded without count', () => {
    announceLoaded('Items');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Items loaded');
  });

  it('announceError', () => {
    announceError('Something broke');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Error: Something broke');
  });

  it('announceSuccess', () => {
    announceSuccess('Saved!');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Saved!');
  });

  it('announcePageChange', () => {
    announcePageChange('Inventory');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Navigated to Inventory');
  });

  it('announceModal opened', () => {
    announceModal('Add Item', true);
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Add Item dialog opened');
  });

  it('announceModal closed', () => {
    announceModal('Add Item', false);
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Add Item dialog closed');
  });

  it('announceSelection selected', () => {
    announceSelection('Camera', true);
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Camera selected');
  });

  it('announceSelection deselected', () => {
    announceSelection('Camera', false);
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Camera deselected');
  });

  it('announceFilterChange', () => {
    announceFilterChange('Category', 'Cameras');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Category changed to Cameras');
  });
});

// =============================================================================
// Focus Management Tests
// =============================================================================

describe('focusAndAnnounce', () => {
  let rAF;

  beforeEach(() => {
    rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    rAF.mockRestore();
  });

  it('should focus the element', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    const spy = vi.spyOn(btn, 'focus');
    focusAndAnnounce(btn);
    expect(spy).toHaveBeenCalled();
    btn.remove();
  });

  it('should announce if message provided', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    focusAndAnnounce(btn, 'Focus moved');
    const a = document.querySelector('[role="status"]');
    expect(a.textContent).toBe('Focus moved');
    btn.remove();
  });

  it('should not announce without message', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    focusAndAnnounce(btn);
    btn.remove();
  });

  it('should not throw for null element', () => {
    expect(() => focusAndAnnounce(null)).not.toThrow();
  });
});

describe('trapFocus', () => {
  it('should return noop for null container', () => {
    const cleanup = trapFocus(null);
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });

  it('should focus first focusable element', () => {
    const container = document.createElement('div');
    const btn1 = document.createElement('button');
    const btn2 = document.createElement('button');
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const spy = vi.spyOn(btn1, 'focus');
    trapFocus(container);
    expect(spy).toHaveBeenCalled();
    container.remove();
  });

  it('should return cleanup function that removes listener', () => {
    const container = document.createElement('div');
    const btn = document.createElement('button');
    container.appendChild(btn);
    document.body.appendChild(container);

    const removeSpy = vi.spyOn(container, 'removeEventListener');
    const cleanup = trapFocus(container);
    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    container.remove();
  });
});
