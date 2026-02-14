import { memo } from 'react';
import { GripVertical } from 'lucide-react';
import { colors } from '../../theme';

interface DragHandleProps {
  canDrag?: boolean;
  size?: number;
}

export const DragHandle = memo<DragHandleProps>(function DragHandle({ canDrag = true, size = 16 }) {
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

