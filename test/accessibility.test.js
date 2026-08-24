// =============================================================================
// Accessibility Utilities Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hexToRgb,
  parseColor,
  getLuminance,
  getContrastRatio,
  checkContrast,
  getContrastStatus,
  validateThemeContrast,
  getContrastSummary,
  CONTRAST_PAIRS,
  announce,
  announcePageChange,
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
// parseColor — the contrast engine's parser (ported from theme-aa-tune.mjs,
// plus the alpha-hex forms the custom theme editor produces)
// =============================================================================

describe('parseColor', () => {
  it('parses opaque hex with a=1', () => {
    expect(parseColor('#ff5500')).toEqual({ r: 255, g: 85, b: 0, a: 1 });
    expect(parseColor('#f50')).toEqual({ r: 255, g: 85, b: 0, a: 1 });
  });

  it('parses 8-digit and 4-digit hex alpha', () => {
    expect(parseColor('#ffffff80')).toEqual({ r: 255, g: 255, b: 255, a: 128 / 255 });
    expect(parseColor('#fff8')).toEqual({ r: 255, g: 255, b: 255, a: 136 / 255 });
    expect(parseColor('#e2e6eaff')).toEqual({ r: 226, g: 230, b: 234, a: 1 });
  });

  it('parses rgb()/rgba()', () => {
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(parseColor('rgba(255, 255, 255, 0.65)')).toEqual({ r: 255, g: 255, b: 255, a: 0.65 });
  });

  it('returns null for what it cannot read', () => {
    expect(parseColor(null)).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('hsl(200 50% 50%)')).toBeNull();
    expect(parseColor('var(--primary)')).toBeNull();
    expect(parseColor('#fffff')).toBeNull(); // 5 digits
    expect(parseColor('rgb(a, b, c)')).toBeNull();
    expect(parseColor('fff')).toBeNull(); // hex requires the #
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

  it('scores 8-digit hex instead of mis-reading it as ratio 1 (the editor bug)', () => {
    // Fully opaque alpha suffix must not change the result
    expect(getContrastRatio('#ffffffff', '#000000ff')).toBeCloseTo(21, 0);
    expect(getContrastRatio('#e2e6eaff', '#1a1d21')).toBe(getContrastRatio('#e2e6ea', '#1a1d21'));
  });

  it('composites a translucent foreground over the background', () => {
    // 50% white over black flattens to #808080 — same math as theme-aa-tune
    const flattened = getContrastRatio('#808080', '#000000');
    expect(getContrastRatio('#ffffff80', '#000000')).toBe(flattened);
    expect(getContrastRatio('rgba(255, 255, 255, 0.5019607843137255)', '#000000')).toBe(flattened);
    // ...and is nowhere near opaque white's 21:1
    expect(getContrastRatio('#ffffff80', '#000000')).toBeLessThan(7);
  });

  it('composites a translucent background over the backdrop, or its own rgb without one', () => {
    // Over white, 50% black becomes mid-gray; without a backdrop the
    // background's own rgb is treated as opaque (no third surface is known)
    expect(getContrastRatio('#ffffff', 'rgba(0, 0, 0, 0.5)', '#ffffff')).toBe(
      getContrastRatio('#ffffff', '#808080'),
    );
    expect(getContrastRatio('#ffffff', 'rgba(0, 0, 0, 0.5)')).toBeCloseTo(21, 0);
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

  it('scores rgba and 8-digit hex colors instead of skipping them', () => {
    const themeWithAlpha = {
      ...mockTheme,
      '--text-secondary': 'rgba(226, 230, 234, 0.85)',
      '--text-primary': '#e2e6eaff',
    };
    const results = validateThemeContrast(themeWithAlpha);
    const secondaryResult = results.find((r) => r.pair.fg === '--text-secondary');
    expect(secondaryResult.result.skipped).toBeUndefined();
    expect(secondaryResult.result.ratio).toBeGreaterThan(1);
    // Opaque-alpha hex scores exactly like its 6-digit form
    const primaryResult = results.find(
      (r) => r.pair.fg === '--text-primary' && r.pair.bg === '--bg-dark',
    );
    const plainResult = validateThemeContrast(mockTheme).find(
      (r) => r.pair.fg === '--text-primary' && r.pair.bg === '--bg-dark',
    );
    expect(primaryResult.result.ratio).toBe(plainResult.result.ratio);
  });

  it('skips only what the parser cannot read', () => {
    const themeWithHsl = {
      ...mockTheme,
      '--text-secondary': 'hsl(210, 15%, 65%)',
    };
    const results = validateThemeContrast(themeWithHsl);
    const secondaryResult = results.find((r) => r.pair.fg === '--text-secondary');
    expect(secondaryResult.result.skipped).toBe(true);
    expect(secondaryResult.result.level).toBe('Unknown');
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
// Screen Reader Announcement Tests — the two functions the app actually
// calls (ThemeContext/CustomThemeEditor → announce, Sidebar →
// announcePageChange). The wider announce* family was deleted with its
// dead exports.
// =============================================================================

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

describe('announcePageChange', () => {
  let rAF;

  beforeEach(() => {
    rAF = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => cb());
  });

  afterEach(() => {
    rAF.mockRestore();
  });

  it('announces the navigation', () => {
    announcePageChange('Gear List');
    const announcer = document.querySelector('[role="status"]');
    expect(announcer.textContent).toBe('Navigated to Gear List');
  });
});
