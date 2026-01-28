// ============================================================================
// SIMS Custom Hooks
// Reusable hooks for common patterns and state management
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================================
// usePagination - Pagination logic
// ============================================================================

/**
 * Hook for pagination
 * @param {Array} items - Items to paginate
 * @param {number} pageSize - Items per page
 */
export function usePagination(items, pageSize = 20) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  // Reset to page 1 when items change
  useMemo(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [items.length, totalPages, page]);

  return {
    page,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ============================================================================
// useDebounce - Debounced value
// ============================================================================

/**
 * Hook for debouncing a value
 * @param {*} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
