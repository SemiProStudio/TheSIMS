import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from '../../theme.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';

// ============================================================================
// LoadingOverlay - Full-screen or container loading state
// ============================================================================

export const LoadingOverlay = memo(function LoadingOverlay({ 
  message = 'Loading...',
  fullScreen = false,
}) {
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  } : {
    position: 'absolute',
    inset: 0,
    background: `${colors.bgDark}cc`,
  };

  return (
    <div style={{
      ...containerStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[3],
    }}>
      <LoadingSpinner size={32} />
      <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
        {message}
      </span>
    </div>
  );
});

LoadingOverlay.propTypes = {
  /** Loading text */
  text: PropTypes.string,
  /** Show as inline rather than overlay */
  inline: PropTypes.bool,
};
