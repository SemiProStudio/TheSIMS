// ============================================================================
// Smart Paste — Control Bar
// Confidence mode, units toggle, and source view toggle
// ============================================================================

import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';

const CONFIDENCE_MODES = [
  { key: 'strict', label: 'Strict', desc: '≥85 — only high-confidence matches' },
  { key: 'balanced', label: 'Balanced', desc: '≥60 — recommended for most input' },
  { key: 'aggressive', label: 'Aggressive', desc: '≥50 — catch more at lower accuracy' },
];

export function ControlBar({
  confidenceMode,
  setConfidenceMode,
  normalizeMetric,
  setNormalizeMetric,
  showSourceView,
  setShowSourceView,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: spacing[1],
        marginBottom: spacing[3],
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: 600,
          color: colors.textMuted,
          marginRight: spacing[1],
        }}
      >
        Match Confidence:
      </span>
      {CONFIDENCE_MODES.map((mode) => {
        const isActive = confidenceMode === mode.key;
        return (
          <button
            key={mode.key}
            onClick={() => setConfidenceMode(mode.key)}
            title={mode.desc}
            style={{
              padding: `3px ${spacing[2]}px`,
              fontSize: typography.fontSize.xs,
              fontWeight: isActive ? 700 : 500,
              border: `1px solid ${isActive ? colors.primary : withOpacity(colors.border, 50)}`,
              borderRadius: borderRadius.sm,
              background: isActive ? withOpacity(colors.primary, 15) : 'transparent',
              color: isActive ? colors.primary : colors.textMuted,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {mode.label}
          </button>
        );
      })}

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Unit normalization toggle */}
      <button
        onClick={() => setNormalizeMetric((prev) => !prev)}
        title={normalizeMetric ? 'Showing metric conversions' : 'Unit normalization off'}
        style={{
          padding: `3px ${spacing[2]}px`,
          fontSize: typography.fontSize.xs,
          fontWeight: normalizeMetric ? 700 : 500,
          border: `1px solid ${normalizeMetric ? colors.primary : withOpacity(colors.border, 50)}`,
          borderRadius: borderRadius.sm,
          background: normalizeMetric ? withOpacity(colors.primary, 15) : 'transparent',
          color: normalizeMetric ? colors.primary : colors.textMuted,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        Units
      </button>

      {/* Source view toggle */}
      <button
        onClick={() => setShowSourceView((prev) => !prev)}
        title={showSourceView ? 'Hide source text' : 'Show source text alongside results'}
        style={{
          padding: `3px ${spacing[2]}px`,
          fontSize: typography.fontSize.xs,
          fontWeight: showSourceView ? 700 : 500,
          border: `1px solid ${showSourceView ? colors.primary : withOpacity(colors.border, 50)}`,
          borderRadius: borderRadius.sm,
          background: showSourceView ? withOpacity(colors.primary, 15) : 'transparent',
          color: showSourceView ? colors.primary : colors.textMuted,
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
        }}
      >
        ▥ Source
      </button>
    </div>
  );
}
