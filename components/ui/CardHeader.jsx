// ============================================================================
// CardHeader - Header section for cards with icon and actions
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing } from './shared.js';

export const CardHeader = memo(function CardHeader({ 
  title, 
  icon: Icon,
  action,
  children 
}) {
  return (
    <div
      style={{
        padding: spacing[4],
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
      }}
    >
      {Icon && <Icon size={16} color={colors.primary} aria-hidden="true" />}
      <strong style={{ color: colors.textPrimary, flex: 1 }}>{title}</strong>
      {action}
      {children}
    </div>
  );
});

CardHeader.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  action: PropTypes.node,
  children: PropTypes.node,
};

export default CardHeader;
