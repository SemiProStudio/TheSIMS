// =============================================================================
// Print Utility
// Opens a new window with HTML content and triggers the browser print dialog.
// Uses Blob URL instead of document.write() to avoid popup blocker issues.
// =============================================================================

/**
 * Open a print window with the given HTML content.
 * Creates a Blob URL from the HTML and opens it in a new tab,
 * which is more reliable than document.write() and less likely
 * to be blocked by popup blockers.
 *
 * @param {Object} options
 * @param {string} options.title - Document title
 * @param {string} options.styles - CSS styles (without <style> tags)
 * @param {string} options.body - HTML body content
 * @param {number} [options.delay=500] - ms to wait before calling print()
 */
export function openPrintWindow({ title, styles, body, delay = 500 }) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>${body}</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');

  if (!w) {
    URL.revokeObjectURL(url);
    alert('Pop-up blocked. Please allow pop-ups for this site to print.');
    return null;
  }

  w.addEventListener('afterprint', () => {
    URL.revokeObjectURL(url);
  });

  w.addEventListener('load', () => {
    setTimeout(() => w.print(), delay);
  });

  return w;
}
