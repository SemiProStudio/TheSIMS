// ============================================================================
// Gear List Component (formerly Inventory)
// Optimized for large datasets with pagination and debounced search
// Supports bulk selection for batch operations
// Supports saved filter views
// ============================================================================

import React, { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { Search, Plus, Grid, List, CheckSquare, Square, MinusSquare, X, Bookmark, BookmarkPlus, Trash2, ChevronDown } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity, zIndex } from './theme.js';
import { getStatusColor, filterBySearch, filterByCategory, filterByStatus, generateId } from './utils.js';
import { Badge, Card, Button, SearchInput, Pagination } from './components/ui.jsx';
import { OptimizedImage } from './components/OptimizedImage.jsx';
import { Select } from './components/Select.jsx';
import { useDebounce, usePagination } from './hooks/index.js';
import { usePermissions, ViewOnlyBanner } from './PermissionsContext.jsx';

// Items per page options
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 25;
const SAVED_VIEWS_KEY = 'sims-saved-filter-views';

// Checkbox component for consistent styling
const Checkbox = memo(function Checkbox({ checked, indeterminate, onChange, size = 20 }) {
  const Icon = indeterminate ? MinusSquare : checked ? CheckSquare : Square;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: checked || indeterminate ? colors.primary : colors.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={size} />
    </button>
  );
});

// Saved Views Dropdown Component
const SavedViewsDropdown = memo(function SavedViewsDropdown({ 
  savedViews, 
  currentFilters,
  onLoadView, 
  onSaveView, 
  onDeleteView,
  hasActiveFilters,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const dropdownRef = React.useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (newViewName.trim()) {
      onSaveView(newViewName.trim());
      setNewViewName('');
      setShowSaveDialog(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setShowSaveDialog(false);
      setNewViewName('');
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          cursor: 'pointer',
          minWidth: 140,
          fontWeight: 500,
        }}
      >
        <Bookmark size={16} />
        <span>Saved Views</span>
        <ChevronDown size={16} style={{ marginLeft: 'auto' }} />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: spacing[1],
          background: colors.bgLight,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 250,
          maxHeight: 350,
          overflowY: 'auto',
          zIndex: zIndex.dropdown,
        }}>
          {/* Save Current View */}
          {hasActiveFilters && (
            <div style={{ 
              padding: spacing[2], 
              borderBottom: `1px solid ${colors.border}`,
            }}>
              {showSaveDialog ? (
                <div style={{ display: 'flex', gap: spacing[2] }}>
                  <input
                    type="text"
                    value={newViewName}
                    onChange={e => setNewViewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="View name..."
                    autoFocus
                    style={{
                      ...styles.input,
                      flex: 1,
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                      fontSize: typography.fontSize.sm,
                    }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={!newViewName.trim()}
                    style={{
                      background: colors.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                      cursor: newViewName.trim() ? 'pointer' : 'not-allowed',
                      opacity: newViewName.trim() ? 1 : 0.5,
                    }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    width: '100%',
                    padding: `${spacing[2]}px`,
                    background: `${withOpacity(colors.primary, 15)}`,
                    border: 'none',
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                    color: colors.primary,
                    fontSize: typography.fontSize.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}
                >
                  <BookmarkPlus size={16} />
                  Save Current Filters
                </button>
              )}
            </div>
          )}

          {/* Saved Views List */}
          {savedViews.length > 0 ? (
            <div style={{ padding: spacing[1] }}>
              {savedViews.map(view => (
                <div
                  key={view.id}
                  className="list-item-hover"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: `${spacing[2]}px ${spacing[2]}px`,
                    borderRadius: borderRadius.md,
                    cursor: 'pointer',
                  }}
                >
                  <div 
                    style={{ flex: 1 }}
                    onClick={() => {
                      onLoadView(view);
                      setIsOpen(false);
                    }}
                  >
                    <div style={{ 
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.sm,
                    }}>
                      {view.name}
                    </div>
                    <div style={{ 
                      fontSize: typography.fontSize.xs, 
                      color: colors.textMuted,
                      marginTop: 2,
                    }}>
                      {[
                        view.filters.search && `"${view.filters.search}"`,
                        view.filters.category !== 'all' && view.filters.category,
                        view.filters.status !== 'all' && view.filters.status,
                      ].filter(Boolean).join(' • ') || 'No filters'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(view.id);
                    }}
                    className="hover-danger"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: spacing[1],
                      cursor: 'pointer',
                      color: colors.textMuted,
                      borderRadius: borderRadius.sm,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title="Delete view"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: spacing[4], 
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: typography.fontSize.sm,
            }}>
              {hasActiveFilters 
                ? 'No saved views yet. Save your current filters above!'
                : 'No saved views. Apply filters and save them for quick access.'
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Memoized grid item component for performance
const GridItem = memo(function GridItem({ item, onViewItem, selectionMode, isSelected, onToggleSelect }) {
  return (
    <Card
      onClick={() => selectionMode ? onToggleSelect(item.id) : onViewItem(item.id)}
      padding={false}
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        display: 'flex',
        flexDirection: 'column',
        outline: isSelected ? `2px solid ${colors.primary}` : 'none',
        outlineOffset: '-2px',
      }}
    >
      {/* Image area - 60% height */}
      <div style={{ flex: '0 0 60%', overflow: 'hidden', position: 'relative' }}>
        {selectionMode && (
          <div 
            style={{ 
              position: 'absolute', 
              top: spacing[2], 
              left: spacing[2], 
              zIndex: zIndex.base + 1,
              background: colors.bgLight,
              borderRadius: borderRadius.sm,
              padding: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} size={22} />
          </div>
        )}
        {item.image ? (
          <OptimizedImage
            src={item.image}
            alt={item.name}
            size="thumbnail"
            style={{ width: '100%', height: '100%' }}
            objectFit="cover"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: `${withOpacity(colors.primary, 10)}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted
          }}>
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span style={{ fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>No Image</span>
          </div>
        )}
      </div>

      {/* Info area - 40% height */}
      <div style={{
        flex: 1,
        padding: spacing[3],
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{
            display: 'flex',
            gap: spacing[1],
            marginBottom: spacing[1],
            flexWrap: 'wrap'
          }}>
            <Badge text={item.id} color={colors.primary} size="xs" />
            <Badge text={item.status} color={getStatusColor(item.status)} size="xs" />
          </div>
          <h4 style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: colors.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {item.name}
          </h4>
        </div>
        <div style={{
          fontSize: typography.fontSize.xs,
          color: colors.textMuted
        }}>
          {item.brand}
        </div>
      </div>
    </Card>
  );
});

// Memoized list item component for performance
const ListItem = memo(function ListItem({ item, onViewItem, selectionMode, isSelected, onToggleSelect }) {
  return (
    <Card
      onClick={() => selectionMode ? onToggleSelect(item.id) : onViewItem(item.id)}
      style={{
        cursor: 'pointer',
        padding: spacing[3],
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        outline: isSelected ? `2px solid ${colors.primary}` : 'none',
        outlineOffset: '-2px',
      }}
    >
      {selectionMode && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} size={22} />
        </div>
      )}
      {item.image ? (
        <OptimizedImage
          src={item.image}
          alt={item.name}
          size="thumbnail"
          width={56}
          height={56}
          style={{ borderRadius: borderRadius.md }}
          objectFit="cover"
        />
      ) : (
        <div style={{
          width: 56,
          height: 56,
          borderRadius: borderRadius.md,
          background: `${withOpacity(colors.primary, 10)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textMuted,
          fontSize: typography.fontSize.xs
        }}>
          No img
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          gap: spacing[1],
          marginBottom: spacing[1]
        }}>
          <Badge text={item.id} color={colors.primary} />
          <Badge text={item.status} color={getStatusColor(item.status)} />
          <Badge text={item.category} color={colors.accent2} />
        </div>
        <div style={{
          fontWeight: typography.fontWeight.medium,
          color: colors.textPrimary
        }}>
          {item.name}
        </div>
        <div style={{
          fontSize: typography.fontSize.sm,
          color: colors.textMuted
        }}>
          {item.brand}
        </div>
      </div>
    </Card>
  );
});

// Selection toolbar component
const SelectionToolbar = memo(function SelectionToolbar({ 
  selectedCount, 
  totalCount, 
  onSelectAll, 
  onDeselectAll, 
  onCancel,
  onBulkAction,
  allSelected,
  someSelected,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[3],
      background: `${withOpacity(colors.primary, 15)}`,
      borderRadius: borderRadius.lg,
      marginBottom: spacing[4],
      flexWrap: 'wrap',
    }}>
      {/* Select all checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Checkbox 
          checked={allSelected} 
          indeterminate={someSelected && !allSelected}
          onChange={() => allSelected ? onDeselectAll() : onSelectAll()} 
        />
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      {/* Bulk action buttons */}
      {selectedCount > 0 && (
        <div style={{ display: 'flex', gap: spacing[2], flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button size="sm" variant="secondary" onClick={() => onBulkAction('status')}>
            Change Status
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onBulkAction('location')}>
            Update Location
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onBulkAction('category')}>
            Change Category
          </Button>
          <Button size="sm" variant="secondary" danger onClick={() => onBulkAction('delete')}>
            Delete
          </Button>
        </div>
      )}

      {/* Cancel button */}
      <Button size="sm" variant="secondary" onClick={onCancel} icon={X}>
        Exit Selection
      </Button>
    </div>
  );
});

function GearList({
  inventory,
  categories,
  categorySettings,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  isGridView,
  setIsGridView,
  onViewItem,
  onAddItem,
  onBulkAction, // New prop for handling bulk actions
}) {
  // Permissions
  const { canEdit } = usePermissions();
  const canEditGearList = canEdit('gear_list');

  // Page size state with localStorage persistence
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('sims-gear-list-page-size');
    return saved ? parseInt(saved, 10) : DEFAULT_PAGE_SIZE;
  });

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Saved views state with localStorage persistence
  const [savedViews, setSavedViews] = useState(() => {
    try {
      const saved = localStorage.getItem(SAVED_VIEWS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save views to localStorage when they change
  useEffect(() => {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(savedViews));
  }, [savedViews]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || statusFilter !== 'all';

  // Current filters object
  const currentFilters = useMemo(() => ({
    search: searchQuery,
    category: categoryFilter,
    status: statusFilter,
  }), [searchQuery, categoryFilter, statusFilter]);

  // Save current filters as a new view
  const saveCurrentView = useCallback((name) => {
    const newView = {
      id: generateId(),
      name,
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };
    setSavedViews(prev => [...prev, newView]);
  }, [currentFilters]);

  // Load a saved view
  const loadView = useCallback((view) => {
    setSearchQuery(view.filters.search || '');
    setCategoryFilter(view.filters.category || 'all');
    setStatusFilter(view.filters.status || 'all');
  }, [setSearchQuery, setCategoryFilter, setStatusFilter]);

  // Delete a saved view
  const deleteView = useCallback((viewId) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
  }, []);

  // Save page size to localStorage
  useEffect(() => {
    localStorage.setItem('sims-gear-list-page-size', pageSize.toString());
  }, [pageSize]);

  // Debounce search for performance with large datasets
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Filter inventory with debounced search
  const filteredItems = useMemo(() => {
    // First, filter out kits - GearList only shows individual items
    let result = inventory.filter(item => !item.isKit);
    
    result = filterBySearch(result, debouncedSearch, ['name', 'brand', 'id']);
    result = filterByCategory(result, categoryFilter);
    
    // Handle low-stock filter specially - needs categorySettings
    if (statusFilter === 'low-stock') {
      result = result.filter(item => {
        const settings = categorySettings?.[item.category];
        if (!settings?.trackQuantity) return false;
        
        // Only consider items that have a quantity defined
        if (item.quantity === undefined || item.quantity === null) return false;
        
        const quantity = item.quantity;
        const threshold = item.reorderPoint || settings.lowStockThreshold || 0;
        return threshold > 0 && quantity <= threshold;
      });
    } else {
      result = filterByStatus(result, statusFilter);
    }
    
    return result;
  }, [inventory, debouncedSearch, categoryFilter, statusFilter, categorySettings]);

  // Filtered item IDs for selection operations
  const filteredIds = useMemo(() => new Set(filteredItems.map(i => i.id)), [filteredItems]);

  // Clear selection when exiting selection mode or when filters change
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
    }
  }, [selectionMode]);

  // Clear invalid selections when filters change
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set([...prev].filter(id => filteredIds.has(id)));
      return validIds.size !== prev.size ? validIds : prev;
    });
  }, [filteredIds]);

  // Selection helpers
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  }, [filteredItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback((action) => {
    if (onBulkAction && selectedIds.size > 0) {
      onBulkAction(action, [...selectedIds]);
    }
  }, [onBulkAction, selectedIds]);

  // Selection stats
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === filteredItems.length && filteredItems.length > 0;
  const someSelected = selectedCount > 0;

  // Pagination
  const {
    page,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(filteredItems, pageSize);

  // Reset to page 1 when filters change
  useMemo(() => {
    goToPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, pageSize]);

  return (
    <>
      {/* View-only banner */}
      {!canEditGearList && <ViewOnlyBanner functionId="gear_list" />}

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          <div>
            <h2 className="page-title">Gear List</h2>
            <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} 
              {hasActiveFilters && ` (filtered)`}
            </p>
          </div>
          {canEditGearList && (
            <Button onClick={onAddItem} icon={Plus}>
              Add Item
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
          {/* Saved Views Dropdown */}
          <SavedViewsDropdown
            savedViews={savedViews}
            currentFilters={currentFilters}
            onLoadView={loadView}
            onSaveView={saveCurrentView}
            onDeleteView={deleteView}
            hasActiveFilters={hasActiveFilters}
          />
          {canEditGearList && !selectionMode ? (
            <Button variant="secondary" onClick={() => setSelectionMode(true)} icon={CheckSquare}>
              Multiple Selection
            </Button>
          ) : selectionMode ? (
            <Button variant="secondary" onClick={() => setSelectionMode(false)} icon={X}>
              Cancel Selection
            </Button>
          ) : null}
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectionMode && (
        <SelectionToolbar
          selectedCount={selectedCount}
          totalCount={filteredItems.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCancel={() => setSelectionMode(false)}
          onBulkAction={handleBulkAction}
          allSelected={allSelected}
          someSelected={someSelected}
        />
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: spacing[3],
        marginBottom: spacing[5],
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search items..."
          />
        </div>

        {/* Category Filter */}
        <Select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Categories' },
            ...categories.map(c => ({ value: c, label: c }))
          ]}
          style={{ minWidth: 150 }}
          aria-label="Filter by category"
        />

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'available', label: 'Available' },
            { value: 'checked-out', label: 'Checked Out' },
            { value: 'reserved', label: 'Reserved' },
            { value: 'needs-attention', label: 'Needs Attention' },
            { value: 'missing', label: 'Missing' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'low-stock', label: 'Low Stock' },
          ]}
          style={{ minWidth: 140 }}
          aria-label="Filter by status"
        />

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            style={{
              ...styles.btnSec,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[2]}px ${spacing[3]}px`,
              fontSize: typography.fontSize.sm,
              color: colors.textMuted,
            }}
            title="Clear all filters"
          >
            <X size={14} />
            Clear
          </button>
        )}

        {/* View Toggle */}
        <div style={{
          display: 'flex',
          background: `${withOpacity(colors.primary, 15)}`,
          borderRadius: borderRadius.lg
        }}>
          <button
            onClick={() => setIsGridView(true)}
            style={{
              ...styles.btnSec,
              border: 'none',
              padding: '12px 14px',
              background: isGridView ? `${withOpacity(colors.primary, 30)}` : 'transparent',
              color: isGridView ? colors.primary : colors.textSecondary,
            }}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setIsGridView(false)}
            style={{
              ...styles.btnSec,
              border: 'none',
              padding: '12px 14px',
              background: !isGridView ? `${withOpacity(colors.primary, 30)}` : 'transparent',
              color: !isGridView ? colors.primary : colors.textSecondary,
            }}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Grid View - Square Items */}
      {isGridView ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: spacing[4]
        }}>
          {paginatedItems.map(item => (
            <GridItem 
              key={item.id} 
              item={item} 
              onViewItem={onViewItem}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
          {paginatedItems.map(item => (
            <ListItem 
              key={item.id} 
              item={item} 
              onViewItem={onViewItem}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: spacing[10],
          color: colors.textMuted
        }}>
          No items found matching your criteria
        </div>
      )}

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[3],
          marginTop: spacing[5],
        }}>
          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Show:</span>
            <Select
              value={pageSize}
              onChange={e => setPageSize(parseInt(e.target.value, 10))}
              options={PAGE_SIZE_OPTIONS.map(size => ({ value: size, label: String(size) }))}
              style={{ width: 80 }}
              aria-label="Items per page"
            />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>items</span>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredItems.length}
            pageSize={pageSize}
            onPageChange={goToPage}
          />
        </div>
      )}
    </>
  );
}

export default memo(GearList);
