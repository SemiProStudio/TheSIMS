// =============================================================================
// Smart Paste Parser — Test Suite
// Comprehensive tests for all parser sub-modules
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  cleanInputText,
  normalize,
  expandAbbreviations,
  levenshtein,
  similarityScore,
  buildSpecAliasMap,
  parseProductText,
  normalizeUnits,
  coerceFieldValue,
  buildApplyPayload,
  detectProductBoundaries,
  parseBatchProducts,
  diffSpecs,
  KNOWN_BRANDS,
  CONFIDENCE,
} from '../lib/smartPaste/index.js';

// =============================================================================
// cleanInputText
// =============================================================================

describe('cleanInputText', () => {
  it('should return empty string for null/undefined/empty input', () => {
    expect(cleanInputText(null)).toBe('');
    expect(cleanInputText(undefined)).toBe('');
    expect(cleanInputText('')).toBe('');
  });

  it('should return empty string for non-string input', () => {
    expect(cleanInputText(42)).toBe('');
    expect(cleanInputText({})).toBe('');
  });

  it('should pass through plain text unchanged', () => {
    expect(cleanInputText('Hello World')).toBe('Hello World');
  });

  it('should convert HTML tables to tab-separated lines', () => {
    const html =
      '<table><tr><td>Weight</td><td>500g</td></tr><tr><td>Color</td><td>Black</td></tr></table>';
    const result = cleanInputText(html);
    expect(result).toContain('Weight\t500g');
    expect(result).toContain('Color\tBlack');
  });

  it('should handle multi-cell rows by joining with commas', () => {
    const html = '<table><tr><td>Dimensions</td><td>100mm</td><td>50mm</td></tr></table>';
    const result = cleanInputText(html);
    expect(result).toContain('Dimensions\t100mm, 50mm');
  });

  it('should remove script and style tags with content', () => {
    const html = 'Product<script>alert("xss")</script> Info<style>.red{color:red}</style>';
    const result = cleanInputText(html);
    expect(result).not.toContain('alert');
    expect(result).not.toContain('.red');
    expect(result).toContain('Product');
    expect(result).toContain('Info');
  });

  it('should remove img, svg, and media tags', () => {
    const html = 'Before<img src="photo.jpg"/>After<svg><path/></svg>End';
    const result = cleanInputText(html);
    expect(result).not.toContain('photo.jpg');
    expect(result).not.toContain('path');
    expect(result).toContain('Before');
    expect(result).toContain('After');
    expect(result).toContain('End');
  });

  it('should decode common HTML entities', () => {
    expect(cleanInputText('&amp; &lt; &gt; &quot; &#39; &nbsp;')).toBe('& < > " \'');
  });

  it('should decode numeric HTML entities', () => {
    expect(cleanInputText('&#169;')).toBe('©');
  });

  it('should convert <br> tags to newlines', () => {
    const result = cleanInputText('Line1<br/>Line2<br>Line3');
    expect(result).toContain('Line1\nLine2\nLine3');
  });

  it('should collapse excessive blank lines', () => {
    const result = cleanInputText('A\n\n\n\n\nB');
    expect(result).toBe('A\n\nB');
  });

  it('should remove nav, footer, form, and button blocks', () => {
    const html = '<nav>Navigation</nav>Content<footer>Footer</footer>';
    const result = cleanInputText(html);
    expect(result).not.toContain('Navigation');
    expect(result).not.toContain('Footer');
    expect(result).toContain('Content');
  });

  it('should convert definition lists to tab-separated', () => {
    const html = '<dl><dt>Weight</dt><dd>500g</dd></dl>';
    const result = cleanInputText(html);
    expect(result).toContain('Weight\t500g');
  });

  it('should strip remaining HTML tags', () => {
    const html = '<div class="spec"><span>Value</span></div>';
    const result = cleanInputText(html);
    expect(result).toBe('Value');
  });
});

// =============================================================================
// normalize
// =============================================================================

describe('normalize', () => {
  it('should lowercase and trim', () => {
    expect(normalize('  Hello World  ')).toBe('hello world');
  });

  it('should replace dashes with spaces', () => {
    expect(normalize('image-stabilization')).toBe('image stabilization');
  });

  it('should remove parentheses and brackets', () => {
    expect(normalize('weight (body only)')).toBe('weight body only');
  });

  it('should remove special characters except / % .', () => {
    expect(normalize('f/2.8')).toBe('f/2.8');
    expect(normalize('100%')).toBe('100%');
  });

  it('should collapse multiple spaces', () => {
    expect(normalize('hello    world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(normalize('')).toBe('');
  });

  it('should handle en-dash and em-dash', () => {
    expect(normalize('hi–there—world')).toBe('hi there world');
  });
});

// =============================================================================
// expandAbbreviations
// =============================================================================

describe('expandAbbreviations', () => {
  it('should expand known abbreviations', () => {
    expect(expandAbbreviations('mic')).toBe('microphone');
    expect(expandAbbreviations('freq')).toBe('frequency');
    expect(expandAbbreviations('temp')).toBe('temperature');
    expect(expandAbbreviations('max')).toBe('maximum');
    expect(expandAbbreviations('min')).toBe('minimum');
    expect(expandAbbreviations('batt')).toBe('battery');
  });

  it('should expand multi-word strings', () => {
    expect(expandAbbreviations('max freq')).toBe('maximum frequency');
  });

  it('should leave unknown words unchanged', () => {
    expect(expandAbbreviations('hello world')).toBe('hello world');
  });
});

// =============================================================================
// levenshtein
// =============================================================================

describe('levenshtein', () => {
  it('should return 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('should return length of other string when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('hello', '')).toBe(5);
  });

  it('should return correct edit distances', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('flaw', 'lawn')).toBe(2);
    expect(levenshtein('weight', 'weigth')).toBe(2); // transposition
  });

  it('should handle single character differences', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
    expect(levenshtein('cat', 'cats')).toBe(1);
    expect(levenshtein('cats', 'cat')).toBe(1);
  });
});

// =============================================================================
// similarityScore
// =============================================================================

describe('similarityScore', () => {
  it('should return 100 for exact matches (after normalization)', () => {
    expect(similarityScore('Weight', 'weight')).toBe(100);
    expect(similarityScore('  focal-length  ', 'focal length')).toBe(100);
  });

  it('should return 0 for completely different strings', () => {
    expect(similarityScore('abc', 'xyz')).toBe(0);
  });

  it('should return 0 for empty inputs', () => {
    expect(similarityScore('', 'hello')).toBe(0);
    expect(similarityScore('test', '')).toBe(0);
  });

  it('should score abbreviation expansions at ALIAS_EXPANSION level', () => {
    // "freq" expands to "frequency", "max freq" expands to "maximum frequency"
    const score = similarityScore('freq', 'frequency');
    expect(score).toBe(CONFIDENCE.ALIAS_EXPANSION);
  });

  it('should give high score when one contains the other', () => {
    const score = similarityScore('image stabilization', 'stabilization');
    expect(score).toBeGreaterThanOrEqual(CONFIDENCE.CONTAINMENT_LOW);
  });

  it('should give score for partial token overlap', () => {
    const score = similarityScore('maximum video resolution', 'video resolution output');
    expect(score).toBeGreaterThan(0);
  });

  it('should handle single long word match', () => {
    const score = similarityScore('impedance value', 'microphone impedance');
    // "impedance" is 9 chars, should get SINGLE_LONG_WORD score
    expect(score).toBeGreaterThanOrEqual(CONFIDENCE.SINGLE_MEDIUM_WORD);
  });
});

// =============================================================================
// buildSpecAliasMap
// =============================================================================

describe('buildSpecAliasMap', () => {
  const mockSpecs = {
    Cameras: [{ name: 'Sensor Type', required: true }, { name: 'Effective Pixels' }],
    Lenses: [{ name: 'Focal Length' }, { name: 'Maximum Aperture' }],
  };

  it('should return empty results for null input', () => {
    const result = buildSpecAliasMap(null);
    expect(result.aliasMap.size).toBe(0);
    expect(result.allSpecNames).toEqual([]);
  });

  it('should populate allSpecNames', () => {
    const { allSpecNames } = buildSpecAliasMap(mockSpecs);
    expect(allSpecNames).toContain('Sensor Type');
    expect(allSpecNames).toContain('Effective Pixels');
    expect(allSpecNames).toContain('Focal Length');
    expect(allSpecNames).toContain('Maximum Aperture');
    expect(allSpecNames.length).toBe(4);
  });

  it('should map normalized spec names with high priority', () => {
    const { aliasMap } = buildSpecAliasMap(mockSpecs);
    const entry = aliasMap.get('sensor type');
    expect(entry).toBeDefined();
    expect(entry.specName).toBe('Sensor Type');
    expect(entry.priority).toBe(100);
  });

  it('should register common aliases', () => {
    const { aliasMap } = buildSpecAliasMap(mockSpecs);
    // "megapixels" is an alias for "Effective Pixels"
    const entry = aliasMap.get('megapixels');
    expect(entry).toBeDefined();
    expect(entry.specName).toBe('Effective Pixels');
    expect(entry.priority).toBe(80);
  });

  it('should track spec categories', () => {
    const { specCategories } = buildSpecAliasMap(mockSpecs);
    expect(specCategories.get('Sensor Type')).toBe('Cameras');
    expect(specCategories.get('Focal Length')).toBe('Lenses');
  });

  it('should skip specs without names', () => {
    const specs = { Cameras: [{ required: true }, { name: 'Valid Spec' }] };
    const { allSpecNames } = buildSpecAliasMap(specs);
    expect(allSpecNames).toEqual(['Valid Spec']);
  });

  it('should skip non-array category values', () => {
    const specs = { Cameras: 'not an array', Lenses: [{ name: 'FL' }] };
    const { allSpecNames } = buildSpecAliasMap(specs);
    expect(allSpecNames).toEqual(['FL']);
  });
});

// =============================================================================
// parseProductText — end-to-end
// =============================================================================

describe('parseProductText', () => {
  const specsConfig = {
    Cameras: [
      { name: 'Sensor Type', required: true },
      { name: 'Effective Pixels' },
      { name: 'Video Resolution' },
      { name: 'ISO Range' },
      { name: 'Weight' },
    ],
    Lenses: [{ name: 'Focal Length' }, { name: 'Maximum Aperture' }, { name: 'Lens Mount' }],
    Lighting: [{ name: 'Light Type' }, { name: 'Color Temperature' }, { name: 'Max Power Output' }],
  };

  it('should return empty result for null/empty input', () => {
    const result = parseProductText(null, specsConfig);
    expect(result.name).toBe('');
    expect(result.fields.size).toBe(0);
    expect(result.unmatchedPairs).toEqual([]);
  });

  it('should return empty result for non-string input', () => {
    const result = parseProductText(42, specsConfig);
    expect(result.name).toBe('');
    expect(result.fields.size).toBe(0);
  });

  it('should parse tab-separated key-value pairs', () => {
    const text =
      'Sony A7 IV Camera\nSensor Type\tFull-Frame CMOS\nEffective Pixels\t33 MP\nWeight\t658g';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Sensor Type')?.value).toBe('Full-Frame CMOS');
    expect(result.fields.get('Effective Pixels')?.value).toBe('33 MP');
    expect(result.fields.get('Weight')?.value).toBe('658g');
  });

  it('should parse colon-separated key-value pairs', () => {
    const text =
      'Canon RF 50mm f/1.2L Lens\nFocal Length: 50mm\nMaximum Aperture: f/1.2\nLens Mount: Canon RF';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Focal Length')?.value).toBe('50mm');
    expect(result.fields.get('Maximum Aperture')?.value).toBe('f/1.2');
    expect(result.fields.get('Lens Mount')?.value).toBe('Canon RF');
  });

  it('should detect product name from brand keywords', () => {
    const text = 'Sony FX3 Cinema Camera\nSensor Type: Full-Frame\nWeight: 640g';
    const result = parseProductText(text, specsConfig);
    expect(result.name).toContain('Sony FX3');
  });

  it('should detect product name from product keywords', () => {
    const text = 'Super Wide Angle Lens 14mm\nFocal Length: 14mm';
    const result = parseProductText(text, specsConfig);
    expect(result.name).toContain('Lens');
  });

  it('should detect price from key-value pair', () => {
    const text = 'Sony Camera\nPrice: $2,499.00\nSensor Type: Full-Frame';
    const result = parseProductText(text, specsConfig);
    expect(result.purchasePrice).toBe('2499.00');
  });

  it('should detect sale price over regular price', () => {
    const text = 'Sony Camera\nList Price: $2,999\nSale Price: $2,499\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.purchasePrice).toBe('2499');
  });

  it('should detect price from text with currency symbols', () => {
    const text = 'This item costs $1,299.99\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.purchasePrice).toBe('1299.99');
  });

  it('should note non-USD currency', () => {
    const text = 'This camera costs €2,199\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.priceNote).toContain('EUR');
  });

  it('should detect brand from product name', () => {
    const text = 'Sony A7C II Camera\nSensor Type: BSI CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.brand).toBe('Sony');
  });

  it('should detect brand from body text when not in name', () => {
    const text = 'Professional Camera\nManufacturer: Canon\nSensor Type: APS-C CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.brand).toBe('Canon');
  });

  it('should detect category via keyword scoring', () => {
    const text =
      'LED Light Panel\nLight Type: LED\nColor Temperature: 5600K\nMax Power Output: 300W';
    const result = parseProductText(text, specsConfig);
    expect(result.category).toBe('Lighting');
  });

  it('should extract serial and model numbers', () => {
    const text = 'Sony Camera\nSerial Number: ABC123456\nModel Number: ILCE-7M4\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.serialNumber).toBe('ABC123456');
    expect(result.modelNumber).toBe('ILCE-7M4');
  });

  it('should handle various serial/model label variants', () => {
    const text = 'Camera System\nS/N: SN12345\nSKU: SKU-ABC\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.serialNumber).toBe('SN12345');
    expect(result.modelNumber).toBe('SKU-ABC');
  });

  it('should collect unmatched pairs', () => {
    const text = 'Sony Camera\nSensor Type: CMOS\nFoo Bar: Baz Qux';
    const result = parseProductText(text, specsConfig);
    const unmatched = result.unmatchedPairs.find((p) => p.key === 'Foo Bar');
    expect(unmatched).toBeDefined();
    expect(unmatched.value).toBe('Baz Qux');
  });

  it('should store raw extracted pairs', () => {
    const text = 'Camera\nSensor Type: CMOS\nWeight: 500g';
    const result = parseProductText(text, specsConfig);
    expect(result.rawExtracted.length).toBeGreaterThanOrEqual(2);
    expect(result.rawExtracted.some((p) => p.key === 'Sensor Type')).toBe(true);
  });

  it('should store source lines', () => {
    const text = 'Line 1\nLine 2\nLine 3';
    const result = parseProductText(text, specsConfig);
    expect(result.sourceLines).toBeDefined();
    expect(result.sourceLines.length).toBe(3);
  });

  it('should fuzzy-match alias names', () => {
    // "megapixels" is an alias for "Effective Pixels"
    const text = 'Camera\nMegapixels: 24.1 MP';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Effective Pixels')?.value).toBe('24.1 MP');
  });

  it('should fuzzy-match via common aliases', () => {
    // "Aperture" is a common alias for "Maximum Aperture"
    const text = 'Canon Lens\nAperture: f/2.8';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Maximum Aperture')?.value).toBe('f/2.8');
  });

  it('should handle pipe-separated key-value pairs', () => {
    const text = 'Camera Info\nSensor Type | BSI CMOS\nWeight | 658g';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Sensor Type')?.value).toBe('BSI CMOS');
  });

  it('should handle equals-separated key-value pairs', () => {
    const text = 'Camera\nSensor Type = Full-Frame\nWeight = 500g';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Sensor Type')?.value).toBe('Full-Frame');
  });

  it('should filter out noise lines', () => {
    const text =
      'Sony Camera\nAdd to Cart\nBuy Now\nSensor Type: CMOS\nFree Shipping\nWeight: 500g';
    const result = parseProductText(text, specsConfig);
    // Should not include "Add to Cart" or similar as key-value pairs
    expect(result.unmatchedPairs.every((p) => p.key !== 'Add to Cart')).toBe(true);
  });

  it('should skip values that start with http', () => {
    const text = 'Camera\nSensor Type: https://example.com\nWeight: 500g';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.has('Sensor Type')).toBe(false);
    expect(result.fields.get('Weight')?.value).toBe('500g');
  });

  it('should work with HTML input by cleaning first', () => {
    const text =
      '<table><tr><td>Sensor Type</td><td>CMOS</td></tr><tr><td>Weight</td><td>500g</td></tr></table>';
    const result = parseProductText(text, specsConfig);
    expect(result.fields.get('Sensor Type')?.value).toBe('CMOS');
    expect(result.fields.get('Weight')?.value).toBe('500g');
  });

  it('should handle price range detection', () => {
    const text = 'Camera priced at $1,999 – $2,499\nSensor Type: CMOS';
    const result = parseProductText(text, specsConfig);
    expect(result.purchasePrice).toBeTruthy();
    expect(result.priceNote).toContain('Range');
  });
});

// =============================================================================
// normalizeUnits
// =============================================================================

describe('normalizeUnits', () => {
  it('should return null for null/empty/non-string input', () => {
    expect(normalizeUnits(null)).toBeNull();
    expect(normalizeUnits('')).toBeNull();
    expect(normalizeUnits(42)).toBeNull();
  });

  it('should convert inches to mm (metric mode)', () => {
    const result = normalizeUnits('10 inches', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('mm');
    expect(parseFloat(result.normalized)).toBeCloseTo(254.0, 0);
  });

  it('should convert mm to inches (imperial mode)', () => {
    const result = normalizeUnits('100 mm', false);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('in');
    expect(parseFloat(result.normalized)).toBeCloseTo(3.94, 1);
  });

  it('should convert pounds to grams', () => {
    const result = normalizeUnits('2.5 lbs', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('g');
    expect(parseFloat(result.normalized)).toBeCloseTo(1134, -1);
  });

  it('should convert ounces to grams', () => {
    const result = normalizeUnits('16 oz', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('g');
    expect(parseFloat(result.normalized)).toBeCloseTo(453.6, 0);
  });

  it('should convert compound weight (lb + oz)', () => {
    const result = normalizeUnits('1 lb 5 oz', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('g');
    const grams = parseFloat(result.normalized);
    expect(grams).toBeGreaterThan(500);
    expect(grams).toBeLessThan(700);
  });

  it('should return kg for compound weights over 1000g', () => {
    const result = normalizeUnits('5 lb 8 oz', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('kg');
  });

  it('should convert dimension strings (inches to mm)', () => {
    const result = normalizeUnits('6.5 x 4.3 x 3.1 inches', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('mm');
    expect(result.normalized).toContain('×');
    expect(result.normalized).toContain('mm');
  });

  it('should convert dimension strings (mm to inches)', () => {
    const result = normalizeUnits('165 x 109 x 79 mm', false);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('in');
    expect(result.normalized).toContain('×');
    expect(result.normalized).toContain('in');
  });

  it('should convert Fahrenheit to Celsius', () => {
    const result = normalizeUnits('212°F', true);
    expect(result).not.toBeNull();
    expect(result.unit).toBe('°C');
    expect(parseFloat(result.normalized)).toBeCloseTo(100, 0);
  });

  it('should return null for values with no units to convert', () => {
    expect(normalizeUnits('Hello World')).toBeNull();
    expect(normalizeUnits('24.1 MP')).toBeNull();
    expect(normalizeUnits('f/2.8')).toBeNull();
  });

  it('should handle two-dimensional measurements', () => {
    const result = normalizeUnits('5 x 3 inches', true);
    expect(result).not.toBeNull();
    expect(result.normalized).toContain('×');
    expect(result.unit).toBe('mm');
  });

  it('should preserve original value in result', () => {
    const result = normalizeUnits('10 inches', true);
    expect(result.original).toBe('10 inches');
  });
});

// =============================================================================
// coerceFieldValue
// =============================================================================

describe('coerceFieldValue', () => {
  it('should return null for null/empty input', () => {
    expect(coerceFieldValue('Weight', null)).toBeNull();
    expect(coerceFieldValue('Weight', '')).toBeNull();
  });

  it('should coerce boolean "Yes" values', () => {
    expect(coerceFieldValue('Weather Sealing', 'yes').coerced).toBe('Yes');
    expect(coerceFieldValue('Weather Sealing', 'true').coerced).toBe('Yes');
    expect(coerceFieldValue('Weather Sealing', 'included').coerced).toBe('Yes');
    expect(coerceFieldValue('Weather Sealing', 'Built-in').coerced).toBe('Yes');
    expect(coerceFieldValue('Weather Sealing', '✓').coerced).toBe('Yes');
  });

  it('should coerce boolean "No" values', () => {
    expect(coerceFieldValue('Weather Sealing', 'no').coerced).toBe('No');
    expect(coerceFieldValue('Weather Sealing', 'false').coerced).toBe('No');
    expect(coerceFieldValue('Weather Sealing', 'Not included').coerced).toBe('No');
    expect(coerceFieldValue('Weather Sealing', 'N/A').coerced).toBe('No');
    expect(coerceFieldValue('Weather Sealing', '—').coerced).toBe('No');
  });

  it('should work with various boolean field names', () => {
    expect(coerceFieldValue('Touchscreen', 'yes').coerced).toBe('Yes');
    expect(coerceFieldValue('Image Stabilization', 'supported').coerced).toBe('Yes');
    expect(coerceFieldValue('Autofocus', 'equipped').coerced).toBe('Yes');
    expect(coerceFieldValue('HDR Recording', 'available').coerced).toBe('Yes');
  });

  it('should normalize CCT/color temperature ranges', () => {
    const result = coerceFieldValue('Color Temperature', '2700K-6500K');
    expect(result).not.toBeNull();
    expect(result.coerced).toBe('2700–6500 K');
  });

  it('should handle CCT with various separators', () => {
    expect(coerceFieldValue('CCT', '2700 to 6500').coerced).toBe('2700–6500 K');
    expect(coerceFieldValue('Color Temp Range', '3200K–5600K').coerced).toBe('3200–5600 K');
  });

  it('should add f/ prefix to bare aperture numbers', () => {
    const result = coerceFieldValue('Maximum Aperture', '2.8');
    expect(result).not.toBeNull();
    expect(result.coerced).toBe('f/2.8');
  });

  it('should not coerce aperture values that already have f/', () => {
    const result = coerceFieldValue('Maximum Aperture', 'f/2.8');
    expect(result).toBeNull();
  });

  it('should return null for non-boolean fields without applicable coercion', () => {
    expect(coerceFieldValue('Weight', '500g')).toBeNull();
    expect(coerceFieldValue('Dimensions', '100 x 50 x 30 mm')).toBeNull();
  });

  it('should preserve original value in result', () => {
    const result = coerceFieldValue('Touchscreen', 'true');
    expect(result.original).toBe('true');
  });
});

// =============================================================================
// buildApplyPayload
// =============================================================================

describe('buildApplyPayload', () => {
  const mockParseResult = {
    name: 'Sony A7 IV',
    brand: 'Sony',
    category: 'Cameras',
    purchasePrice: '2499',
    priceNote: '',
    serialNumber: 'SN12345',
    modelNumber: 'ILCE-7M4',
    fields: new Map([
      ['Sensor Type', { value: 'Full-Frame CMOS', confidence: 100 }],
      ['Weight', { value: '658g', confidence: 90 }],
      ['Weather Sealing', { value: 'yes', confidence: 85 }],
    ]),
  };

  it('should return basic info fields', () => {
    const payload = buildApplyPayload(mockParseResult, {});
    expect(payload.name).toBe('Sony A7 IV');
    expect(payload.brand).toBe('Sony');
    expect(payload.category).toBe('Cameras');
    expect(payload.purchasePrice).toBe('2499');
    expect(payload.serialNumber).toBe('SN12345');
    expect(payload.modelNumber).toBe('ILCE-7M4');
  });

  it('should include spec values', () => {
    const payload = buildApplyPayload(mockParseResult, {});
    expect(payload.specs['Sensor Type']).toBe('Full-Frame CMOS');
    expect(payload.specs['Weight']).toBe('658g');
  });

  it('should respect user-selected overrides', () => {
    const payload = buildApplyPayload(mockParseResult, { Weight: '700g' });
    expect(payload.specs['Weight']).toBe('700g');
    expect(payload.specs['Sensor Type']).toBe('Full-Frame CMOS');
  });

  it('should apply type coercion to boolean values', () => {
    const payload = buildApplyPayload(mockParseResult, {});
    expect(payload.specs['Weather Sealing']).toBe('Yes');
  });

  it('should apply unit normalization when normalizeMetric is true', () => {
    const parseResult = {
      ...mockParseResult,
      fields: new Map([
        ['Weight', { value: '2 lbs', confidence: 90 }],
        ['Sensor Type', { value: 'CMOS', confidence: 100 }],
      ]),
    };
    const payload = buildApplyPayload(parseResult, {}, { normalizeMetric: true });
    // 2 lbs should be converted to grams
    expect(payload.specs['Weight']).toMatch(/g$/);
    expect(payload.specs['Weight']).not.toContain('lbs');
  });

  it('should not apply normalization when normalizeMetric is false (default)', () => {
    const parseResult = {
      ...mockParseResult,
      fields: new Map([['Weight', { value: '2 lbs', confidence: 90 }]]),
    };
    const payload = buildApplyPayload(parseResult, {});
    expect(payload.specs['Weight']).toBe('2 lbs');
  });

  it('should include manually-mapped unmatched pairs', () => {
    const selectedValues = {
      _manualMappings: {
        'Sensor Type': 'APS-C',
        'Focal Length': '50mm',
      },
    };
    // Sensor Type already in fields, so manual mapping should not overwrite
    const payload = buildApplyPayload(mockParseResult, selectedValues);
    expect(payload.specs['Sensor Type']).toBe('Full-Frame CMOS'); // from fields, not manual
    expect(payload.specs['Focal Length']).toBe('50mm'); // from manual mapping
  });

  it('should apply normalization to manually-mapped values', () => {
    const selectedValues = {
      _manualMappings: {
        Weight: '3 lbs',
      },
    };
    const parseResult = { ...mockParseResult, fields: new Map() };
    const payload = buildApplyPayload(parseResult, selectedValues, { normalizeMetric: true });
    expect(payload.specs['Weight']).toMatch(/g$/);
  });

  it('should skip empty/whitespace values', () => {
    const parseResult = {
      ...mockParseResult,
      fields: new Map([
        ['Sensor Type', { value: '  ', confidence: 100 }],
        ['Weight', { value: '500g', confidence: 90 }],
      ]),
    };
    const payload = buildApplyPayload(parseResult, {});
    expect(payload.specs).not.toHaveProperty('Sensor Type');
    expect(payload.specs['Weight']).toBe('500g');
  });

  it('should handle empty parse result gracefully', () => {
    const emptyResult = {
      name: '',
      brand: '',
      category: '',
      purchasePrice: '',
      priceNote: '',
      serialNumber: '',
      modelNumber: '',
      fields: new Map(),
    };
    const payload = buildApplyPayload(emptyResult, {});
    expect(payload.name).toBe('');
    expect(Object.keys(payload.specs).length).toBe(0);
  });
});

// =============================================================================
// detectProductBoundaries
// =============================================================================

describe('detectProductBoundaries', () => {
  it('should return empty array for null/empty input', () => {
    expect(detectProductBoundaries(null)).toEqual([]);
    expect(detectProductBoundaries('')).toEqual([]);
  });

  it('should return empty array for single product text', () => {
    const text = 'Sensor Type: CMOS\nWeight: 500g\nISO Range: 100-51200';
    expect(detectProductBoundaries(text)).toEqual([]);
  });

  it('should detect products separated by horizontal rules', () => {
    const text =
      'Sony A7 IV\nSensor Type: Full-Frame CMOS\nWeight: 658g\n---\nCanon R6 II\nSensor Type: Full-Frame CMOS\nWeight: 680g';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
  });

  it('should detect products separated by markdown headings', () => {
    const text =
      '# Sony A7 IV\nSensor Type: Full-Frame\nWeight: 658g\n# Canon R6 II\nSensor Type: Full-Frame\nWeight: 680g';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
    expect(boundaries[0].name).toContain('Sony');
    expect(boundaries[1].name).toContain('Canon');
  });

  it('should detect products with "Product Name:" labels', () => {
    const text =
      'Product Name: Sony A7 IV\nSensor Type: CMOS\nWeight: 658g\nProduct Name: Canon R6\nSensor Type: CMOS\nWeight: 680g';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
  });

  it('should detect products by brand names after blank lines', () => {
    const text =
      'Sony A7 IV\nSensor Type: Full-Frame\nWeight: 658g\n\nCanon R6 Mark II\nSensor Type: Full-Frame\nWeight: 680g';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
  });

  it('should use full KNOWN_BRANDS list (bug fix verification)', () => {
    // Deity and Tentacle Sync were NOT in the old 17-brand hardcoded list
    const text =
      'Deity V-Mic D4 Duo\nType: Shotgun Microphone\nFrequency: 20Hz-20kHz\nWeight: 300g\n\nTentacle Sync E\nType: Timecode Generator\nBattery: 35 hours\nWeight: 45g';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
  });

  it('should store segment text and metadata', () => {
    const text =
      '# Product A\nSpec1: Value1\nSpec2: Value2\n# Product B\nSpec3: Value3\nSpec4: Value4';
    const boundaries = detectProductBoundaries(text);
    expect(boundaries.length).toBe(2);
    boundaries.forEach((b) => {
      expect(b).toHaveProperty('startLine');
      expect(b).toHaveProperty('endLine');
      expect(b).toHaveProperty('name');
      expect(b).toHaveProperty('text');
      expect(b.text.length).toBeGreaterThan(20);
    });
  });
});

// =============================================================================
// parseBatchProducts
// =============================================================================

describe('parseBatchProducts', () => {
  const specsConfig = {
    Cameras: [{ name: 'Sensor Type' }, { name: 'Weight' }],
  };

  it('should return single-element array for single product text', () => {
    const text = 'Camera\nSensor Type: CMOS\nWeight: 500g';
    const results = parseBatchProducts(text, specsConfig);
    expect(results.length).toBe(1);
    expect(results[0].result.fields.get('Sensor Type')?.value).toBe('CMOS');
  });

  it('should parse each segment independently for multi-product text', () => {
    const text =
      '# Sony A7 IV\nSensor Type: Full-Frame\nWeight: 658g\n# Canon R6\nSensor Type: Dual Pixel\nWeight: 680g';
    const results = parseBatchProducts(text, specsConfig);
    expect(results.length).toBe(2);
    expect(results[0].result.fields.get('Sensor Type')?.value).toBe('Full-Frame');
    expect(results[1].result.fields.get('Sensor Type')?.value).toBe('Dual Pixel');
  });

  it('should include segment metadata', () => {
    const text =
      '# Product 1\nSensor Type: A\nWeight: 100g\n# Product 2\nSensor Type: B\nWeight: 200g';
    const results = parseBatchProducts(text, specsConfig);
    results.forEach((r) => {
      expect(r.segment).toHaveProperty('name');
      expect(r.result).toHaveProperty('fields');
    });
  });
});

// =============================================================================
// diffSpecs
// =============================================================================

describe('diffSpecs', () => {
  it('should detect added fields', () => {
    const existing = {};
    const newFields = new Map([['Weight', { value: '500g', confidence: 90 }]]);
    const diff = diffSpecs(existing, newFields);
    expect(diff.length).toBe(1);
    expect(diff[0].status).toBe('added');
    expect(diff[0].specName).toBe('Weight');
    expect(diff[0].newValue).toBe('500g');
  });

  it('should detect removed fields', () => {
    const existing = { Weight: '500g' };
    const newFields = new Map();
    const diff = diffSpecs(existing, newFields);
    expect(diff.length).toBe(1);
    expect(diff[0].status).toBe('removed');
    expect(diff[0].oldValue).toBe('500g');
  });

  it('should detect changed fields', () => {
    const existing = { Weight: '500g' };
    const newFields = new Map([['Weight', { value: '658g', confidence: 90 }]]);
    const diff = diffSpecs(existing, newFields);
    expect(diff.length).toBe(1);
    expect(diff[0].status).toBe('changed');
    expect(diff[0].oldValue).toBe('500g');
    expect(diff[0].newValue).toBe('658g');
  });

  it('should detect unchanged fields', () => {
    const existing = { Weight: '500g' };
    const newFields = new Map([['Weight', { value: '500g', confidence: 90 }]]);
    const diff = diffSpecs(existing, newFields);
    expect(diff.length).toBe(1);
    expect(diff[0].status).toBe('unchanged');
  });

  it('should detect unchanged with case-insensitive comparison', () => {
    const existing = { 'Sensor Type': 'Full-Frame CMOS' };
    const newFields = new Map([['Sensor Type', { value: 'full-frame cmos', confidence: 100 }]]);
    const diff = diffSpecs(existing, newFields);
    expect(diff[0].status).toBe('unchanged');
  });

  it('should handle multiple fields of different statuses', () => {
    const existing = { Weight: '500g', 'Sensor Type': 'CMOS', 'Old Field': 'old' };
    const newFields = new Map([
      ['Weight', { value: '658g', confidence: 90 }], // changed
      ['Sensor Type', { value: 'CMOS', confidence: 100 }], // unchanged
      ['New Field', { value: 'new', confidence: 80 }], // added
    ]);
    const diff = diffSpecs(existing, newFields);
    expect(diff.length).toBe(4);
    expect(diff.some((d) => d.status === 'changed')).toBe(true);
    expect(diff.some((d) => d.status === 'unchanged')).toBe(true);
    expect(diff.some((d) => d.status === 'added')).toBe(true);
    expect(diff.some((d) => d.status === 'removed')).toBe(true);
  });

  it('should sort by status: changed → added → unchanged → removed', () => {
    const existing = { A: '1', B: '2', C: '3' };
    const newFields = new Map([
      ['A', { value: '1', confidence: 100 }], // unchanged
      ['B', { value: '99', confidence: 90 }], // changed
      ['D', { value: '4', confidence: 80 }], // added
    ]);
    const diff = diffSpecs(existing, newFields);
    expect(diff[0].status).toBe('changed');
    expect(diff[1].status).toBe('added');
    expect(diff[2].status).toBe('unchanged');
    expect(diff[3].status).toBe('removed');
  });

  it('should handle null/empty inputs gracefully', () => {
    expect(diffSpecs(null, null)).toEqual([]);
    expect(diffSpecs({}, new Map())).toEqual([]);
    expect(diffSpecs(null, new Map([['A', { value: '1' }]]))).toEqual([
      expect.objectContaining({ status: 'added', specName: 'A' }),
    ]);
  });

  it('should include confidence in results', () => {
    const newFields = new Map([['Weight', { value: '500g', confidence: 85 }]]);
    const diff = diffSpecs({}, newFields);
    expect(diff[0].confidence).toBe(85);
  });
});

// =============================================================================
// KNOWN_BRANDS (constants verification)
// =============================================================================

describe('KNOWN_BRANDS', () => {
  it('should contain a substantial number of brands', () => {
    expect(KNOWN_BRANDS.length).toBeGreaterThan(80);
  });

  it('should include major camera brands', () => {
    expect(KNOWN_BRANDS).toContain('Sony');
    expect(KNOWN_BRANDS).toContain('Canon');
    expect(KNOWN_BRANDS).toContain('Nikon');
    expect(KNOWN_BRANDS).toContain('Panasonic');
  });

  it('should include audio brands', () => {
    expect(KNOWN_BRANDS).toContain('Sennheiser');
    expect(KNOWN_BRANDS).toContain('Rode');
    expect(KNOWN_BRANDS).toContain('Shure');
  });

  it('should include lighting brands', () => {
    expect(KNOWN_BRANDS).toContain('Aputure');
    expect(KNOWN_BRANDS).toContain('Godox');
    expect(KNOWN_BRANDS).toContain('Profoto');
  });

  it('should include niche brands that were previously missing from batch detection', () => {
    // These were NOT in the old 17-brand hardcoded regex in batch parser
    expect(KNOWN_BRANDS).toContain('Deity');
    expect(KNOWN_BRANDS).toContain('Tentacle Sync');
    expect(KNOWN_BRANDS).toContain('Timecode Systems');
    expect(KNOWN_BRANDS).toContain('Schoeps');
    expect(KNOWN_BRANDS).toContain('Quasar Science');
  });
});

// =============================================================================
// CONFIDENCE constants
// =============================================================================

describe('CONFIDENCE thresholds', () => {
  it('should have named constants for all key thresholds', () => {
    expect(CONFIDENCE.DIRECT_MATCH).toBeDefined();
    expect(CONFIDENCE.ALIAS_EXPANSION).toBeDefined();
    expect(CONFIDENCE.CONTAINMENT_HIGH).toBeDefined();
    expect(CONFIDENCE.CONTAINMENT_LOW).toBeDefined();
    expect(CONFIDENCE.FUZZY_MINIMUM).toBeDefined();
    expect(CONFIDENCE.FUZZY_CAP).toBeDefined();
    expect(CONFIDENCE.COMMUNITY_BASE).toBeDefined();
    expect(CONFIDENCE.COMMUNITY_MAX).toBeDefined();
    expect(CONFIDENCE.CONFLICT_DIFF_THRESHOLD).toBeDefined();
    expect(CONFIDENCE.MERGE_RANGE).toBeDefined();
  });

  it('should have hierarchical ordering (alias expansion > direct match > containment > fuzzy)', () => {
    // ALIAS_EXPANSION is the score when abbreviation expansion produces an exact match
    // It scores higher than DIRECT_MATCH because it's more specific
    expect(CONFIDENCE.ALIAS_EXPANSION).toBeGreaterThanOrEqual(CONFIDENCE.DIRECT_MATCH);
    expect(CONFIDENCE.CONTAINMENT_HIGH).toBeGreaterThanOrEqual(CONFIDENCE.CONTAINMENT_LOW);
    expect(CONFIDENCE.CONTAINMENT_LOW).toBeGreaterThan(CONFIDENCE.FUZZY_MINIMUM);
    expect(CONFIDENCE.FUZZY_MINIMUM).toBeGreaterThan(0);
  });
});
