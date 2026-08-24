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

  // Accent colors
  primary: 'var(--primary)',

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
  onSuccess: 'var(--on-success)',
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

// Typography — the families are CSS variables so a theme can swap the face
// (themes-data.js `tokens`); defaults live in index.css :root
export const typography = {
  fontFamily: 'var(--font-sans)',
  fontFamilyHeading: 'var(--font-heading)',
  fontFamilyMono: 'var(--font-mono)',
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

// Border radius — CSS variables so a theme can set the corner style (sharp
// vs. soft); defaults in index.css :root, per-theme values in themes-data.js
export const borderRadius = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
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
  desktop: 1024,
};

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 100,
  // Mobile chrome (.mobile-header 998, sidebar drawer 1000 in index.css) must
  // stay UNDER open modals, so the modal layer sits above 1000; dropdown
  // portals (Select/DatePicker) and toasts render higher still.
  modal: 1100,
  confirm: 1200,
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

  // Input field
  input: {
    width: '100%',
    padding: `${spacing[3]}px ${spacing[4]}px`,
    background: 'var(--input-bg, color-mix(in srgb, var(--primary) 10%, transparent))',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily,
    outline: 'none',
    boxSizing: 'border-box',
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

