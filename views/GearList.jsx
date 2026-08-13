// ============================================================================
// Gear List Component (formerly Inventory)
// Optimized for large datasets with pagination and debounced search
// Supports bulk selection for batch operations (synced to FilterContext so
// Export Data can export the selection), sorting, saved filter views
// (persisted per-user), and an explicit Kits filter.
// ============================================================================

import { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { STATUS_LABELS } from '../constants.js';
import {
  Plus,
  Grid,
  List,
  Check,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  X,
  Bookmark,
  BookmarkPlus,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import {
  colors,
  styles,
  spacing,
  borderRadius,
  typography,
  withOpacity,
  zIndex,
} from '../theme.js';
import {
  getStatusColor,
  filterBySearch,
  filterByCategory,
  matchesStatusSelection,
  formatDate,
  getTodayISO,
  generateId,
} from '../utils';
import {
  Badge,
  Card,
  Button,
  SearchInput,
  Pagination,
  PageHeader,
  ConfirmDialog,
} from '../components/ui.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { Select } from '../components/Select.jsx';
import { useDebounce, usePagination } from '../hooks/index.js';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { ViewOnlyBanner } from '../contexts/PermissionsContext.jsx';

// Items per page options
const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500];
const DEFAULT_PAGE_SIZE = 25;
const SAVED_VIEWS_KEY = 'sims-saved-filter-views';
const SORT_KEY = 'sims-gear-list-sort';

// Sentinel for the Kits entry in the category filter — kits are excluded from
// normal browsing (their contents are the individual items) but must stay
// discoverable somewhere. Underscored so a real category can't collide.
export const KITS_FILTER = '__kits__';

const SEARCH_FIELDS = ['name', 'brand', 'id', 'serialNumber'];

export const SORT_OPTIONS = [
  { value: 'default', label: 'Category (default)' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
  { value: 'id-asc', label: 'ID' },
  { value: 'brand-asc', label: 'Brand' },
  { value: 'value-desc', label: 'Value: high to low' },
  { value: 'value-asc', label: 'Value: low to high' },
];

export function sortItems(items, sortBy) {
  if (!sortBy || sortBy === 'default') return items;
  const sorted = [...items];
  const val = (i) => i.currentValue || i.purchasePrice || 0;
  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      break;
    case 'name-desc':
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
      break;
    case 'id-asc':
      sorted.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      break;
    case 'brand-asc':
      sorted.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
      break;
    case 'value-desc':
      sorted.sort((a, b) => val(b) - val(a));
      break;
    case 'value-asc':
      sorted.sort((a, b) => val(a) - val(b));
      break;
    default:
      break;
  }
  return sorted;
}

// Checkbox component for consistent styling (real checkbox semantics)
const Checkbox = memo(function Checkbox({ checked, indeterminate, onChange, size = 20, label }) {
  const Icon = indeterminate ? MinusSquare : checked ? CheckSquare : Square;
  return (
    <button
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked, e);
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
  activeViewId,
  onLoadView,
  onSaveView,
  onDeleteView,
  hasActiveFilters,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const dropdownRef = useRef(null);

  const activeView = savedViews.find((v) => v.id === activeViewId);

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

  const nameExists = savedViews.some(
    (v) => v.name.toLowerCase() === newViewName.trim().toLowerCase(),
  );

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          cursor: 'pointer',
          minWidth: 140,
          fontWeight: 500,
          ...(activeView && { color: colors.primary }),
        }}
      >
        <Bookmark size={16} />
        <span
          style={{
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeView ? activeView.name : 'Saved Views'}
        </span>
        <ChevronDown size={16} style={{ marginLeft: 'auto' }} />
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
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
          }}
        >
          {/* Save Current View */}
          {hasActiveFilters && (
            <div
              style={{
                padding: spacing[2],
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {showSaveDialog ? (
                <div>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <input
                      type="text"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
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
                        color: 'var(--on-primary)',
                        border: 'none',
                        borderRadius: borderRadius.md,
                        padding: `${spacing[1]}px ${spacing[2]}px`,
                        cursor: newViewName.trim() ? 'pointer' : 'not-allowed',
                        opacity: newViewName.trim() ? 1 : 0.5,
                      }}
                    >
                      {nameExists ? 'Update' : 'Save'}
                    </button>
                  </div>
                  {nameExists && (
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                        marginTop: spacing[1],
                      }}
                    >
                      A view with this name exists — it will be updated.
                    </div>
                  )}
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
              {savedViews.map((view) => (
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
                    ...(view.id === activeViewId && {
                      background: `${withOpacity(colors.primary, 12)}`,
                    }),
                  }}
                >
                  {view.id === activeViewId && <Check size={14} color={colors.primary} />}
                  <div
                    style={{ flex: 1 }}
                    onClick={() => {
                      onLoadView(view);
                      setIsOpen(false);
                    }}
                  >
                    <div
                      style={{
                        fontWeight: typography.fontWeight.medium,
                        color: view.id === activeViewId ? colors.primary : colors.textPrimary,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {view.name}
                    </div>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {[
                        view.filters.search && `"${view.filters.search}"`,
                        view.filters.category === KITS_FILTER
                          ? 'Kits'
                          : view.filters.category !== 'all' && view.filters.category,
                        view.filters.status !== 'all' && view.filters.status,
                        view.filters.sort &&
                          view.filters.sort !== 'default' &&
                          SORT_OPTIONS.find((o) => o.value === view.filters.sort)?.label,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'No filters'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteView(view);
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
                    aria-label={`Delete saved view ${view.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: spacing[4],
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
            >
              {hasActiveFilters
                ? 'No saved views yet. Save your current filters above!'
                : 'No saved views. Apply filters and save them for quick access.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Memoized grid item component for performance
const GridItem = memo(function GridItem({
  item,
  onViewItem,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  return (
    <Card
      aria-label={`${item.name} - ${item.status}${isSelected ? ', selected' : ''}`}
      onClick={(e) => (selectionMode ? onToggleSelect(item.id, e) : onViewItem(item.id))}
      padding={false}
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        display: 'flex',
        flexDirection: 'column',
        outline: isSelected ? `2px solid ${colors.primary}` : 'none',
        outlineOffset: '-2px',
        ...(selectionMode && { userSelect: 'none' }),
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
            <Checkbox
              checked={isSelected}
              onChange={(next, e) => onToggleSelect(item.id, e)}
              size={22}
              label={`Select ${item.name}`}
            />
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
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `${withOpacity(colors.primary, 10)}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
            }}
          >
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
              No Image
            </span>
          </div>
        )}
      </div>

      {/* Info area - 40% height */}
      <div
        style={{
          flex: 1,
          padding: spacing[3],
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              gap: spacing[1],
              marginBottom: spacing[1],
              flexWrap: 'wrap',
            }}
          >
            <Badge text={item.id} color={colors.primary} size="xs" />
            <Badge text={item.status} color={getStatusColor(item.status)} size="xs" />
            {item.isKit && <Badge text="Kit" color={colors.accent1} size="xs" />}
          </div>
          <h4
            style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: colors.textPrimary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.name}
          </h4>
        </div>
        <div
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.textMuted,
          }}
        >
          {item.brand}
        </div>
      </div>
    </Card>
  );
});

// Memoized list item component for performance
const ListItem = memo(function ListItem({
  item,
  onViewItem,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const isOverdue =
    item.status === 'checked-out' && item.dueBack && item.dueBack < getTodayISO();
  return (
    <Card
      aria-label={`${item.name} - ${item.status}${isSelected ? ', selected' : ''}`}
      onClick={(e) => (selectionMode ? onToggleSelect(item.id, e) : onViewItem(item.id))}
      style={{
        cursor: 'pointer',
        padding: spacing[3],
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        outline: isSelected ? `2px solid ${colors.primary}` : 'none',
        outlineOffset: '-2px',
        ...(selectionMode && { userSelect: 'none' }),
      }}
    >
      {selectionMode && (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onChange={(next, e) => onToggleSelect(item.id, e)}
            size={22}
            label={`Select ${item.name}`}
          />
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
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: borderRadius.md,
            background: `${withOpacity(colors.primary, 10)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            flexShrink: 0,
          }}
        >
          No img
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            gap: spacing[1],
            marginBottom: spacing[1],
            flexWrap: 'wrap',
          }}
        >
          <Badge text={item.id} color={colors.primary} />
          <Badge text={item.status} color={getStatusColor(item.status)} />
          <Badge text={item.category} color={colors.accent2} />
          {item.isKit && <Badge text="Kit" color={colors.accent1} />}
          {isOverdue && <Badge text="Overdue" color={colors.danger} />}
        </div>
        <div
          style={{
            fontWeight: typography.fontWeight.medium,
            color: colors.textPrimary,
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textMuted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {[item.brand, item.location, item.condition].filter(Boolean).join(' • ')}
        </div>
        {item.status === 'checked-out' && (
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: isOverdue ? colors.danger : colors.checkedOut,
              marginTop: 2,
            }}
          >
            {item.checkedOutTo || 'Unknown'}
            {item.dueBack ? ` • Due ${formatDate(item.dueBack)}` : ''}
          </div>
        )}
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
  onExportSelection,
  allSelected,
  someSelected,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[3],
        background: `${withOpacity(colors.primary, 15)}`,
        borderRadius: borderRadius.lg,
        marginBottom: spacing[4],
        flexWrap: 'wrap',
      }}
    >
      {/* Select all checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={() => (allSelected ? onDeselectAll() : onSelectAll())}
          label="Select all items"
        />
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
          {selectedCount} of {totalCount} selected
        </span>
      </div>

      {/* Bulk action buttons */}
      {selectedCount > 0 && (
        <div
          style={{
            display: 'flex',
            gap: spacing[2],
            flex: 1,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
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
          <Button size="sm" variant="secondary" icon={Download} onClick={onExportSelection}>
            Export
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
  onBulkAction,
  onExportSelection, // opens the inventory export modal (selection-scoped)
  onSelectionChange, // syncs selection to FilterContext (Export Data scope)
  savedViews: savedViewsProp, // per-user saved views (profile-persisted)
  onChangeSavedViews,
}) {
  // Permissions
  const { canEdit } = usePermissions();
  const canEditGearList = canEdit('gear_list');

  // Page size state with localStorage persistence
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('sims-gear-list-page-size');
    return saved ? parseInt(saved, 10) : DEFAULT_PAGE_SIZE;
  });

  // Sort state with localStorage persistence
  const [sortBy, setSortBy] = useState(() => {
    const saved = localStorage.getItem(SORT_KEY);
    return SORT_OPTIONS.some((o) => o.value === saved) ? saved : 'default';
  });
  useEffect(() => {
    localStorage.setItem(SORT_KEY, sortBy);
  }, [sortBy]);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const lastToggledIdRef = useRef(null);

  // Saved views: per-user (profile) when provided; falls back to the legacy
  // localStorage store so pre-existing views survive the migration.
  const [savedViews, setSavedViews] = useState(() => {
    if (savedViewsProp !== undefined && savedViewsProp !== null) return savedViewsProp;
    try {
      const saved = localStorage.getItem(SAVED_VIEWS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [viewPendingDelete, setViewPendingDelete] = useState(null);

  const persistViews = useCallback(
    (next) => {
      setSavedViews(next);
      onChangeSavedViews?.(next);
      // Keep the legacy store in sync for sessions without profile persistence
      localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
    },
    [onChangeSavedViews],
  );

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'default';

  // Save (or update, when the name already exists) the current filters
  const saveCurrentView = useCallback(
    (name) => {
      const filters = {
        search: searchQuery,
        category: categoryFilter,
        status: statusFilter,
        sort: sortBy,
      };
      const existing = savedViews.find((v) => v.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        persistViews(savedViews.map((v) => (v.id === existing.id ? { ...v, filters } : v)));
      } else {
        persistViews([
          ...savedViews,
          { id: generateId(), name, filters, createdAt: new Date().toISOString() },
        ]);
      }
    },
    [searchQuery, categoryFilter, statusFilter, sortBy, savedViews, persistViews],
  );

  // Load a saved view
  const loadView = useCallback(
    (view) => {
      setSearchQuery(view.filters.search || '');
      setCategoryFilter(view.filters.category || 'all');
      setStatusFilter(view.filters.status || 'all');
      setSortBy(
        SORT_OPTIONS.some((o) => o.value === view.filters.sort) ? view.filters.sort : 'default',
      );
    },
    [setSearchQuery, setCategoryFilter, setStatusFilter],
  );

  // The saved view whose filters exactly match the current state
  const activeViewId = useMemo(() => {
    return savedViews.find(
      (v) =>
        (v.filters.search || '') === (searchQuery || '') &&
        (v.filters.category || 'all') === categoryFilter &&
        (v.filters.status || 'all') === statusFilter &&
        (v.filters.sort || 'default') === sortBy,
    )?.id;
  }, [savedViews, searchQuery, categoryFilter, statusFilter, sortBy]);

  // Save page size to localStorage
  useEffect(() => {
    localStorage.setItem('sims-gear-list-page-size', pageSize.toString());
  }, [pageSize]);

  // Debounce search for performance with large datasets
  const debouncedSearch = useDebounce(searchQuery, 200);

  // Filter inventory with debounced search
  const filteredItems = useMemo(() => {
    // Kits are excluded from normal browsing (their contents are the real
    // items) but shown exclusively under the Kits filter entry.
    let result =
      categoryFilter === KITS_FILTER
        ? inventory.filter((item) => item.isKit)
        : inventory.filter((item) => !item.isKit);

    result = filterBySearch(result, debouncedSearch, SEARCH_FIELDS);
    if (categoryFilter !== KITS_FILTER) {
      result = filterByCategory(result, categoryFilter);
    }

    // Shared matcher handles the computed states (overdue, low-stock) that
    // plain status equality can't
    if (statusFilter !== 'all') {
      result = result.filter((item) =>
        matchesStatusSelection(item, [statusFilter], categorySettings),
      );
    }

    return result;
  }, [inventory, debouncedSearch, categoryFilter, statusFilter, categorySettings]);

  // Sort after filtering; pagination consumes the sorted list
  const sortedItems = useMemo(() => sortItems(filteredItems, sortBy), [filteredItems, sortBy]);

  // Filtered item IDs for selection operations
  const filteredIds = useMemo(() => new Set(filteredItems.map((i) => i.id)), [filteredItems]);

  // Clear selection when exiting selection mode or when filters change
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set());
      lastToggledIdRef.current = null;
    }
  }, [selectionMode]);

  // Clear invalid selections when filters change
  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set([...prev].filter((id) => filteredIds.has(id)));
      return validIds.size !== prev.size ? validIds : prev;
    });
  }, [filteredIds]);

  // Sync the selection to FilterContext so Export Data can scope to it —
  // and clear it on unmount so a stale selection can't leak into an export
  // started from another view.
  useEffect(() => {
    onSelectionChange?.(selectionMode ? [...selectedIds] : []);
  }, [selectedIds, selectionMode, onSelectionChange]);

  // Selection helpers. Shift-click selects the range between the last
  // toggled item and the clicked one (in the current sorted order).
  const toggleSelect = useCallback(
    (id, event) => {
      // Read the modifier synchronously — state updaters run after the
      // event's lifetime, when synthetic-event fields are no longer reliable.
      const isRangeSelect =
        !!event?.shiftKey && !!lastToggledIdRef.current && lastToggledIdRef.current !== id;
      if (isRangeSelect) {
        const ids = sortedItems.map((i) => i.id);
        const from = ids.indexOf(lastToggledIdRef.current);
        const to = ids.indexOf(id);
        if (from !== -1 && to !== -1) {
          const [start, end] = from < to ? [from, to] : [to, from];
          const range = ids.slice(start, end + 1);
          setSelectedIds((prev) => new Set([...prev, ...range]));
          lastToggledIdRef.current = id;
          return;
        }
      }
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
      lastToggledIdRef.current = id;
    },
    [sortedItems],
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  }, [filteredItems]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback(
    (action) => {
      if (onBulkAction && selectedIds.size > 0) {
        onBulkAction(action, [...selectedIds]);
      }
    },
    [onBulkAction, selectedIds],
  );

  // Selection stats
  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === filteredItems.length && filteredItems.length > 0;
  const someSelected = selectedCount > 0;

  // Pagination
  const { page, totalPages, paginatedItems, goToPage } = usePagination(sortedItems, pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch, categoryFilter, statusFilter, sortBy, pageSize, goToPage]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSortBy('default');
  }, [setSearchQuery, setCategoryFilter, setStatusFilter]);

  return (
    <>
      {/* View-only banner */}
      {!canEditGearList && <ViewOnlyBanner functionId="gear_list" />}

      {/* Header */}
      <PageHeader
        title="Gear List"
        subtitle={`${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'}${hasActiveFilters ? ' (filtered)' : ''}`}
        action={
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
            {canEditGearList && (
              <Button onClick={onAddItem} icon={Plus}>
                Add Item
              </Button>
            )}
            <SavedViewsDropdown
              savedViews={savedViews}
              activeViewId={activeViewId}
              onLoadView={loadView}
              onSaveView={saveCurrentView}
              onDeleteView={setViewPendingDelete}
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
        }
      />

      {/* Selection Toolbar */}
      {selectionMode && (
        <SelectionToolbar
          selectedCount={selectedCount}
          totalCount={filteredItems.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onCancel={() => setSelectionMode(false)}
          onBulkAction={handleBulkAction}
          onExportSelection={onExportSelection}
          allSelected={allSelected}
          someSelected={someSelected}
        />
      )}

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: spacing[3],
          marginBottom: spacing[5],
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Search - left side */}
        <div style={{ minWidth: 200, maxWidth: 400, flex: '1 1 200px' }}>
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder="Search name, ID, brand, serial..."
          />
        </div>

        {/* Right side controls */}
        <div
          style={{
            display: 'flex',
            gap: spacing[3],
            alignItems: 'center',
            flexWrap: 'wrap',
            marginLeft: 'auto',
          }}
        >
          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                ...styles.btnSec,
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1],
                padding: '12px 14px',
                fontSize: typography.fontSize.sm,
                color: colors.textMuted,
              }}
              title="Clear all filters"
            >
              <X size={14} />
              Clear
            </button>
          )}

          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Categories' },
              ...categories.map((c) => ({ value: c, label: c })),
              { value: KITS_FILTER, label: 'Kits' },
            ]}
            style={{ minWidth: 150 }}
            aria-label="Filter by category"
          />

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
            style={{ minWidth: 140 }}
            aria-label="Filter by status"
          />

          {/* Sort */}
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={SORT_OPTIONS}
            style={{ minWidth: 170 }}
            aria-label="Sort items"
          />

          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              background: `${withOpacity(colors.primary, 15)}`,
              borderRadius: borderRadius.lg,
            }}
          >
            <button
              onClick={() => setIsGridView(true)}
              aria-label="Grid view"
              aria-pressed={isGridView}
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
              aria-label="List view"
              aria-pressed={!isGridView}
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
      </div>

      {/* Grid View - Square Items */}
      {isGridView ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: spacing[4],
          }}
        >
          {paginatedItems.map((item) => (
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
          {paginatedItems.map((item) => (
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
        <div
          style={{
            textAlign: 'center',
            padding: spacing[10],
            color: colors.textMuted,
          }}
        >
          <p style={{ marginBottom: spacing[4] }}>No items found matching your criteria</p>
          {hasActiveFilters ? (
            <Button variant="secondary" onClick={clearFilters} icon={X}>
              Clear Filters
            </Button>
          ) : (
            canEditGearList && (
              <Button onClick={onAddItem} icon={Plus}>
                Add Item
              </Button>
            )
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing[3],
            marginTop: spacing[5],
          }}
        >
          {/* Page size selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>Show:</span>
            <Select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: String(size) }))}
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

      {/* Saved view delete confirmation */}
      <ConfirmDialog
        isOpen={!!viewPendingDelete}
        title="Delete Saved View"
        message={
          viewPendingDelete ? `Delete the saved view "${viewPendingDelete.name}"?` : ''
        }
        confirmText="Delete"
        onConfirm={() => {
          persistViews(savedViews.filter((v) => v.id !== viewPendingDelete.id));
          setViewPendingDelete(null);
        }}
        onCancel={() => setViewPendingDelete(null)}
      />
    </>
  );
}

export default memo(GearList);
