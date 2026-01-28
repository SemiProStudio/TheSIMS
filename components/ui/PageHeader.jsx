// ============================================================================
// PageHeader - Consistent page title with optional subtitle and actions
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from './shared.js';
import { BackButton } from './BackButton.jsx';

export const PageHeader = memo(function PageHeader({ 
  title, 
  subtitle,
  actions, 
  action, // alias for actions (backward compat)
  backButton,
  onBack,
  backLabel = 'Back',
}) {
  const actionContent = actions || action;
  
  return (
    <>
      {(backButton || onBack) && (
        <BackButton onClick={onBack}>{backLabel}</BackButton>
      )}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: spacing[5] 
      }}>
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>{title}</h2>
          {subtitle && (
            <p style={{ 
              margin: `${spacing[1]}px 0 0`, 
              color: colors.textMuted, 
              fontSize: typography.fontSize.sm 
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {actionContent}
      </div>
    </>
  );
});

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  action: PropTypes.node,
  backButton: PropTypes.bool,
  onBack: PropTypes.func,
  backLabel: PropTypes.string,
};

export default PageHeader;
