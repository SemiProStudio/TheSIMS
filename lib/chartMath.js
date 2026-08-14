// =============================================================================
// Chart math — pure geometry/scale helpers for components/charts.jsx
// No React, no DOM: everything here is unit-testable in isolation.
// =============================================================================

/**
 * Linear scale factory mapping [d0, d1] → [r0, r1].
 * A degenerate domain (d0 === d1) maps everything to r0 so callers never
 * divide by zero on single-point or all-equal series.
 */
export const linearScale = (d0, d1, r0, r1) => {
  const span = d1 - d0;
  if (span === 0) return () => r0;
  return (v) => r0 + ((v - d0) / span) * (r1 - r0);
};

/**
 * Round up to a "nice" axis maximum: 1/2/5 × 10^n at or above value.
 * niceMax(0) is 1 so empty charts still get a stable scale.
 */
export const niceMax = (value) => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = Math.floor(Math.log10(value));
  const base = 10 ** power;
  for (const mult of [1, 2, 5, 10]) {
    if (mult * base >= value) return mult * base;
  }
  return 10 * base;
};

/**
 * Stroke-dasharray donut segments. Returns one {length, offset, fraction}
 * per value, in order, for a circle of the given circumference. Zero and
 * negative values produce zero-length segments (skipped by the renderer);
 * an all-zero total returns fractions of 0 for every segment.
 */
export const donutSegments = (values, circumference) => {
  const total = values.reduce((sum, v) => sum + Math.max(0, v), 0);
  let cursor = 0;
  return values.map((v) => {
    const fraction = total > 0 ? Math.max(0, v) / total : 0;
    const length = fraction * circumference;
    const segment = { length, offset: cursor, fraction };
    cursor += length;
    return segment;
  });
};

/**
 * SVG path for a polyline through points [{x, y}]. Empty input → ''.
 */
export const buildLinePath = (points) => {
  if (!points || points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
};

/**
 * Closed area path under a line, down to baselineY. Empty input → ''.
 */
export const buildAreaPath = (points, baselineY) => {
  if (!points || points.length === 0) return '';
  const line = buildLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x},${baselineY} L${first.x},${baselineY} Z`;
};

/**
 * Evenly-spaced x positions for n points across [x0, x1]. A single point
 * sits centered so lone-bucket trends don't collapse to the left edge.
 */
export const spreadX = (n, x0, x1) => {
  if (n <= 0) return [];
  if (n === 1) return [(x0 + x1) / 2];
  const step = (x1 - x0) / (n - 1);
  return Array.from({ length: n }, (_, i) => x0 + i * step);
};

/**
 * Indices of x-axis labels to render so at most maxLabels appear, always
 * including the first and last. Guards dense series (365 daily buckets)
 * from unreadable label pileups.
 */
export const labelIndices = (count, maxLabels) => {
  if (count <= 0) return [];
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i);
  const step = Math.ceil((count - 1) / (maxLabels - 1));
  const indices = [];
  for (let i = 0; i < count; i += step) indices.push(i);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
};
