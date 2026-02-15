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
 * @param {Object} parseResult - Result from parseProductText()
 * @param {Object} selectedValues - User-selected value overrides
 * @param {Object} options - Optional: { normalizeMetric: boolean }
 * @returns {Object} Payload with name, brand, category, specs, etc.
 */
export function buildApplyPayload(parseResult, selectedValues, { normalizeMetric = false } = {}) {
  const specs = {};
  for (const [specName, data] of parseResult.fields) {
    const override = selectedValues?.[specName];
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

  // Include manually-mapped unmatched pairs (also apply normalization/coercion)
  if (selectedValues?._manualMappings) {
    for (const [specName, rawValue] of Object.entries(selectedValues._manualMappings)) {
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
