// ============================================================================
// Accessibility Utilities
// Color contrast checking, screen reader announcements, and theme validation
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
 * Calculate contrast ratio between two colors (WCAG formula)
 * @param {string} color1 - Hex color
 * @param {string} color2 - Hex color
 * @returns {number} Contrast ratio (1-21)
 */
export function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA requirements
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @param {boolean} isLargeText - Whether text is large (18px+ or 14px+ bold)
 * @returns {{ratio: number, passes: boolean, level: string}}
 */
export function checkContrast(foreground, background, isLargeText = false) {
  const ratio = getContrastRatio(foreground, background);
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
  return CONTRAST_PAIRS.map((pair) => {
    const fgColor = themeColors[pair.fg];
    const bgColor = themeColors[pair.bg];

    // Skip if either color is not a hex value (e.g., rgba)
    if (!fgColor?.startsWith('#') || !bgColor?.startsWith('#')) {
      return { pair, result: { ratio: 0, passes: false, level: 'Unknown', skipped: true } };
    }

    return {
      pair,
      result: checkContrast(fgColor, bgColor),
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
 * Announce an assertive (important) message
 * @param {string} message
 */
export function announceAssertive(message) {
  announce(message, 'assertive');
}

// ============================================================================
// Common Announcement Helpers
// ============================================================================

/**
 * Announce when an item is added
 * @param {string} itemName - Name of the added item
 * @param {string} context - Context (e.g., "inventory", "cart")
 */
export function announceAdded(itemName, context = '') {
  announce(`${itemName} added${context ? ` to ${context}` : ''}`);
}

/**
 * Announce when an item is removed
 * @param {string} itemName
 * @param {string} context
 */
export function announceRemoved(itemName, context = '') {
  announce(`${itemName} removed${context ? ` from ${context}` : ''}`);
}

/**
 * Announce when content is loading
 * @param {string} content - What's loading
 */
export function announceLoading(content = 'Content') {
  announce(`${content} loading`);
}

/**
 * Announce when content is loaded
 * @param {string} content - What was loaded
 * @param {number} count - Optional count of items
 */
export function announceLoaded(content = 'Content', count = null) {
  if (count !== null) {
    announce(`${content} loaded. ${count} items found.`);
  } else {
    announce(`${content} loaded`);
  }
}

/**
 * Announce an error
 * @param {string} errorMessage
 */
export function announceError(errorMessage) {
  announceAssertive(`Error: ${errorMessage}`);
}

/**
 * Announce a success message
 * @param {string} message
 */
export function announceSuccess(message) {
  announce(message);
}

/**
 * Announce page/view navigation
 * @param {string} pageName
 */
export function announcePageChange(pageName) {
  announce(`Navigated to ${pageName}`);
}

/**
 * Announce modal open/close
 * @param {string} modalName
 * @param {boolean} isOpen
 */
export function announceModal(modalName, isOpen) {
  if (isOpen) {
    announce(`${modalName} dialog opened`);
  } else {
    announce(`${modalName} dialog closed`);
  }
}

/**
 * Announce selection change
 * @param {string} itemName
 * @param {boolean} isSelected
 */
export function announceSelection(itemName, isSelected) {
  announce(`${itemName} ${isSelected ? 'selected' : 'deselected'}`);
}

/**
 * Announce filter/sort change
 * @param {string} filterType
 * @param {string} value
 */
export function announceFilterChange(filterType, value) {
  announce(`${filterType} changed to ${value}`);
}

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Move focus to an element and announce it
 * @param {HTMLElement} element
 * @param {string} announcement - Optional announcement
 */
export function focusAndAnnounce(element, announcement = '') {
  if (!element) return;

  element.focus();
  if (announcement) {
    announce(announcement);
  }
}

/**
 * Trap focus within a container (for modals)
 * @param {HTMLElement} container
 * @returns {Function} Cleanup function
 */
export function trapFocus(container) {
  if (!container) return () => {};

  const focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const focusableElements = container.querySelectorAll(focusableSelectors);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  firstFocusable?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

export default {
  // Contrast
  hexToRgb,
  getLuminance,
  getContrastRatio,
  checkContrast,
  getContrastStatus,
  validateThemeContrast,
  getContrastSummary,
  CONTRAST_PAIRS,
  // Announcements
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
  // Focus
  focusAndAnnounce,
  trapFocus,
};
