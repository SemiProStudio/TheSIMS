// ============================================================================
// Smart Paste — Unmatched Pairs
// Extracted but unmatched key-value pairs with manual mapping dropdowns
// ============================================================================

import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { colors, styles, spacing, typography, withOpacity } from '../../theme.js';

export function UnmatchedPairs({
  unmatchedPairs,
  manualMappings,
  onManualMapping,
  unmappedSpecOptions,
  showUnmatched,
  setShowUnmatched,
}) {
  if (!unmatchedPairs || unmatchedPairs.length === 0) return null;

  return (
    <div
      style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderTop: `1px solid ${colors.border}`,
      }}
    >
      <button
        onClick={() => setShowUnmatched(!showUnmatched)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: colors.textMuted,
          fontSize: typography.fontSize.xs,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
          padding: `${spacing[1]}px 0`,
          fontWeight: 600,
        }}
      >
        <AlertCircle size={12} />
        {showUnmatched ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {unmatchedPairs.length} extracted but not matched
        {Object.keys(manualMappings).length > 0 && (
          <span
            style={{
              marginLeft: 6,
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: 4,
              background: withOpacity(colors.primary, 15),
              color: colors.primary,
            }}
          >
            {Object.keys(manualMappings).length} mapped
          </span>
        )}
      </button>
      {showUnmatched && (
        <div
          style={{
            marginTop: spacing[2],
            fontSize: typography.fontSize.sm,
            color: colors.textMuted,
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: withOpacity(colors.textMuted, 60),
              marginBottom: spacing[2],
              fontStyle: 'italic',
            }}
          >
            Use the dropdowns to manually assign unmatched pairs to spec fields.
          </div>
          {unmatchedPairs.map((pair, i) => {
            const mappedTo = manualMappings[i];
            return (
              <div
                key={i}
                style={{
                  padding: `4px 0`,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.2fr 1fr',
                  gap: spacing[2],
                  alignItems: 'center',
                  borderBottom: `1px solid ${withOpacity(colors.border, 20)}`,
                }}
              >
                <span style={{ fontWeight: 600, color: colors.textSecondary }}>{pair.key}</span>
                <span style={{ color: withOpacity(colors.textMuted, 70) }}>{pair.value}</span>
                <select
                  value={mappedTo || ''}
                  onChange={(e) => onManualMapping(i, e.target.value, pair.value)}
                  style={{
                    ...styles.select,
                    fontSize: typography.fontSize.xs,
                    padding: `2px ${spacing[1]}px`,
                    paddingRight: `${spacing[5]}px`,
                    minHeight: 'auto',
                    color: mappedTo ? colors.primary : colors.textMuted,
                  }}
                >
                  <option value="">— Assign to field —</option>
                  {unmappedSpecOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
