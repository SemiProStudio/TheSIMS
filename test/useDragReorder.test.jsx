// =============================================================================
// useDragReorder Hook Tests
// Tests for the drag-to-reorder custom hook
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragReorder } from '../components/ui/useDragReorder.js';

// =============================================================================
// Helper: create a minimal drag event
// =============================================================================

function makeDragEvent(overrides = {}) {
  return {
    preventDefault: vi.fn(),
    target: { style: {} },
    dataTransfer: {
      effectAllowed: null,
      setData: vi.fn(),
    },
    ...overrides,
  };
}

// =============================================================================
// useDragReorder Tests
// =============================================================================

describe('useDragReorder', () => {
  const items = ['A', 'B', 'C', 'D'];
  const onReorder = vi.fn();

  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------

  it('should return initial state', () => {
    const { result } = renderHook(() => useDragReorder(items, onReorder));

    expect(result.current.draggedIndex).toBeNull();
    expect(result.current.dragOverIndex).toBeNull();
    expect(typeof result.current.getDragProps).toBe('function');
    expect(typeof result.current.getDragStyle).toBe('function');
  });

  // ---------------------------------------------------------------------------
  // getDragProps
  // ---------------------------------------------------------------------------

  describe('getDragProps', () => {
    it('should return drag handler props when canDrag is true', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const props = result.current.getDragProps(0);

      expect(props.draggable).toBe(true);
      expect(typeof props.onDragStart).toBe('function');
      expect(typeof props.onDragEnd).toBe('function');
      expect(typeof props.onDragOver).toBe('function');
      expect(typeof props.onDragLeave).toBe('function');
      expect(typeof props.onDrop).toBe('function');
    });

    it('should return empty object when canDrag is false', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const props = result.current.getDragProps(0, false);

      expect(props).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // getDragStyle
  // ---------------------------------------------------------------------------

  describe('getDragStyle', () => {
    it('should return default style when no drag in progress', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const style = result.current.getDragStyle(0);

      expect(style.cursor).toBe('grab');
      expect(style.userSelect).toBe('none');
      expect(style.background).toBeUndefined();
      expect(style.borderTop).toContain('transparent');
    });

    it('should return default cursor style when canDrag is false', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const style = result.current.getDragStyle(0, false);

      expect(style.cursor).toBe('default');
    });
  });

  // ---------------------------------------------------------------------------
  // Drag lifecycle: start → over → drop → end
  // ---------------------------------------------------------------------------

  describe('drag lifecycle', () => {
    it('should set draggedIndex on drag start', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const props = result.current.getDragProps(1);
      const event = makeDragEvent();

      act(() => {
        props.onDragStart(event);
      });

      expect(result.current.draggedIndex).toBe(1);
      expect(event.dataTransfer.effectAllowed).toBe('move');
      expect(event.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 1);
    });

    it('should set dragOverIndex on drag over a different index', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      // Start dragging item at index 0
      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });

      // Drag over index 2
      const overEvent = makeDragEvent();
      act(() => {
        result.current.getDragProps(2).onDragOver(overEvent);
      });

      expect(result.current.dragOverIndex).toBe(2);
      expect(overEvent.preventDefault).toHaveBeenCalled();
    });

    it('should NOT set dragOverIndex when hovering same index', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(1).onDragStart(makeDragEvent());
      });

      act(() => {
        result.current.getDragProps(1).onDragOver(makeDragEvent());
      });

      expect(result.current.dragOverIndex).toBeNull();
    });

    it('should clear dragOverIndex on drag leave', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });

      act(() => {
        result.current.getDragProps(2).onDragOver(makeDragEvent());
      });
      expect(result.current.dragOverIndex).toBe(2);

      act(() => {
        result.current.getDragProps(2).onDragLeave();
      });

      expect(result.current.dragOverIndex).toBeNull();
    });

    it('should reorder items on drop', () => {
      onReorder.mockClear();
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      // Drag item 0 ("A") and drop on index 2
      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });

      act(() => {
        result.current.getDragProps(2).onDrop(makeDragEvent());
      });

      expect(onReorder).toHaveBeenCalledTimes(1);
      // After moving A (index 0) to index 2: B, C, A, D
      expect(onReorder).toHaveBeenCalledWith(['B', 'C', 'A', 'D']);
    });

    it('should not reorder when dropping on same index', () => {
      onReorder.mockClear();
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(1).onDragStart(makeDragEvent());
      });

      act(() => {
        result.current.getDragProps(1).onDrop(makeDragEvent());
      });

      expect(onReorder).not.toHaveBeenCalled();
    });

    it('should not reorder when no drag started', () => {
      onReorder.mockClear();
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(2).onDrop(makeDragEvent());
      });

      expect(onReorder).not.toHaveBeenCalled();
    });

    it('should reset state on drag end', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });
      expect(result.current.draggedIndex).toBe(0);

      act(() => {
        result.current.getDragProps(0).onDragEnd();
      });

      expect(result.current.draggedIndex).toBeNull();
      expect(result.current.dragOverIndex).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Drag style during active drag
  // ---------------------------------------------------------------------------

  describe('getDragStyle during drag', () => {
    it('should highlight the drag-over target', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });
      act(() => {
        result.current.getDragProps(2).onDragOver(makeDragEvent());
      });

      const style = result.current.getDragStyle(2);
      expect(style.background).toBeTruthy();
      expect(style.borderTop).not.toContain('transparent');
    });

    it('should NOT highlight non-target indices', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      act(() => {
        result.current.getDragProps(0).onDragStart(makeDragEvent());
      });
      act(() => {
        result.current.getDragProps(2).onDragOver(makeDragEvent());
      });

      const style = result.current.getDragStyle(1);
      expect(style.background).toBeUndefined();
      expect(style.borderTop).toContain('transparent');
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle drag start without dataTransfer', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));
      const event = { target: { style: {} }, dataTransfer: null, preventDefault: vi.fn() };

      act(() => {
        result.current.getDragProps(0).onDragStart(event);
      });

      expect(result.current.draggedIndex).toBe(0);
    });

    it('should handle drag end when ref is already null', () => {
      const { result } = renderHook(() => useDragReorder(items, onReorder));

      // Drag end without a prior start should not throw
      act(() => {
        result.current.getDragProps(0).onDragEnd();
      });

      expect(result.current.draggedIndex).toBeNull();
    });
  });
});
