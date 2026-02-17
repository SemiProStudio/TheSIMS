// ============================================================================
// Smart Paste — Confidence Badge
// Displays confidence level indicator (Direct/Likely/Fuzzy)
// ============================================================================

import { colors, withOpacity } from '../../theme.js';

export function ConfidenceBadge({ confidence }) {
  let color, label;
  if (confidence >= 85) {
    color = colors.available || '#4ade80';
    label = 'Direct';
  } else if (confidence >= 60) {
    color = colors.accent1 || '#facc15';
    label = 'Likely';
  } else {
    color = colors.textMuted;
    label = 'Fuzzy';
  }

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 4,
        background: `${withOpacity(color, 20)}`,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}
