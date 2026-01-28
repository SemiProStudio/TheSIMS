// =============================================================================
// VirtualizedList Component Tests
// Tests for virtualization, scroll handling, and performance
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { 
  VirtualizedList, 
  VirtualizedGrid, 
  useVirtualization,
  InfiniteLoader 
} from '../components/VirtualizedList.jsx';
import { renderHook, act } from '@testing-library/react';

// =============================================================================
// Test Data
// =============================================================================

const generateItems = (count) => 
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    value: i * 100,
  }));

const defaultRenderItem = (item, index) => (
  <div data-testid={`item-${index}`}>
    {item.name}
  </div>
);

// =============================================================================
// VirtualizedList Tests
// =============================================================================

describe('VirtualizedList', () => {
  describe('Rendering', () => {
    it('should render visible items only', () => {
      const items = generateItems(100);
      
      render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
        />
      );
      
      // With 200px height and 50px items, should show ~4 items + overscan
      // Should NOT render all 100 items
      const renderedItems = screen.getAllByTestId(/^item-/);
      expect(renderedItems.length).toBeLessThan(20);
      expect(renderedItems.length).toBeGreaterThan(0);
    });

    it('should render empty message when no items', () => {
      render(
        <VirtualizedList
          items={[]}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          emptyMessage="No items found"
        />
      );
      
      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      const items = generateItems(10);
      
      render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
        />
      );
      
      expect(screen.getByRole('list')).toHaveAttribute('aria-rowcount', '10');
    });

    it('should render items with correct position', () => {
      const items = generateItems(10);
      
      const { container } = render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
        />
      );
      
      const firstItem = container.querySelector('[role="listitem"]');
      expect(firstItem).toHaveStyle({ top: '0px', height: '50px' });
    });
  });

  describe('Scrolling', () => {
    it('should update visible items on scroll', () => {
      const items = generateItems(100);
      
      const { container } = render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          overscan={1}
        />
      );
      
      const scrollContainer = container.querySelector('[role="list"]');
      
      // Initially should show first few items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      
      // Scroll down
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } });
      
      // After scrolling, item 0 should not be visible but items around index 10 should be
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    });

    it('should call onScroll callback', () => {
      const items = generateItems(100);
      const onScroll = vi.fn();
      
      const { container } = render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          onScroll={onScroll}
        />
      );
      
      const scrollContainer = container.querySelector('[role="list"]');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 100 } });
      
      expect(onScroll).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollTop: expect.any(Number),
        })
      );
    });
  });

  describe('Overscan', () => {
    it('should render extra items based on overscan value', () => {
      const items = generateItems(100);
      
      // With overscan=0
      const { container: container1 } = render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          overscan={0}
        />
      );
      
      const itemsWithNoOverscan = container1.querySelectorAll('[role="listitem"]').length;
      
      // With overscan=5
      const { container: container2 } = render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          overscan={5}
        />
      );
      
      const itemsWithOverscan = container2.querySelectorAll('[role="listitem"]').length;
      
      expect(itemsWithOverscan).toBeGreaterThan(itemsWithNoOverscan);
    });
  });

  describe('Custom Keys', () => {
    it('should use getItemKey for unique keys', () => {
      const items = generateItems(10);
      const getItemKey = (item) => item.id;
      
      render(
        <VirtualizedList
          items={items}
          renderItem={defaultRenderItem}
          itemHeight={50}
          containerHeight={200}
          getItemKey={getItemKey}
        />
      );
      
      // Component should render without key warnings
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should only re-render visible items on scroll', () => {
      const renderCount = vi.fn();
      const items = generateItems(1000);
      
      const TrackedRenderItem = (item, index) => {
        renderCount(index);
        return <div data-testid={`item-${index}`}>{item.name}</div>;
      };
      
      const { container } = render(
        <VirtualizedList
          items={items}
          renderItem={TrackedRenderItem}
          itemHeight={50}
          containerHeight={200}
          overscan={2}
        />
      );
      
      // Should NOT have rendered all 1000 items
      expect(renderCount.mock.calls.length).toBeLessThan(50);
    });
  });
});

// =============================================================================
// VirtualizedGrid Tests
// =============================================================================

describe('VirtualizedGrid', () => {
  describe('Rendering', () => {
    it('should calculate correct number of columns', () => {
      const items = generateItems(20);
      
      const { container } = render(
        <VirtualizedGrid
          items={items}
          renderItem={defaultRenderItem}
          itemWidth={100}
          itemHeight={100}
          containerWidth={350}
          containerHeight={300}
          gap={16}
        />
      );
      
      // 350px width with 100px items and 16px gap = 3 columns
      expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-colcount', '3');
    });

    it('should position items in grid layout', () => {
      const items = generateItems(10);
      
      const { container } = render(
        <VirtualizedGrid
          items={items}
          renderItem={defaultRenderItem}
          itemWidth={100}
          itemHeight={100}
          containerWidth={350}
          containerHeight={300}
          gap={16}
        />
      );
      
      const gridCells = container.querySelectorAll('[role="gridcell"]');
      expect(gridCells.length).toBeGreaterThan(0);
    });

    it('should render empty message when no items', () => {
      render(
        <VirtualizedGrid
          items={[]}
          renderItem={defaultRenderItem}
          itemWidth={100}
          itemHeight={100}
          containerWidth={350}
          containerHeight={300}
          emptyMessage="No grid items"
        />
      );
      
      expect(screen.getByText('No grid items')).toBeInTheDocument();
    });
  });

  describe('ARIA Attributes', () => {
    it('should have correct grid ARIA attributes', () => {
      const items = generateItems(10);
      
      render(
        <VirtualizedGrid
          items={items}
          renderItem={defaultRenderItem}
          itemWidth={100}
          itemHeight={100}
          containerWidth={350}
          containerHeight={300}
        />
      );
      
      const grid = screen.getByRole('grid');
      expect(grid).toHaveAttribute('aria-rowcount');
      expect(grid).toHaveAttribute('aria-colcount');
    });

    it('should have correct gridcell attributes', () => {
      const items = generateItems(10);
      
      const { container } = render(
        <VirtualizedGrid
          items={items}
          renderItem={defaultRenderItem}
          itemWidth={100}
          itemHeight={100}
          containerWidth={350}
          containerHeight={300}
        />
      );
      
      const firstCell = container.querySelector('[role="gridcell"]');
      expect(firstCell).toHaveAttribute('aria-rowindex');
      expect(firstCell).toHaveAttribute('aria-colindex');
    });
  });
});

// =============================================================================
// useVirtualization Hook Tests
// =============================================================================

describe('useVirtualization', () => {
  it('should calculate visible range correctly', () => {
    const { result } = renderHook(() => 
      useVirtualization({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 200,
        overscan: 2,
      })
    );
    
    expect(result.current.visibleRange.startIndex).toBe(0);
    expect(result.current.visibleRange.endIndex).toBeGreaterThan(0);
    expect(result.current.visibleRange.endIndex).toBeLessThan(20);
  });

  it('should calculate total height', () => {
    const { result } = renderHook(() => 
      useVirtualization({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 200,
      })
    );
    
    expect(result.current.totalHeight).toBe(5000); // 100 * 50
  });

  it('should provide getItemStyle function', () => {
    const { result } = renderHook(() => 
      useVirtualization({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 200,
      })
    );
    
    const style = result.current.getItemStyle(5);
    expect(style).toEqual({
      position: 'absolute',
      top: 250, // 5 * 50
      left: 0,
      right: 0,
      height: 50,
    });
  });

  it('should detect item visibility', () => {
    const { result } = renderHook(() => 
      useVirtualization({
        totalItems: 100,
        itemHeight: 50,
        containerHeight: 200,
        overscan: 2,
      })
    );
    
    expect(result.current.isItemVisible(0)).toBe(true);
    expect(result.current.isItemVisible(50)).toBe(false);
  });
});

// =============================================================================
// InfiniteLoader Tests
// =============================================================================

describe('InfiniteLoader', () => {
  it('should render children', () => {
    const loadMore = vi.fn();
    
    render(
      <InfiniteLoader
        loadMore={loadMore}
        hasMore={true}
        isLoading={false}
      >
        <div data-testid="content">Content</div>
      </InfiniteLoader>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('should show loading component when loading', () => {
    const loadMore = vi.fn();
    
    render(
      <InfiniteLoader
        loadMore={loadMore}
        hasMore={true}
        isLoading={true}
        loadingComponent={<div data-testid="loading">Loading...</div>}
      >
        <div>Content</div>
      </InfiniteLoader>
    );
    
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should not show loading when not loading', () => {
    const loadMore = vi.fn();
    
    render(
      <InfiniteLoader
        loadMore={loadMore}
        hasMore={true}
        isLoading={false}
        loadingComponent={<div data-testid="loading">Loading...</div>}
      >
        <div>Content</div>
      </InfiniteLoader>
    );
    
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
  });

  it('should not call loadMore when already loading', () => {
    const loadMore = vi.fn();
    
    const { container } = render(
      <InfiniteLoader
        loadMore={loadMore}
        hasMore={true}
        isLoading={true}
        threshold={100}
      >
        <div style={{ height: 500 }}>Content</div>
      </InfiniteLoader>
    );
    
    // Simulate scroll near bottom
    fireEvent.scroll(container.firstChild, {
      target: {
        scrollTop: 400,
        scrollHeight: 500,
        clientHeight: 100,
      },
    });
    
    expect(loadMore).not.toHaveBeenCalled();
  });

  it('should not call loadMore when no more items', () => {
    const loadMore = vi.fn();
    
    const { container } = render(
      <InfiniteLoader
        loadMore={loadMore}
        hasMore={false}
        isLoading={false}
        threshold={100}
      >
        <div style={{ height: 500 }}>Content</div>
      </InfiniteLoader>
    );
    
    fireEvent.scroll(container.firstChild, {
      target: {
        scrollTop: 400,
        scrollHeight: 500,
        clientHeight: 100,
      },
    });
    
    expect(loadMore).not.toHaveBeenCalled();
  });
});
