// ============================================================================
// Smart Paste — Diff View
// Spec diff comparison view (re-import mode)
// ============================================================================

import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';

const STATUS_LABELS = { changed: '~', added: '+', removed: '-', unchanged: '=' };

export function DiffView({ diffResults, onHideDiff: _onHideDiff }) {
  if (!diffResults) return null;

  return (
    <div
      style={{
        background: colors.bgLight,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        marginBottom: spacing[3],
      }}
    >
      <div
        style={{
          padding: `${spacing[2]}px ${spacing[3]}px`,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: typography.fontSize.xs,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
        }}
      >
        ⇄ Spec Changes ({diffResults.filter((d) => d.status !== 'unchanged').length} differences)
      </div>
      {diffResults.map(({ specName, status, oldValue, newValue }) => {
        const statusColors = {
          changed: colors.accent1 || '#facc15',
          added: colors.available || '#4ade80',
          removed: colors.danger || '#f87171',
          unchanged: withOpacity(colors.textMuted, 40),
        };
        if (status === 'unchanged') return null;
        return (
          <div
            key={specName}
            style={{
              padding: `${spacing[1]}px ${spacing[3]}px`,
              borderBottom: `1px solid ${withOpacity(colors.border, 20)}`,
              display: 'grid',
              gridTemplateColumns: '24px 1fr 1fr',
              gap: spacing[2],
              fontSize: typography.fontSize.xs,
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontWeight: 700,
                color: statusColors[status],
                fontFamily: 'monospace',
                textAlign: 'center',
              }}
            >
              {STATUS_LABELS[status]}
            </span>
            <div>
              <div style={{ fontWeight: 600, color: colors.textPrimary }}>{specName}</div>
              {oldValue && (
                <div
                  style={{
                    color: status === 'changed' ? colors.danger || '#f87171' : colors.textMuted,
                    textDecoration: status === 'changed' ? 'line-through' : 'none',
                  }}
                >
                  {oldValue}
                </div>
              )}
            </div>
            <div
              style={{
                color:
                  status === 'removed'
                    ? withOpacity(colors.textMuted, 40)
                    : colors.available || '#4ade80',
                fontWeight: status === 'added' ? 600 : 400,
              }}
            >
              {newValue || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
