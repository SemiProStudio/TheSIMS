import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing } from '../../theme.js';

// ============================================================================
// CardHeader - Card header with title
// ============================================================================

export const CardHeader = memo(function CardHeader({ 
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
// Uses CSS color-mix() for CSS variables, converts hex to rgba for hex colors
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

CardHeader.propTypes = {
  /** Header title */
  title: PropTypes.string.isRequired,
  /** Lucide icon component */
  icon: PropTypes.elementType,
  /** Action element(s) to render on the right */
  action: PropTypes.node,
};
