// =============================================================================
// Chart math — geometry/scale helpers behind components/charts.jsx
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  linearScale,
  niceMax,
  donutSegments,
  buildLinePath,
  buildAreaPath,
  spreadX,
  labelIndices,
} from '../lib/chartMath.js';

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const y = linearScale(0, 10, 0, 100);
    expect(y(0)).toBe(0);
    expect(y(5)).toBe(50);
    expect(y(10)).toBe(100);
  });

  it('supports inverted ranges (SVG y-down)', () => {
    const y = linearScale(0, 10, 100, 0);
    expect(y(0)).toBe(100);
    expect(y(10)).toBe(0);
  });

  it('degenerate domain maps everything to r0 instead of dividing by zero', () => {
    const y = linearScale(5, 5, 0, 100);
    expect(y(5)).toBe(0);
    expect(y(999)).toBe(0);
  });
});

describe('niceMax', () => {
  it('rounds up to 1/2/5 × 10^n', () => {
    expect(niceMax(3)).toBe(5);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(11)).toBe(20);
    expect(niceMax(42)).toBe(50);
    expect(niceMax(180)).toBe(200);
    expect(niceMax(700)).toBe(1000);
  });

  it('exact nice values stay put', () => {
    expect(niceMax(10)).toBe(10);
    expect(niceMax(50)).toBe(50);
  });

  it('zero, negative, and non-finite values fall back to 1 for a stable axis', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(-5)).toBe(1);
    expect(niceMax(NaN)).toBe(1);
    expect(niceMax(Infinity)).toBe(1);
  });
});

describe('donutSegments', () => {
  it('splits the circumference proportionally with running offsets', () => {
    const segs = donutSegments([1, 1, 2], 100);
    expect(segs[0]).toEqual({ length: 25, offset: 0, fraction: 0.25 });
    expect(segs[1]).toEqual({ length: 25, offset: 25, fraction: 0.25 });
    expect(segs[2]).toEqual({ length: 50, offset: 50, fraction: 0.5 });
  });

  it('a single value fills the whole ring', () => {
    const [seg] = donutSegments([7], 100);
    expect(seg.length).toBe(100);
    expect(seg.fraction).toBe(1);
  });

  it('all-zero totals produce zero-length segments, not NaN', () => {
    const segs = donutSegments([0, 0], 100);
    segs.forEach((s) => {
      expect(s.length).toBe(0);
      expect(s.fraction).toBe(0);
    });
  });

  it('negative values are clamped to zero', () => {
    const segs = donutSegments([-5, 10], 100);
    expect(segs[0].length).toBe(0);
    expect(segs[1].length).toBe(100);
  });
});

describe('line/area paths', () => {
  it('builds a move-then-line path', () => {
    expect(
      buildLinePath([
        { x: 0, y: 10 },
        { x: 5, y: 20 },
      ]),
    ).toBe('M0,10 L5,20');
  });

  it('area path closes down to the baseline', () => {
    const d = buildAreaPath(
      [
        { x: 0, y: 10 },
        { x: 5, y: 20 },
      ],
      50,
    );
    expect(d).toBe('M0,10 L5,20 L5,50 L0,50 Z');
  });

  it('empty input yields empty paths', () => {
    expect(buildLinePath([])).toBe('');
    expect(buildAreaPath([], 50)).toBe('');
  });
});

describe('spreadX', () => {
  it('spaces n points evenly across the range', () => {
    expect(spreadX(3, 0, 100)).toEqual([0, 50, 100]);
  });

  it('a single point sits centered', () => {
    expect(spreadX(1, 0, 100)).toEqual([50]);
  });

  it('zero points yields an empty array', () => {
    expect(spreadX(0, 0, 100)).toEqual([]);
  });
});

describe('labelIndices', () => {
  it('shows every label when under the cap', () => {
    expect(labelIndices(5, 7)).toEqual([0, 1, 2, 3, 4]);
  });

  it('always includes the first and last index when thinning', () => {
    const indices = labelIndices(365, 7);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(364);
    expect(indices.length).toBeLessThanOrEqual(8);
  });

  it('empty series yields no labels', () => {
    expect(labelIndices(0, 7)).toEqual([]);
  });
});
