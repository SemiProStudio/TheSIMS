// =============================================================================
// Theme token reference check
// Every `colors.<name>` used in source must exist in theme.js's colors export.
// Phantom tokens fail silently at runtime (undefined -> invalid CSS -> the
// browser ignores the declaration), which has shipped twice already
// (colors.surfaceHover, colors.surfaceAlt). This test makes the third time a
// red build instead of an invisible styling bug.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { colors } from '../theme.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['views', 'components', 'modals', 'hooks', 'contexts', 'lib'];
const SCAN_FILES = ['App.jsx', 'AppViews.jsx', 'AppModals.jsx'];

function collectFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectFiles(full));
    else if (/\.(jsx?|tsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((d) => collectFiles(join(root, d))),
  ...SCAN_FILES.map((f) => join(root, f)),
];

describe('theme token references', () => {
  it('every colors.<name> reference resolves to a real token', () => {
    const known = new Set(Object.keys(colors));
    const problems = [];

    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      // Only files that take `colors` from theme.js — a local `colors`
      // declaration (charts helpers etc.) is a different object
      const importsThemeColors =
        /import\s*{[^}]*\bcolors\b[^}]*}\s*from\s*['"][^'"]*theme(\.js)?['"]/.test(src);
      const declaresLocal = /(const|let|var)\s+colors\s*=/.test(src);
      if (!importsThemeColors || declaresLocal) continue;

      // Strip comments (a token named in prose isn't a reference) and skip
      // property chains like `category.colors.map` (a different object)
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      for (const match of code.matchAll(/(?<!\.)\bcolors\.([a-zA-Z_$][\w$]*)/g)) {
        if (!known.has(match[1])) {
          problems.push(`${file.replace(root + '/', '')}: colors.${match[1]}`);
        }
      }
    }

    expect(problems, `Unknown theme tokens referenced:\n${problems.join('\n')}`).toEqual([]);
  });
});
