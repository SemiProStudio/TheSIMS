// ============================================================================
// Smart Paste — Basic Info Row
// Read-only label + value row for basic item info
// ============================================================================

import { colors, spacing, typography, withOpacity } from '../../theme.js';

export function BasicInfoRow({ label, value }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 1fr',
        gap: spacing[2],
        padding: `${spacing[1]}px 0`,
        fontSize: typography.fontSize.sm,
      }}
    >
      <span style={{ fontWeight: 600, color: colors.textPrimary }}>{label}</span>
      <span
        style={{
          color: value ? colors.textSecondary : withOpacity(colors.textMuted, 40),
          fontStyle: value ? 'normal' : 'italic',
        }}
      >
        {value || 'Not detected'}
      </span>
    </div>
  );
}
