// ============================================================================
// BackButton - Consistent back navigation
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { colors, styles, spacing } from './shared.js';

export const BackButton = memo(function BackButton({ onClick, children = 'Back' }) {
  return (
    <button 
      onClick={onClick} 
      type="button"
      aria-label="Go back"
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
  onClick: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default BackButton;
