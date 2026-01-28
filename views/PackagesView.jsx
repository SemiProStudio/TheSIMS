// ============================================================================
// Packages Views - Kits & Packages List and Detail
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, CheckCircle, Trash2, Tag } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatMoney, getStatusColor } from '../utils.js';
import { Badge, Card, CardHeader, Button, BackButton } from '../components/ui.jsx';
import NotesSection from '../NotesSection.jsx';

// ============================================================================
// Kits & Packages List
// ============================================================================
export const PackagesList = memo(function PackagesList({ 
  packages, 
  categories, 
  categoryFilter, 
  setCategoryFilter, 
  inventory, 
  onViewPackage, 
  onAddPackage 
}) {
  const filtered = packages.filter(p => categoryFilter === 'all' || p.category === categoryFilter);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[6] }}>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>Kits & Packages</h2>
        <Button onClick={onAddPackage} icon={Plus}>Create Kit/Package</Button>
      </div>
      <div style={{ marginBottom: spacing[5] }}>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ ...styles.input, width: 'auto' }}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: spacing[5] }}>
        {filtered.map(pkg => {
          const items = pkg.items.map(id => inventory.find(i => i.id === id)).filter(Boolean);
          const avail = items.every(i => i.status === 'available');
          return (
            <Card key={pkg.id} onClick={() => onViewPackage(pkg.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[3] }}>
                <Badge text={pkg.id} color={colors.primary} />
                <Badge text={avail ? 'Available' : 'Partial'} color={avail ? colors.available : colors.checkedOut} />
              </div>
              <h3 style={{ margin: `0 0 ${spacing[2]}px`, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>{pkg.name}</h3>
              <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>{pkg.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                <span>{items.length} items</span>
                <span>{pkg.price ? formatMoney(pkg.price) + '/day' : '-'}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
});

// ============================================================================
// Kit/Package Detail
// ============================================================================
export const PackageDetail = memo(function PackageDetail({ 
  pkg, 
  inventory, 
  onBack, 
  onViewItem, 
  onDelete, 
  onAddNote, 
  onReplyNote, 
  onDeleteNote, 
  user 
}) {
  if (!pkg) return null;
  
  return (
    <>
      <BackButton onClick={onBack}>Back to Kits & Packages</BackButton>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: spacing[6] }}>
        <Card padding={false}>
          <div style={{ padding: spacing[6], borderBottom: `1px solid ${colors.borderLight}` }}>
            <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[3] }}>
              <Badge text={pkg.id} color={colors.primary} />
              <Badge text={pkg.category} color={colors.accent2} />
            </div>
            <h1 style={{ margin: `0 0 ${spacing[2]}px`, fontSize: typography.fontSize['3xl'], color: colors.textPrimary }}>{pkg.name}</h1>
            <p style={{ color: colors.textSecondary, margin: 0 }}>{pkg.description}</p>
          </div>
          <div style={{ padding: spacing[6] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
              <h3 style={{ margin: 0, fontSize: typography.fontSize.md, color: colors.textPrimary }}>Items ({pkg.items.length})</h3>
              <div style={{ display: 'flex', gap: spacing[3] }}>
                <Button icon={CheckCircle}>Check Out All</Button>
                <Button variant="secondary" danger onClick={() => onDelete(pkg.id)} icon={Trash2} />
              </div>
            </div>
            {pkg.items.map(id => {
              const item = inventory.find(i => i.id === id);
              if (!item) return null;
              return (
                <div 
                  key={id} 
                  onClick={() => onViewItem(id)} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: spacing[3], 
                    background: `${withOpacity(colors.primary, 8)}`, 
                    borderRadius: borderRadius.lg, 
                    padding: spacing[3], 
                    marginBottom: spacing[3], 
                    cursor: 'pointer' 
                  }}
                >
                  <div style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: borderRadius.md, 
                    background: `${withOpacity(colors.primary, 15)}`, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: colors.textMuted, 
                    fontSize: typography.fontSize.xs 
                  }}>
                    {item.image ? (
                      <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: borderRadius.md }} />
                    ) : 'No img'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: spacing[1], marginBottom: spacing[1] }}>
                      <Badge text={item.id} color={colors.primary} />
                      <Badge text={item.status} color={getStatusColor(item.status)} />
                    </div>
                    <div style={{ fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.base, color: colors.textPrimary }}>{item.name}</div>
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>{formatMoney(item.currentValue)}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <Card padding={false}>
            <CardHeader title="Pricing" icon={Tag} />
            <div style={{ padding: spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <span style={{ color: colors.textSecondary }}>Daily Rate</span>
                <span style={{ fontWeight: typography.fontWeight.semibold, color: colors.available }}>{pkg.price ? formatMoney(pkg.price) : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.textSecondary }}>Total Value</span>
                <span style={{ color: colors.textPrimary }}>{formatMoney(pkg.items.reduce((s, id) => s + (inventory.find(i => i.id === id)?.currentValue || 0), 0))}</span>
              </div>
            </div>
          </Card>
          <NotesSection 
            notes={pkg.notes || []} 
            onAddNote={onAddNote} 
            onReply={onReplyNote} 
            onDelete={onDeleteNote} 
            user={user} 
          />
        </div>
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================

/** Shape for inventory item */
const inventoryItemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  status: PropTypes.string,
  currentValue: PropTypes.number,
  image: PropTypes.string,
});

/** Shape for package */
const packageShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  category: PropTypes.string,
  price: PropTypes.number,
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
  notes: PropTypes.array,
});

/** Shape for user */
const userShape = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string,
  role: PropTypes.string,
});

PackagesList.propTypes = {
  /** Array of packages/kits */
  packages: PropTypes.arrayOf(packageShape).isRequired,
  /** Available categories for filtering */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Currently selected category filter */
  categoryFilter: PropTypes.string.isRequired,
  /** Callback to update category filter */
  setCategoryFilter: PropTypes.func.isRequired,
  /** Full inventory for item lookups */
  inventory: PropTypes.arrayOf(inventoryItemShape).isRequired,
  /** Callback when package is clicked */
  onViewPackage: PropTypes.func.isRequired,
  /** Callback to add new package */
  onAddPackage: PropTypes.func.isRequired,
};

PackageDetail.propTypes = {
  /** Package to display */
  pkg: packageShape,
  /** Full inventory for item lookups */
  inventory: PropTypes.arrayOf(inventoryItemShape).isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to delete package */
  onDelete: PropTypes.func.isRequired,
  /** Callback to add note */
  onAddNote: PropTypes.func,
  /** Callback to reply to note */
  onReplyNote: PropTypes.func,
  /** Callback to delete note */
  onDeleteNote: PropTypes.func,
  /** Current user */
  user: userShape,
};
