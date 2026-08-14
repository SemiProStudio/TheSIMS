// =============================================================================
// Chart primitives — hand-rolled, theme-native, dependency-free
// All colors come from theme tokens (CSS variables), so every chart follows
// the active theme automatically and prints cleanly. Geometry lives in
// lib/chartMath.js so the math is unit-testable without rendering.
// =============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import {
  linearScale,
  niceMax,
  donutSegments,
  buildLinePath,
  buildAreaPath,
  spreadX,
  labelIndices,
} from '../lib/chartMath.js';

const defaultFormat = (v) => String(v);

// =============================================================================
// DonutChart — composition of a whole (status mix, alert severity)
// =============================================================================

export const DonutChart = memo(function DonutChart({
  data,
  size = 132,
  thickness = 16,
  centerLabel,
  centerValue,
  ariaLabel,
  formatValue = defaultFormat,
  legend = true,
}) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const segments = donutSegments(
    data.map((d) => d.value),
    circumference,
  );
  const summary =
    ariaLabel ||
    `${centerLabel || 'Breakdown'}: ${data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4], flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={summary}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.borderLight}
            strokeWidth={thickness}
          />
          {total > 0 &&
            data.map((d, i) =>
              segments[i].length > 0 ? (
                <circle
                  key={`${i}-${d.label}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${segments[i].length} ${circumference - segments[i].length}`}
                  strokeDashoffset={-segments[i].offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${d.label}: ${formatValue(d.value)}`}</title>
                </circle>
              ) : null,
            )}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.bold,
              color: colors.textPrimary,
              lineHeight: 1.1,
            }}
          >
            {centerValue !== undefined ? centerValue : total === 0 ? '—' : formatValue(total)}
          </div>
          {centerLabel && (
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
              {centerLabel}
            </div>
          )}
        </div>
      </div>
      {legend && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1], minWidth: 120 }}>
          {data.map((d, i) => (
            <div
              key={`${i}-${d.label}`}
              style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: d.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {d.label}
              </span>
              <span
                style={{
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.textPrimary,
                }}
              >
                {formatValue(d.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

DonutChart.propTypes = {
  /** Segments: label + value + theme color */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string.isRequired,
    }),
  ).isRequired,
  size: PropTypes.number,
  thickness: PropTypes.number,
  /** Small caption under the center value */
  centerLabel: PropTypes.string,
  /** Overrides the computed total in the center */
  centerValue: PropTypes.node,
  ariaLabel: PropTypes.string,
  formatValue: PropTypes.func,
  legend: PropTypes.bool,
};

// =============================================================================
// HBarChart — labeled horizontal bars (rankings, per-category values)
// HTML-based: text truncation and fluid widths beat SVG here.
// =============================================================================

export const HBarChart = memo(function HBarChart({
  data,
  formatValue = defaultFormat,
  ariaLabel,
  barHeight = 12,
}) {
  const max = Math.max(0, ...data.map((d) => Math.max(d.value, d.secondaryValue || 0)));
  return (
    <div
      role="img"
      aria-label={
        ariaLabel || data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')
      }
    >
      {data.map((d, i) => (
        <div key={`${i}-${d.label}`} style={{ marginBottom: spacing[3] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: spacing[2],
              marginBottom: spacing[1],
            }}
          >
            <span
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: colors.textPrimary,
                flexShrink: 0,
              }}
            >
              {formatValue(d.value)}
              {d.secondaryValue !== undefined && (
                <span style={{ color: colors.textMuted, fontWeight: typography.fontWeight.normal }}>
                  {' '}
                  / {formatValue(d.secondaryValue)}
                </span>
              )}
            </span>
          </div>
          <div
            style={{
              height: barHeight,
              background: colors.borderLight,
              borderRadius: borderRadius.full,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: max > 0 ? `${(Math.max(0, d.value) / max) * 100}%` : '0%',
                background: d.color || colors.primary,
                borderRadius: borderRadius.full,
              }}
            />
          </div>
          {d.secondaryValue !== undefined && (
            <div
              style={{
                height: barHeight / 2,
                background: colors.borderLight,
                borderRadius: borderRadius.full,
                overflow: 'hidden',
                marginTop: 2,
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: max > 0 ? `${(Math.max(0, d.secondaryValue) / max) * 100}%` : '0%',
                  background: d.secondaryColor || colors.textMuted,
                  borderRadius: borderRadius.full,
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

HBarChart.propTypes = {
  /** Bars: primary value, optional secondary (paired) value drawn beneath */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
      secondaryValue: PropTypes.number,
      secondaryColor: PropTypes.string,
    }),
  ).isRequired,
  formatValue: PropTypes.func,
  ariaLabel: PropTypes.string,
  barHeight: PropTypes.number,
};

// =============================================================================
// ColumnChart — vertical columns (day-of-week, monthly costs, histograms)
// =============================================================================

const VIEW_W = 600;
const VIEW_H = 170;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

export const ColumnChart = memo(function ColumnChart({
  data,
  color = colors.primary,
  formatValue = defaultFormat,
  ariaLabel,
  maxXLabels = 13,
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const y = linearScale(0, max, VIEW_H - PAD_BOTTOM, PAD_TOP);
  const slot = VIEW_W / Math.max(1, data.length);
  const barW = Math.min(56, slot * 0.6);
  const shown = new Set(labelIndices(data.length, maxXLabels));

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={
        ariaLabel || data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')
      }
    >
      <line
        x1={0}
        y1={VIEW_H - PAD_BOTTOM}
        x2={VIEW_W}
        y2={VIEW_H - PAD_BOTTOM}
        stroke={colors.borderLight}
        strokeWidth={1}
      />
      <line x1={0} y1={PAD_TOP} x2={VIEW_W} y2={PAD_TOP} stroke={colors.borderLight} strokeWidth={1} strokeDasharray="4 4" />
      <text x={4} y={PAD_TOP - 3} fontSize={11} fill={colors.textMuted}>
        {formatValue(max)}
      </text>
      {data.map((d, i) => {
        const cx = slot * i + slot / 2;
        const top = y(Math.max(0, d.value));
        return (
          <g key={`${i}-${d.label}`}>
            <rect
              x={cx - barW / 2}
              y={top}
              width={barW}
              height={Math.max(0, VIEW_H - PAD_BOTTOM - top)}
              rx={3}
              fill={color}
            >
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
            {shown.has(i) && (
              <text
                x={cx}
                y={VIEW_H - PAD_BOTTOM + 16}
                fontSize={11}
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
});

ColumnChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  color: PropTypes.string,
  formatValue: PropTypes.func,
  ariaLabel: PropTypes.string,
  /** Cap on x-axis labels; first and last always render */
  maxXLabels: PropTypes.number,
};

// =============================================================================
// TrendChart — area + line over ordered buckets (activity, costs, growth)
// =============================================================================

export const TrendChart = memo(function TrendChart({
  data,
  color = colors.primary,
  formatValue = defaultFormat,
  ariaLabel,
  maxXLabels = 7,
  showPoints,
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const y = linearScale(0, max, VIEW_H - PAD_BOTTOM, PAD_TOP);
  const xs = spreadX(data.length, 8, VIEW_W - 8);
  const points = data.map((d, i) => ({ x: xs[i], y: y(Math.max(0, d.value)) }));
  const shown = new Set(labelIndices(data.length, maxXLabels));
  const drawPoints = showPoints !== undefined ? showPoints : data.length <= 31;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={
        ariaLabel || data.map((d) => `${d.label} ${formatValue(d.value)}`).join(', ')
      }
    >
      <line
        x1={0}
        y1={VIEW_H - PAD_BOTTOM}
        x2={VIEW_W}
        y2={VIEW_H - PAD_BOTTOM}
        stroke={colors.borderLight}
        strokeWidth={1}
      />
      <line x1={0} y1={PAD_TOP} x2={VIEW_W} y2={PAD_TOP} stroke={colors.borderLight} strokeWidth={1} strokeDasharray="4 4" />
      <text x={4} y={PAD_TOP - 3} fontSize={11} fill={colors.textMuted}>
        {formatValue(max)}
      </text>
      {points.length > 0 && (
        <>
          <path
            d={buildAreaPath(points, VIEW_H - PAD_BOTTOM)}
            fill={color}
            opacity={0.15}
          />
          <path d={buildLinePath(points)} fill="none" stroke={color} strokeWidth={2} />
        </>
      )}
      {drawPoints &&
        points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={color}>
            <title>{`${data[i].label}: ${formatValue(data[i].value)}`}</title>
          </circle>
        ))}
      {data.map((d, i) =>
        shown.has(i) ? (
          <text
            key={`${i}-${d.label}`}
            x={xs[i]}
            y={VIEW_H - PAD_BOTTOM + 16}
            fontSize={11}
            fill={colors.textMuted}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
          >
            {d.label}
          </text>
        ) : null,
      )}
    </svg>
  );
});

TrendChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
    }),
  ).isRequired,
  color: PropTypes.string,
  formatValue: PropTypes.func,
  ariaLabel: PropTypes.string,
  maxXLabels: PropTypes.number,
  /** Force point markers on/off; defaults to on for ≤31 buckets */
  showPoints: PropTypes.bool,
};

// =============================================================================
// Sparkline — tiny inline trend for hub cards
// =============================================================================

export const Sparkline = memo(function Sparkline({ data, color = colors.primary, ariaLabel }) {
  const W = 120;
  const H = 32;
  const max = Math.max(1, ...data);
  const y = linearScale(0, max, H - 2, 2);
  const xs = spreadX(data.length, 2, W - 2);
  const points = data.map((v, i) => ({ x: xs[i], y: y(Math.max(0, v)) }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={ariaLabel || `Trend: ${data.join(', ')}`}
    >
      {points.length > 1 && (
        <>
          <path d={buildAreaPath(points, H - 1)} fill={color} opacity={0.15} />
          <path d={buildLinePath(points)} fill="none" stroke={color} strokeWidth={1.5} />
        </>
      )}
      {points.length === 1 && <circle cx={points[0].x} cy={points[0].y} r={2} fill={color} />}
    </svg>
  );
});

Sparkline.propTypes = {
  /** Ordered numeric series, oldest first */
  data: PropTypes.arrayOf(PropTypes.number).isRequired,
  color: PropTypes.string,
  ariaLabel: PropTypes.string,
};
