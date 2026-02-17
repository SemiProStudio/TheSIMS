import { memo } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { colors, styles, spacing } from '../../theme.js';

// ============================================================================
// BackButton - Consistent back navigation
// ============================================================================

export const BackButton = memo(function BackButton({ onClick, children = 'Back' }) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={`Go back: ${children}`}
      style={{
        ...styles.btnSec,
        marginBottom: spacing[4],
        border: 'none',
        background: 'none',
        padding: 0,
        color: colors.textSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        cursor: 'pointer',
      }}
    >
      <ArrowLeft size={18} aria-hidden="true" /> {children}
    </button>
  );
});

BackButton.propTypes = {
  /** Click handler */
  onClick: PropTypes.func.isRequired,
  /** Button text */
  children: PropTypes.node,
};
