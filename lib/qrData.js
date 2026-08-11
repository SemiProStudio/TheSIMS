// =============================================================================
// QR Payload Helpers
// Item QR codes encode a deep link (https://<host>/?item=<id>) so a phone's
// native camera app opens the item directly in SIMS. The in-app scanners
// accept both the deep-link form and the bare IDs printed on older labels.
// =============================================================================

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
