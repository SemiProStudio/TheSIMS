import { memo } from 'react';
import PropTypes from 'prop-types';
import { GripVertical } from 'lucide-react';
import { colors } from '../../theme.js';

export const DragHandle = memo(function DragHandle({ canDrag = true, size = 16 }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center',
      color: canDrag ? colors.textMuted : colors.borderLight,
      cursor: canDrag ? 'grab' : 'default',
    }}>
      <GripVertical size={size} />
    </div>
  );
});

DragHandle.propTypes = {
  /** Whether dragging is enabled */
  canDrag: PropTypes.bool,
  /** Icon size */
  size: PropTypes.number,
};
