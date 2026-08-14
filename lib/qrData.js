// =============================================================================
// QR Payload + Image Helpers
// Item QR codes encode a deep link (https://<host>/?item=<id>) so a phone's
// native camera app opens the item directly in SIMS. The in-app scanners
// accept both the deep-link form and the bare IDs printed on older labels.
//
// Image generation renders at OVERSAMPLE× the display size so QR modules stay
// crisp on retina screens and, more importantly, on 300–600dpi label
// printers — a QR rasterized at its 60–80px display size prints visibly
// blurry. QR colors are intentionally hardcoded black-on-white in every
// theme: scanners need the contrast, and labels print on white stock.
// =============================================================================

import QRCodeLib from 'qrcode';
import { error as logError } from './logger.js';

export const OVERSAMPLE = 4;

export const QR_OPTIONS = {
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  errorCorrectionLevel: 'M',
};

/**
 * Generate a QR PNG data URL rendered at OVERSAMPLE× the display size.
 * @param {string} data - Payload to encode.
 * @param {number} displaySize - The CSS pixel size it will be displayed at.
 * @returns {Promise<string>} data URL, or '' on failure.
 */
export async function generateQRDataURL(data, displaySize = 100) {
  try {
    return await QRCodeLib.toDataURL(String(data), {
      ...QR_OPTIONS,
      width: displaySize * OVERSAMPLE,
    });
  } catch (err) {
    logError('QR Code toDataURL error:', err);
    return '';
  }
}

/**
 * Build the payload encoded in an item's QR code.
 * @param {string} itemId
 * @param {string} [origin] - Defaults to the current origin (dev/test/prod safe).
 */
export function buildItemQRData(itemId, origin = window.location.origin) {
  return `${origin}/?item=${encodeURIComponent(itemId)}`;
}

/**
 * Normalize a scanned QR payload (or manually entered code) to an item code.
 * Deep-link URLs yield their `item` query param; anything else (bare IDs,
 * serial numbers, foreign QR content) passes through trimmed.
 * @param {string} raw
 * @returns {string}
 */
export function parseScannedCode(raw) {
  const text = String(raw ?? '').trim();
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      const itemParam = url.searchParams.get('item');
      if (itemParam) return itemParam.trim();
    } catch {
      // fall through — treat as a plain code
    }
  }
  return text;
}
