// ============================================================================
// SIMS Theme Configuration
// Uses CSS custom properties (variables) for dynamic theme switching
// ============================================================================

// ============================================================================
// Colors - Using CSS variables for theme support
// These reference CSS custom properties that are set by ThemeContext
// For opacity, use the withOpacity() helper which uses CSS color-mix()
// ============================================================================

import { warn } from './lib/logger.js';

export const colors = {
  // Primary backgrounds
  bgDark: 'var(--bg-dark)',
  bgMedium: 'var(--bg-medium)',
  bgLight: 'var(--bg-light)',
  bgCard: 'var(--bg-card)',
  bgCardSolid: 'var(--bg-card-solid)',

  // Accent colors
  primary: 'var(--primary)',
  primaryLight: 'var(--primary-light)',
  primaryDark: 'var(--primary-dark)',

  accent1: 'var(--accent1)',
  accent2: 'var(--accent2)',
  accent3: 'var(--accent3)',

  // Status colors
  available: 'var(--status-available)',
  checkedOut: 'var(--status-checked-out)',
  reserved: 'var(--status-reserved)',
  needsAttention: 'var(--status-needs-attention)',
  missing: 'var(--status-missing)',

  // Condition colors
  excellent: 'var(--condition-excellent)',
  good: 'var(--condition-good)',
  fair: 'var(--condition-fair)',
  poor: 'var(--condition-poor)',

  // Text colors
  textPrimary: 'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textMuted: 'var(--text-muted)',

  // Border colors
  border: 'var(--border)',
  borderLight: 'var(--border-light)',

  // Semantic colors
  danger: 'var(--danger)',
  success: 'var(--success)',
  warning: 'var(--warning)',

  // Label colors for text rendered ON colored fills (buttons, filled badges).
  // Per-theme values chosen for WCAG 4.5:1 — see test/theme-contrast.test.js
  onPrimary: 'var(--on-primary)',
  onDanger: 'var(--on-danger)',
  onSuccess: 'var(--on-success)',

  // Focus ring (accessibility)
  focusRing: 'var(--focus-ring-color)',
};

// ============================================================================
// Opacity Helper - Uses CSS color-mix() for theme-aware opacity
// ============================================================================

/**
 * Apply opacity to a CSS color variable using color-mix()
 * This works with CSS variables and automatically updates with theme changes
 *
 * @param {string} color - A CSS variable reference (e.g., colors.primary or 'var(--primary)') or hex color
 * @param {number} percent - Opacity percentage (0-100), e.g., 20 for 20% opacity
 * @returns {string} CSS color-mix() expression
 *
 * @example
 * // Using with colors object
 * background: withOpacity(colors.primary, 20)  // 20% opacity
 * border: `1px solid ${withOpacity(colors.primary, 50)}`  // 50% opacity
 *
 * // Using with CSS variable string
 * background: withOpacity('var(--panel-alerts)', 15)
 *
 * // Using with hex color (works but not reactive to theme)
 * background: withOpacity('#6366f1', 20)
 */
export const withOpacity = (color, percent) => {
  if (!color) {
    warn('withOpacity called with undefined color');
    return 'transparent';
  }
  // color-mix works with both hex colors and CSS variable references
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
};

// ============================================================================
// Static values - These don't change with themes
// ============================================================================

// Typography
export const typography = {
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    xs: '12px',
    sm: '13px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing scale (in pixels)
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

// Border radius
export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '10px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
};

// Shadows - Using CSS variables for theme support
export const shadows = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  card: 'var(--shadow-card)',
};

// Responsive breakpoints (px). Keep in sync with the index.css media queries:
// ≤phone = off-canvas drawer nav + full-screen modal sheets stay ≤tablet;
// phone<w≤desktop = sidebar icon rail by default.
export const breakpoints = {
  phone: 640,
  tablet: 768,
  desktop: 1024,
};

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 1090,
  // Mobile chrome (.mobile-header 998, sidebar drawer 1000 in index.css) must
  // stay UNDER open modals, so the modal layer sits above 1000; dropdown
  // portals (Select/DatePicker) and toasts render higher still.
  modal: 1100,
  popover: 1150,
  confirm: 1200,
  tooltip: 1250,
};

// Transitions
export const transitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
};

// ============================================================================
// Reusable Style Objects
// ============================================================================

export const styles = {
  // Card style
  card: {
    background: colors.bgLight,
    backdropFilter: 'blur(10px)',
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.card,
  },

  // Primary button
  // Primary buttons: use the `.btn` CSS class (index.css) — its gradient and
  // --on-primary label are contrast-checked per theme. A duplicate inline
  // `btn` style with a --text-primary label used to live here; it failed
  // WCAG in every theme (invisible in Terminal) and was removed.

  // Secondary button
  btnSec: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    background: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    padding: `${spacing[2]}px ${spacing[3]}px`,
    borderRadius: borderRadius.lg,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    transition: transitions.fast,
  },

  // Danger button modifier
  btnDanger: {
    borderColor: colors.danger,
    color: colors.danger,
  },

  // Input field
  input: {
    width: '100%',
    padding: `${spacing[3]}px ${spacing[4]}px`,
    background: 'var(--input-bg, color-mix(in srgb, var(--primary) 10%, transparent))',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  },

  // Select dropdown - matches input but with proper height
  select: {
    width: '100%',
    padding: `${spacing[3]}px ${spacing[4]}px`,
    paddingRight: `${spacing[8]}px`, // Extra space for dropdown arrow
    background: 'var(--input-bg, color-mix(in srgb, var(--primary) 10%, transparent))',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `right ${spacing[3]}px center`,
    minHeight: '42px', // Match input height
  },

  // Form label
  label: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: spacing[2],
  },

  // Modal backdrop
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.modal,
    padding: spacing[4],
  },

  // Modal box
  modalBox: {
    background: colors.bgMedium,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: shadows.lg,
  },
};

