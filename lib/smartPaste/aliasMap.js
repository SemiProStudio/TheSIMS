// ============================================================================
// Smart Paste — Alias Map Builder
// Constructs priority-ranked alias map from spec configuration
// ============================================================================

import { COMMON_ALIASES, GENERIC_WORDS } from './constants.js';
import { normalize, expandAbbreviations } from './fuzzyMatch.js';

/**
 * Build a map of aliases to spec names from the specs configuration.
 * Returns { aliasMap, allSpecNames, specCategories }.
 */
export function buildSpecAliasMap(specsConfig) {
  const aliasMap = new Map();
  const allSpecNames = new Set();
  const specCategories = new Map();

  if (!specsConfig) return { aliasMap, allSpecNames: [...allSpecNames], specCategories };

  Object.entries(specsConfig).forEach(([category, specList]) => {
    if (!Array.isArray(specList)) return;
    specList.forEach((spec) => {
      if (!spec.name) return;
      const name = spec.name;
      allSpecNames.add(name);
      specCategories.set(name, category);

      // Exact name → highest priority
      aliasMap.set(normalize(name), { specName: name, priority: 100, category });

      // Expanded abbreviations form
      const expanded = expandAbbreviations(normalize(name));
      if (expanded !== normalize(name)) {
        aliasMap.set(expanded, { specName: name, priority: 98, category });
      }

      // Individual specific long words from multi-word spec names
      const words = normalize(name).split(' ');
      if (words.length > 1) {
        words.forEach((word) => {
          if (word.length >= 5 && !GENERIC_WORDS.has(word)) {
            const existing = aliasMap.get(word);
            if (!existing || existing.priority < 40) {
              aliasMap.set(word, { specName: name, priority: 40, category });
            }
          }
        });
      }
    });
  });

  // Register common aliases
  Object.entries(COMMON_ALIASES).forEach(([canonical, aliases]) => {
    const canonicalNorm = normalize(canonical);
    const mapEntry = aliasMap.get(canonicalNorm);
    const specName = mapEntry ? mapEntry.specName : null;
    const category = mapEntry ? mapEntry.category : null;
    if (!specName) return;

    aliases.forEach((alias) => {
      const aliasNorm = normalize(alias);
      const existing = aliasMap.get(aliasNorm);
      if (!existing || existing.priority < 80) {
        aliasMap.set(aliasNorm, { specName, priority: 80, category });
      }
      const aliasExpanded = expandAbbreviations(aliasNorm);
      if (aliasExpanded !== aliasNorm) {
        const existingExp = aliasMap.get(aliasExpanded);
        if (!existingExp || existingExp.priority < 78) {
          aliasMap.set(aliasExpanded, { specName, priority: 78, category });
        }
      }
    });
  });

  return { aliasMap, allSpecNames: [...allSpecNames], specCategories };
}
