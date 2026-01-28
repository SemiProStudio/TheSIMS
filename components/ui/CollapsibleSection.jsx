// ============================================================================
// CollapsibleSection - Card with collapsible content
// ============================================================================

import React from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography, borderRadius } from './shared.js';

// Helper to apply opacity to a color (supports hex, CSS variables, and rgb/rgba)
const withAlpha = (color, alpha) => {
  if (!color) return color;
  
  // Already has alpha
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  
  // CSS variable - use color-mix()
  if (color.startsWith('var(')) {
    const percent = Math.round(alpha * 100);
    return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
  }
  
  // Hex color - convert to rgba
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const expandedHex = color.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expandedHex);
  if (!result) return color;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
};

export function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  collapsed,
  onToggleCollapse,
  action,
  children,
  padding = true,
  style,
  headerColor,
}) {
  const accentColor = headerColor || colors.primary;

  return (
    <div style={{
      background: withAlpha(accentColor, 0.18),
      borderRadius: borderRadius.lg,
      border: `1px solid ${withAlpha(accentColor, 0.35)}`,
      overflow: 'hidden',
      ...style,
    }}>
      {/* Header - clickable to toggle */}
      <div
        className="collapsible-header"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleCollapse?.();
          }
        }}
        style={{
          '--section-accent-color': accentColor,
          padding: `${spacing[3]}px ${spacing[4]}px`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          cursor: 'pointer',
          userSelect: 'none',
          background: collapsed ? withAlpha(accentColor, 0.30) : withAlpha(accentColor, 0.38),
          borderBottom: collapsed ? 'none' : `1px solid ${withAlpha(accentColor, 0.4)}`,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {Icon && <Icon size={16} color={accentColor} aria-hidden="true" />}
        <strong style={{ color: colors.textPrimary, flex: 1 }}>
          {title}
        </strong>
        {badge !== undefined && badge !== null && (
          <span style={{
            background: withAlpha(accentColor, 0.5),
            color: colors.textPrimary,
            padding: '2px 8px',
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
          }}>
            {badge}
          </span>
        )}
        {action && (
          <div onClick={e => e.stopPropagation()}>
            {action}
          </div>
        )}
        {/* Collapse indicator */}
        <svg 
          width={16} 
          height={16} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      
      {/* Content - shown when not collapsed */}
      {!collapsed && (
        <div style={{ 
          padding: padding ? spacing[4] : 0,
          background: withAlpha(accentColor, 0.30),
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

CollapsibleSection.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  action: PropTypes.node,
  children: PropTypes.node,
  padding: PropTypes.bool,
  style: PropTypes.object,
  headerColor: PropTypes.string,
};

export default CollapsibleSection;
