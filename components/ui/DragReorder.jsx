// ============================================================================
// DragReorder - Components for drag-to-reorder functionality
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { GripVertical } from 'lucide-react';
import { colors } from './shared.js';

// ============================================================================
// DragHandle - Visual grip handle for draggable items
// ============================================================================

export const DragHandle = memo(function DragHandle({ canDrag = true, size = 16 }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: canDrag ? 'grab' : 'default',
        color: canDrag ? colors.textMuted : colors.textMuted,
        opacity: canDrag ? 1 : 0.3,
      }}
      aria-hidden="true"
    >
      <GripVertical size={size} />
    </span>
  );
});

DragHandle.propTypes = {
  canDrag: PropTypes.bool,
  size: PropTypes.number,
};
