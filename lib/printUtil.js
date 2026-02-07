// =============================================================================
// Print Utility
// Opens a new window with HTML content and triggers the browser print dialog.
// Replaces scattered document.write() calls with a single reusable function.
// =============================================================================

/**
 * Open a print window with the given HTML content.
 * Uses document.write under the hood (the only reliable cross-browser way
 * to populate a new window for printing), but encapsulates it cleanly.
 *
 * @param {Object} options
 * @param {string} options.title - Document title
 * @param {string} options.styles - CSS styles (without <style> tags)
 * @param {string} options.body - HTML body content
 * @param {number} [options.delay=250] - ms to wait before calling print()
 */
export function openPrintWindow({ title, styles, body, delay = 250 }) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print.');
    return null;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>${body}</body>
</html>`;

  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), delay);
  return w;
}
