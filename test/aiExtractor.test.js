// =============================================================================
// AI Extractor (Phase 2) — extract-specs client + result mapping
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractSpecs, aiResultToParseResult } from '../lib/smartPaste/aiExtractor.js';

const SPECS_CONFIG = {
  Lenses: [
    { name: 'Focal Length' },
    { name: 'Maximum Aperture' },
    { name: 'Lens Mount' },
    { name: 'Weight' },
  ],
};

describe('extractSpecs', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POSTs text + category with the user token', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'X', brand: 'Y', fields: [] }),
    });

    await extractSpecs('some text', 'Lenses', 'https://fn/extract-specs', 'user-jwt');

    expect(global.fetch).toHaveBeenCalledWith('https://fn/extract-specs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer user-jwt',
      },
      body: JSON.stringify({ text: 'some text', category: 'Lenses' }),
    });
  });

  it('throws a sign-in message on 401', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(extractSpecs('t', 'Lenses', 'https://fn', 'tok')).rejects.toThrow(
      /Sign in required/,
    );
  });

  it('surfaces the rate-limit message on 429', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Daily AI extraction limit reached — try again tomorrow' }),
    });
    await expect(extractSpecs('t', 'Lenses', 'https://fn', 'tok')).rejects.toThrow(
      /Daily AI extraction limit/,
    );
  });

  it('maps 503 to the not-configured fallback message', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(extractSpecs('t', 'Lenses', 'https://fn', 'tok')).rejects.toThrow(
      /not configured/,
    );
  });

  it('throws without a function URL', async () => {
    await expect(extractSpecs('t', 'Lenses', null, 'tok')).rejects.toThrow(/Edge Function URL/);
  });
});

describe('aiResultToParseResult', () => {
  const text = 'Sony FE 24-70mm\nFocal Length: 24-70mm\nMaximum Aperture: f/2.8\nWeight: 695 g';

  const result = {
    name: 'Sony FE 24-70mm f/2.8 GM II',
    brand: 'Sony',
    fields: [
      { field: 'Focal Length', value: '24-70mm', quote: 'Focal Length: 24-70mm' },
      { field: 'Maximum Aperture', value: 'f/2.8', quote: 'Maximum Aperture: f/2.8' },
      { field: 'Weight', value: '24.5', quote: 'Weight: 695 g' },
    ],
  };

  it('builds the parseResult shape the review panel renders', () => {
    const parsed = aiResultToParseResult(result, 'Lenses', text, SPECS_CONFIG);

    expect(parsed.name).toBe('Sony FE 24-70mm f/2.8 GM II');
    expect(parsed.brand).toBe('Sony');
    expect(parsed.category).toBe('Lenses');
    expect(parsed.fields.size).toBe(3);

    const weight = parsed.fields.get('Weight');
    expect(weight.value).toBe('24.5');
    expect(weight.confidence).toBeGreaterThanOrEqual(85); // shows as Direct
    expect(weight.sourceKey).toBe('Weight: 695 g'); // quote is the provenance
    expect(parsed.unmatchedPairs).toEqual([]);
  });

  it('locates each quote in the source text for highlight-on-click', () => {
    const parsed = aiResultToParseResult(result, 'Lenses', text, SPECS_CONFIG);
    expect(parsed.fields.get('Focal Length').lineIndex).toBe(1);
    expect(parsed.fields.get('Weight').lineIndex).toBe(3);
    expect(parsed.sourceLines).toHaveLength(4);
  });

  it('drops fields outside the category config', () => {
    const withStray = {
      ...result,
      fields: [...result.fields, { field: 'Beam Angle', value: '45°', quote: 'x' }],
    };
    const parsed = aiResultToParseResult(withStray, 'Lenses', text, SPECS_CONFIG);
    expect(parsed.fields.has('Beam Angle')).toBe(false);
    expect(parsed.fields.size).toBe(3);
  });

  it('keeps the first duplicate and offers the rest as alternatives', () => {
    const withDup = {
      ...result,
      fields: [
        ...result.fields,
        { field: 'Weight', value: '25.1', quote: 'shipping weight 712 g' },
      ],
    };
    const parsed = aiResultToParseResult(withDup, 'Lenses', text, SPECS_CONFIG);
    const weight = parsed.fields.get('Weight');
    expect(weight.value).toBe('24.5');
    expect(weight.alternatives).toHaveLength(2); // original + duplicate
    expect(weight.alternatives[1].value).toBe('25.1');
  });

  it('tolerates empty results', () => {
    const parsed = aiResultToParseResult(
      { name: null, brand: null, fields: [] },
      'Lenses',
      '',
      SPECS_CONFIG,
    );
    expect(parsed.fields.size).toBe(0);
    expect(parsed.name).toBe('');
  });
});
