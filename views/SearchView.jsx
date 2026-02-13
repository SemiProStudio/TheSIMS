// ============================================================================
// Search View Component
// ============================================================================

import { memo, useMemo, useCallback } from 'react';
import { Search, Eye, X, Filter } from 'lucide-react';
import { STATUS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { getStatusColor } from '../utils';
import { Badge, Card, Button, SearchInput, PageHeader } from '../components/ui.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown.jsx';

const ALL_STATUSES = Object.values(STATUS);

function SearchView({
  inventory,
  categories,
  searchQuery,
  setSearchQuery,
  selectedCategories,
  setSelectedCategories,
  selectedStatuses,
  setSelectedStatuses,
  onViewItem
}) {
  // Filter inventory
  const filteredItems = useMemo(() => {
    let result = inventory;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(i => selectedCategories.includes(i.category));
    }

    if (selectedStatuses.length > 0) {
      result = result.filter(i => selectedStatuses.includes(i.status));
    }

    return result;
  }, [inventory, searchQuery, selectedCategories, selectedStatuses]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }, [setSearchQuery, setSelectedCategories, setSelectedStatuses]);

  const hasFilters = searchQuery.trim() || selectedCategories.length > 0 || selectedStatuses.length > 0;

  // Prepare options for dropdowns
  const categoryOptions = useMemo(() => 
    categories.map(cat => ({ value: cat, label: cat })),
    [categories]
  );

  const statusOptions = useMemo(() => 
    ALL_STATUSES.map(status => ({ value: status, label: status })),
    []
  );

  // Custom render for status options with badge
  const renderStatusOption = useCallback((option) => (
    <Badge text={option.label} color={getStatusColor(option.value)} size="sm" />
  ), []);

  return (
    <>
      <PageHeader title="Search" />

      {/* Filters Bar */}
      <Card style={{ marginBottom: spacing[4], padding: spacing[3] }}>
        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: spacing[1], 
              fontSize: typography.fontSize.sm, 
              fontWeight: typography.fontWeight.medium, 
              color: colors.textSecondary 
            }}>
              Search
            </label>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search by name, brand, or ID..."
            />
          </div>

          {/* Category Filter */}
          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <MultiSelectDropdown
              label="Categories"
              options={categoryOptions}
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
              placeholder="All categories"
            />
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 200px', minWidth: '160px' }}>
            <MultiSelectDropdown
              label="Status"
              options={statusOptions}
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="All statuses"
              renderOption={renderStatusOption}
            />
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <Button 
              variant="secondary" 
              onClick={clearAllFilters} 
              icon={X}
              style={{ flexShrink: 0 }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Active filter summary */}
        {hasFilters && (
          <div style={{ 
            marginTop: spacing[3], 
            paddingTop: spacing[3], 
            borderTop: `1px solid ${colors.borderLight}`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            flexWrap: 'wrap',
          }}>
            <Filter size={14} color={colors.textMuted} />
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
              Showing {filteredItems.length} of {inventory.length} items
            </span>
            {selectedCategories.length > 0 && (
              <Badge text={`${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'}`} color={colors.accent2} size="sm" />
            )}
            {selectedStatuses.length > 0 && (
              <Badge text={`${selectedStatuses.length} status${selectedStatuses.length > 1 ? 'es' : ''}`} color={colors.primary} size="sm" />
            )}
          </div>
        )}
      </Card>

      {/* Results */}
      <div style={{ marginBottom: spacing[3], color: colors.textMuted, fontSize: typography.fontSize.sm }}>
        {filteredItems.length} results
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
        {filteredItems.map(item => (
          <Card key={item.id} style={{ padding: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <div onClick={() => onViewItem(item.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[3], cursor: 'pointer' }}>
              {item.image ? (
                <OptimizedImage 
                  src={item.image} 
                  alt={item.name} 
                  size="thumbnail"
                  width={48} 
                  height={48} 
                  style={{ borderRadius: borderRadius.md }}
                  objectFit="cover"
                />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: `${withOpacity(colors.primary, 10)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: typography.fontSize.xs }}>No img</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: spacing[1], marginBottom: spacing[1], flexWrap: 'wrap' }}>
                  <Badge text={item.id} color={colors.primary} />
                  <Badge text={item.status} color={getStatusColor(item.status)} />
                  <Badge text={item.category} color={colors.accent2} />
                </div>
                <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{item.name}</div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{item.brand}</div>
              </div>
            </div>
            <button onClick={() => onViewItem(item.id)} className="btn-secondary" style={{ padding: spacing[2] }}>
              <Eye size={16} />
            </button>
          </Card>
        ))}
      </div>
      
      {filteredItems.length === 0 && (
        <Card style={{ textAlign: 'center', padding: spacing[10] }}>
          <Search size={48} color={colors.textMuted} style={{ marginBottom: spacing[3], opacity: 0.5 }} />
          <div style={{ color: colors.textMuted }}>No items found matching your filters</div>
          {hasFilters && (
            <Button variant="secondary" onClick={clearAllFilters} style={{ marginTop: spacing[3] }}>
              Clear Filters
            </Button>
          )}
        </Card>
      )}
    </>
  );
}

export default memo(SearchView);
