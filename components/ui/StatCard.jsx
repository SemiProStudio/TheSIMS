// ============================================================================
// StatCard - Dashboard statistic card
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography, borderRadius } from './shared.js';

export const StatCard = memo(function StatCard({ 
  label, 
  value, 
  icon: Icon,
  color = colors.primary,
  onClick,
  trend,
  trendUp,
}) {
  const isClickable = !!onClick;
  
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      style={{
        background: colors.bgLight,
        borderRadius: borderRadius.lg,
        padding: spacing[4],
        border: `1px solid ${colors.border}`,
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 150ms ease',
      }}
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: spacing[2],
      }}>
        <span style={{ 
          color: colors.textMuted, 
          fontSize: typography.fontSize.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: borderRadius.md,
              background: `color-mix(in srgb, ${color} 15%, transparent)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={16} color={color} aria-hidden="true" />
          </div>
        )}
      </div>
      <div style={{ 
        fontSize: typography.fontSize['2xl'],
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
      }}>
        {value}
      </div>
      {trend !== undefined && (
        <div style={{
          marginTop: spacing[1],
          fontSize: typography.fontSize.xs,
          color: trendUp ? colors.success : colors.danger,
        }}>
          {trendUp ? '↑' : '↓'} {trend}%
        </div>
      )}
    </div>
  );
});

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  onClick: PropTypes.func,
  trend: PropTypes.number,
  trendUp: PropTypes.bool,
};

export default StatCard;
