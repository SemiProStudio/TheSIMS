// ============================================================================
// Smart Paste — Batch Parser
// Multi-product detection and parsing
// BUG FIX: Uses full KNOWN_BRANDS list instead of hardcoded subset
// ============================================================================

import { KNOWN_BRANDS } from './constants.js';
import { parseProductText } from './parser.js';

// Build regex dynamically from the full brand list (was previously hardcoded with only ~17 brands)
const escapedBrands = KNOWN_BRANDS.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const productNamePattern = new RegExp('\\b(?:' + escapedBrands.join('|') + ')\\b', 'i');

/**
 * Detect product boundaries in text containing multiple products.
 * Returns array of { startLine, endLine, name, text } segments.
 */
export function detectProductBoundaries(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const boundaries = [];
  let currentStart = 0;
  let currentName = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let isBoundary = false;
    let detectedName = null;

    // Check horizontal rules
    if (/^[-=_]{3,}\s*$/.test(line)) {
      isBoundary = true;
    }
    // Check markdown headings
    else if (/^#{1,3}\s+(.+)/.test(line)) {
      isBoundary = true;
      detectedName = line.replace(/^#{1,3}\s+/, '').trim();
    }
    // Check "Product Name:" style labels
    else if (/^(?:product|item|model)\s*(?:name|#|number)?\s*[:→=]\s*(.+)/i.test(line)) {
      isBoundary = true;
      const match = line.match(/[:→=]\s*(.+)/);
      detectedName = match ? match[1].trim() : null;
    }
    // Check for brand-name product lines after a gap
    else if (i > 0 && !lines[i - 1]?.trim() && productNamePattern.test(line) && line.length < 120) {
      isBoundary = true;
      detectedName = line;
    }

    if (isBoundary && i > currentStart + 2) {
      // Save previous segment
      const segText = lines.slice(currentStart, i).join('\n').trim();
      if (segText.length > 20) {
        boundaries.push({
          startLine: currentStart,
          endLine: i - 1,
          name: currentName || `Product ${boundaries.length + 1}`,
          text: segText,
        });
      }
      currentStart = i;
      currentName = detectedName;
    } else if (isBoundary && !currentName) {
      currentName = detectedName;
    }
  }

  // Last segment
  const lastText = lines.slice(currentStart).join('\n').trim();
  if (lastText.length > 20) {
    boundaries.push({
      startLine: currentStart,
      endLine: lines.length - 1,
      name: currentName || `Product ${boundaries.length + 1}`,
      text: lastText,
    });
  }

  // If only one segment found, text likely contains a single product
  return boundaries.length > 1 ? boundaries : [];
}

/**
 * Parse multiple products from batch text.
 * Returns array of parse results.
 */
export function parseBatchProducts(text, specs, options = {}) {
  const segments = detectProductBoundaries(text);
  if (segments.length === 0) {
    // Single product — return as array of one
    return [{ segment: { name: 'Single Product', text }, result: parseProductText(text, specs, options) }];
  }
  return segments.map(segment => ({
    segment,
    result: parseProductText(segment.text, specs, options),
  }));
}
