// ============================================================================
// Search View Component
// ============================================================================

import React, { memo, useMemo, useCallback } from 'react';
import { Search, Eye, X } from 'lucide-react';
import { STATUS } from './constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from './theme.js';
import { getStatusColor } from './utils.js';
import { Badge, Card, Button, SearchInput } from './components/ui.jsx';

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
  selectedIds,
  setSelectedIds,
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

  const toggleCategory = useCallback((cat) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, [setSelectedCategories]);

  const toggleStatus = useCallback((status) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  }, [setSelectedStatuses]);

  const toggleItem = useCallback((id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, [setSelectedIds]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
  }, [setSearchQuery, setSelectedCategories, setSelectedStatuses]);

  const hasFilters = searchQuery.trim() || selectedCategories.length > 0 || selectedStatuses.length > 0;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[6] }}>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>Search</h2>
        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
            <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>{selectedIds.length} selected</span>
            <Button variant="secondary" onClick={() => setSelectedIds([])} size="sm">Clear</Button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: spacing[5] }}>
        {/* Filters Sidebar */}
        <div>
          <Card padding={false}>
            {/* Search Input */}
            <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search..."
              />
            </div>

            {/* Categories */}
            <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                <span style={{ ...styles.label, marginBottom: 0 }}>Categories</span>
                {selectedCategories.length > 0 && (
                  <button onClick={() => setSelectedCategories([])} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: typography.fontSize.xs }}>Clear</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                {categories.map(cat => (
                  <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], padding: spacing[2], borderRadius: borderRadius.md, cursor: 'pointer', background: selectedCategories.includes(cat) ? `${withOpacity(colors.primary, 15)}` : 'transparent' }}>
                    <input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} style={{ accentColor: colors.primary }} />
                    <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm }}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Statuses */}
            <div style={{ padding: spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                <span style={{ ...styles.label, marginBottom: 0 }}>Status</span>
                {selectedStatuses.length > 0 && (
                  <button onClick={() => setSelectedStatuses([])} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: typography.fontSize.xs }}>Clear</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                {ALL_STATUSES.map(status => (
                  <label key={status} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], padding: spacing[2], borderRadius: borderRadius.md, cursor: 'pointer', background: selectedStatuses.includes(status) ? `${withOpacity(colors.primary, 15)}` : 'transparent' }}>
                    <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} style={{ accentColor: colors.primary }} />
                    <Badge text={status} color={getStatusColor(status)} size="sm" />
                  </label>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {hasFilters && (
              <div style={{ padding: spacing[4], borderTop: `1px solid ${colors.borderLight}` }}>
                <Button variant="secondary" fullWidth onClick={clearAllFilters} icon={X}>Remove All Filters</Button>
              </div>
            )}
          </Card>
        </div>

        {/* Results */}
        <div>
          <div style={{ marginBottom: spacing[3], color: colors.textMuted, fontSize: typography.fontSize.sm }}>
            {filteredItems.length} results
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
            {filteredItems.map(item => (
              <Card key={item.id} style={{ padding: spacing[3], display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => toggleItem(item.id)}
                  style={{ accentColor: colors.primary }}
                />
                <div onClick={() => onViewItem(item.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: spacing[3], cursor: 'pointer' }}>
                  {item.image ? (
                    <img src={item.image} alt="" style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: `${withOpacity(colors.primary, 10)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: typography.fontSize.xs }}>No img</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: spacing[1], marginBottom: spacing[1] }}>
                      <Badge text={item.id} color={colors.primary} />
                      <Badge text={item.status} color={getStatusColor(item.status)} />
                      <Badge text={item.category} color={colors.accent2} />
                    </div>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{item.name}</div>
                    <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{item.brand}</div>
                  </div>
                </div>
                <button onClick={() => onViewItem(item.id)} style={{ ...styles.btnSec, padding: spacing[2] }}><Eye size={16} /></button>
              </Card>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: spacing[10], color: colors.textMuted }}>No items found</div>
          )}
        </div>
      </div>
    </>
  );
}

export default memo(SearchView);
