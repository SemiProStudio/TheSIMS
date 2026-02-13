import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing } from '../../theme.js';

// ============================================================================
// Divider - Horizontal line
// ============================================================================

export const Divider = memo(function Divider({ spacing: sp = 4 }) {
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

Divider.propTypes = {
  /** Vertical spacing (theme spacing key) */
  spacing: PropTypes.number,
};
