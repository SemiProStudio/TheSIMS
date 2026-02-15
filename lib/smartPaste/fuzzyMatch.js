// ============================================================================
// Smart Paste — Fuzzy Matching Engine
// String normalization, Levenshtein distance, and similarity scoring
// ============================================================================

import { ABBREVIATIONS, STOP_WORDS, CONFIDENCE } from './constants.js';

/**
 * Normalize a string for comparison: lowercase, strip special chars, collapse whitespace.
 */
export function normalize(str) {
  return str.toLowerCase()
    .replace(/[-–—]/g, ' ')
    .replace(/[()[\]{}]/g, '')
    .replace(/[^a-z0-9\s/%.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expand known abbreviations in a normalized string.
 */
export function expandAbbreviations(str) {
  return str.split(' ').map(w => ABBREVIATIONS[w] || w).join(' ');
}

/**
 * Compute Levenshtein edit distance between two strings.
 */
export function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Calculate similarity score between two strings (0-100).
 * Uses abbreviation expansion, substring containment, token overlap, and Levenshtein distance.
 */
export function similarityScore(source, target) {
  const a = normalize(source);
  const b = normalize(target);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const aExp = expandAbbreviations(a);
  const bExp = expandAbbreviations(b);
  if (aExp === bExp) return CONFIDENCE.ALIAS_EXPANSION;

  // One contains the other fully
  if (bExp.length >= 4 && aExp.includes(bExp) && bExp.length / aExp.length > 0.4) {
    return CONFIDENCE.CONTAINMENT_HIGH + Math.min(10, (bExp.length / aExp.length) * 10);
  }
  if (aExp.length >= 4 && bExp.includes(aExp) && aExp.length / bExp.length > 0.4) {
    return CONFIDENCE.CONTAINMENT_LOW + Math.min(10, (aExp.length / bExp.length) * 10);
  }

  // Token-level overlap
  const wordsA = aExp.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const wordsB = bExp.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w));

  if (wordsA.length > 0 && wordsB.length > 0) {
    let exactShared = 0;
    let fuzzyShared = 0;
    const usedB = new Set();

    for (const wa of wordsA) {
      const exactIdx = wordsB.findIndex((wb, i) => !usedB.has(i) && wb === wa);
      if (exactIdx !== -1) {
        exactShared++;
        usedB.add(exactIdx);
        continue;
      }
      if (wa.length >= 5) {
        const fuzzyIdx = wordsB.findIndex((wb, i) =>
          !usedB.has(i) && wb.length >= 5 && levenshtein(wa, wb) <= 1
        );
        if (fuzzyIdx !== -1) {
          fuzzyShared++;
          usedB.add(fuzzyIdx);
        }
      }
    }

    const totalShared = exactShared + fuzzyShared * 0.8;
    const maxWords = Math.max(wordsA.length, wordsB.length);
    const overlapRatio = totalShared / maxWords;

    if (overlapRatio >= 0.5) {
      return Math.round(50 + overlapRatio * 35 + (exactShared > fuzzyShared ? 5 : 0));
    }

    if (exactShared === 1 && wordsA.find(w => wordsB.includes(w) && w.length >= 7)) return CONFIDENCE.SINGLE_LONG_WORD;
    if (exactShared === 1 && wordsA.find(w => wordsB.includes(w) && w.length >= 5)) return CONFIDENCE.SINGLE_MEDIUM_WORD;
  }

  // Levenshtein on full short strings
  if (aExp.length <= 20 && bExp.length <= 20) {
    const maxLen = Math.max(aExp.length, bExp.length);
    const dist = levenshtein(aExp, bExp);
    const ratio = 1 - dist / maxLen;
    if (ratio >= 0.7) return Math.round(40 + ratio * 20);
  }

  return 0;
}
