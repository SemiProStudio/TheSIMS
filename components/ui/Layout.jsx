// ============================================================================
// Layout Components - Grid, Flex, Divider
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing } from './shared.js';

// ============================================================================
// Grid - Simple grid layout
// ============================================================================

export const Grid = memo(function Grid({ 
  children, 
  columns = 2, 
  gap = 4,
  style: customStyle,
  ...props 
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: spacing[gap],
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

Grid.propTypes = {
  children: PropTypes.node,
  columns: PropTypes.number,
  gap: PropTypes.number,
  style: PropTypes.object,
};

// ============================================================================
// Flex - Flexbox container
// ============================================================================

export const Flex = memo(function Flex({ 
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'flex-start',
  gap = 0,
  wrap = false,
  style: customStyle,
  ...props 
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap: spacing[gap],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

Flex.propTypes = {
  children: PropTypes.node,
  direction: PropTypes.oneOf(['row', 'column', 'row-reverse', 'column-reverse']),
  align: PropTypes.oneOf(['flex-start', 'flex-end', 'center', 'stretch', 'baseline']),
  justify: PropTypes.oneOf(['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']),
  gap: PropTypes.number,
  wrap: PropTypes.bool,
  style: PropTypes.object,
};

// ============================================================================
// Divider - Horizontal divider line
// ============================================================================

export const Divider = memo(function Divider({ spacing: sp = 4 }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.border}`,
        margin: `${spacing[sp]}px 0`,
      }}
    />
  );
});

Divider.propTypes = {
  spacing: PropTypes.number,
};

export default { Grid, Flex, Divider };
