// =============================================================================
// Smart Paste correction-layer regressions (2026-08-24 audit, §2.B1/B3/B4/B14)
// These units had no coverage — each carried a wrong-result bug for months.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { cleanOcrText } from '../lib/smartPaste/ocr.js';
import { coerceFieldValue } from '../lib/smartPaste/unitNormalizer.js';
import { VALUE_RANGES } from '../lib/smartPaste/constants.js';
import { detectProductBoundaries } from '../lib/smartPaste/batchParser.js';

describe('cleanOcrText (B1)', () => {
  it('fixes l→I only between uppercase letters', () => {
    expect(cleanOcrText('MlLC camera')).toBe('MILC camera');
    expect(cleanOcrText('HDMl PORT')).toBe('HDMl PORT'); // trailing l untouched (no uppercase after)
    expect(cleanOcrText('AlBlC')).toBe('AIBIC'); // consecutive fixes via lookahead
  });

  it('leaves ordinary lowercase words alone (the old \\w rule corrupted them)', () => {
    expect(cleanOcrText('black filter also class')).toBe('black filter also class');
    expect(cleanOcrText('Rolling shutter')).toBe('Rolling shutter');
  });

  it('still maps | to I and tidies whitespace', () => {
    expect(cleanOcrText('M|LC\n\n\n\nnext')).toBe('MILC\n\nnext');
  });
});

describe('coerceFieldValue boolean matching (B3)', () => {
  it('coerces specs whose name CONTAINS a bool field', () => {
    expect(coerceFieldValue('Phantom Power (48V)', 'yes')).toEqual({
      original: 'yes',
      coerced: 'Yes',
    });
    expect(coerceFieldValue('Weather Sealing', 'not included')).toEqual({
      original: 'not included',
      coerced: 'No',
    });
  });

  it('does NOT coerce a spec merely contained IN a bool-field name', () => {
    // 'Power' ⊂ 'phantom power' used to turn a Power spec of "None" into "No"
    expect(coerceFieldValue('Power', 'None')).toBeNull();
    expect(coerceFieldValue('Power', 'Yes')).toBeNull();
  });
});

describe('VALUE_RANGES.Weight sanity check (B4)', () => {
  const { checkFn } = VALUE_RANGES.Weight;

  it('accepts realistic oz/lb weights that the old kg rule flagged', () => {
    expect(checkFn('112 oz')).toBe(true); // 7 lb tripod
    expect(checkFn('7 lb')).toBe(true);
    expect(checkFn('220 lb')).toBe(true); // ~100 kg, boundary
  });

  it('flags weights over ~100 kg in any pasted unit', () => {
    expect(checkFn('3600 oz')).toBe(false); // ~102 kg — the old rule passed this
    expect(checkFn('250 lb')).toBe(false);
    expect(checkFn('150 kg')).toBe(false);
    expect(checkFn('101000 g')).toBe(false);
  });

  it('still accepts metric pastes under the cap and tolerates junk', () => {
    expect(checkFn('90 kg')).toBe(true);
    expect(checkFn('850 g')).toBe(true);
    expect(checkFn('light as a feather')).toBe(true); // no number — not its job
  });
});

describe('detectProductBoundaries tight packing (B14)', () => {
  it('splits two products even when the first spans only 2 lines', () => {
    // The old `i > currentStart + 2` guard swallowed this boundary and
    // merged both products into one, dropping the second detected name
    const text = [
      '# Sony FX3 Cinema Camera',
      'Sensor: Full-Frame CMOS',
      '# Canon R5 Mirrorless',
      'Sensor: 45MP CMOS',
    ].join('\n');
    const segments = detectProductBoundaries(text);
    expect(segments).toHaveLength(2);
    expect(segments[0].name).toContain('Sony FX3');
    expect(segments[1].name).toContain('Canon R5');
    expect(segments[0].text).not.toContain('Canon');
  });

  it('does not split on marker-only gaps (rule line straight into heading)', () => {
    const text = [
      '----',
      '# Sony FX3 Cinema Camera',
      'Sensor: Full-Frame CMOS',
      'Mount: E-mount lenses accepted',
      '----',
      '# Canon R5 Mirrorless',
      'Sensor: 45MP CMOS',
      'Mount: RF-mount lenses accepted',
    ].join('\n');
    const segments = detectProductBoundaries(text);
    expect(segments).toHaveLength(2);
    expect(segments[0].name).toContain('Sony FX3');
    expect(segments[1].name).toContain('Canon R5');
  });

  it('still returns [] for single-product text', () => {
    const text = 'Sony FX3\nSensor: Full-Frame\nMount: E';
    expect(detectProductBoundaries(text)).toEqual([]);
  });
});
