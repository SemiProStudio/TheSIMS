// =============================================================================
// VirtualList Component Tests
// Tests for virtualization functionality
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { VirtualList, VirtualGrid, useVirtualization } from '../components/VirtualList.jsx';
import { renderHook, act } from '@testing-library/react';

// =============================================================================
// Test Data
// =============================================================================

const createItems = (count) => 
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    value: i,
  }));

// =============================================================================
// VirtualList Tests
// =============================================================================

describe('VirtualList', () => {
  const defaultProps = {
    items: createItems(1000),
    itemHeight: 50,
    height: 400,
    renderItem: (item) => (
      <div data-testid={`item-${item.id}`}>{item.name}</div>
    ),
    getItemKey: (item) => item.id,
  };

  it('should render without crashing', () => {
    render(<VirtualList {...defaultProps} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('should render visible items only', () => {
    render(<VirtualList {...defaultProps} />);
    
    // With height=400 and itemHeight=50, about 8 items visible + overscan
    // Should NOT render all 1000 items
    const allItems = screen.queryAllByTestId(/^item-item-/);
    expect(allItems.length).toBeLessThan(100);
    expect(allItems.length).toBeGreaterThan(5);
  });

  it('should render first items at top', () => {
    render(<VirtualList {...defaultProps} />);
    
    expect(screen.getByTestId('item-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-item-1')).toBeInTheDocument();
  });

  it('should show empty message when items is empty', () => {
    render(
      <VirtualList 
        {...defaultProps} 
        items={[]} 
        emptyMessage="No data available"
      />
    );
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should have correct aria attributes', () => {
    render(<VirtualList {...defaultProps} />);
    
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-rowcount', '1000');
  });

  it('should apply custom className', () => {
    render(<VirtualList {...defaultProps} className="custom-class" />);
    
    const list = screen.getByRole('list');
    expect(list).toHaveClass('custom-class');
  });

  it('should apply custom style', () => {
    render(
    const { container } = render(
      <VirtualList 
        {...defaultProps} 
        style={{ backgroundColor: 'red' }}
      />
    );
    
    expect(container.firstChild).toHaveStyle({ backgroundColor: 'red' });
  });

  it('should handle scroll events', () => {
    const onScroll = vi.fn();
    render(<VirtualList {...defaultProps} onScroll={onScroll} />);
    
    const list = screen.getByRole('list');
    fireEvent.scroll(list, { target: { scrollTop: 500 } });
    
    expect(onScroll).toHaveBeenCalled();
  });

  it('should use getItemKey for keys', () => {
    const getItemKey = vi.fn((item) => item.id);
    render(<VirtualList {...defaultProps} getItemKey={getItemKey} />);
    
    expect(getItemKey).toHaveBeenCalled();
  });

  it('should handle overscan correctly', () => {
    render(<VirtualList {...defaultProps} overscan={5} />);
    
    const items = screen.queryAllByTestId(/^item-item-/);
    // With overscan=5, should render more items
    expect(items.length).toBeGreaterThan(8);
  });

  it('should pass style to renderItem', () => {
    const renderItem = vi.fn((item, index, style) => (
      <div style={style}>{item.name}</div>
    ));
    
    render(<VirtualList {...defaultProps} renderItem={renderItem} />);
    
    expect(renderItem).toHaveBeenCalled();
    const [, , style] = renderItem.mock.calls[0];
    expect(style).toHaveProperty('position', 'absolute');
    expect(style).toHaveProperty('height', 50);
  });

  it('should handle width as number', () => {
    render(<VirtualList {...defaultProps} width={500} />);
    
    const list = screen.getByRole('list');
    expect(list).toHaveStyle({ width: '500px' });
  });

  it('should handle width as string', () => {
    render(<VirtualList {...defaultProps} width="100%" />);
    
    const list = screen.getByRole('list');
    expect(list).toHaveStyle({ width: '100%' });
  });
});

// =============================================================================
// VirtualGrid Tests
// =============================================================================

describe('VirtualGrid', () => {
  const defaultProps = {
    items: createItems(100),
    itemHeight: 200,
    itemWidth: 250,
    height: 600,
    gap: 16,
    renderItem: (item) => (
      <div data-testid={`grid-${item.id}`}>{item.name}</div>
    ),
    getItemKey: (item) => item.id,
  };

  // Mock ResizeObserver
  beforeEach(() => {
    global.ResizeObserver = class MockResizeObserver {
      constructor(callback) {
        this._callback = callback;
        this.observe = vi.fn((element) => {
          callback([{ contentRect: { width: 800 } }]);
        });
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
      }
    };
  });

  afterEach(() => {
    delete global.ResizeObserver;
  });

  it('should render without crashing', () => {
    render(<VirtualGrid {...defaultProps} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('should render visible items in grid layout', () => {
    render(<VirtualGrid {...defaultProps} />);
    
    // Should render some items
    const items = screen.queryAllByTestId(/^grid-item-/);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(100);
  });

  it('should show empty message when items is empty', () => {
    render(
      <VirtualGrid 
        {...defaultProps} 
        items={[]} 
        emptyMessage="Grid is empty"
      />
    );
    
    expect(screen.getByText('Grid is empty')).toBeInTheDocument();
  });

  it('should have correct aria attributes', () => {
    render(<VirtualGrid {...defaultProps} />);
    
    const grid = screen.getByRole('grid');
    expect(grid).toHaveAttribute('aria-rowcount');
    expect(grid).toHaveAttribute('aria-colcount');
  });

  it('should handle scroll events', () => {
    const onScroll = vi.fn();
    render(<VirtualGrid {...defaultProps} onScroll={onScroll} />);
    
    const grid = screen.getByRole('grid');
    fireEvent.scroll(grid, { target: { scrollTop: 200 } });
    
    expect(onScroll).toHaveBeenCalled();
  });
});

// =============================================================================
// useVirtualization Hook Tests
// =============================================================================

describe('useVirtualization', () => {
  it('should calculate visible range correctly', () => {
    const { result } = renderHook(() => useVirtualization({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 400,
      overscan: 3,
    }));
    
    expect(result.current.totalHeight).toBe(50000);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBeGreaterThan(0);
  });

  it('should update on scroll', () => {
    const { result } = renderHook(() => useVirtualization({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 400,
      overscan: 3,
    }));
    
    const initialStartIndex = result.current.startIndex;
    
    // Simulate scroll
    act(() => {
      result.current.handleScroll({ target: { scrollTop: 500 } });
    });
    
    // After scrolling, start index should change
    expect(result.current.scrollTop).toBe(500);
  });

  it('should provide correct item styles', () => {
    const { result } = renderHook(() => useVirtualization({
      itemCount: 100,
      itemHeight: 50,
      containerHeight: 400,
    }));
    
    const style = result.current.getItemStyle(5);
    
    expect(style).toEqual({
      position: 'absolute',
      top: 250, // 5 * 50
      left: 0,
      right: 0,
      height: 50,
    });
  });

  it('should handle empty list', () => {
    const { result } = renderHook(() => useVirtualization({
      itemCount: 0,
      itemHeight: 50,
      containerHeight: 400,
    }));
    
    expect(result.current.totalHeight).toBe(0);
    expect(result.current.startIndex).toBe(0);
    expect(result.current.endIndex).toBe(-1);
  });

  it('should respect overscan setting', () => {
    const { result: result1 } = renderHook(() => useVirtualization({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 400,
      overscan: 0,
    }));
    
    const { result: result2 } = renderHook(() => useVirtualization({
      itemCount: 1000,
      itemHeight: 50,
      containerHeight: 400,
      overscan: 10,
    }));
    
    // More overscan = more visible items
    expect(result2.current.visibleCount).toBeGreaterThan(result1.current.visibleCount);
  });
});

// =============================================================================
// Performance Tests
// =============================================================================

describe('VirtualList Performance', () => {
  it('should handle large datasets efficiently', () => {
    const largeItems = createItems(100000);
    const startTime = performance.now();
    
    render(
      <VirtualList
        items={largeItems}
        itemHeight={50}
        height={400}
        renderItem={(item) => <div>{item.name}</div>}
      />
    );
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render quickly even with 100k items
    expect(renderTime).toBeLessThan(1000); // Less than 1 second
  });

  it('should not re-render all items on scroll', () => {
    const renderItem = vi.fn((item) => <div>{item.name}</div>);
    
    render(
      <VirtualList
        items={createItems(1000)}
        itemHeight={50}
        height={400}
        renderItem={renderItem}
      />
    );
    
    const initialCallCount = renderItem.mock.calls.length;
    
    // Scroll a small amount
    const list = screen.getByRole('list');
    fireEvent.scroll(list, { target: { scrollTop: 100 } });
    
    // Should only render a few new items, not all
    const newCallCount = renderItem.mock.calls.length - initialCallCount;
    expect(newCallCount).toBeLessThan(20);
  });
});

// =============================================================================
// Accessibility Tests
// =============================================================================

describe('VirtualList Accessibility', () => {
  const props = {
    items: createItems(100),
    itemHeight: 50,
    height: 400,
    renderItem: (item) => <div>{item.name}</div>,
  };

  it('should have list role', () => {
    render(<VirtualList {...props} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('should have listitem roles for items', () => {
    render(<VirtualList {...props} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
  });

  it('should have aria-rowindex on items', () => {
    render(<VirtualList {...props} />);
    const items = screen.getAllByRole('listitem');
    
    items.forEach(item => {
      expect(item).toHaveAttribute('aria-rowindex');
    });
  });

  it('should have aria-rowcount on list', () => {
    render(<VirtualList {...props} />);
    expect(screen.getByRole('list')).toHaveAttribute('aria-rowcount', '100');
  });
});
