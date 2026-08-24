// =============================================================================
// useReportItemFilter — category filter + sort state for report item tables
// (audit §5.6). Inventory and Insurance carried byte-identical copies of this
// memo; the comparator map is the union of both views' sort options, so each
// view reproduces its exact previous ordering.
// =============================================================================

import { useMemo, useState } from 'react';

const SORT_COMPARATORS = {
  name: (a, b) => (a.name || '').localeCompare(b.name || ''),
  category: (a, b) => (a.category || '').localeCompare(b.category || ''),
  status: (a, b) => (a.status || '').localeCompare(b.status || ''),
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  'value-desc': (a, b) => (b.currentValue || 0) - (a.currentValue || 0),
  'value-asc': (a, b) => (a.currentValue || 0) - (b.currentValue || 0),
  'purchase-desc': (a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0),
};

/**
 * Filter and sort report items.
 *
 * @param {Array} inventory - Full inventory array
 * @param {string} initialSortBy - Initial sort key (a SORT_COMPARATORS key)
 * @returns {{ selectedCategory, setSelectedCategory, sortBy, setSortBy, filteredItems }}
 */
export function useReportItemFilter(inventory, initialSortBy) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState(initialSortBy);

  const filteredItems = useMemo(() => {
    let items = [...inventory];

    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.category === selectedCategory);
    }

    const compare = SORT_COMPARATORS[sortBy];
    if (compare) items.sort(compare);

    return items;
  }, [inventory, selectedCategory, sortBy]);

  return { selectedCategory, setSelectedCategory, sortBy, setSortBy, filteredItems };
}
