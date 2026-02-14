import { memo } from 'react';
import { colors, spacing } from '../../theme';

// ============================================================================
// Divider - Horizontal line
// ============================================================================

interface DividerProps {
  spacing?: number;
}

export const Divider = memo<DividerProps>(function Divider({ spacing: sp = 4 }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.borderLight}`,
        margin: `${spacing[sp]}px 0`,
      }}
    />
  );
});

