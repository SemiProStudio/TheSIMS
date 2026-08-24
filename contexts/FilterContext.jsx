// =============================================================================
// FilterContext
// Provides filter/search state via context so only filter-dependent
// components re-render on search/filter changes — not the entire App tree.
// =============================================================================

import { useState, useMemo } from 'react';
import { getTodayISO } from '../utils';
import FilterContext from './FilterContext.js';

export function FilterProvider({ children }) {
  // Search state (gear list)
  const [searchQuery, setSearchQuery] = useState('');

  // Global Search view state — separate from the gear list's query so a
  // search typed on one page doesn't silently follow the user to the other.
  // Lives here (not in SearchView) so it survives navigating into a result
  // and back.
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchTypes, setGlobalSearchTypes] = useState([]);

  // Category filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Status filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  // View preferences
  const [isGridView, setIsGridView] = useState(true);

  // Schedule view state
  const [scheduleView, setScheduleView] = useState('week');
  const [scheduleMode, setScheduleMode] = useState('calendar');
  const [scheduleDate, setScheduleDate] = useState(getTodayISO());

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // ============================================================================
  // Memoized context value
  // ============================================================================
  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      globalSearchQuery,
      setGlobalSearchQuery,
      globalSearchTypes,
      setGlobalSearchTypes,
      categoryFilter,
      setCategoryFilter,
      selectedCategories,
      setSelectedCategories,
      statusFilter,
      setStatusFilter,
      selectedStatuses,
      setSelectedStatuses,
      isGridView,
      setIsGridView,
      scheduleView,
      setScheduleView,
      scheduleMode,
      setScheduleMode,
      scheduleDate,
      setScheduleDate,
      selectedIds,
      setSelectedIds,
    }),
    [
      searchQuery,
      globalSearchQuery,
      globalSearchTypes,
      categoryFilter,
      selectedCategories,
      statusFilter,
      selectedStatuses,
      isGridView,
      scheduleView,
      scheduleMode,
      scheduleDate,
      selectedIds,
    ],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
