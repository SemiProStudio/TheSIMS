import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, withOpacity } from '../../theme.js';

// ============================================================================
// LoadingSpinner - Loading indicator
// ============================================================================

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 24, 
  color = colors.primary,
  style: customStyle 
}) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${withOpacity(color, 30)}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      ...customStyle,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

LoadingSpinner.propTypes = {
  /** Spinner size in pixels */
  size: PropTypes.number,
  /** Spinner color */
  color: PropTypes.string,
};
