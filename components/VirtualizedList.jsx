// =============================================================================
// VirtualizedList Component
// Efficiently renders large lists using windowing/virtualization
// Only renders items that are visible in the viewport
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

// =============================================================================
// VirtualizedList - Main Component
// =============================================================================

/**
 * Virtualized list that only renders visible items
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Function to render each item: (item, index, style) => React.Node
 * @param {number} props.itemHeight - Fixed height of each item in pixels
 * @param {number} props.containerHeight - Height of the scrollable container
 * @param {number} props.overscan - Number of items to render outside visible area (default: 3)
 * @param {Function} props.getItemKey - Function to get unique key for each item (default: index)
 * @param {string} props.className - Additional CSS class for container
 * @param {Object} props.style - Additional inline styles for container
 */
export function VirtualizedList({
  items,
  renderItem,
  itemHeight,
  containerHeight = 400,
  overscan = 3,
  getItemKey,
  className = '',
  style = {},
  onScroll,
  emptyMessage = 'No items to display',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount);
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll({
        scrollTop: newScrollTop,
        scrollHeight: e.currentTarget.scrollHeight,
        clientHeight: e.currentTarget.clientHeight,
      });
    }
  }, [onScroll]);

  // Get visible items with their styles
  const visibleItems = useMemo(() => {
    const result = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const item = items[i];
      if (item === undefined) continue;
      
      const style = {
        position: 'absolute',
        top: i * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      };
      
      const key = getItemKey ? getItemKey(item, i) : i;
      
      result.push({
        item,
        index: i,
        style,
        key,
      });
    }
    
    return result;
  }, [items, visibleRange, itemHeight, getItemKey]);

  // Empty state
  if (items.length === 0) {
    return (
      <div
        className={className}
        style={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          ...style,
        }}
        role="list"
        aria-label="Empty list"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
      role="list"
      aria-rowcount={items.length}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style, key }) => (
          <div
            key={key}
            style={style}
            role="listitem"
            aria-rowindex={index + 1}
          >
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  );
}

VirtualizedList.propTypes = {
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  itemHeight: PropTypes.number.isRequired,
  containerHeight: PropTypes.number,
  overscan: PropTypes.number,
  getItemKey: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  onScroll: PropTypes.func,
  emptyMessage: PropTypes.node,
};

// =============================================================================
// VirtualizedGrid - Grid Layout with Virtualization
// =============================================================================

/**
 * Virtualized grid that only renders visible items
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Function to render each item
 * @param {number} props.itemWidth - Width of each item in pixels
 * @param {number} props.itemHeight - Height of each item in pixels
 * @param {number} props.containerWidth - Width of the container
 * @param {number} props.containerHeight - Height of the container
 * @param {number} props.gap - Gap between items (default: 16)
 */
export function VirtualizedGrid({
  items,
  renderItem,
  itemWidth,
  itemHeight,
  containerWidth = 800,
  containerHeight = 600,
  gap = 16,
  overscan = 2,
  getItemKey,
  className = '',
  style = {},
  emptyMessage = 'No items to display',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate grid dimensions
  const columnsCount = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const rowHeight = itemHeight + gap;
  const totalHeight = rowsCount * rowHeight;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / rowHeight) + 2 * overscan;
    const endRow = Math.min(rowsCount - 1, startRow + visibleRows);
    
    const startIndex = startRow * columnsCount;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsCount - 1);
    
    return { startIndex, endIndex, startRow, endRow };
  }, [scrollTop, rowHeight, containerHeight, overscan, rowsCount, columnsCount, items.length]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const result = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      const item = items[i];
      if (item === undefined) continue;
      
      const row = Math.floor(i / columnsCount);
      const col = i % columnsCount;
      
      const itemStyle = {
        position: 'absolute',
        top: row * rowHeight,
        left: col * (itemWidth + gap),
        width: itemWidth,
        height: itemHeight,
      };
      
      const key = getItemKey ? getItemKey(item, i) : i;
      
      result.push({
        item,
        index: i,
        style: itemStyle,
        key,
      });
    }
    
    return result;
  }, [items, visibleRange, columnsCount, rowHeight, itemWidth, itemHeight, gap, getItemKey]);

  // Empty state
  if (items.length === 0) {
    return (
      <div
        className={className}
        style={{
          height: containerHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          ...style,
        }}
        role="grid"
        aria-label="Empty grid"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={rowsCount}
      aria-colcount={columnsCount}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style: itemStyle, key }) => (
          <div
            key={key}
            style={itemStyle}
            role="gridcell"
            aria-rowindex={Math.floor(index / columnsCount) + 1}
            aria-colindex={(index % columnsCount) + 1}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

VirtualizedGrid.propTypes = {
  items: PropTypes.array.isRequired,
  renderItem: PropTypes.func.isRequired,
  itemWidth: PropTypes.number.isRequired,
  itemHeight: PropTypes.number.isRequired,
  containerWidth: PropTypes.number,
  containerHeight: PropTypes.number,
  gap: PropTypes.number,
  overscan: PropTypes.number,
  getItemKey: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  emptyMessage: PropTypes.node,
};

// =============================================================================
// useVirtualization Hook
// =============================================================================

/**
 * Hook for custom virtualization implementations
 * @param {Object} options
 * @param {number} options.totalItems - Total number of items
 * @param {number} options.itemHeight - Height of each item
 * @param {number} options.containerHeight - Height of visible container
 * @param {number} options.overscan - Items to render outside viewport
 * @returns {Object} Virtualization state and handlers
 */
export function useVirtualization({
  totalItems,
  itemHeight,
  containerHeight,
  overscan = 3,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = totalItems * itemHeight;

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(totalItems - 1, startIndex + visibleCount);
    
    return {
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, totalItems]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index, align = 'start') => {
    if (!containerRef.current) return;
    
    let targetTop;
    
    if (align === 'start') {
      targetTop = index * itemHeight;
    } else if (align === 'center') {
      targetTop = index * itemHeight - containerHeight / 2 + itemHeight / 2;
    } else if (align === 'end') {
      targetTop = (index + 1) * itemHeight - containerHeight;
    }
    
    containerRef.current.scrollTop = Math.max(0, Math.min(targetTop, totalHeight - containerHeight));
  }, [itemHeight, containerHeight, totalHeight]);

  const getItemStyle = useCallback((index) => ({
    position: 'absolute',
    top: index * itemHeight,
    left: 0,
    right: 0,
    height: itemHeight,
  }), [itemHeight]);

  const isItemVisible = useCallback((index) => {
    return index >= visibleRange.startIndex && index <= visibleRange.endIndex;
  }, [visibleRange]);

  return {
    containerRef,
    scrollTop,
    totalHeight,
    visibleRange,
    handleScroll,
    scrollToIndex,
    getItemStyle,
    isItemVisible,
  };
}

// =============================================================================
// InfiniteLoader - Load more items on scroll
// =============================================================================

/**
 * Infinite scroll loader wrapper
 * @param {Object} props
 * @param {Function} props.loadMore - Function to load more items
 * @param {boolean} props.hasMore - Whether there are more items to load
 * @param {boolean} props.isLoading - Whether currently loading
 * @param {number} props.threshold - Scroll threshold to trigger load (pixels from bottom)
 */
export function InfiniteLoader({
  children,
  loadMore,
  hasMore,
  isLoading,
  threshold = 200,
  loadingComponent = <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>,
}) {
  const containerRef = useRef(null);

  const handleScroll = useCallback((e) => {
    if (isLoading || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom < threshold) {
      loadMore();
    }
  }, [isLoading, hasMore, threshold, loadMore]);

  return (
    <div ref={containerRef} onScroll={handleScroll} style={{ overflow: 'auto' }}>
      {children}
      {isLoading && loadingComponent}
    </div>
  );
}

InfiniteLoader.propTypes = {
  children: PropTypes.node.isRequired,
  loadMore: PropTypes.func.isRequired,
  hasMore: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  threshold: PropTypes.number,
  loadingComponent: PropTypes.node,
};

export default VirtualizedList;
