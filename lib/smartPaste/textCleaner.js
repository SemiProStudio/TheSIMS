// ============================================================================
// Smart Paste — Text Cleaner
// Preprocesses HTML/text content for parsing
// ============================================================================

/**
 * Clean HTML artifacts, table structures, and non-text elements from pasted text.
 * Converts table rows to "key\tvalue" lines for downstream parsing.
 */
export function cleanInputText(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // ---- Remove non-text elements entirely ----
  cleaned = cleaned.replace(/<img[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  cleaned = cleaned.replace(/<(?:picture|video|audio|iframe|canvas|object|embed)[^>]*(?:\/>|>[\s\S]*?<\/(?:picture|video|audio|iframe|canvas|object|embed)>)/gi, '');
  cleaned = cleaned.replace(/<(?:script|style|noscript)[\s\S]*?<\/(?:script|style|noscript)>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  // Remove nav, footer, form, button blocks
  cleaned = cleaned.replace(/<(?:button|nav|footer|form)[^>]*>[\s\S]*?<\/(?:button|nav|footer|form)>/gi, '');

  // ---- Convert table structures to key\tvalue lines ----
  cleaned = cleaned.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        if (cellText) cells.push(cellText);
      }
      if (cells.length >= 2) {
        rows.push(cells[0] + '\t' + cells.slice(1).join(', '));
      } else if (cells.length === 1) {
        rows.push(cells[0]);
      }
    }
    return rows.join('\n');
  });

  // <dt>...<dd> → "term\tvalue" (definition lists — must run BEFORE block-level cleanup)
  cleaned = cleaned.replace(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi, (_, dt, dd) => {
    const key = dt.replace(/<[^>]+>/g, '').trim();
    const val = dd.replace(/<[^>]+>/g, '').trim();
    return key + '\t' + val + '\n';
  });

  // ---- Convert remaining block-level elements ----
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<hr\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(?:p|div|tr|li|h[1-6]|dt|dd|section|article|header|blockquote)>/gi, '\n');

  cleaned = cleaned.replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, '\t');
  cleaned = cleaned.replace(/<\/tr>\s*/gi, '\n');

  // ---- Strip all remaining HTML tags ----
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // ---- Decode HTML entities ----
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  cleaned = cleaned.replace(/&[a-zA-Z]+;/g, '');

  // ---- Normalize whitespace ----
  cleaned = cleaned.replace(/\t+/g, '\t');
  cleaned = cleaned.replace(/[ \t]*\n[ \t]*/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\s+|\s+$/g, '');

  return cleaned;
}
