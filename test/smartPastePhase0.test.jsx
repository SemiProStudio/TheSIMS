// =============================================================================
// Smart Paste Phase 0 Tests — evaluation regression fixtures
// Pins the fixes from the 2026-08-16 evaluation:
//   P0-1 apply honors threshold + category restriction (buildApplyPayload)
//   P0-2 one-to-one pair→field assignment (no fan-out)
//   P0-3 category detection is a suggestion (ResultsPanel defaultCategory)
// The parser scenarios mirror the empirical probe run against the real prod
// taxonomy (near-duplicate fields), which reproduced every reported failure.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { parseProductText } from '../lib/smartPaste/parser.js';
import { buildApplyPayload } from '../lib/smartPaste/applyPayload.js';
import { ResultsPanel } from '../modals/smartPaste/ResultsPanel.jsx';

// Mini taxonomy mirroring the prod near-duplicates that caused fan-out
const SPECS = {
  Lenses: [
    { name: 'Focal Length' },
    { name: 'Maximum Aperture' },
    { name: 'Lens Mount' },
    { name: 'Filter Thread' },
    { name: 'Autofocus' },
    { name: 'AF Motor Type' },
    { name: 'Focus Gear Pitch' },
    { name: 'Angle of View (FF)' },
    { name: 'Angle of View (APS-C)' },
    { name: 'Minimum Focus Distance' },
    { name: 'Dimensions (DxL)' },
    { name: 'Weight' },
  ],
  Cameras: [
    { name: 'Sensor Type' },
    { name: 'ISO Range' },
    { name: 'Native ISO Range' },
    { name: 'Extended ISO Range' },
    { name: 'AF System' },
    { name: 'AF Points' },
    { name: 'Video Output' },
    { name: 'Weight' },
  ],
  Lighting: [
    { name: 'Color Temperature' },
    { name: 'CRI' },
    { name: 'Beam Angle' },
    { name: 'Illuminance (lux @ 1m)' },
    { name: 'Illuminance (lux @ 3m)' },
    { name: 'Dimensions' },
    { name: 'Weight' },
  ],
};

const LENS_TEXT = `Sony FE 24-70mm f/2.8 GM II Lens
Focal Length\t24-70mm
Maximum Aperture\tf/2.8
Lens Mount\tSony E
Angle of View\t84° to 34°
Minimum Focus Distance\t1.24' / 38 cm
Focus Type\tAutofocus
Filter Size\t82 mm (Front)
Dimensions (ø x L)\t3.46 x 4.72" / 87.8 x 119.9 mm
Weight\t1.54 lb / 695 g`;

const CAMERA_TEXT = `Sony a7S III Mirrorless Camera
Sensor Type: Full-Frame CMOS
ISO Range: 80 to 102400
Extended ISO: 40 to 409600
Weight: 1.35 lb`;

const LIGHT_TEXT = `Aputure LS 600d Pro Daylight LED Light
Color Temperature: 5600K
CRI: 96+
Illuminance @ 1m: 8,500 lux
Weight: 12.35 lb`;

// =============================================================================
// P0-2: One-to-one pair→field assignment
// =============================================================================

describe('one-to-one pair assignment (P0-2)', () => {
  it('one source line fills at most one field (Focus Type fan-out)', () => {
    const result = parseProductText(LENS_TEXT, SPECS, {});
    // The core invariant: the line lands in AT MOST one field (it used to
    // fill four). Which single field wins can shift with the taxonomy — the
    // semantic choice is Phase 2's job; Phase 0 kills the fan-out.
    const fromFocusType = [...result.fields.values()].filter((f) => f.sourceKey === 'Focus Type');
    expect(fromFocusType.length).toBeLessThanOrEqual(1);
    // And it must not land in another category's AF fields
    expect(result.fields.get('AF System')?.sourceKey).not.toBe('Focus Type');
    expect(result.fields.get('AF Points')?.sourceKey).not.toBe('Focus Type');
  });

  it('Angle of View fills exactly one of the (FF)/(APS-C) variants', () => {
    const result = parseProductText(LENS_TEXT, SPECS, {});
    const ff = result.fields.get('Angle of View (FF)');
    const apsc = result.fields.get('Angle of View (APS-C)');
    expect([ff, apsc].filter(Boolean)).toHaveLength(1);
  });

  it('Extended ISO never lands in Native ISO Range', () => {
    const result = parseProductText(CAMERA_TEXT, SPECS, {});
    expect(result.category).toBe('Cameras');
    expect(result.fields.get('Extended ISO Range')?.value).toBe('40 to 409600');
    expect(result.fields.get('Native ISO Range')).toBeUndefined();
    expect(result.fields.get('ISO Range')?.value).toBe('80 to 102400');
  });

  it('Illuminance @ 1m never fills the @ 3m field', () => {
    const result = parseProductText(LIGHT_TEXT, SPECS, {});
    expect(result.fields.get('Illuminance (lux @ 1m)')?.value).toBe('8,500 lux');
    expect(result.fields.get('Illuminance (lux @ 3m)')).toBeUndefined();
  });

  it('prefers an in-category field within the margin over a shared cross-category one', () => {
    const result = parseProductText(LENS_TEXT, SPECS, {});
    expect(result.category).toBe('Lenses');
    // "Dimensions (ø x L)" belongs in Lenses' "Dimensions (DxL)", not the
    // shared Lighting "Dimensions" that scores marginally higher lexically
    expect(result.fields.get('Dimensions (DxL)')?.value).toContain('87.8 x 119.9');
    expect(result.fields.get('Dimensions')).toBeUndefined();
  });

  it('still merges multiple pairs with the same key into one field', () => {
    const text = `Sony a7S III Mirrorless Camera
Video Output: HDMI Type-A
Video Output: USB-C 3.2`;
    const result = parseProductText(text, SPECS, {});
    const field = result.fields.get('Video Output');
    expect(field?.mergedCount).toBe(2);
    expect(field?.value).toContain('HDMI Type-A');
    expect(field?.value).toContain('USB-C 3.2');
  });
});

// =============================================================================
// P0-1: buildApplyPayload threshold + category restriction
// =============================================================================

const mkParseResult = (entries, category = 'Lenses') => ({
  name: 'Test Product',
  brand: 'Sony',
  category,
  purchasePrice: '',
  priceNote: '',
  serialNumber: '',
  modelNumber: '',
  fields: new Map(entries),
  unmatchedPairs: [],
  rawExtracted: [],
});

const LENS_FIELD_NAMES = SPECS.Lenses.map((s) => s.name);

describe('buildApplyPayload filtering (P0-1)', () => {
  const entries = [
    ['Maximum Aperture', { value: 'f/2.8', confidence: 100, sourceKey: 'Maximum Aperture' }],
    ['Focus Gear Pitch', { value: 'Autofocus', confidence: 50, sourceKey: 'Focus Type' }],
    ['Beam Angle', { value: '84° to 34°', confidence: 56, sourceKey: 'Angle of View' }],
  ];

  it('drops sub-threshold fields the user never saw', () => {
    const payload = buildApplyPayload(mkParseResult(entries), {}, { threshold: 60 });
    expect(payload.specs['Maximum Aperture']).toBe('f/2.8');
    expect(payload.specs['Focus Gear Pitch']).toBeUndefined();
    expect(payload.specs['Beam Angle']).toBeUndefined();
  });

  it('drops fields outside the allowed category even above threshold', () => {
    const payload = buildApplyPayload(mkParseResult(entries), {}, {
      threshold: 50,
      allowedFields: LENS_FIELD_NAMES,
    });
    expect(payload.specs['Maximum Aperture']).toBe('f/2.8');
    expect(payload.specs['Focus Gear Pitch']).toBe('Autofocus'); // in category, ≥50
    expect(payload.specs['Beam Angle']).toBeUndefined(); // Lighting field
  });

  it('keeps an explicit user override even below threshold', () => {
    const payload = buildApplyPayload(
      mkParseResult(entries),
      { 'Focus Gear Pitch': '0.8 MOD' },
      { threshold: 60, allowedFields: LENS_FIELD_NAMES },
    );
    expect(payload.specs['Focus Gear Pitch']).toBe('0.8 MOD');
  });

  it('applies manual mappings regardless of threshold but respects the category', () => {
    const payload = buildApplyPayload(
      mkParseResult(entries),
      { _manualMappings: { 'Filter Thread': '82mm', CRI: '96+' } },
      { threshold: 60, allowedFields: LENS_FIELD_NAMES },
    );
    expect(payload.specs['Filter Thread']).toBe('82mm');
    expect(payload.specs['CRI']).toBeUndefined(); // Lighting field
  });

  it('with no options behaves as before (no filtering) for legacy callers', () => {
    const payload = buildApplyPayload(mkParseResult(entries), {});
    expect(Object.keys(payload.specs)).toHaveLength(3);
  });
});

// =============================================================================
// P0-3: category precedence in ResultsPanel
// =============================================================================

const renderPanel = (overrides = {}) => {
  const setCategoryOverride = vi.fn();
  const props = {
    parseResult: mkParseResult([], 'Lighting'),
    matchedFields: [],
    emptyFields: [],
    selectedValues: {},
    onSelectValue: vi.fn(),
    onClearField: vi.fn(),
    onHighlightLine: vi.fn(),
    normalizeMetric: false,
    normalizeUnits: () => null,
    coerceFieldValue: () => null,
    brandOverride: null,
    setBrandOverride: vi.fn(),
    categoryOverride: null,
    setCategoryOverride,
    defaultCategory: 'Cameras',
    availableCategories: ['Cameras', 'Lenses', 'Lighting'],
    showSourceView: false,
    ...overrides,
  };
  render(<ResultsPanel {...props} />);
  return { setCategoryOverride };
};

describe('category precedence (P0-3)', () => {
  it('shows the host form category, not the parser detection', () => {
    renderPanel();
    // Custom Select renders a button trigger showing the selected label
    expect(screen.getByLabelText('Category')).toHaveTextContent('Cameras');
  });

  it('offers the detection as a hint with a "use detected" action', () => {
    const { setCategoryOverride } = renderPanel();
    expect(screen.getByText(/Detected: Lighting/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'use detected' }));
    expect(setCategoryOverride).toHaveBeenCalledWith('Lighting');
  });

  it('shows no hint when detection agrees with the effective category', () => {
    renderPanel({ defaultCategory: 'Lighting' });
    expect(screen.queryByText(/Detected:/)).not.toBeInTheDocument();
  });

  it('an explicit override wins over the host category', () => {
    renderPanel({ categoryOverride: 'Lenses' });
    expect(screen.getByLabelText('Category')).toHaveTextContent('Lenses');
  });
});
