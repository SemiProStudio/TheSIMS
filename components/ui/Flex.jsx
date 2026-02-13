import { memo } from 'react';
import PropTypes from 'prop-types';
import { spacing } from '../../theme.js';

// ============================================================================
// Flex - Flexbox container
// ============================================================================

export const Flex = memo(function Flex({ 
  children, 
  direction = 'row',
  align = 'center',
  justify = 'flex-start',
  gap = 2,
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
  /** Flex content */
  children: PropTypes.node.isRequired,
  /** Flex direction */
  direction: PropTypes.oneOf(['row', 'column']),
  /** Align items */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch']),
  /** Justify content */
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around']),
  /** Gap between items */
  gap: PropTypes.number,
  /** Allow wrapping */
  wrap: PropTypes.bool,
};
