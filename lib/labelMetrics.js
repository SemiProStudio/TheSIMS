// ============================================================================
// Label metrics — pure sizing math shared by the label renderer (ItemLabel),
// the sheet exporter (labelSheet), and LabelsView. All dimensions are at the
// 96ppi baseline (1 CSS px per printed 1/96"); callers scale for display.
// Lives outside ItemLabel.jsx so component files export only components
// (React fast refresh requirement).
// ============================================================================

/** QR display size in px at the 96ppi baseline, per format. */
export const qrBaseSize = (format) =>
  format.id === 'small' ? 80 : format.id === 'medium' ? 70 : 60;

/** QR display size in CSS px for a format at a given ppi (exported so callers
 *  generate the data URL at the size it will be shown). */
export function qrDisplaySize(format, ppi = 96) {
  return (qrBaseSize(format) * ppi) / 96;
}

/**
 * QR position inside a label, in 96ppi-baseline px. Mirrors ItemLabel's flex
 * layout (padding / row-centering). The sheet exporter needs this because
 * WebKit refuses to load <img> subresources (even data: URLs) inside a
 * foreignObject that is being rasterized — so sheet QRs are drawn onto the
 * canvas at these offsets instead of being part of the SVG.
 */
export function qrOffset(format) {
  if (format.id === 'small') return { x: 8, y: 8 };
  if (format.id === 'medium') {
    // Row layout: QR vertically centered within the padded content box
    return { x: 12, y: 12 + (format.height * 96 - 24 - qrBaseSize(format)) / 2 };
  }
  return { x: 12, y: 12 }; // header row, top-left
}

// Average glyph width as a fraction of the font size for the label font
// stack — the basis for fitting text by SHRINKING the font instead of
// truncating with an ellipsis. Deterministic (no DOM measurement), so the
// preview, print, and PNG paths all compute identical sizes.
const AVG_GLYPH_WIDTH = 0.52;

/** Font size (96ppi-baseline px) at which `text` fits `maxWidth`, shrinking
 *  from `base` down to a readability floor. */
export function fitFontSize(text, maxWidth, base, min = 5) {
  const len = String(text ?? '').length;
  if (!len) return base;
  return Math.max(min, Math.min(base, maxWidth / (len * AVG_GLYPH_WIDTH)));
}
