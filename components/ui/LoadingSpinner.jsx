// ============================================================================
// LoadingSpinner - Simple loading indicator
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors } from './shared.js';

export const LoadingSpinner = memo(function LoadingSpinner({ 
  size = 24, 
  color = colors.primary,
  className,
}) {
  return (
    <div 
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={className}
      style={{ 
        width: size, 
        height: size,
        display: 'inline-block',
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        style={{ 
          animation: 'spin 1s linear infinite',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="60"
          strokeDashoffset="20"
        />
      </svg>
    </div>
  );
});

LoadingSpinner.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
  className: PropTypes.string,
};

export default LoadingSpinner;
