// =============================================================================
// FilterContext
// Provides filter/search state via context so only filter-dependent
// components re-render on search/filter changes — not the entire App tree.
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { getTodayISO } from '../utils';
import FilterContext from './FilterContext.js';

export function FilterProvider({
  children,
  defaultCategoryFilter = 'all',
  defaultStatusFilter = 'all',
  defaultGridView = true,
}) {
  // Search state (gear list)
  const [searchQuery, setSearchQuery] = useState('');

  // Global Search view state — separate from the gear list's query so a
  // search typed on one page doesn't silently follow the user to the other.
  // Lives here (not in SearchView) so it survives navigating into a result
  // and back.
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchTypes, setGlobalSearchTypes] = useState([]);

  // Category filters
  const [categoryFilter, setCategoryFilter] = useState(defaultCategoryFilter);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('all');

  // Status filters
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  // View preferences
  const [isGridView, setIsGridView] = useState(defaultGridView);

  // Schedule view state
  const [scheduleView, setScheduleView] = useState('week');
  const [scheduleMode, setScheduleMode] = useState('calendar');
  const [scheduleDate, setScheduleDate] = useState(getTodayISO());

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSearch = useCallback((query) => setSearchQuery(query), []);
  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const handleCategoryFilter = useCallback((category) => {
    setCategoryFilter(category);
    setSelectedCategories([]);
  }, []);

  const toggleCategory = useCallback((category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
    setCategoryFilter('all');
  }, []);

  const clearCategoryFilters = useCallback(() => {
    setCategoryFilter('all');
    setSelectedCategories([]);
  }, []);

  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    setSelectedStatuses([]);
  }, []);

  const toggleStatus = useCallback((status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    setStatusFilter('all');
  }, []);

  const clearStatusFilters = useCallback(() => {
    setStatusFilter('all');
    setSelectedStatuses([]);
  }, []);

  const toggleViewMode = useCallback(() => setIsGridView((prev) => !prev), []);
  const setGridView = useCallback(() => setIsGridView(true), []);
  const setListView = useCallback(() => setIsGridView(false), []);

  const handleScheduleView = useCallback((view) => setScheduleView(view), []);
  const handleScheduleMode = useCallback((mode) => setScheduleMode(mode), []);
  const handleScheduleDate = useCallback((date) => setScheduleDate(date), []);
  const resetScheduleToToday = useCallback(() => setScheduleDate(getTodayISO()), []);

  const toggleSelection = useCallback((id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  const selectAll = useCallback((ids) => setSelectedIds(ids), []);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const isSelected = useCallback((id) => selectedIds.includes(id), [selectedIds]);

  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setGlobalSearchQuery('');
    setGlobalSearchTypes([]);
    setCategoryFilter(defaultCategoryFilter);
    setSelectedCategories([]);
    setStatusFilter(defaultStatusFilter);
    setSelectedStatuses([]);
    setPackageCategoryFilter('all');
    setSelectedIds([]);
  }, [defaultCategoryFilter, defaultStatusFilter]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery !== '' ||
      categoryFilter !== 'all' ||
      selectedCategories.length > 0 ||
      statusFilter !== 'all' ||
      selectedStatuses.length > 0
    );
  }, [searchQuery, categoryFilter, selectedCategories, statusFilter, selectedStatuses]);

  const selectionCount = selectedIds.length;
  const hasSelection = selectionCount > 0;

  // ============================================================================
  // Memoized context value
  // ============================================================================
  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      handleSearch,
      clearSearch,
      globalSearchQuery,
      setGlobalSearchQuery,
      globalSearchTypes,
      setGlobalSearchTypes,
      categoryFilter,
      setCategoryFilter,
      selectedCategories,
      setSelectedCategories,
      packageCategoryFilter,
      setPackageCategoryFilter,
      handleCategoryFilter,
      toggleCategory,
      clearCategoryFilters,
      statusFilter,
      setStatusFilter,
      selectedStatuses,
      setSelectedStatuses,
      handleStatusFilter,
      toggleStatus,
      clearStatusFilters,
      isGridView,
      setIsGridView,
      toggleViewMode,
      setGridView,
      setListView,
      scheduleView,
      setScheduleView,
      scheduleMode,
      setScheduleMode,
      scheduleDate,
      setScheduleDate,
      handleScheduleView,
      handleScheduleMode,
      handleScheduleDate,
      resetScheduleToToday,
      selectedIds,
      setSelectedIds,
      toggleSelection,
      selectAll,
      clearSelection,
      isSelected,
      selectionCount,
      hasSelection,
      resetAllFilters,
      hasActiveFilters,
    }),
    [
      searchQuery,
      globalSearchQuery,
      globalSearchTypes,
      categoryFilter,
      selectedCategories,
      packageCategoryFilter,
      statusFilter,
      selectedStatuses,
      isGridView,
      scheduleView,
      scheduleMode,
      scheduleDate,
      selectedIds,
      selectionCount,
      hasSelection,
      hasActiveFilters,
      handleSearch,
      clearSearch,
      handleCategoryFilter,
      toggleCategory,
      clearCategoryFilters,
      handleStatusFilter,
      toggleStatus,
      clearStatusFilters,
      toggleViewMode,
      setGridView,
      setListView,
      handleScheduleView,
      handleScheduleMode,
      handleScheduleDate,
      resetScheduleToToday,
      toggleSelection,
      selectAll,
      clearSelection,
      isSelected,
      resetAllFilters,
    ],
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}
