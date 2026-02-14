import React, { memo } from 'react';
import { colors, borderRadius, spacing, typography, withOpacity } from '../../theme';
import { Card } from './Card';

// ============================================================================
// EmptyState - No data placeholder
// ============================================================================

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = memo<EmptyStateProps>(function EmptyState({
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
        <p style={{ color: colors.textMuted, marginBottom: spacing[5] }}>
          {description}
        </p>
      )}
      {action}
    </Card>
  );
});

