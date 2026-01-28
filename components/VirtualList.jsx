// =============================================================================
// VirtualList Component
// Efficiently renders large lists by only rendering visible items
// =============================================================================

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * VirtualList - Renders only visible items for performance
 * 
 * @example
 * <VirtualList
 *   items={largeArray}
 *   itemHeight={60}
 *   renderItem={(item, index, style) => (
 *     <div key={item.id} style={style}>
 *       {item.name}
 *     </div>
 *   )}
 *   height={400}
 * />
 */
export function VirtualList({
  items,
  itemHeight,
  renderItem,
  height = 400,
  width = '100%',
  overscan = 3,
  className = '',
  style = {},
  onScroll,
  getItemKey,
  emptyMessage = 'No items to display',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const { startIndex, endIndex, totalHeight, visibleItems } = useMemo(() => {
    const itemCount = items.length;
    const totalHeight = itemCount * itemHeight;
    
    if (itemCount === 0) {
      return { startIndex: 0, endIndex: 0, totalHeight: 0, visibleItems: [] };
    }
    
    // Calculate which items are visible
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(height / itemHeight) + 2 * overscan;
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount);
    
    // Slice visible items
    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      style: {
        position: 'absolute',
        top: (startIndex + index) * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight,
      },
    }));
    
    return { startIndex, endIndex, totalHeight, visibleItems };
  }, [items, itemHeight, scrollTop, height, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    if (onScroll) {
      onScroll({
        scrollTop: newScrollTop,
        scrollHeight: e.target.scrollHeight,
        clientHeight: e.target.clientHeight,
      });
    }
  }, [onScroll]);

  // Scroll to item
  const scrollToItem = useCallback((index, align = 'auto') => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const itemTop = index * itemHeight;
    const itemBottom = itemTop + itemHeight;
    const viewportTop = container.scrollTop;
    const viewportBottom = viewportTop + container.clientHeight;
    
    if (align === 'start' || (align === 'auto' && itemTop < viewportTop)) {
      container.scrollTop = itemTop;
    } else if (align === 'end' || (align === 'auto' && itemBottom > viewportBottom)) {
      container.scrollTop = itemBottom - container.clientHeight;
    } else if (align === 'center') {
      container.scrollTop = itemTop - (container.clientHeight - itemHeight) / 2;
    }
  }, [itemHeight]);

  // Expose scrollToItem via ref
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollToItem = scrollToItem;
    }
  }, [scrollToItem]);

  // Empty state
  if (items.length === 0) {
    return (
      <div 
        className={className}
        style={{ 
          ...style, 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
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
        ...style,
        height,
        width,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
      role="list"
      aria-rowcount={items.length}
    >
      {/* Spacer to maintain scroll height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style: itemStyle }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            role="listitem"
            aria-rowindex={index + 1}
            style={itemStyle}
          >
            {renderItem(item, index, itemStyle)}
          </div>
        ))}
      </div>
    </div>
  );
}

VirtualList.propTypes = {
  /** Array of items to render */
  items: PropTypes.array.isRequired,
  /** Height of each item in pixels */
  itemHeight: PropTypes.number.isRequired,
  /** Render function for each item: (item, index, style) => React.Node */
  renderItem: PropTypes.func.isRequired,
  /** Height of the container */
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Width of the container */
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Number of items to render outside visible area */
  overscan: PropTypes.number,
  /** CSS class name */
  className: PropTypes.string,
  /** Inline styles */
  style: PropTypes.object,
  /** Scroll event handler */
  onScroll: PropTypes.func,
  /** Function to get unique key for each item */
  getItemKey: PropTypes.func,
  /** Message to show when list is empty */
  emptyMessage: PropTypes.string,
};

// =============================================================================
// VirtualGrid Component
// For grid layouts with virtualization
// =============================================================================

export function VirtualGrid({
  items,
  itemHeight,
  itemWidth,
  renderItem,
  height = 400,
  width = '100%',
  gap = 16,
  overscan = 2,
  className = '',
  style = {},
  onScroll,
  getItemKey,
  emptyMessage = 'No items to display',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate grid layout
  const { columns, rows, visibleItems, totalHeight } = useMemo(() => {
    if (containerWidth === 0 || items.length === 0) {
      return { columns: 0, rows: 0, visibleItems: [], totalHeight: 0 };
    }
    
    // Calculate columns that fit
    const columns = Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
    const rows = Math.ceil(items.length / columns);
    const rowHeight = itemHeight + gap;
    const totalHeight = rows * rowHeight;
    
    // Calculate visible rows
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(height / rowHeight) + 2 * overscan;
    const endRow = Math.min(rows - 1, startRow + visibleRowCount);
    
    // Get visible items
    const visibleItems = [];
    for (let row = startRow; row <= endRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        if (index < items.length) {
          visibleItems.push({
            item: items[index],
            index,
            style: {
              position: 'absolute',
              top: row * rowHeight,
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            },
          });
        }
      }
    }
    
    return { columns, rows, visibleItems, totalHeight };
  }, [items, containerWidth, itemWidth, itemHeight, gap, scrollTop, height, overscan]);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
    if (onScroll) {
      onScroll({
        scrollTop: e.target.scrollTop,
        scrollHeight: e.target.scrollHeight,
        clientHeight: e.target.clientHeight,
      });
    }
  }, [onScroll]);

  // Empty state
  if (items.length === 0) {
    return (
      <div 
        className={className}
        style={{ 
          ...style, 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
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
        ...style,
        height,
        width,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={rows}
      aria-colcount={columns}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style: itemStyle }) => (
          <div
            key={getItemKey ? getItemKey(item, index) : index}
            role="gridcell"
            style={itemStyle}
          >
            {renderItem(item, index, itemStyle)}
          </div>
        ))}
      </div>
    </div>
  );
}

VirtualGrid.propTypes = {
  items: PropTypes.array.isRequired,
  itemHeight: PropTypes.number.isRequired,
  itemWidth: PropTypes.number.isRequired,
  renderItem: PropTypes.func.isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  gap: PropTypes.number,
  overscan: PropTypes.number,
  className: PropTypes.string,
  style: PropTypes.object,
  onScroll: PropTypes.func,
  getItemKey: PropTypes.func,
  emptyMessage: PropTypes.string,
};

// =============================================================================
// useVirtualization Hook
// For custom virtualization implementations
// =============================================================================

export function useVirtualization({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const virtualState = useMemo(() => {
    const totalHeight = itemCount * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(itemCount - 1, startIndex + visibleCount);
    
    return {
      totalHeight,
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1,
      offsetTop: startIndex * itemHeight,
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  const getItemStyle = useCallback((index) => ({
    position: 'absolute',
    top: index * itemHeight,
    left: 0,
    right: 0,
    height: itemHeight,
  }), [itemHeight]);
  
  const scrollToIndex = useCallback((index, containerRef) => {
    if (containerRef?.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);
  
  return {
    ...virtualState,
    scrollTop,
    handleScroll,
    getItemStyle,
    scrollToIndex,
  };
}

export default VirtualList;
