// ============================================================================
// EmptyState - Placeholder for empty data states
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography, borderRadius } from './shared.js';
import { Card } from './Card.jsx';

export const EmptyState = memo(function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  action,
}) {
  return (
    <Card style={{ padding: spacing[12], textAlign: 'center' }}>
      {Icon && (
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            borderRadius: borderRadius.full,
            background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={28} color={colors.textMuted} aria-hidden="true" />
        </div>
      )}
      <h3 style={{ 
        margin: 0, 
        marginBottom: spacing[2], 
        color: colors.textPrimary,
        fontSize: typography.fontSize.lg,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ 
          margin: 0, 
          marginBottom: action ? spacing[4] : 0, 
          color: colors.textMuted,
          fontSize: typography.fontSize.sm,
        }}>
          {description}
        </p>
      )}
      {action}
    </Card>
  );
});

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.node,
};

export default EmptyState;
