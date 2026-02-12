// ============================================================================
// Kit Section Component
// Displays and manages kit/container parent-child relationships
// ============================================================================

import React, { memo, useState, useMemo } from 'react';
import { 
  Package, Plus, X, ChevronRight, Box, Layers, Link2, Unlink,
  Search, AlertTriangle
} from 'lucide-react';
import { KIT_TYPES } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatMoney, getStatusColor } from '../utils';
import { Badge, Card, CardHeader, Button, SearchInput } from './ui.jsx';

// Get kit type label
const getKitTypeLabel = (type) => {
  switch (type) {
    case KIT_TYPES.KIT: return 'Kit';
    case KIT_TYPES.CONTAINER: return 'Container';
    case KIT_TYPES.BUNDLE: return 'Bundle';
    default: return 'Kit';
  }
};

// Get kit type color
const getKitTypeColor = (type) => {
  switch (type) {
    case KIT_TYPES.KIT: return colors.primary;
    case KIT_TYPES.CONTAINER: return colors.accent2;
    case KIT_TYPES.BUNDLE: return colors.accent1;
    default: return colors.primary;
  }
};

// Item preview component
const ItemPreview = memo(function ItemPreview({ item, onRemove, onView, showRemove = true }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        padding: spacing[2],
        background: colors.bgLight,
        borderRadius: borderRadius.md,
        marginBottom: spacing[2],
      }}
    >
      {/* Image */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: borderRadius.sm,
          background: `${withOpacity(colors.primary, 15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {item.image ? (
          <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={16} color={colors.textMuted} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: typography.fontSize.sm, 
          color: colors.textPrimary,
          fontWeight: typography.fontWeight.medium,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {item.name}
        </div>
        <div style={{ 
          fontSize: typography.fontSize.xs, 
          color: colors.textMuted,
          display: 'flex',
          gap: spacing[1],
          alignItems: 'center',
        }}>
          <span>{item.id}</span>
          <span>•</span>
          <Badge text={item.status} color={getStatusColor(item.status)} size="xs" />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing[1] }}>
        {onView && (
          <button
            onClick={() => onView(item.id)}
            style={{
              ...styles.btnSec,
              padding: spacing[1],
            }}
          >
            <ChevronRight size={14} />
          </button>
        )}
        {showRemove && onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            style={{
              ...styles.btnSec,
              padding: spacing[1],
              color: colors.danger,
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

// Add items modal/panel
const AddItemsPanel = memo(function AddItemsPanel({ 
  inventory, 
  currentItemId,
  existingChildIds,
  onAdd, 
  onClose 
}) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter available items (not self, not already in kit, not another kit's child)
  const availableItems = useMemo(() => {
    const query = search.toLowerCase();
    return inventory.filter(item => {
      // Exclude self
      if (item.id === currentItemId) return false;
      // Exclude already in this kit
      if (existingChildIds.includes(item.id)) return false;
      // Exclude items that are already children of another kit
      if (item.parentKitId && item.parentKitId !== currentItemId) return false;
      // Exclude items that are kits with their own children (prevent deep nesting)
      if (item.isKit && item.childItemIds && item.childItemIds.length > 0) return false;
      // Search filter
      if (query && !item.name.toLowerCase().includes(query) && 
          !item.id.toLowerCase().includes(query) &&
          !item.brand.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  }, [inventory, currentItemId, existingChildIds, search]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    onClose();
  };

  return (
    <div style={{
      padding: spacing[4],
      background: `${withOpacity(colors.primary, 5)}`,
      borderRadius: borderRadius.lg,
      border: `1px solid ${withOpacity(colors.primary, 20)}`,
      marginBottom: spacing[4],
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
        <h4 style={{ margin: 0, color: colors.textPrimary }}>Add Items to Kit</h4>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}
        >
          <X size={18} />
        </button>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search items..."
        style={{ marginBottom: spacing[3] }}
      />

      <div style={{ 
        maxHeight: 250, 
        overflowY: 'auto', 
        marginBottom: spacing[3],
        border: `1px solid ${colors.borderLight}`,
        borderRadius: borderRadius.md,
      }}>
        {availableItems.length === 0 ? (
          <p style={{ 
            color: colors.textMuted, 
            textAlign: 'center', 
            padding: spacing[4],
            margin: 0,
            fontSize: typography.fontSize.sm,
          }}>
            No available items found
          </p>
        ) : (
          availableItems.map(item => (
            <div
              key={item.id}
              onClick={() => toggleSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: spacing[2],
                borderBottom: `1px solid ${colors.borderLight}`,
                cursor: 'pointer',
                background: selectedIds.includes(item.id) ? `${withOpacity(colors.primary, 15)}` : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                style={{ width: 16, height: 16 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                  {item.name}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                  {item.id} • {item.category}
                </div>
              </div>
              <Badge text={item.status} color={getStatusColor(item.status)} size="xs" />
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose} size="sm">Cancel</Button>
        <Button 
          onClick={handleAdd} 
          disabled={selectedIds.length === 0}
          icon={Plus}
          size="sm"
        >
          Add {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
        </Button>
      </div>
    </div>
  );
});

// Main Kit Section component
function KitSection({ 
  item, 
  inventory,
  onAddToKit,
  onRemoveFromKit,
  onSetAsKit,
  onClearKit,
  onViewItem,
}) {
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Get child items
  const childItems = useMemo(() => {
    if (!item.isKit || !item.childItemIds) return [];
    return item.childItemIds
      .map(id => inventory.find(i => i.id === id))
      .filter(Boolean);
  }, [item, inventory]);

  // Get parent kit if this item is part of one
  const parentKit = useMemo(() => {
    if (!item.parentKitId) return null;
    return inventory.find(i => i.id === item.parentKitId);
  }, [item, inventory]);

  // Calculate total kit value
  const kitValue = useMemo(() => {
    if (!item.isKit) return 0;
    const childValue = childItems.reduce((sum, child) => sum + (child.currentValue || 0), 0);
    return (item.currentValue || 0) + childValue;
  }, [item, childItems]);

  // Check if all children are available
  const allChildrenAvailable = useMemo(() => {
    return childItems.every(child => child.status === 'available');
  }, [childItems]);

  return (
    <Card padding={false}>
      <CardHeader
        title={item.isKit ? `Kit Contents (${childItems.length})` : 'Kit / Container'}
        icon={item.isKit ? Layers : Package}
        action={
          item.isKit ? (
            <button
              onClick={() => setShowAddPanel(true)}
              style={{
                ...styles.btn,
                padding: spacing[1],
                fontSize: typography.fontSize.xs,
              }}
            >
              <Plus size={14} />
            </button>
          ) : null
        }
      />
      <div style={{ padding: spacing[4] }}>
        {/* Parent kit info (if this item is part of a kit) */}
        {parentKit && (
          <div style={{
            padding: spacing[3],
            background: `${withOpacity(colors.accent2, 10)}`,
            borderRadius: borderRadius.md,
            marginBottom: spacing[3],
            border: `1px solid ${withOpacity(colors.accent2, 30)}`,
          }}>
            <div style={{ 
              fontSize: typography.fontSize.xs, 
              color: colors.textMuted, 
              marginBottom: spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
            }}>
              <Link2 size={12} />
              Part of Kit
            </div>
            <div 
              onClick={() => onViewItem(parentKit.id)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: spacing[2],
                cursor: 'pointer',
              }}
            >
              <span style={{ 
                fontSize: typography.fontSize.sm, 
                color: colors.textPrimary,
                fontWeight: typography.fontWeight.medium,
              }}>
                {parentKit.name}
              </span>
              <Badge text={parentKit.id} color={colors.accent2} size="xs" />
              <ChevronRight size={14} color={colors.textMuted} />
            </div>
          </div>
        )}

        {/* Kit contents (if this is a kit) */}
        {item.isKit && (
          <>
            {/* Kit info banner */}
            <div style={{
              display: 'flex',
              gap: spacing[3],
              marginBottom: spacing[3],
              padding: spacing[3],
              background: withOpacity(getKitTypeColor(item.kitType), 10),
              borderRadius: borderRadius.md,
            }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                  {childItems.length}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Items</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.available }}>
                  {formatMoney(kitValue)}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Value</div>
              </div>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ 
                  fontSize: typography.fontSize.lg, 
                  fontWeight: typography.fontWeight.bold, 
                  color: allChildrenAvailable ? colors.available : colors.checkedOut 
                }}>
                  {allChildrenAvailable ? '✓' : '!'}
                </div>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                  {allChildrenAvailable ? 'Ready' : 'Partial'}
                </div>
              </div>
            </div>

            {/* Warning if not all available */}
            {!allChildrenAvailable && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: spacing[2],
                background: `${withOpacity(colors.checkedOut, 15)}`,
                borderRadius: borderRadius.md,
                marginBottom: spacing[3],
                fontSize: typography.fontSize.xs,
                color: colors.checkedOut,
              }}>
                <AlertTriangle size={14} />
                Some items are not available
              </div>
            )}

            {/* Add items panel */}
            {showAddPanel && (
              <AddItemsPanel
                inventory={inventory}
                currentItemId={item.id}
                existingChildIds={item.childItemIds || []}
                onAdd={onAddToKit}
                onClose={() => setShowAddPanel(false)}
              />
            )}

            {/* Child items list */}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {childItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: spacing[4], color: colors.textMuted }}>
                  <Package size={24} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
                    No items in this kit yet
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => setShowAddPanel(true)}
                    icon={Plus}
                    style={{ marginTop: spacing[2] }}
                  >
                    Add Items
                  </Button>
                </div>
              ) : (
                childItems.map(child => (
                  <ItemPreview
                    key={child.id}
                    item={child}
                    onRemove={onRemoveFromKit}
                    onView={onViewItem}
                  />
                ))
              )}
            </div>

            {/* Clear kit button */}
            {childItems.length > 0 && (
              <div style={{ marginTop: spacing[3], paddingTop: spacing[3], borderTop: `1px solid ${colors.borderLight}` }}>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={onClearKit}
                  icon={Unlink}
                  danger
                >
                  Remove All Items
                </Button>
              </div>
            )}
          </>
        )}

        {/* Convert to kit button (if not already a kit and not part of another kit) */}
        {!item.isKit && !parentKit && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
              Convert this item to a kit to add child items that belong together.
            </p>
            <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'center' }}>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => onSetAsKit(KIT_TYPES.KIT)}
                icon={Layers}
              >
                Make Kit
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => onSetAsKit(KIT_TYPES.CONTAINER)}
                icon={Box}
              >
                Make Container
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default memo(KitSection);
