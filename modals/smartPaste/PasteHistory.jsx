// ============================================================================
// Smart Paste — Paste History
// Session storage-backed recent imports list
// ============================================================================

import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';

export function PasteHistory({ pasteHistory, onRestore }) {
  if (!pasteHistory || pasteHistory.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: spacing[2],
        padding: `${spacing[2]}px ${spacing[3]}px`,
        background: withOpacity(colors.bgMedium, 50),
        borderRadius: borderRadius.md,
        border: `1px solid ${withOpacity(colors.border, 30)}`,
      }}
    >
      <div
        style={{
          fontSize: typography.fontSize.xs,
          fontWeight: 600,
          color: colors.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
          marginBottom: spacing[1],
        }}
      >
        🕐 Recent Imports
      </div>
      {pasteHistory.map((entry, i) => (
        <button
          key={i}
          onClick={() => onRestore(entry)}
          style={{
            display: 'flex',
            width: '100%',
            textAlign: 'left',
            padding: `${spacing[1]}px ${spacing[2]}px`,
            border: 'none',
            borderRadius: borderRadius.sm,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: typography.fontSize.xs,
            color: colors.textSecondary,
            gap: spacing[2],
            alignItems: 'center',
          }}
        >
          <span
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {entry.name}
          </span>
          <span style={{ color: colors.primary, fontWeight: 600, flexShrink: 0 }}>
            {entry.matchedCount} fields
          </span>
          <span style={{ color: withOpacity(colors.textMuted, 50), flexShrink: 0 }}>
            {new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </button>
      ))}
    </div>
  );
}
