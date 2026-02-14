import React, { memo } from 'react';
import { colors, spacing } from '../../theme';

// ============================================================================
// CardHeader - Card header with title
// ============================================================================

interface CardHeaderProps {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader = memo<CardHeaderProps>(function CardHeader({
  title,
  icon: Icon,
  action,
  children
}) {
  return (
    <div
      style={{
        padding: `${spacing[4]}px`,
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
      }}
    >
      {Icon && <Icon size={16} color={colors.primary} />}
      <strong style={{ color: colors.textPrimary, flex: 1 }}>{title}</strong>
      {action}
      {children}
    </div>
  );
});

// ============================================================================
// CollapsibleSection - Card with collapsible content (click header to toggle)
// ============================================================================

// Helper to apply opacity to a color (supports hex, CSS variables, and rgb/rgba)
