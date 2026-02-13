import { memo } from 'react';
import PropTypes from 'prop-types';
import { spacing } from '../../theme.js';

// ============================================================================
// Grid - Responsive grid layout
// ============================================================================

export const Grid = memo(function Grid({ 
  children, 
  columns = 'auto-fill',
  minWidth = 180,
  gap = 4,
  style: customStyle,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(${minWidth}px, 1fr))`,
        gap: spacing[gap],
        ...customStyle,
      }}
    >
      {children}
    </div>
  );
});

Grid.propTypes = {
  /** Grid content */
  children: PropTypes.node.isRequired,
  /** Minimum column width */
  minWidth: PropTypes.number,
  /** Gap between items */
  gap: PropTypes.number,
};
