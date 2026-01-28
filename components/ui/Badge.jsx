// ============================================================================
// Badge - Status indicator pill
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography, borderRadius } from './shared.js';

export const Badge = memo(function Badge({ text, children, color = colors.primary, size = 'sm' }) {
  const content = children || text;
  const isSmall = size === 'sm';
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: isSmall ? `2px ${spacing[2]}px` : `${spacing[1]}px ${spacing[3]}px`,
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
        color: color,
        borderRadius: borderRadius.full,
        fontSize: isSmall ? typography.fontSize.xs : typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        whiteSpace: 'nowrap',
      }}
    >
      {content}
    </span>
  );
});

Badge.propTypes = {
  text: PropTypes.string,
  children: PropTypes.node,
  color: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md']),
};

export default Badge;
