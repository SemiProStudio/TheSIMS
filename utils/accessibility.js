// ============================================================================
// Accessibility Utilities
// Color contrast checking / theme validation (WCAG 2.1) and the two
// screen-reader announcements the app actually makes. The wider
// announce*/focusAndAnnounce/trapFocus family that used to live here had no
// importers (ModalBase hand-rolls its own focus trap) — deleted in the
// 2026-08-14 dead-export sweep.
// ============================================================================

// ============================================================================
// Color Contrast Calculations (WCAG 2.1)
// ============================================================================

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color string (#RGB or #RRGGBB)
 * @returns {{r: number, g: number, b: number} | null}
 */
export function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null;

  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand (#RGB)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (hex.length !== 6) return null;

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Parse a CSS color into channels: #RGB/#RGBA/#RRGGBB/#RRGGBBAA and
 * rgb()/rgba(). Ported from scripts/theme-aa-tune.mjs (which must stay
 * standalone for the AA audit) plus the alpha-hex forms — the custom theme
 * editor feeds 8-digit hex here, which the hex-only path scored as ratio 1.
 * @param {string} color
 * @returns {{r: number, g: number, b: number, a: number} | null} a in 0-1
 */
export function parseColor(color) {
  if (!color || typeof color !== 'string') return null;
  const str = color.trim();

  const hexMatch = str.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    if (hex.length !== 6 && hex.length !== 8) return null;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return { r, g, b, a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1 };
  }

  const fnMatch = str.match(/^rgba?\(([^)]+)\)$/i);
  if (fnMatch) {
    const parts = fnMatch[1].split(',').map(Number);
    if (parts.length < 3 || parts.length > 4 || parts.some(Number.isNaN)) return null;
    const [r, g, b, a] = parts;
    return { r, g, b, a: parts.length === 4 ? a : 1 };
  }

  return null;
}

// Flatten a translucent color onto an opaque backdrop — WCAG contrast is
// defined over opaque colors. Same arithmetic as theme-aa-tune's `over`.
function compositeOver(fg, backdrop) {
  if (!(fg.a < 1)) return fg;
  return {
    r: Math.round(fg.r * fg.a + backdrop.r * (1 - fg.a)),
    g: Math.round(fg.g * fg.a + backdrop.g * (1 - fg.a)),
    b: Math.round(fg.b * fg.a + backdrop.b * (1 - fg.a)),
    a: 1,
  };
}

/**
 * Calculate relative luminance of a color (WCAG formula)
 * @param {{r: number, g: number, b: number}} rgb
 * @returns {number} Luminance value (0-1)
 */
export function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG formula).
 * Accepts every parseColor form. Translucent colors are composited first:
 * the background over `backdrop` (over its own rgb — treated opaque — when
 * no backdrop is supplied, since no third surface is known), then the
 * foreground over the resolved background.
 * @param {string} color1 - Foreground color
 * @param {string} color2 - Background color
 * @param {string} [backdrop] - Surface behind a translucent background
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2, backdrop) {
  const fg = parseColor(color1);
  const bg = parseColor(color2);

  if (!fg || !bg) return 1;

  const bgFlat = compositeOver(bg, (backdrop && parseColor(backdrop)) || bg);
  const fgFlat = compositeOver(fg, bgFlat);

  const l1 = getLuminance(fgFlat);
  const l2 = getLuminance(bgFlat);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 * @param {string} foreground - Foreground color
 * @param {string} background - Background color
 * @param {boolean} isLargeText - Whether text is large (18px+ or 14px+ bold)
 * @param {string} [backdrop] - Surface behind a translucent background
 * @returns {{ratio: number, passes: boolean, level: string}}
 */
export function checkContrast(foreground, background, isLargeText = false, backdrop = undefined) {
  const ratio = getContrastRatio(foreground, background, backdrop);
  const minRatio = isLargeText ? 3 : 4.5;
  const aaaRatio = isLargeText ? 4.5 : 7;

  let level = 'Fail';
  if (ratio >= aaaRatio) level = 'AAA';
  else if (ratio >= minRatio) level = 'AA';

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= minRatio,
    level,
  };
}

/**
 * Get contrast status with description
 * @param {number} ratio - Contrast ratio
 * @returns {{status: string, color: string, description: string}}
 */
export function getContrastStatus(ratio) {
  if (ratio >= 7) {
    return { status: 'excellent', color: '#22c55e', description: 'Excellent (AAA)' };
  } else if (ratio >= 4.5) {
    return { status: 'good', color: '#84cc16', description: 'Good (AA)' };
  } else if (ratio >= 3) {
    return { status: 'warning', color: '#eab308', description: 'Large text only' };
  } else {
    return { status: 'fail', color: '#ef4444', description: 'Insufficient' };
  }
}

// ============================================================================
// Theme Contrast Validation
// ============================================================================

/**
 * Define color pairs that should be checked for contrast
 */
export const CONTRAST_PAIRS = [
  { fg: '--text-primary', bg: '--bg-dark', label: 'Primary text on main background' },
  { fg: '--text-primary', bg: '--bg-medium', label: 'Primary text on medium background' },
  { fg: '--text-primary', bg: '--bg-light', label: 'Primary text on light background' },
  { fg: '--text-secondary', bg: '--bg-dark', label: 'Secondary text on main background' },
  { fg: '--text-muted', bg: '--bg-dark', label: 'Muted text on main background' },
  { fg: '--primary', bg: '--bg-dark', label: 'Primary color on main background' },
  { fg: '--primary-light', bg: '--bg-dark', label: 'Primary light on main background' },
  { fg: '--status-available', bg: '--bg-dark', label: 'Available status on background' },
  { fg: '--status-needs-attention', bg: '--bg-dark', label: 'Needs attention on background' },
  { fg: '--danger', bg: '--bg-dark', label: 'Danger color on background' },
  { fg: '--success', bg: '--bg-dark', label: 'Success color on background' },
  { fg: '--warning', bg: '--bg-dark', label: 'Warning color on background' },
  { fg: '--focus-ring-color', bg: '--bg-dark', label: 'Focus ring on background' },
];

/**
 * Validate all color pairs in a theme for WCAG compliance
 * @param {Object} themeColors - Theme color object with CSS variable keys
 * @returns {Array<{pair: Object, result: Object}>}
 */
export function validateThemeContrast(themeColors) {
  // Panels sit on the page base, so a translucent background resolves over it
  const backdrop = themeColors['--bg-dark'];
  return CONTRAST_PAIRS.map((pair) => {
    const fgColor = themeColors[pair.fg];
    const bgColor = themeColors[pair.bg];

    // Skip only what parseColor can't read (hsl(), var() refs, missing) —
    // rgba()/8-digit hex used to land here and score as ratio 1 or 0
    if (!parseColor(fgColor) || !parseColor(bgColor)) {
      return { pair, result: { ratio: 0, passes: false, level: 'Unknown', skipped: true } };
    }

    return {
      pair,
      result: checkContrast(fgColor, bgColor, false, backdrop),
    };
  });
}

/**
 * Get summary of contrast validation results
 * @param {Array} validationResults - Results from validateThemeContrast
 * @returns {{passing: number, failing: number, skipped: number, score: number}}
 */
export function getContrastSummary(validationResults) {
  const passing = validationResults.filter((r) => r.result.passes).length;
  const failing = validationResults.filter((r) => !r.result.passes && !r.result.skipped).length;
  const skipped = validationResults.filter((r) => r.result.skipped).length;
  const total = validationResults.length - skipped;

  return {
    passing,
    failing,
    skipped,
    score: total > 0 ? Math.round((passing / total) * 100) : 0,
  };
}

// ============================================================================
// Screen Reader Announcements
// The two live consumers: ThemeContext + CustomThemeEditor call announce(),
// Sidebar calls announcePageChange(). The wider announce*/trapFocus family
// that used to live here had no importers and was deleted 2026-08-14.
// ============================================================================

let announcerElement = null;

/**
 * Get or create the screen reader announcer element
 */
function getAnnouncer() {
  if (announcerElement) return announcerElement;

  announcerElement = document.createElement('div');
  announcerElement.setAttribute('role', 'status');
  announcerElement.setAttribute('aria-live', 'polite');
  announcerElement.setAttribute('aria-atomic', 'true');
  announcerElement.className = 'sr-only';
  Object.assign(announcerElement.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  });
  document.body.appendChild(announcerElement);

  return announcerElement;
}

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 * @param {string} politeness - 'polite' or 'assertive'
 */
export function announce(message, politeness = 'polite') {
  const announcer = getAnnouncer();
  announcer.setAttribute('aria-live', politeness);

  // Clear and re-set to trigger announcement
  announcer.textContent = '';
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/**
 * Announce a page/view navigation
 * @param {string} pageName
 */
export function announcePageChange(pageName) {
  announce(`Navigated to ${pageName}`);
}
