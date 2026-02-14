// ============================================================================
// Change Log Component
// Tracks and displays all changes made to items, kits, and packages
// ============================================================================

import { memo, useState, useMemo, useCallback } from 'react';
import { History, Package, ChevronRight, Clock, User, Edit2, Plus, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDateTime } from '../utils';
import { Card, Button, SearchInput, Badge, BackButton, PageHeader } from '../components/ui.jsx';

// Change type icons and colors
const CHANGE_TYPE_CONFIG = {
  created: { icon: Plus, color: colors.success, label: 'Created' },
  updated: { icon: Edit2, color: colors.primary, label: 'Updated' },
  deleted: { icon: Trash2, color: colors.danger, label: 'Deleted' },
  status_change: { icon: RefreshCw, color: colors.warning, label: 'Status Changed' },
  checkout: { icon: ArrowRight, color: colors.checkedOut, label: 'Checked Out' },
  checkin: { icon: RefreshCw, color: colors.available, label: 'Checked In' },
  bulk_update: { icon: Edit2, color: colors.accent1, label: 'Bulk Update' },
  bulk_delete: { icon: Trash2, color: colors.danger, label: 'Bulk Delete' },
  reservation_added: { icon: Plus, color: colors.reserved, label: 'Reservation Added' },
  reservation_removed: { icon: Trash2, color: colors.textMuted, label: 'Reservation Removed' },
  maintenance: { icon: Edit2, color: colors.warning, label: 'Maintenance Updated' },
  value_updated: { icon: Edit2, color: colors.accent2, label: 'Value Updated' },
};

// Format field value for display
const formatFieldValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Change entry component
const ChangeEntry = memo(function ChangeEntry({ change, onViewItem, isExpanded }) {
  const config = CHANGE_TYPE_CONFIG[change.type] || CHANGE_TYPE_CONFIG.updated;
  const Icon = config.icon;
  
  return (
    <div style={{
      padding: spacing[3],
      borderBottom: `1px solid ${colors.border}`,
      background: isExpanded ? `${withOpacity(colors.primary, 5)}` : 'transparent',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
      }}>
        {/* Icon */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: borderRadius.md,
          background: withOpacity(config.color, 15),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={18} style={{ color: config.color }} />
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' }}>
            <Badge text={config.label} color={config.color} size="sm" />
            {change.itemId && (
              <button
                onClick={() => onViewItem(change.itemId, change.itemType)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: colors.primary,
                  fontWeight: typography.fontWeight.medium,
                  fontSize: typography.fontSize.sm,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[1],
                }}
              >
                {change.itemType === 'package' ? <Package size={14} /> : null}
                {change.itemId}
                {change.itemName && ` - ${change.itemName}`}
              </button>
            )}
          </div>
          
          {/* Description */}
          <p style={{ 
            margin: `${spacing[1]}px 0 0`, 
            color: colors.textPrimary,
            fontSize: typography.fontSize.sm,
          }}>
            {change.description}
          </p>
          
          {/* Field changes */}
          {change.changes && change.changes.length > 0 && (
            <div style={{
              marginTop: spacing[2],
              padding: spacing[2],
              background: colors.bgDark,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.xs,
            }}>
              {change.changes.map((fieldChange, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  gap: spacing[2],
                  padding: `${spacing[1]}px 0`,
                  borderBottom: idx < change.changes.length - 1 ? `1px solid ${colors.border}` : 'none',
                }}>
                  <span style={{ color: colors.textMuted, minWidth: 100 }}>{fieldChange.field}:</span>
                  <span style={{ color: colors.danger, textDecoration: 'line-through' }}>
                    {formatFieldValue(fieldChange.oldValue)}
                  </span>
                  <span style={{ color: colors.textMuted }}>→</span>
                  <span style={{ color: colors.success }}>
                    {formatFieldValue(fieldChange.newValue)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Meta info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
            marginTop: spacing[2],
            fontSize: typography.fontSize.xs,
            color: colors.textMuted,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
              <Clock size={12} />
              {formatDateTime(change.timestamp)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
              <User size={12} />
              {change.user || 'System'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

// Item history view
const ItemHistoryView = memo(function ItemHistoryView({ item, changes, onBack, onViewItem }) {
  if (!item) return null;
  
  const itemChanges = changes.filter(c => c.itemId === item.id);
  
  return (
    <div>
      <BackButton onClick={onBack} label="Back to Change Log" />
      
      <Card style={{ marginTop: spacing[4] }}>
        <div style={{
          padding: spacing[4],
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.lg,
            background: `${withOpacity(colors.primary, 15)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <History size={24} style={{ color: colors.primary }} />
          </div>
          <div>
            <h3 style={{ margin: 0, color: colors.textPrimary }}>{item.name}</h3>
            <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
              {item.id} • {itemChanges.length} change{itemChanges.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>
        
        {itemChanges.length > 0 ? (
          <div>
            {itemChanges.map((change, idx) => (
              <ChangeEntry 
                key={change.id || idx} 
                change={change} 
                onViewItem={onViewItem}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: spacing[6],
            textAlign: 'center',
            color: colors.textMuted,
          }}>
            No changes recorded for this item.
          </div>
        )}
      </Card>
    </div>
  );
});

// Search result item
const SearchResultItem = memo(function SearchResultItem({ item, onClick, changeCount }) {
  const isPackage = item.type === 'package';
  
  return (
    <button
      onClick={onClick}
      className="list-item-hover"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        width: '100%',
        padding: spacing[3],
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        background: isPackage ? `${withOpacity(colors.accent1, 15)}` : `${withOpacity(colors.primary, 15)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {isPackage ? <Package size={18} style={{ color: colors.accent1 }} /> : <History size={18} style={{ color: colors.primary }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
          {item.name}
        </div>
        <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
          {item.id} • {item.category || item.type}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
          {changeCount} change{changeCount !== 1 ? 's' : ''}
        </span>
        <ChevronRight size={16} style={{ color: colors.textMuted }} />
      </div>
    </button>
  );
});

// Main Change Log Component
function ChangeLog({ 
  changeLog = [], 
  inventory = [], 
  packages = [], 
  onViewItem,
  onBack,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Get recent changes (last 10)
  const recentChanges = useMemo(() => {
    return [...changeLog]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [changeLog]);
  
  // Combine inventory and packages for search
  const allItems = useMemo(() => {
    const items = inventory.map(i => ({ ...i, type: 'item' }));
    const pkgs = packages.map(p => ({ ...p, type: 'package' }));
    return [...items, ...pkgs];
  }, [inventory, packages]);
  
  // Get change counts per item
  const changeCounts = useMemo(() => {
    const counts = {};
    changeLog.forEach(change => {
      if (change.itemId) {
        counts[change.itemId] = (counts[change.itemId] || 0) + 1;
      }
    });
    return counts;
  }, [changeLog]);
  
  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allItems
      .filter(item => 
        item.id?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, allItems]);
  
  // Handle view item from change entry
  const handleViewItem = useCallback((itemId, _itemType) => {
    const item = allItems.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
    }
  }, [allItems]);
  
  // Handle search result click
  const handleSearchResultClick = useCallback((item) => {
    setSelectedItem(item);
    setSearchQuery('');
  }, []);
  
  // If viewing item history
  if (selectedItem) {
    return (
      <ItemHistoryView
        item={selectedItem}
        changes={changeLog}
        onBack={() => setSelectedItem(null)}
        onViewItem={handleViewItem}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Change Log"
        subtitle="Track all changes made to items, kits, and packages"
        onBack={onBack}
        backLabel="Back to Admin"
      />
      
      {/* Search Section */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[4] }}>
          <label style={{
            display: 'block',
            marginBottom: spacing[2],
            fontWeight: typography.fontWeight.medium,
            color: colors.textPrimary,
            fontSize: typography.fontSize.sm,
          }}>
            Search Items, Kits & Packages
          </label>
          <div style={{ position: 'relative' }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search by ID, name, or brand..."
            />
          </div>
        </div>
        
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ borderTop: `1px solid ${colors.border}` }}>
            {searchResults.map(item => (
              <SearchResultItem
                key={item.id}
                item={item}
                onClick={() => handleSearchResultClick(item)}
                changeCount={changeCounts[item.id] || 0}
              />
            ))}
          </div>
        )}
        
        {searchQuery && searchResults.length === 0 && (
          <div style={{
            padding: spacing[4],
            textAlign: 'center',
            color: colors.textMuted,
            borderTop: `1px solid ${colors.border}`,
          }}>
            No items, kits or packages found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </Card>
      
      {/* Recent Changes */}
      <Card>
        <div style={{
          padding: spacing[4],
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Clock size={18} style={{ color: colors.primary }} />
            <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: typography.fontSize.lg }}>
              Recent Changes
            </h3>
          </div>
          <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
            Last 10 changes
          </span>
        </div>
        
        {recentChanges.length > 0 ? (
          <div>
            {recentChanges.map((change, idx) => (
              <ChangeEntry
                key={change.id || idx}
                change={change}
                onViewItem={handleViewItem}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: spacing[6],
            textAlign: 'center',
            color: colors.textMuted,
          }}>
            <History size={48} style={{ opacity: 0.3, marginBottom: spacing[3] }} />
            <p style={{ margin: 0 }}>No changes recorded yet.</p>
            <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.sm }}>
              Changes to items, kits, and packages will appear here.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}

export default memo(ChangeLog);
