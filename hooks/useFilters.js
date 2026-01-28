// =============================================================================
// useFilters Hook
// Manages search, filter, and view state for inventory and other lists
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { getTodayISO } from '../utils.js';

/**
 * Custom hook for managing search and filter state
 * @param {Object} options - Configuration options
 * @param {string} options.defaultCategoryFilter - Default category filter value
 * @param {string} options.defaultStatusFilter - Default status filter value
 * @param {boolean} options.defaultGridView - Whether to use grid view by default
 * @returns {Object} Filter state and handlers
 */
export function useFilters({
  defaultCategoryFilter = 'all',
  defaultStatusFilter = 'all',
  defaultGridView = true,
} = {}) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
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
  // Search Handlers
  // ============================================================================

  /**
   * Update search query
   * @param {string} query - New search query
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  /**
   * Clear search query
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // ============================================================================
  // Category Filter Handlers
  // ============================================================================

  /**
   * Set single category filter
   * @param {string} category - Category to filter by ('all' for no filter)
   */
  const handleCategoryFilter = useCallback((category) => {
    setCategoryFilter(category);
    // Clear multi-select when using single filter
    setSelectedCategories([]);
  }, []);

  /**
   * Toggle category in multi-select
   * @param {string} category - Category to toggle
   */
  const toggleCategory = useCallback((category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
    // Clear single filter when using multi-select
    setCategoryFilter('all');
  }, []);

  /**
   * Clear all category filters
   */
  const clearCategoryFilters = useCallback(() => {
    setCategoryFilter('all');
    setSelectedCategories([]);
  }, []);

  // ============================================================================
  // Status Filter Handlers
  // ============================================================================

  /**
   * Set single status filter
   * @param {string} status - Status to filter by ('all' for no filter)
   */
  const handleStatusFilter = useCallback((status) => {
    setStatusFilter(status);
    // Clear multi-select when using single filter
    setSelectedStatuses([]);
  }, []);

  /**
   * Toggle status in multi-select
   * @param {string} status - Status to toggle
   */
  const toggleStatus = useCallback((status) => {
    setSelectedStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    // Clear single filter when using multi-select
    setStatusFilter('all');
  }, []);

  /**
   * Clear all status filters
   */
  const clearStatusFilters = useCallback(() => {
    setStatusFilter('all');
    setSelectedStatuses([]);
  }, []);

  // ============================================================================
  // View Handlers
  // ============================================================================

  /**
   * Toggle between grid and list view
   */
  const toggleViewMode = useCallback(() => {
    setIsGridView(prev => !prev);
  }, []);

  /**
   * Set grid view explicitly
   */
  const setGridView = useCallback(() => {
    setIsGridView(true);
  }, []);

  /**
   * Set list view explicitly
   */
  const setListView = useCallback(() => {
    setIsGridView(false);
  }, []);

  // ============================================================================
  // Schedule Handlers
  // ============================================================================

  /**
   * Set schedule view type (day, week, month)
   * @param {string} view - View type
   */
  const handleScheduleView = useCallback((view) => {
    setScheduleView(view);
  }, []);

  /**
   * Set schedule mode (calendar, list, timeline)
   * @param {string} mode - Mode type
   */
  const handleScheduleMode = useCallback((mode) => {
    setScheduleMode(mode);
  }, []);

  /**
   * Set schedule date
   * @param {string} date - ISO date string
   */
  const handleScheduleDate = useCallback((date) => {
    setScheduleDate(date);
  }, []);

  /**
   * Reset schedule to today
   */
  const resetScheduleToToday = useCallback(() => {
    setScheduleDate(getTodayISO());
  }, []);

  // ============================================================================
  // Selection Handlers
  // ============================================================================

  /**
   * Toggle item selection
   * @param {string} id - Item ID to toggle
   */
  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => 
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  }, []);

  /**
   * Select all items
   * @param {Array} ids - Array of IDs to select
   */
  const selectAll = useCallback((ids) => {
    setSelectedIds(ids);
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  /**
   * Check if item is selected
   * @param {string} id - Item ID to check
   * @returns {boolean}
   */
  const isSelected = useCallback((id) => {
    return selectedIds.includes(id);
  }, [selectedIds]);

  // ============================================================================
  // Reset All Filters
  // ============================================================================

  /**
   * Reset all filters and search to default values
   */
  const resetAllFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(defaultCategoryFilter);
    setSelectedCategories([]);
    setStatusFilter(defaultStatusFilter);
    setSelectedStatuses([]);
    setPackageCategoryFilter('all');
    setSelectedIds([]);
  }, [defaultCategoryFilter, defaultStatusFilter]);

  // ============================================================================
  // Filter Helper
  // ============================================================================

  /**
   * Create a filter function for items
   * @param {Object} options - Filter options
   * @returns {Function} Filter function
   */
  const createItemFilter = useCallback((options = {}) => {
    const {
      searchFields = ['name', 'code', 'description'],
      categoryField = 'category',
      statusField = 'status',
    } = options;

    return (item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = searchFields.some(field => 
          item[field]?.toLowerCase?.().includes(query)
        );
        if (!matchesSearch) return false;
      }
      
      // Category filter (single)
      if (categoryFilter !== 'all' && item[categoryField] !== categoryFilter) {
        return false;
      }
      
      // Category filter (multi-select)
      if (selectedCategories.length > 0 && !selectedCategories.includes(item[categoryField])) {
        return false;
      }
      
      // Status filter (single)
      if (statusFilter !== 'all' && item[statusField] !== statusFilter) {
        return false;
      }
      
      // Status filter (multi-select)
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item[statusField])) {
        return false;
      }
      
      return true;
    };
  }, [searchQuery, categoryFilter, selectedCategories, statusFilter, selectedStatuses]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' ||
      categoryFilter !== 'all' ||
      selectedCategories.length > 0 ||
      statusFilter !== 'all' ||
      selectedStatuses.length > 0;
  }, [searchQuery, categoryFilter, selectedCategories, statusFilter, selectedStatuses]);

  const selectionCount = selectedIds.length;
  const hasSelection = selectionCount > 0;

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    handleSearch,
    clearSearch,
    
    // Category filter state
    categoryFilter,
    setCategoryFilter,
    selectedCategories,
    setSelectedCategories,
    packageCategoryFilter,
    setPackageCategoryFilter,
    handleCategoryFilter,
    toggleCategory,
    clearCategoryFilters,
    
    // Status filter state
    statusFilter,
    setStatusFilter,
    selectedStatuses,
    setSelectedStatuses,
    handleStatusFilter,
    toggleStatus,
    clearStatusFilters,
    
    // View state
    isGridView,
    setIsGridView,
    toggleViewMode,
    setGridView,
    setListView,
    
    // Schedule state
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
    
    // Selection state
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectionCount,
    hasSelection,
    
    // Helpers
    resetAllFilters,
    createItemFilter,
    hasActiveFilters,
  };
}

export default useFilters;
