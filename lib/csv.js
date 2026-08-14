// =============================================================================
// CSV parsing — RFC 4180, the parts the old line-splitting parser got wrong:
// - quoted fields may contain newlines (Excel notes columns)
// - files may open with a UTF-8 BOM (Excel adds one to every CSV it saves;
//   it used to make the required "name" header unrecognizable)
// - values our own exporter prefixed with a formula-guard apostrophe must
//   round-trip back without it
// Pure string functions — no DOM, no React.
// =============================================================================

/**
 * Parse CSV text into {headers, rows} where rows are arrays of strings.
 * Character-by-character over the whole text so quoted fields can contain
 * commas, escaped quotes (""), and newlines. Handles \n and \r\n. Strips a
 * leading UTF-8 BOM. Blank records are dropped.
 */
export function parseCSV(text) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;
  let fieldStarted = false; // distinguishes a truly empty line from ,","

  const endField = () => {
    record.push(field.trim());
    field = '';
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    const blank = record.every((v) => v === '');
    if (!blank) records.push(record);
    record = [];
  };

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      fieldStarted = true;
    } else if (char === ',') {
      fieldStarted = true;
      endField();
      fieldStarted = true; // the comma implies a following field
    } else if (char === '\n') {
      if (fieldStarted || record.length > 0 || field !== '') endRecord();
      else {
        field = '';
        record = [];
      }
    } else if (char === '\r') {
      // consumed as part of \r\n (or a stray \r treated as a newline)
      if (src[i + 1] === '\n') continue;
      if (fieldStarted || record.length > 0 || field !== '') endRecord();
    } else {
      field += char;
      fieldStarted = true;
    }
  }
  // Final record when the file doesn't end with a newline
  if (fieldStarted || field !== '' || record.length > 0) endRecord();

  if (records.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row');
  }

  const [headers, ...rows] = records;
  return { headers, rows };
}

/**
 * Undo the CSV-injection guard our exporter applies: a leading apostrophe
 * followed by a formula-triggering character was added on export and must
 * not survive a round-trip into the data.
 */
export function stripFormulaGuard(value) {
  if (typeof value !== 'string') return value;
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

/**
 * Parse a human money/number string: "$3,498.50" → 3498.5. The old
 * parseFloat call turned "3,498" into 3 (comma stopped the parse) and
 * "$3,498" into 0 — both silent corruption.
 * Returns {value, ok}: ok=false means the string had content that wasn't a
 * number; empty/absent input is ok with value 0.
 */
export function parseMoney(str) {
  if (str === null || str === undefined) return { value: 0, ok: true };
  const trimmed = String(str).trim();
  if (trimmed === '') return { value: 0, ok: true };
  const cleaned = trimmed.replace(/[$,\s]/g, '');
  if (!/^-?\d*\.?\d+$/.test(cleaned)) return { value: 0, ok: false };
  return { value: parseFloat(cleaned), ok: true };
}
