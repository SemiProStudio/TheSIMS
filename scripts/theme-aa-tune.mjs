#!/usr/bin/env node
// =============================================================================
// Theme AA tuner — for each modern theme, find the smallest lightness shift
// per accent colour that makes every axe-relevant text pair reach 4.5:1
// (hue and saturation preserved). Prints the keys that need to change.
//
//   node scripts/theme-aa-tune.mjs            # audit all modern themes
//   node scripts/theme-aa-tune.mjs slate      # one theme, with suggestions
//
// The pairs mirror how the app actually renders accents as SMALL text:
// active nav label on a 20% tint of itself, 10px status badges on a 15%
// tint, 12px dashboard panel sub-text on the card surface, muted/secondary
// text on every surface, primary/danger as text. test/theme-contrast.test.js
// enforces the same set.
// =============================================================================

import { themes, MODERN_THEME_IDS } from '../themes-data.js';

const parse = (c) => {
  const m = String(c)
    .trim()
    .match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  const r = String(c).match(/rgba?\(([^)]+)\)/);
  if (r) return r[1].split(',').map(Number);
  return null;
};
const over = (fg, bg) =>
  fg.length === 4 ? fg.slice(0, 3).map((v, i) => Math.round(v * fg[3] + bg[i] * (1 - fg[3]))) : fg;
const lum = ([r, g, b]) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const tint = (bg, c, p) => bg.map((v, i) => Math.round(v * (1 - p) + c[i] * p));
const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]) {
  if (s === 0) return [l, l, l].map((v) => v * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => v * 255);
}

/** Every (fgKey → [bg, min]) pair the app renders as text. */
function pairsFor(colors) {
  const g = (k) => parse(colors[k]);
  const bgD = g('--bg-dark'),
    bgM = g('--bg-medium'),
    bgL = g('--bg-light');
  const pairs = [];
  const add = (key, bgFn, min, label) => pairs.push({ key, bgFn, min, label });
  const primary = g('--primary');
  add('--text-muted', () => bgD, 4.5, 'muted on page');
  add('--text-muted', () => bgM, 4.5, 'muted on panels');
  add('--text-muted', () => bgL, 4.5, 'muted on cards');
  // Gear-card image placeholder and inputs: a 10% primary wash over the card
  add('--text-muted', () => tint(bgL, primary, 0.1), 4.5, 'muted on the primary wash');
  // Muted sub-text inside a status-tinted row (e.g. a reserved item row)
  for (const k of ['available', 'checked-out', 'reserved', 'needs-attention', 'missing']) {
    add('--text-muted', () => tint(bgL, g(`--status-${k}`), 0.25), 4.5, `muted on ${k} tint`);
  }
  add(
    '--text-primary',
    () => tint(bgL, primary, 0.3),
    4.5,
    'selected segment label (30% primary tint)',
  );
  add('--text-secondary', () => bgL, 4.5, 'secondary on cards');
  add('--text-secondary', () => bgD, 4.5, 'secondary on page');
  add('--primary', () => bgM, 4.5, 'primary as text');
  add('--primary', (c) => tint(bgM, c, 0.2), 4.5, 'primary on its tint (active nav)');
  add('--primary', () => bgL, 4.5, 'primary on cards');
  add('--danger', (c) => tint(bgL, c, 0.25), 4.5, 'danger badge');
  add('--warning', () => bgL, 4.5, 'warning text');
  add('--success', () => bgL, 4.5, 'success text');
  // Accent badges (package category, kit tags) — same xs badge construction
  for (const k of ['--accent1', '--accent2', '--accent3']) {
    add(k, (c) => tint(bgL, c, 0.25), 4.5, `${k} badge`);
  }
  // Status badges: the xs badge on a gear card sits on a ~25% tint
  for (const k of ['available', 'checked-out', 'reserved', 'needs-attention', 'missing']) {
    add(`--status-${k}`, (c) => tint(bgL, c, 0.25), 4.5, `status badge ${k}`);
  }
  for (const k of ['excellent', 'good', 'fair', 'poor'])
    add(`--condition-${k}`, () => bgL, 4.5, `condition ${k}`);
  for (let i = 1; i <= 6; i += 1)
    add(`--sidebar-item${i}`, (c) => tint(bgM, c, 0.2), 4.5, `nav ${i} active label`);
  for (const k of Object.keys(colors).filter((k) => k.startsWith('--panel-')))
    add(k, () => bgL, 4.5, `${k} sub-text`);
  return pairs;
}

export function audit(colors) {
  const fails = [];
  for (const p of pairsFor(colors)) {
    const fg = parse(colors[p.key]);
    if (!fg) continue;
    const bg = p.bgFn(over(fg, p.bgFn([0, 0, 0])));
    const ratio = contrast(over(fg, bg), bg);
    if (ratio < p.min) fails.push({ ...p, ratio });
  }
  return fails;
}

/** Smallest lightness move (toward contrast) that clears every pair for a key. */
function suggest(colors, key) {
  const fg = parse(colors[key]);
  if (!fg || fg.length === 4) return null;
  const [h, s, l0] = rgbToHsl(fg);
  const bgLum = lum(parse(colors['--bg-medium']));
  const dir = bgLum < 0.3 ? 1 : -1; // dark bg → lighter text
  for (let step = 0; step <= 60; step += 1) {
    const l = Math.min(1, Math.max(0, l0 + (dir * step) / 100));
    const candidate = hslToRgb([h, s, l]).map(Math.round);
    const trial = { ...colors, [key]: hex(candidate) };
    if (!audit(trial).some((f) => f.key === key)) return hex(candidate);
  }
  return null;
}

// CLI only — test/theme-contrast.test.js imports audit() from this module
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('theme-aa-tune.mjs');
const ids = !invokedDirectly ? [] : process.argv[2] ? process.argv[2].split(',') : MODERN_THEME_IDS;
for (const id of ids) {
  const colors = themes[id].colors;
  const fails = audit(colors);
  if (!fails.length) {
    console.log(`${id}: AA clean`);
    continue;
  }
  console.log(`${id}: ${fails.length} failing pairs`);
  const keys = [...new Set(fails.map((f) => f.key))];
  for (const key of keys) {
    const worst = Math.min(...fails.filter((f) => f.key === key).map((f) => f.ratio));
    console.log(
      `  ${key.padEnd(26)} ${colors[key].padEnd(10)} worst ${worst.toFixed(2)} → ${suggest(colors, key) || '(no lightness-only fix)'}`,
    );
  }
}
