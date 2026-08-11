// =============================================================================
// Label Sheet Export — Test Suite
// Pins the Cricut Print-Then-Cut sheet geometry (6.75" × 9.25" at 300 DPI),
// the grid math per format, and the SVG structure (transparent background,
// flat labels, XHTML namespace) that Design Space contour-cutting relies on.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  computeSheetLayout,
  buildLabelSheetSVGs,
  CRICUT_PRINT_AREA,
  LABEL_GAP_IN,
  SHEET_DPI,
} from '../components/labelSheet.jsx';
import { LABEL_FORMATS } from '../constants.js';

const fmt = (id) => LABEL_FORMATS.find((f) => f.id === id);
const QR = 'data:image/png;base64,TESTQR';

const item = (id) => ({ id, name: `Item ${id}`, brand: 'Brand' });

describe('computeSheetLayout', () => {
  it.each([
    ['small', 5, 7, 35], // 1x1
    ['medium', 3, 7, 21], // 2x1
    ['large', 2, 4, 8], // 3x2
    ['brandingText', 2, 3, 6], // 3x2.5
  ])('%s fits %ix%i = %i per sheet', (id, cols, rows, perSheet) => {
    const layout = computeSheetLayout(fmt(id));
    expect(layout.cols).toBe(cols);
    expect(layout.rows).toBe(rows);
    expect(layout.perSheet).toBe(perSheet);
  });

  it('grid always fits inside the Cricut print area with the gap honored', () => {
    for (const format of LABEL_FORMATS) {
      const { cols, rows, labelW, labelH, offsetX, offsetY } = computeSheetLayout(format);
      const usedW = cols * labelW + (cols - 1) * LABEL_GAP_IN;
      const usedH = rows * labelH + (rows - 1) * LABEL_GAP_IN;
      expect(usedW).toBeLessThanOrEqual(CRICUT_PRINT_AREA.width);
      expect(usedH).toBeLessThanOrEqual(CRICUT_PRINT_AREA.height);
      expect(offsetX).toBeGreaterThanOrEqual(0);
      expect(offsetY).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('buildLabelSheetSVGs', () => {
  it('produces 300-DPI sheets of the Cricut Print-Then-Cut size', async () => {
    const { width, height, svgs } = await buildLabelSheetSVGs({
      items: [item('A1')],
      format: fmt('medium'),
      qrDataURLs: [QR],
    });
    expect(width).toBe(2025); // 6.75in * 300
    expect(height).toBe(2775); // 9.25in * 300
    expect(svgs[0]).toContain('width="2025"');
    expect(svgs[0]).toContain('height="2775"');
  });

  it('splits overflow onto additional sheets', async () => {
    const items = Array.from({ length: 25 }, (_, i) => item(`IT${i}`));
    const { svgs, perSheet } = await buildLabelSheetSVGs({
      items,
      format: fmt('medium'),
      qrDataURLs: items.map(() => QR),
    });
    expect(perSheet).toBe(21);
    expect(svgs).toHaveLength(2);
    expect(svgs[0].match(/position:absolute/g)).toHaveLength(21);
    expect(svgs[1].match(/position:absolute/g)).toHaveLength(4);
  });

  it('keeps the background transparent and the labels flat (no shadow)', async () => {
    const { svgs } = await buildLabelSheetSVGs({
      items: [item('A1')],
      format: fmt('medium'),
      qrDataURLs: [QR],
    });
    expect(svgs[0]).not.toContain('<rect'); // no background fill
    expect(svgs[0]).not.toContain('box-shadow:0'); // flat labels
    expect(svgs[0]).toContain('xmlns="http://www.w3.org/1999/xhtml"'); // valid foreignObject
    expect(svgs[0]).toContain(QR);
  });

  it('renders label content at 300ppi (labels scale up from the 96ppi baseline)', async () => {
    const { svgs } = await buildLabelSheetSVGs({
      items: [item('A1')],
      format: fmt('medium'),
      qrDataURLs: [QR],
    });
    // 2in-wide medium label at 300ppi = 600px
    expect(svgs[0]).toContain('width:600px');
  });

  it('escapes malicious item data inside the sheet markup', async () => {
    const { svgs } = await buildLabelSheetSVGs({
      items: [{ id: 'X1', name: '<script>alert(1)</script>', brand: 'B' }],
      format: fmt('medium'),
      qrDataURLs: [QR],
    });
    expect(svgs[0]).not.toContain('<script>');
    expect(svgs[0]).toContain('&lt;script&gt;');
  });
});

describe('sheet DPI constant', () => {
  it('is 300 (what the E2E PNG-dimension assertions and Design Space sizing assume)', () => {
    expect(SHEET_DPI).toBe(300);
  });
});
