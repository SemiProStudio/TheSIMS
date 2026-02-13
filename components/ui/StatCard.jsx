import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, borderRadius, spacing, typography } from '../../theme.js';

// ============================================================================
// StatCard - Dashboard statistic card
// ============================================================================

export const StatCard = memo(function StatCard({ 
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

StatCard.propTypes = {
  /** Lucide icon component */
  icon: PropTypes.elementType.isRequired,
  /** Stat label */
  label: PropTypes.string.isRequired,
  /** Stat value */
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  /** Icon and accent color */
  color: PropTypes.string,
  /** Click handler */
  onClick: PropTypes.func,
  /** Trend indicator: 'up' or 'down' */
  trend: PropTypes.oneOf(['up', 'down']),
  /** Trend percentage value */
  trendValue: PropTypes.string,
};
