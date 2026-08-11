// =============================================================================
// HTML Escaping
// Shared helper for code paths that build HTML strings (print/export windows).
// Print windows are Blob URLs and inherit the app's origin, so any unescaped
// user-controlled string (item names, list names, brands…) is an XSS vector.
// =============================================================================

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
