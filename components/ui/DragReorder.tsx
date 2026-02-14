// ============================================================================
// DragReorder - Hook and components for drag-to-reorder functionality
// ============================================================================

import { memo, useState, useCallback, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import { colors, withOpacity } from './shared';

// ============================================================================
// useDragReorder - Hook for drag-to-reorder list functionality
// ============================================================================

export function useDragReorder(items, onReorder) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragNodeRef = useRef(null);

  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    onReorder(newItems);
    setDragOverIndex(null);
  }, [draggedIndex, items, onReorder]);

  const getDragProps = useCallback((index, canDrag = true) => {
    if (!canDrag) return {};
    return {
      draggable: true,
      onDragStart: (e) => handleDragStart(e, index),
      onDragEnd: handleDragEnd,
      onDragOver: (e) => handleDragOver(e, index),
      onDragLeave: handleDragLeave,
      onDrop: (e) => handleDrop(e, index),
    };
  }, [handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]);

  const getDragStyle = useCallback((index, canDrag = true) => ({
    background: dragOverIndex === index ? `${withOpacity(colors.primary, 0.2)}` : undefined,
    borderTop: dragOverIndex === index ? `2px solid ${colors.primary}` : '2px solid transparent',
    cursor: canDrag ? 'grab' : 'default',
    userSelect: 'none',
    transition: 'background 150ms ease',
  }), [dragOverIndex]);

  return {
    draggedIndex,
    dragOverIndex,
    getDragProps,
    getDragStyle,
  };
}

// ============================================================================
// DragHandle - Visual grip handle for draggable items
// ============================================================================

interface DragHandleProps {
  canDrag?: boolean;
  size?: number;
}

export const DragHandle = memo<DragHandleProps>(function DragHandle({ canDrag = true, size = 16 }) {
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

export default { useDragReorder, DragHandle };
