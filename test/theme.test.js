// =============================================================================
// Theme Tests
// Tests for theme configuration and helper functions
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
  zIndex,
  transitions,
  withOpacity,
} from '../theme.js';

// =============================================================================
// Colors Tests
// =============================================================================

describe('colors', () => {
  it('should have all required background colors', () => {
    expect(colors.bgDark).toBeDefined();
    expect(colors.bgMedium).toBeDefined();
    expect(colors.bgLight).toBeDefined();
    expect(colors.bgCard).toBeDefined();
    expect(colors.bgCardSolid).toBeDefined();
  });

  it('should have all required primary colors', () => {
    expect(colors.primary).toBeDefined();
    expect(colors.primaryLight).toBeDefined();
    expect(colors.primaryDark).toBeDefined();
  });

  it('should have all required status colors', () => {
    expect(colors.available).toBeDefined();
    expect(colors.checkedOut).toBeDefined();
    expect(colors.reserved).toBeDefined();
    expect(colors.needsAttention).toBeDefined();
    expect(colors.missing).toBeDefined();
  });

  it('should have all required text colors', () => {
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
    expect(colors.textMuted).toBeDefined();
  });

  it('should have all required semantic colors', () => {
    expect(colors.danger).toBeDefined();
    expect(colors.success).toBeDefined();
    expect(colors.warning).toBeDefined();
  });

  it('should use CSS variables for colors', () => {
    expect(colors.primary).toContain('var(--');
    expect(colors.textPrimary).toContain('var(--');
    expect(colors.danger).toContain('var(--');
  });

  it('should have focus ring color', () => {
    expect(colors.focusRing).toBeDefined();
    expect(colors.focusRing).toContain('var(--');
  });
});

// =============================================================================
// Spacing Tests
// =============================================================================

describe('spacing', () => {
  it('should have spacing scale values', () => {
    expect(spacing[0]).toBe(0);
    expect(spacing[1]).toBe(4);
    expect(spacing[2]).toBe(8);
    expect(spacing[3]).toBe(12);
    expect(spacing[4]).toBe(16);
    expect(spacing[5]).toBe(20);
    expect(spacing[6]).toBe(24);
  });

  it('should have larger spacing values', () => {
    expect(spacing[8]).toBe(32);
    expect(spacing[10]).toBe(40);
    expect(spacing[12]).toBe(48);
  });

  it('should follow 4px base unit pattern', () => {
    expect(spacing[1]).toBe(4);
    expect(spacing[2]).toBe(4 * 2);
    expect(spacing[4]).toBe(4 * 4);
  });
});

// =============================================================================
// Border Radius Tests
// =============================================================================

describe('borderRadius', () => {
  it('should have all required radius values', () => {
    expect(borderRadius.none).toBe(0);
    expect(borderRadius.sm).toBeDefined();
    expect(borderRadius.md).toBeDefined();
    expect(borderRadius.lg).toBeDefined();
    expect(borderRadius.full).toBe('9999px');
  });

  it('should have increasing radius values', () => {
    expect(borderRadius.sm).toBeLessThan(borderRadius.md);
    expect(borderRadius.md).toBeLessThan(borderRadius.lg);
  });
});

// =============================================================================
// Typography Tests
// =============================================================================

describe('typography', () => {
  it('should have font sizes', () => {
    expect(typography.fontSize).toBeDefined();
    expect(typography.fontSize.xs).toBeDefined();
    expect(typography.fontSize.sm).toBeDefined();
    expect(typography.fontSize.base).toBeDefined();
    expect(typography.fontSize.lg).toBeDefined();
    expect(typography.fontSize.xl).toBeDefined();
  });

  it('should have font weights', () => {
    expect(typography.fontWeight).toBeDefined();
    expect(typography.fontWeight.normal).toBe(400);
    expect(typography.fontWeight.medium).toBe(500);
    expect(typography.fontWeight.semibold).toBe(600);
    expect(typography.fontWeight.bold).toBe(700);
  });

  it('should have line heights', () => {
    expect(typography.lineHeight).toBeDefined();
    expect(typography.lineHeight.tight).toBeDefined();
    expect(typography.lineHeight.normal).toBeDefined();
    expect(typography.lineHeight.relaxed).toBeDefined();
  });
});

// =============================================================================
// Shadows Tests
// =============================================================================

describe('shadows', () => {
  it('should have all shadow sizes', () => {
    expect(shadows.sm).toBeDefined();
    expect(shadows.md).toBeDefined();
    expect(shadows.lg).toBeDefined();
    expect(shadows.card).toBeDefined();
  });

  it('should use CSS variables', () => {
    expect(shadows.sm).toContain('var(--');
    expect(shadows.card).toContain('var(--');
  });
});

// =============================================================================
// Z-Index Tests
// =============================================================================

describe('zIndex', () => {
  it('should have all z-index levels', () => {
    expect(zIndex.dropdown).toBeDefined();
    expect(zIndex.sticky).toBeDefined();
    expect(zIndex.modal).toBeDefined();
    expect(zIndex.tooltip).toBeDefined();
  });

  it('should have modal higher than dropdown', () => {
    expect(zIndex.modal).toBeGreaterThan(zIndex.dropdown);
  });

  it('should have tooltip higher than modal', () => {
    expect(zIndex.tooltip).toBeGreaterThan(zIndex.modal);
  });
});

// =============================================================================
// Transitions Tests
// =============================================================================

describe('transitions', () => {
  it('should have transition durations', () => {
    expect(transitions.fast).toBeDefined();
    expect(transitions.normal).toBeDefined();
    expect(transitions.slow).toBeDefined();
  });

  it('should have easing functions', () => {
    expect(transitions.easing).toBeDefined();
    expect(transitions.easing.default).toBeDefined();
    expect(transitions.easing.in).toBeDefined();
    expect(transitions.easing.out).toBeDefined();
    expect(transitions.easing.inOut).toBeDefined();
  });
});

// =============================================================================
// withOpacity Helper Tests
// =============================================================================

describe('withOpacity', () => {
  it('should create color-mix CSS for opacity', () => {
    const result = withOpacity(colors.primary, 0.5);
    expect(result).toContain('color-mix');
    expect(result).toContain('50%');
  });

  it('should handle 0 opacity', () => {
    const result = withOpacity(colors.danger, 0);
    expect(result).toContain('0%');
  });

  it('should handle 1 opacity', () => {
    const result = withOpacity(colors.success, 1);
    expect(result).toContain('100%');
  });

  it('should handle decimal opacity values', () => {
    const result = withOpacity(colors.warning, 0.25);
    expect(result).toContain('25%');
  });
});
