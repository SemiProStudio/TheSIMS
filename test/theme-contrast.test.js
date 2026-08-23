// =============================================================================
// Theme contrast guards
// Enforces WCAG contrast for every static theme in themes-data.js so a new
// or edited theme can't silently ship unreadable text. If you add a theme,
// these tests tell you exactly which color pair to adjust.
//
// The button checks mirror the CSS constructions in index.css:
//   .btn         gradient = color-mix(--primary 88%/62%, black), label --on-primary
//   .btn-danger  gradient = color-mix(--danger-fill 78%/58%, black), label --on-danger
// Change those percentages in either place and the other must follow.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  themes,
  DEFAULT_CUSTOM_THEME,
  COLOR_KEYS,
  MODERN_THEME_IDS,
  pickOnColor,
  PRIMARY_FILL_MIXES,
  DANGER_FILL_MIXES,
  VARIANT_BUTTON_STYLE,
} from '../themes-data.js';
import { audit } from '../scripts/theme-aa-tune.mjs';

// Derived at runtime by ThemeContext.applyTheme when a theme omits them —
// not required in the static definitions
const DERIVED_KEYS = new Set(['--focus-ring-color', '--focus-ring-color-danger']);

// --- WCAG math -------------------------------------------------------------

function parseColor(c) {
  if (typeof c !== 'string') return null;
  const hex = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hex) return null; // rgba()/hsl() values are skipped by callers
  let h = hex[1];
  if (h.length === 3)
    h = h
      .split('')
      .map((x) => x + x)
      .join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** color-mix(in srgb, color P%, black) approximation used by the button CSS */
const mixTowardBlack = (c, pct) => c.map((v) => (v * pct) / 100);

const staticThemes = Object.values(themes).filter((t) => !t.isRandom && !t.isCustom);

function check(theme, fgKey, bgKey, min, transform = (c) => c) {
  const fg = parseColor(theme.colors[fgKey]);
  const bg = parseColor(theme.colors[bgKey]);
  if (!fg || !bg) return; // non-hex values (shadows, rgba) aren't checked
  const ratio = contrast(fg, transform(bg));
  expect(
    ratio,
    `${theme.id}: ${fgKey} on ${bgKey} is ${ratio.toFixed(2)}:1 (needs ≥ ${min}:1)`,
  ).toBeGreaterThanOrEqual(min);
}

// --- Structural guards -------------------------------------------------------

describe('theme completeness', () => {
  it.each(staticThemes.map((t) => [t.id, t]))('%s defines every COLOR_KEY', (_, theme) => {
    for (const key of COLOR_KEYS) {
      if (DERIVED_KEYS.has(key)) continue;
      expect(theme.colors[key], `${theme.id} is missing ${key}`).toBeTruthy();
    }
  });

  it('DEFAULT_CUSTOM_THEME defines every COLOR_KEY', () => {
    for (const key of COLOR_KEYS) {
      if (DERIVED_KEYS.has(key)) continue;
      expect(DEFAULT_CUSTOM_THEME[key], `missing ${key}`).toBeTruthy();
    }
  });
});

// --- Text readability --------------------------------------------------------

describe('text contrast (WCAG AA)', () => {
  it.each(staticThemes.map((t) => [t.id, t]))('%s: body text on surfaces', (_, theme) => {
    check(theme, '--text-primary', '--bg-dark', 4.5);
    check(theme, '--text-primary', '--bg-medium', 4.5);
    check(theme, '--text-primary', '--bg-light', 4.5);
    check(theme, '--text-secondary', '--bg-medium', 4.5);
    check(theme, '--text-muted', '--bg-medium', 4.5);
    check(theme, '--text-muted', '--bg-light', 4.5);
  });

  it.each(staticThemes.map((t) => [t.id, t]))('%s: semantic text colors', (_, theme) => {
    check(theme, '--danger', '--bg-medium', 4.5);
    check(theme, '--primary', '--bg-medium', 3); // accents/links/UI components
  });

  it.each(staticThemes.map((t) => [t.id, t]))('%s: status colors on cards', (_, theme) => {
    for (const key of [
      '--status-available',
      '--status-checked-out',
      '--status-reserved',
      '--status-needs-attention',
      '--status-missing',
      '--condition-excellent',
      '--condition-poor',
    ]) {
      check(theme, key, '--bg-light', 3);
    }
  });
});

// --- Accents rendered as SMALL text (WCAG AA 4.5:1) ---------------------------
// The app renders accent colours as text in several places axe flags:
// the active nav label on a 20% tint of its own colour, 10px status badges
// on a 15% tint, 12px dashboard panel sub-text on the card surface, plus
// muted/secondary text and primary/danger as text. Every MODERN theme must
// clear all of them — legacy themes are kept as they were. The pair list
// lives in scripts/theme-aa-tune.mjs, which also suggests the smallest
// lightness fix when a theme fails here.

describe('modern themes read at AA wherever an accent becomes text', () => {
  const modern = MODERN_THEME_IDS.map((id) => [id, themes[id]]);
  it.each(modern)('%s', (_, theme) => {
    const fails = audit(theme.colors).map(
      (f) => `${f.key} (${f.label}) ${f.ratio.toFixed(2)}:1 < ${f.min}:1`,
    );
    expect(
      fails,
      `${theme.id} — run scripts/theme-aa-tune.mjs ${theme.id}:\n  ${fails.join('\n  ')}`,
    ).toEqual([]);
  });
});

// --- Dashboard panel tints ---------------------------------------------------
// --panel-* colours tint each dashboard card's icon and sub-text as well as
// the alpha wash behind them. Modern themes must keep them legible on the
// card surface (legacy Terminal deliberately runs deep panels — exempt).

describe('panel tints (modern themes)', () => {
  const modern = MODERN_THEME_IDS.map((id) => [id, themes[id]]);
  it.each(modern)('%s: panel colours read on cards', (_, theme) => {
    for (const key of COLOR_KEYS.filter((k) => k.startsWith('--panel-'))) {
      check(theme, key, '--bg-light', 3);
    }
  });
});

// --- Button label contrast (mirrors index.css constructions) -----------------

describe('button label contrast', () => {
  it.each(staticThemes.map((t) => [t.id, t]))('%s: primary button (.btn)', (_, theme) => {
    const label = parseColor(theme.colors['--on-primary']);
    const primary = parseColor(theme.colors['--primary']);
    expect(label, `${theme.id} needs --on-primary`).toBeTruthy();
    // Variant CSS may replace the gradient construction (index.css): model
    // the fill that actually renders for this theme
    const style = VARIANT_BUTTON_STYLE[theme.variant] || 'gradient';
    if (style === 'outline') {
      // --primary text on the page surface
      const ratio = contrast(primary, parseColor(theme.colors['--bg-medium']));
      expect(
        ratio,
        `${theme.id}: outline .btn text is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
      return;
    }
    const mixes = style === 'flat' ? [100] : PRIMARY_FILL_MIXES;
    for (const pct of mixes) {
      const fill = mixTowardBlack(primary, pct);
      const ratio = contrast(label, fill);
      expect(
        ratio,
        `${theme.id}: --on-primary on ${pct}% primary fill is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(staticThemes.map((t) => [t.id, t]))('%s: danger button (.btn-danger)', (_, theme) => {
    const label = parseColor(theme.colors['--on-danger']);
    const fillBase = parseColor(theme.colors['--danger-fill'] || theme.colors['--danger']);
    expect(label, `${theme.id} needs --on-danger`).toBeTruthy();
    for (const pct of DANGER_FILL_MIXES) {
      const fill = mixTowardBlack(fillBase, pct);
      const ratio = contrast(label, fill);
      expect(
        ratio,
        `${theme.id}: --on-danger on ${pct}% danger fill is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(staticThemes.map((t) => [t.id, t]))('%s: success fill label', (_, theme) => {
    const label = parseColor(theme.colors['--on-success']);
    const success = parseColor(theme.colors['--success']);
    expect(label, `${theme.id} needs --on-success`).toBeTruthy();
    const ratio = contrast(label, success);
    expect(
      ratio,
      `${theme.id}: --on-success on --success is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});

// --- pickOnColor (fallback derivation for custom/random themes) --------------

describe('pickOnColor', () => {
  it('picks white on dark fills and near-black on light fills', () => {
    expect(pickOnColor('#000000')).toBe('#ffffff');
    expect(pickOnColor('#1a1d21')).toBe('#ffffff');
    expect(pickOnColor('#ffffff')).toBe('#0b0d10');
    expect(pickOnColor('#00ff00')).toBe('#0b0d10');
  });

  it('handles hsl() and rgb() strings (random theme uses hsl)', () => {
    expect(pickOnColor('hsl(120, 100%, 10%)')).toBe('#ffffff');
    expect(pickOnColor('hsl(60, 100%, 85%)')).toBe('#0b0d10');
    expect(pickOnColor('rgb(255, 255, 255)')).toBe('#0b0d10');
  });

  it('agrees with every static theme’s hand-set --on-primary', () => {
    // Same mixes the .btn gradient uses — this proves the runtime fallback
    // derivation (custom themes) matches the hand-tuned static values
    for (const theme of staticThemes) {
      const style = VARIANT_BUTTON_STYLE[theme.variant] || 'gradient';
      if (style === 'outline') continue; // no label on a fill
      const mixes = style === 'flat' ? [100] : PRIMARY_FILL_MIXES;
      expect(
        pickOnColor(theme.colors['--primary'], mixes),
        `${theme.id}: pickOnColor disagrees with --on-primary`,
      ).toBe(theme.colors['--on-primary']);
    }
  });
});
