// =============================================================================
// Theme catalogue guards
// The picker is driven by metadata on each theme (group, tokens, art). These
// tests keep that metadata honest: every theme lands in a real section, the
// Legacy set is exactly the original catalogue, token overrides only name
// tokens that exist (a typo would silently do nothing), the JS defaults stay
// in sync with the :root block in index.css, and novelty art files exist.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  themes,
  THEME_GROUPS,
  TOKEN_DEFAULTS,
  LEGACY_THEME_IDS,
  MODERN_THEME_IDS,
} from '../themes-data.js';
import { borderRadius, typography } from '../theme.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const allThemes = Object.values(themes);

// The catalogue that shipped before the Modern set — these must stay in
// Legacy so existing users' saved theme ids keep resolving
const ORIGINAL_IDS = [
  'light', 'dark', 'darker', 'primaries', 'pastel', 'terminal', 'blackwhite',
  'vibrant', 'muted', 'xp', 'cheese', 'cats', 'dogs',
];

describe('theme groups', () => {
  it('every theme belongs to a section the picker renders', () => {
    for (const theme of allThemes) {
      expect(THEME_GROUPS[theme.group], `${theme.id} has group ${theme.group}`).toBeDefined();
    }
  });

  it('Legacy is exactly the original catalogue', () => {
    expect([...LEGACY_THEME_IDS].sort()).toEqual([...ORIGINAL_IDS].sort());
    for (const id of ORIGINAL_IDS) expect(themes[id].group).toBe('legacy');
  });

  it('offers at least five modern themes, listed first', () => {
    expect(MODERN_THEME_IDS.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(themes).slice(0, MODERN_THEME_IDS.length)).toEqual(MODERN_THEME_IDS);
    for (const id of MODERN_THEME_IDS) expect(themes[id].group).toBe('modern');
  });

  it('random and custom sit in the tools section', () => {
    expect(themes.random.group).toBe('tools');
    expect(themes.custom.group).toBe('tools');
  });

  it('the default theme id still resolves', () => {
    expect(themes.dark).toBeDefined();
  });
});

describe('shape + type tokens', () => {
  it('theme overrides only name tokens that exist in TOKEN_DEFAULTS', () => {
    const known = new Set(Object.keys(TOKEN_DEFAULTS));
    for (const theme of allThemes) {
      for (const key of Object.keys(theme.tokens || {})) {
        expect(known.has(key), `${theme.id} sets unknown token ${key}`).toBe(true);
      }
    }
  });

  it('modern themes vary more than colour', () => {
    const varied = MODERN_THEME_IDS.filter((id) => {
      const t = themes[id];
      return Object.keys(t.tokens || {}).length > 0 || t.backgroundImage;
    });
    expect(varied).toEqual(MODERN_THEME_IDS);
  });

  it('theme.js references resolve to defined tokens', () => {
    const refs = [
      ...Object.values(borderRadius),
      typography.fontFamily,
      typography.fontFamilyHeading,
      typography.fontFamilyMono,
    ];
    for (const ref of refs) {
      const m = ref.match(/^var\((--[\w-]+)\)$/);
      if (!m) continue; // e.g. borderRadius.full is a literal
      expect(TOKEN_DEFAULTS[m[1]], `${ref} has no default`).toBeDefined();
    }
  });

  it('JS defaults match the :root block in index.css', () => {
    const css = readFileSync(join(root, 'index.css'), 'utf8');
    const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
    for (const [key, value] of Object.entries(TOKEN_DEFAULTS)) {
      const m = rootBlock.match(new RegExp(`${key}:\\s*([^;]+);`));
      expect(m, `${key} missing from index.css :root`).toBeTruthy();
      const normalise = (v) => v.replace(/\s+/g, ' ').replace(/["']/g, '').trim();
      expect(normalise(m[1]), key).toBe(normalise(value));
    }
  });
});

describe('theme art', () => {
  const withArt = allThemes.filter((t) => t.backgroundImage || t.cursor);

  it('novelty themes ship both a tile and a cursor', () => {
    for (const id of ['cheese', 'cats', 'dogs']) {
      expect(themes[id].backgroundImage, `${id} tile`).toBeTruthy();
      expect(themes[id].cursor, `${id} cursor`).toBeTruthy();
    }
  });

  it('every referenced asset exists in public/', () => {
    for (const theme of withArt) {
      for (const file of [theme.backgroundImage, theme.cursor].filter(Boolean)) {
        expect(existsSync(join(root, 'public', file)), `${theme.id}: ${file}`).toBe(true);
      }
    }
  });

  it('background opacity, when set, is a sensible fraction', () => {
    for (const theme of withArt) {
      if (theme.backgroundOpacity === undefined) continue;
      expect(theme.backgroundOpacity).toBeGreaterThan(0);
      expect(theme.backgroundOpacity).toBeLessThanOrEqual(1);
    }
  });
});
