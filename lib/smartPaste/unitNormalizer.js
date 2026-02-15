// ============================================================================
// Smart Paste — Unit Normalization & Type Coercion
// Imperial↔Metric conversion and value formatting
// ============================================================================

import { UNIT_CONVERSIONS } from './constants.js';

/**
 * Detect units in a value and return normalized form + original.
 * Returns { original, normalized, unit } or null if no conversion applies.
 */
export function normalizeUnits(value, preferMetric = true) {
  if (!value || typeof value !== 'string') return null;

  // Compound weight: "1 lb 5 oz" → grams
  const compoundLb = value.match(/([\d.]+)\s*(?:lbs?|pounds?)\s+([\d.]+)\s*(?:oz|ounces?)/i);
  if (compoundLb) {
    const grams = parseFloat(compoundLb[1]) * 453.592 + parseFloat(compoundLb[2]) * 28.3495;
    if (grams >= 1000) {
      return { original: value, normalized: `${(grams / 1000).toFixed(2)} kg`, unit: 'kg' };
    }
    return { original: value, normalized: `${Math.round(grams)} g`, unit: 'g' };
  }

  // Dimensions: "6.5 x 4.3 x 3.1 inches" or "165 x 109 x 79 mm"
  const dimInches = value.match(/([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*[x×]\s*([\d.]+))?\s*(?:in(?:ch(?:es)?)?|")/i);
  if (dimInches && preferMetric) {
    const dims = [dimInches[1], dimInches[2], dimInches[3]].filter(Boolean).map(d => Math.round(parseFloat(d) * 25.4));
    return { original: value, normalized: dims.join(' × ') + ' mm', unit: 'mm' };
  }
  const dimMm = value.match(/([\d.]+)\s*[x×]\s*([\d.]+)(?:\s*[x×]\s*([\d.]+))?\s*mm/i);
  if (dimMm && !preferMetric) {
    const dims = [dimMm[1], dimMm[2], dimMm[3]].filter(Boolean).map(d => (parseFloat(d) / 25.4).toFixed(2));
    return { original: value, normalized: dims.join(' × ') + ' in', unit: 'in' };
  }

  // Simple single-unit conversions
  if (preferMetric) {
    for (const key of ['in_to_mm', 'lb_to_g', 'oz_to_g']) {
      const conv = UNIT_CONVERSIONS[key];
      const match = value.match(conv.pattern);
      if (match) {
        const num = parseFloat(match[1]);
        const converted = conv.fn ? conv.fn(num) : (num * conv.factor).toFixed(conv.toUnit === 'mm' ? 1 : 0);
        return { original: value, normalized: `${converted} ${conv.toUnit}`, unit: conv.toUnit };
      }
    }
  } else {
    for (const key of ['mm_to_in']) {
      const conv = UNIT_CONVERSIONS[key];
      const match = value.match(conv.pattern);
      if (match) {
        const num = parseFloat(match[1]);
        const converted = (num * conv.factor).toFixed(2);
        return { original: value, normalized: `${converted} ${conv.toUnit}`, unit: conv.toUnit };
      }
    }
  }

  // Fahrenheit to Celsius
  const fMatch = value.match(UNIT_CONVERSIONS.f_to_c.pattern);
  if (fMatch && preferMetric) {
    const converted = UNIT_CONVERSIONS.f_to_c.fn(parseFloat(fMatch[1]));
    return { original: value, normalized: `${converted} °C`, unit: '°C' };
  }

  return null;
}

/**
 * Smart type coercion — normalize values to expected formats.
 * Returns { original, coerced } or null if no coercion applies.
 */
export function coerceFieldValue(specName, value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  const nameLower = specName.toLowerCase();

  // Boolean fields
  const boolFields = ['weather sealing', 'touchscreen', 'autofocus', 'image stabilization',
    'stabilization', 'wireless control', 'airline approved', 'phantom power', 'hdr recording'];
  if (boolFields.some(f => nameLower.includes(f) || f.includes(nameLower))) {
    const lower = v.toLowerCase();
    if (/^(yes|true|included|available|built[\s-]?in|equipped|supported|✓|✔)$/i.test(lower)) {
      return { original: v, coerced: 'Yes' };
    }
    if (/^(no|false|not included|none|n\/a|not available|not supported|✗|✘|—)$/i.test(lower)) {
      return { original: v, coerced: 'No' };
    }
  }

  // CCT / Color Temperature range: "2700K-6500K" → "2700–6500 K"
  if (nameLower.includes('color temp') || nameLower.includes('cct')) {
    const cctMatch = v.match(/(\d{3,5})\s*K?\s*[-–—to]+\s*(\d{3,5})\s*K?/i);
    if (cctMatch) {
      return { original: v, coerced: `${cctMatch[1]}–${cctMatch[2]} K` };
    }
  }

  // Aperture: ensure f/ prefix
  if (nameLower.includes('aperture')) {
    const apMatch = v.match(/^(\d+\.?\d*)$/);
    if (apMatch) {
      return { original: v, coerced: `f/${apMatch[1]}` };
    }
  }

  return null;
}
