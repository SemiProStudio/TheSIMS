import React, { memo } from 'react';
import { colors, borderRadius, spacing, typography } from '../../theme';

// ============================================================================
// StatCard - Dashboard statistic card
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
  onClick?: (...args: any[]) => any;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export const StatCard = memo<StatCardProps>(function StatCard({
  icon: Icon,
  value,
  label,
  color = colors.primary,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: spacing[5],
        textAlign: 'center',
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border}`,
        background: colors.bgLight,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...(onClick && { cursor: 'pointer' }),
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          background: colors.bgMedium,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {Icon && <Icon size={24} color={color} />}
      </div>
      <div
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: color,
          marginBottom: spacing[1],
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: typography.fontSize.xs,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
});

