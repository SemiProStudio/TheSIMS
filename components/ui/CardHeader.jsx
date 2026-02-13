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
CardHeader.propTypes = {
  /** Header title */
  title: PropTypes.string.isRequired,
  /** Lucide icon component */
  icon: PropTypes.elementType,
  /** Action element(s) to render on the right */
  action: PropTypes.node,
};
