// ============================================================================
// Smart Paste — Core Parser
// Extracts product info from text using multi-pass matching
// ============================================================================

import { KNOWN_BRANDS, CATEGORY_KEYWORDS, CONFIDENCE, VALUE_RANGES } from './constants.js';
import { cleanInputText } from './textCleaner.js';
import { normalize, expandAbbreviations, similarityScore } from './fuzzyMatch.js';
import { buildSpecAliasMap } from './aliasMap.js';

// ============================================================================
// Parser-specific patterns (implementation details, not in constants)
// ============================================================================

const SPEC_PATTERNS = [
  /^([^\t]{2,60})\t+(.+)$/, // Key\tValue (table-derived)
  /^([^:]{2,60}):\s+(.+)$/, // Key: Value
  /^([^|]{2,60})\s*\|\s*(.+)$/, // Key | Value
  /^([^=]{2,60})\s*=\s*(.+)$/, // Key = Value
  /^([^→]{2,40})\s*→\s*(.{2,})$/, // Key → Value
  /^([^-]{2,40})\s+[-–—]\s+(.{2,})$/, // Key - Value
];

const NOISE_PATTERNS = [
  /^(home|shop|cart|login|sign in|sign up|sign out|menu|search|filter by|sort by|subscribe|newsletter|cookie|accept|privacy|terms|copyright|©|all rights)/i,
  /^(add to|buy now|add to cart|in stock|out of stock|free shipping|see more|learn more|read more|show more|view all|close|back to|next|prev)/i,
  /^(share|tweet|pin it|email this|print|save for|wishlist|compare|reviews?\s*\(|rating|stars?|^\d+ customer)/i,
  /^\d+(\.\d+)?$/,
  /^[A-Z0-9]{3,}$/,
  /^\[.*\]$/,
];

// Fields that appear across multiple categories
const SHARED_FIELDS = new Set([
  'Weight',
  'Dimensions',
  'Battery Type',
  'Battery Life',
  'Mount Type',
  'Power Input',
  'Material',
]);

// ============================================================================
// Sub-functions (module-internal)
// ============================================================================

/**
 * Extract raw key-value pairs and detect product name from lines.
 * Returns { rawPairs, detectedName }.
 */
function extractRawPairs(lines) {
  const rawPairs = [];
  let detectedName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3 || line.length > 300) continue;
    if (NOISE_PATTERNS.some((p) => p.test(line))) continue;

    let matched = false;
    for (const pattern of SPEC_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        let [, key, value] = match;
        key = key.trim();
        value = value.trim();
        if (value.startsWith('http') || value.length > 200 || value.length < 1) continue;
        if (key.length < 2) continue;
        rawPairs.push({ key, value, sourceLine: line, lineIndex: i });
        matched = true;
        // Detect product name from name-like keys
        if (!detectedName && /^(product\s*name|item\s*name|model\s*name|name|title)$/i.test(key)) {
          detectedName = value;
        }
        break;
      }
    }

    // Consecutive-line detection: "Label" then "Value" on next line
    if (!matched && i + 1 < lines.length) {
      const nextLine = lines[i + 1]?.trim();
      const looksLikeLabel =
        line.length >= 3 &&
        line.length <= 50 &&
        !/^\d/.test(line) &&
        !/[:|\t=→]/.test(line) &&
        /^[A-Za-z]/.test(line);
      const looksLikeValue =
        nextLine &&
        nextLine.length >= 1 &&
        nextLine.length <= 150 &&
        (/^\d/.test(nextLine) ||
          /\b(mm|cm|m|kg|g|lbs|oz|W|V|Wh|mAh|Hz|kHz|dB|lux|lm|cd|°|fps|bit|yes|no|true|false|approx)\b/i.test(
            nextLine,
          ) ||
          /^(f\/|[A-Z]{2,4}[\s-])/i.test(nextLine));

      if (looksLikeLabel && looksLikeValue) {
        rawPairs.push({
          key: line,
          value: nextLine,
          sourceLine: `${line} → ${nextLine}`,
          lineIndex: i,
        });
        i++;
        matched = true;
      }
    }

    // Product name detection
    if (!matched && !detectedName && line.length > 5 && line.length < 120) {
      const hasBrand = KNOWN_BRANDS.some((b) => line.toLowerCase().includes(b.toLowerCase()));
      const hasProductWords =
        /\b(camera|lens|light|mic|microphone|tripod|monitor|recorder|flash|strobe|gimbal|stabilizer|wireless|transmitter|receiver|boom|shotgun|panel|fixture|battery|card)\b/i.test(
          line,
        );
      if (hasBrand || hasProductWords) {
        detectedName = line;
      }
    }
  }

  return { rawPairs, detectedName };
}

/**
 * Extract price from raw pairs and full text.
 * Returns { purchasePrice, priceNote }.
 */
function extractPrice(rawPairs, fullText) {
  const priceLabelPattern =
    /^(sale\s*price|price|msrp|list\s*price|rrp|retail\s*price|srp|map\s*price|street\s*price)$/i;
  const priceKeyPriority = [
    'sale price',
    'street price',
    'map price',
    'price',
    'msrp',
    'list price',
    'rrp',
    'retail price',
    'srp',
  ];
  let bestPriceKeyRank = Infinity;
  let priceFromPair = null;

  for (const pair of rawPairs) {
    const keyNorm = pair.key.trim().toLowerCase();
    if (priceLabelPattern.test(keyNorm)) {
      const rank = priceKeyPriority.findIndex((p) => keyNorm.includes(p));
      const effectiveRank = rank === -1 ? priceKeyPriority.length : rank;
      if (effectiveRank < bestPriceKeyRank) {
        const valMatch = pair.value.match(/[$€£¥]?\s*([\d,]+\.?\d*)/);
        if (valMatch) {
          priceFromPair = valMatch[1].replace(/,/g, '');
          bestPriceKeyRank = effectiveRank;
        }
      }
    }
  }

  if (priceFromPair) {
    return { purchasePrice: priceFromPair, priceNote: '' };
  }

  // Fall back to scanning text for price patterns
  const rangeMatch = fullText.match(/[$€£¥]\s*([\d,]+\.?\d*)\s*[-–—]\s*[$€£¥]?\s*([\d,]+\.?\d*)/);
  if (rangeMatch) {
    return {
      purchasePrice: rangeMatch[1].replace(/,/g, ''),
      priceNote: `Range: ${rangeMatch[0]}`,
    };
  }

  const singleMatch = fullText.match(/[$€£¥]\s*([\d,]+\.?\d*)/);
  if (singleMatch) {
    let priceNote = '';
    const currSymbol = fullText.match(/([$€£¥])/);
    if (currSymbol && currSymbol[1] !== '$') {
      const currNames = { '€': 'EUR', '£': 'GBP', '¥': 'JPY/CNY' };
      priceNote = `Currency: ${currNames[currSymbol[1]] || currSymbol[1]}`;
    }
    return { purchasePrice: singleMatch[1].replace(/,/g, ''), priceNote };
  }

  return { purchasePrice: '', priceNote: '' };
}

/**
 * Detect brand from product name and full text.
 * Single pass: checks name first, then falls through to full text.
 */
function detectBrand(name, textLower) {
  const nameToCheck = name ? name.toLowerCase() : '';
  for (const brand of KNOWN_BRANDS) {
    const brandLower = brand.toLowerCase();
    if (nameToCheck && nameToCheck.includes(brandLower)) {
      return brand;
    }
  }
  // Fall through to full text if not found in name
  for (const brand of KNOWN_BRANDS) {
    if (textLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return '';
}

/**
 * Detect category using keyword scoring.
 * Returns category name or empty string.
 */
function detectCategory(textLower) {
  let bestCategory = '';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) score++;
    }
    if (score > 0 && score > bestScore) {
      bestCategory = category;
      bestScore = score;
    }
  }
  return bestCategory;
}

/**
 * Extract serial number and model number from raw pairs.
 */
function extractSerialModel(rawPairs) {
  const serialPatterns = /^(serial\s*(number|no|#)?|s\/n|sn)$/i;
  const modelPatterns =
    /^(model\s*(number|no|#)?|part\s*(number|no|#)?|sku|upc|ean|asin|mfr\s*(part|#|number)?|manufacturer\s*part|item\s*(number|no|#)?)$/i;
  let serialNumber = '';
  let modelNumber = '';

  for (const pair of rawPairs) {
    const keyNorm = pair.key.trim();
    if (!serialNumber && serialPatterns.test(keyNorm)) {
      serialNumber = pair.value.trim();
    }
    if (!modelNumber && modelPatterns.test(keyNorm)) {
      modelNumber = pair.value.trim();
    }
  }

  return { serialNumber, modelNumber };
}

/**
 * Inject community aliases into the alias map with scaled priority.
 */
function injectCommunityAliases(aliasMap, communityAliases) {
  if (!communityAliases || communityAliases.size === 0) return;
  for (const [sourceKey, { specName, usageCount }] of communityAliases) {
    const norm = normalize(sourceKey);
    if (!aliasMap.has(norm)) {
      const priority = Math.min(
        CONFIDENCE.COMMUNITY_MAX,
        CONFIDENCE.COMMUNITY_BASE + Math.floor((usageCount - 3) * 1.5),
      );
      aliasMap.set(norm, { specName, priority, category: null });
    }
  }
}

/**
 * 3-pass field matching: Direct alias → Fuzzy → collect candidates.
 * Returns { candidateMap, matchedPairIndices }.
 */
function matchFields(rawPairs, aliasMap, allSpecNames, specCategories, detectedCategory) {
  const candidateMap = new Map();
  allSpecNames.forEach((name) => candidateMap.set(name, []));
  const matchedPairIndices = new Set();

  // --- Pass 1: Direct alias lookups ---
  rawPairs.forEach((pair, idx) => {
    const keyNorm = normalize(pair.key);
    const keyExp = expandAbbreviations(keyNorm);

    let entry = aliasMap.get(keyNorm);
    if (!entry) entry = aliasMap.get(keyExp);

    if (entry) {
      const candidates = candidateMap.get(entry.specName) || [];
      candidates.push({
        value: pair.value,
        confidence: entry.priority,
        sourceKey: pair.key,
        lineIndex: pair.lineIndex,
      });
      candidateMap.set(entry.specName, candidates);
      matchedPairIndices.add(idx);
    }
  });

  // --- Pass 2: Fuzzy matching for unmatched pairs ---
  rawPairs.forEach((pair, idx) => {
    if (matchedPairIndices.has(idx)) return;
    const keyNorm = normalize(pair.key);
    const keyExp = expandAbbreviations(keyNorm);

    const fuzzyMatches = [];

    for (const specName of allSpecNames) {
      const specNorm = normalize(specName);
      const specExp = expandAbbreviations(specNorm);
      const score = Math.max(similarityScore(keyNorm, specNorm), similarityScore(keyExp, specExp));

      if (score >= CONFIDENCE.FUZZY_MINIMUM) {
        let adj = score;
        const specCat = specCategories.get(specName);
        if (
          detectedCategory &&
          specCat &&
          specCat !== detectedCategory &&
          !SHARED_FIELDS.has(specName)
        ) {
          adj = Math.max(0, score - 25);
        }
        if (adj >= CONFIDENCE.FUZZY_MINIMUM) fuzzyMatches.push({ specName, score: adj });
      }
    }

    for (const [alias, entry] of aliasMap.entries()) {
      const aliasExp = expandAbbreviations(alias);
      const score = Math.max(similarityScore(keyNorm, alias), similarityScore(keyExp, aliasExp));

      if (score >= CONFIDENCE.FUZZY_ALIAS_MINIMUM) {
        let adj = Math.min(CONFIDENCE.FUZZY_CAP, score + (entry.priority - 50) * 0.15);
        const specCat = specCategories.get(entry.specName);
        if (
          detectedCategory &&
          specCat &&
          specCat !== detectedCategory &&
          !SHARED_FIELDS.has(entry.specName)
        ) {
          adj = Math.max(0, adj - 25);
        }
        if (adj >= CONFIDENCE.FUZZY_MINIMUM)
          fuzzyMatches.push({ specName: entry.specName, score: adj });
      }
    }

    if (fuzzyMatches.length > 0) {
      const bestBySpec = new Map();
      fuzzyMatches.forEach((m) => {
        const existing = bestBySpec.get(m.specName);
        if (!existing || m.score > existing.score) bestBySpec.set(m.specName, m);
      });

      for (const [specName, match] of bestBySpec) {
        const candidates = candidateMap.get(specName) || [];
        candidates.push({
          value: pair.value,
          confidence: Math.round(match.score),
          sourceKey: pair.key,
          lineIndex: pair.lineIndex,
        });
        candidateMap.set(specName, candidates);
      }
      matchedPairIndices.add(idx);
    }
  });

  return { candidateMap, matchedPairIndices };
}

/**
 * Validate a field value against known ranges.
 * Returns warning string or null.
 */
function validateFieldValue(specName, value) {
  const rule = VALUE_RANGES[specName];
  if (!rule) return null;
  const match = value.match(rule.pattern);
  if (!match) return null;
  if (rule.checkFn) {
    return rule.checkFn(value) ? null : rule.warn;
  }
  const num = parseFloat(match[rule.group || 0]);
  if (isNaN(num)) return null;
  if (rule.min !== undefined && num < rule.min) return rule.warn;
  if (rule.max !== undefined && num > rule.max) return rule.warn;
  return null;
}

/**
 * Resolve best match per field from candidates.
 * Handles dedup, multi-value merging, conflict detection, and validation.
 * Returns the fields Map.
 */
function resolveFields(candidateMap) {
  const fields = new Map();

  for (const [specName, candidates] of candidateMap) {
    if (candidates.length === 0) continue;

    candidates.sort((a, b) => b.confidence - a.confidence);

    // Deduplicate by value
    const seen = new Set();
    const deduped = candidates.filter((c) => {
      const key = c.value.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // --- Multi-value merging ---
    const directMatches = deduped.filter((c) => c.confidence >= CONFIDENCE.DIRECT_MATCH);
    let merged = null;
    if (directMatches.length > 1) {
      const confRange =
        Math.max(...directMatches.map((c) => c.confidence)) -
        Math.min(...directMatches.map((c) => c.confidence));
      if (confRange <= CONFIDENCE.MERGE_RANGE) {
        merged = {
          value: directMatches.map((c) => c.value).join(', '),
          confidence: Math.round(
            directMatches.reduce((s, c) => s + c.confidence, 0) / directMatches.length,
          ),
          sourceKey: directMatches.map((c) => c.sourceKey).join(' + '),
          mergedCount: directMatches.length,
        };
      }
    }

    // --- Conflict detection ---
    let hasConflict = false;
    if (!merged && deduped.length > 1) {
      const topTwo = deduped.slice(0, 2);
      const confDiff = Math.abs(topTwo[0].confidence - topTwo[1].confidence);
      if (
        confDiff <= CONFIDENCE.CONFLICT_DIFF_THRESHOLD &&
        topTwo[0].confidence >= CONFIDENCE.FUZZY_MINIMUM &&
        topTwo[1].confidence >= CONFIDENCE.FUZZY_MINIMUM
      ) {
        hasConflict = true;
      }
    }

    // Prefer merged → direct match → best candidate
    const directMatch = deduped.find((c) => c.confidence >= CONFIDENCE.DIRECT_MATCH);
    const best = merged || directMatch || deduped[0];

    // Value range validation
    const validationWarning = validateFieldValue(specName, best.value);

    fields.set(specName, {
      value: best.value,
      confidence: best.confidence,
      sourceKey: best.sourceKey,
      lineIndex: best.lineIndex,
      alternatives: deduped.length > 1 ? deduped : [],
      ...(merged ? { mergedCount: merged.mergedCount } : {}),
      ...(hasConflict ? { hasConflict: true } : {}),
      ...(validationWarning ? { validationWarning } : {}),
    });
  }

  return fields;
}

// ============================================================================
// Main Parser — Orchestrator
// ============================================================================

/**
 * Parse product text and extract structured data.
 * Performs text cleaning, key-value extraction, price/brand/category detection,
 * and 3-pass spec field matching.
 *
 * @param {string} text - Raw text content
 * @param {Object} specsConfig - Spec configuration { category: [{ name, required }] }
 * @param {Object} options - Optional: { communityAliases: Map }
 * @returns {Object} Parse result with fields, name, brand, etc.
 */
export function parseProductText(text, specsConfig, { communityAliases } = {}) {
  const result = {
    name: '',
    brand: '',
    category: '',
    purchasePrice: '',
    priceNote: '',
    serialNumber: '',
    modelNumber: '',
    fields: new Map(),
    unmatchedPairs: [],
    rawExtracted: [],
  };

  if (!text || typeof text !== 'string') return result;

  // 1. Clean and split into lines
  const cleaned = cleanInputText(text);
  const lines = cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l);

  // 2. Extract raw key-value pairs and detect product name
  const { rawPairs, detectedName } = extractRawPairs(lines);
  result.name = detectedName;
  result.rawExtracted = rawPairs.map((p) => ({
    key: p.key,
    value: p.value,
    lineIndex: p.lineIndex,
    sourceLine: p.sourceLine,
  }));

  // 3. Extract price
  const { purchasePrice, priceNote } = extractPrice(rawPairs, text);
  result.purchasePrice = purchasePrice;
  result.priceNote = priceNote;

  // 4. Detect brand and category
  const textLower = cleaned.toLowerCase();
  result.brand = detectBrand(result.name, textLower);
  result.category = detectCategory(textLower);

  // 5. Extract serial/model numbers
  const { serialNumber, modelNumber } = extractSerialModel(rawPairs);
  result.serialNumber = serialNumber;
  result.modelNumber = modelNumber;

  // 6. Build alias map and inject community aliases
  const { aliasMap, allSpecNames, specCategories } = buildSpecAliasMap(specsConfig);
  injectCommunityAliases(aliasMap, communityAliases);

  // 7. 3-pass field matching
  const { candidateMap, matchedPairIndices } = matchFields(
    rawPairs,
    aliasMap,
    allSpecNames,
    specCategories,
    result.category,
  );

  // 8. Resolve best match per field
  result.fields = resolveFields(candidateMap);

  // 9. Store source lines and collect unmatched
  result.sourceLines = lines;
  rawPairs.forEach((pair, idx) => {
    if (!matchedPairIndices.has(idx)) {
      result.unmatchedPairs.push({ key: pair.key, value: pair.value, lineIndex: pair.lineIndex });
    }
  });

  return result;
}
