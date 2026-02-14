import React, { memo } from 'react';
import { colors, spacing, typography } from '../../theme';
import { BackButton } from './BackButton';

// ============================================================================
// PageHeader - Consistent page title with optional subtitle and actions
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backButton?: boolean;
  onBack?: (...args: any[]) => any;
  backLabel?: string;
}

export const PageHeader = memo<PageHeaderProps>(function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  onBack,
  backLabel = 'Back',
}) {
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
        {action}
      </div>
    </>
  );
});

