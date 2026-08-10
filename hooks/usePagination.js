// =============================================================================
// usePagination - Pagination logic hook
// =============================================================================

import { useState, useCallback, useMemo, useRef } from 'react';

/**
 * Hook for pagination
 * @param {Array} items - Items to paginate
 * @param {number} pageSize - Items per page
 */
export function usePagination(items, pageSize = 20) {
  const [rawPage, setRawPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize);

  // Clamp during render: when a shrinking result set strands the stored page
  // past the end, show the last valid page immediately instead of rendering
  // an empty page for a frame and then resetting.
  const page = Math.min(rawPage, Math.max(1, totalPages));

  // Ref mirror so goToPage can clamp without closing over totalPages — a
  // totalPages-dependent identity made consumers' filter-reset effects
  // (which list goToPage as a dep) re-fire on any background data refresh
  // that changed the item count, bouncing the user back to page 1 mid-browse.
  const totalPagesRef = useRef(totalPages);
  totalPagesRef.current = totalPages;

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goToPage = useCallback((newPage) => {
    setRawPage(Math.max(1, Math.min(newPage, Math.max(1, totalPagesRef.current))));
  }, []);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

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
