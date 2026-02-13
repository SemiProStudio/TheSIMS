import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, borderRadius, typography, withOpacity } from '../../theme.js';

// ============================================================================
// Badge - Status/category indicator
// ============================================================================

export const Badge = memo(function Badge({ text, children, color = colors.primary, size = 'sm' }) {
  const sizes = {
    xs: { padding: '2px 5px', fontSize: '9px' },
    sm: { padding: '3px 8px', fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '11px' },
  };

  const content = text || children;
  
  // Don't render if no content
  if (!content) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: withOpacity(color, 25),
        color: color,
        borderRadius: borderRadius.full,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        ...sizes[size],
      }}
    >
      {content}
    </span>
  );
});

Badge.propTypes = {
  /** Badge text (deprecated, use children) */
  text: PropTypes.string,
  /** Badge content */
  children: PropTypes.node,
  /** Badge color */
  color: PropTypes.string,
  /** Badge size: 'xs', 'sm', 'md' */
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
};
