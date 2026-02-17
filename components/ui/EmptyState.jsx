import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, borderRadius, spacing, typography, withOpacity } from '../../theme.js';
import { Card } from './Card.jsx';

// ============================================================================
// EmptyState - No data placeholder
// ============================================================================

export const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card style={{ padding: spacing[12], textAlign: 'center' }}>
      {Icon && (
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            background: `${withOpacity(colors.primary, 20)}`,
            borderRadius: borderRadius['2xl'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={32} color={colors.primary} />
        </div>
      )}
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: typography.fontSize.lg,
          color: colors.textPrimary,
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ color: colors.textMuted, marginBottom: spacing[5] }}>{description}</p>
      )}
      {action}
    </Card>
  );
});

EmptyState.propTypes = {
  /** Lucide icon component */
  icon: PropTypes.elementType.isRequired,
  /** Title text */
  title: PropTypes.string.isRequired,
  /** Description text */
  description: PropTypes.string,
  /** Action button element */
  action: PropTypes.node,
};
