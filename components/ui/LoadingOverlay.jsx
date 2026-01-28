// ============================================================================
// LoadingOverlay - Full-screen or container loading state
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from './shared.js';
import { LoadingSpinner } from './LoadingSpinner.jsx';

export const LoadingOverlay = memo(function LoadingOverlay({ 
  message = 'Loading...',
  fullScreen = false,
}) {
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  } : {
    position: 'absolute',
    inset: 0,
    background: `color-mix(in srgb, ${colors.bgDark} 80%, transparent)`,
  };

  return (
    <div 
      role="status"
      aria-live="polite"
      aria-label={message}
      style={{
        ...containerStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[3],
      }}
    >
      <LoadingSpinner size={32} />
      <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
        {message}
      </span>
    </div>
  );
});

LoadingOverlay.propTypes = {
  message: PropTypes.string,
  fullScreen: PropTypes.bool,
};

export default LoadingOverlay;
