// ============================================================================
// Smart Paste — Apply Payload Builder
// Converts parse results into item form data
// BUG FIX: Now applies normalizeUnits() and coerceFieldValue() to spec values
// ============================================================================

import { normalizeUnits, coerceFieldValue } from './unitNormalizer.js';

/**
 * Build the payload to apply to the item form.
 * Combines parse results with user-selected overrides.
 *
 * Filtering matches what the review UI shows: fields below the active
 * confidence threshold are skipped (unless the user explicitly picked a
 * value for them), and when a category is resolved, only that category's
 * defined fields apply. Without these guards, Apply silently wrote every
 * resolved field — including sub-threshold junk and other categories'
 * fields the user never saw.
 *
 * @param {Object} parseResult - Result from parseProductText()
 * @param {Object} selectedValues - User-selected value overrides
 * @param {Object} options - Optional: { normalizeMetric: boolean,
 *   threshold: number, allowedFields: string[]|null }
 * @returns {Object} Payload with name, brand, category, specs, etc.
 */
export function buildApplyPayload(
  parseResult,
  selectedValues,
  { normalizeMetric = false, threshold = 0, allowedFields = null } = {},
) {
  const allowed = allowedFields ? new Set(allowedFields) : null;
  const specs = {};
  for (const [specName, data] of parseResult.fields) {
    if (allowed && !allowed.has(specName)) continue;
    const override = selectedValues?.[specName];
    // An explicit user selection is intent; parser confidence only gates
    // fields the user never touched.
    if (override === undefined && data.confidence < threshold) continue;
    let value = override !== undefined ? override : data.value;
    if (value && value.trim()) {
      // Apply unit normalization if requested
      if (normalizeMetric) {
        const unitResult = normalizeUnits(value, true);
        if (unitResult) value = unitResult.normalized;
      }
      // Apply type coercion
      const coercionResult = coerceFieldValue(specName, value);
      if (coercionResult) value = coercionResult.coerced;

      specs[specName] = value;
    }
  }

  // Include manually-mapped unmatched pairs (also apply normalization/coercion).
  // Manual mappings are explicit user actions, so no threshold — but they
  // still respect the category restriction (the mapping UI only offers the
  // category's fields when one is resolved; this guard is defense in depth).
  if (selectedValues?._manualMappings) {
    for (const [specName, rawValue] of Object.entries(selectedValues._manualMappings)) {
      if (allowed && !allowed.has(specName)) continue;
      let value = rawValue;
      if (value && value.trim() && !specs[specName]) {
        if (normalizeMetric) {
          const unitResult = normalizeUnits(value, true);
          if (unitResult) value = unitResult.normalized;
        }
        const coercionResult = coerceFieldValue(specName, value);
        if (coercionResult) value = coercionResult.coerced;
        specs[specName] = value;
      }
    }
  }

  return {
    name: parseResult.name || '',
    brand: parseResult.brand || '',
    category: parseResult.category || '',
    purchasePrice: parseResult.purchasePrice || '',
    priceNote: parseResult.priceNote || '',
    serialNumber: parseResult.serialNumber || '',
    modelNumber: parseResult.modelNumber || '',
    specs,
  };
}

/**
 * Merge a parsed smart-paste payload into an item form.
 * The ONE shared implementation — ItemModal and the Add Item page carried
 * duplicated copies that silently dropped the serial number the parser
 * worked to extract (the same serial a CSV import would have kept).
 */
export function applySmartPastePayload(prev, parsed) {
  return {
    ...prev,
    name: parsed.name || prev.name,
    brand: parsed.brand || prev.brand,
    category: parsed.category || prev.category,
    purchasePrice: parsed.purchasePrice || prev.purchasePrice,
    currentValue: parsed.purchasePrice || prev.currentValue,
    serialNumber: parsed.serialNumber || prev.serialNumber,
    specs: { ...prev.specs, ...parsed.specs },
  };
}
