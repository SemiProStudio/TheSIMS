// ============================================================================
// Smart Paste — AI Extractor client
// Calls the extract-specs edge function (single schema-constrained Claude
// call) and converts its result into the parseResult shape the review panel
// already renders — source quotes become the per-field provenance.
// ============================================================================

/**
 * Call the extract-specs edge function.
 * @param {string} text - Page/spec-sheet text
 * @param {string} category - The category whose canonical fields to extract
 * @param {string} functionUrl - Edge function URL
 * @param {string} accessToken - The signed-in user's session token (NOT the
 *   anon key — the function rejects the anon key with 401)
 * @returns {Promise<{name: string|null, brand: string|null,
 *   fields: Array<{field: string, value: string, quote: string}>}>}
 */
export async function extractSpecs(text, category, functionUrl, accessToken) {
  if (!functionUrl) {
    throw new Error('AI extraction requires the extract-specs Edge Function URL.');
  }

  let response;
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text, category }),
    });
  } catch {
    throw new Error('Network error reaching the AI extraction service.');
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.error || body.message || '';
    } catch {
      /* not JSON */
    }
    if (response.status === 401) {
      throw new Error('Sign in required for AI extraction.');
    }
    if (response.status === 429) {
      throw new Error(detail || 'AI extraction rate limit reached — try again shortly.');
    }
    if (response.status === 503) {
      throw new Error('AI extraction is not configured — using the local parser instead.');
    }
    if (response.status === 404) {
      throw new Error('AI extraction service not deployed.');
    }
    throw new Error(detail || `AI extraction failed (${response.status}).`);
  }

  return response.json();
}

/**
 * Convert an extract-specs result into the parseResult shape the Smart
 * Paste review panel renders. Quotes become sourceKey (the provenance line
 * FieldRow displays), and the quote's location in the source text drives
 * the highlight-on-click behavior.
 */
export function aiResultToParseResult(result, category, text, specsConfig) {
  const sourceLines = (text || '').split('\n');
  const categoryFields = new Set(
    ((specsConfig && specsConfig[category]) || []).map((s) => s.name),
  );

  const findLineIndex = (quote) => {
    if (!quote) return -1;
    const needle = quote.slice(0, 24).trim().toLowerCase();
    if (!needle) return -1;
    return sourceLines.findIndex((line) => line.toLowerCase().includes(needle));
  };

  const fields = new Map();
  for (const entry of result.fields || []) {
    if (!entry?.field || !entry.value) continue;
    // Schema enum already restricts fields server-side; filter again in case
    // the local config and server definitions have drifted
    if (categoryFields.size > 0 && !categoryFields.has(entry.field)) continue;

    const candidate = {
      value: String(entry.value),
      confidence: 96,
      sourceKey: entry.quote || 'AI extraction',
      lineIndex: findLineIndex(entry.quote),
    };

    const existing = fields.get(entry.field);
    if (existing) {
      // Duplicate field from the model — keep the first, offer the rest
      existing.alternatives = existing.alternatives.length
        ? existing.alternatives
        : [{ ...existing }];
      existing.alternatives.push({ ...candidate, confidence: 90 });
    } else {
      fields.set(entry.field, { ...candidate, alternatives: [] });
    }
  }

  return {
    name: result.name || '',
    brand: result.brand || '',
    category: category || '',
    purchasePrice: '',
    priceNote: '',
    serialNumber: '',
    modelNumber: '',
    fields,
    unmatchedPairs: [],
    rawExtracted: (result.fields || []).map((entry, i) => ({
      key: entry.field,
      value: entry.value,
      lineIndex: findLineIndex(entry.quote),
      sourceLine: entry.quote || '',
      index: i,
    })),
    sourceLines,
  };
}
