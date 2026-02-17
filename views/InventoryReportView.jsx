// ============================================================================
// Inventory Summary Report Panel View
// Full inventory breakdown by category, status, condition, and location
// ============================================================================

import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Package, Layers, MapPin, BarChart3 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { formatMoney, sanitizeCSVCell } from '../utils';
import { Badge, Card, CardHeader, StatCard, Button, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';

export const InventoryReportPanel = memo(function InventoryReportPanel({
  inventory,
  categories,
  currentUser,
  onViewItem,
  onBack
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...inventory];

    if (selectedCategory !== 'all') {
      items = items.filter(i => i.category === selectedCategory);
    }

    switch (sortBy) {
      case 'name':
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'value-desc':
        items.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
        break;
      case 'category':
        items.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        break;
      case 'status':
        items.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
        break;
      case 'newest':
        items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }

    return items;
  }, [inventory, selectedCategory, sortBy]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalValue = inventory.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const totalPurchase = inventory.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);

    // By category
    const byCategory = {};
    inventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { count: 0, value: 0 };
      }
      byCategory[cat].count++;
      byCategory[cat].value += item.currentValue || 0;
    });

    // By status
    const byStatus = {};
    inventory.forEach(item => {
      const status = item.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // By condition
    const byCondition = {};
    inventory.forEach(item => {
      const condition = item.condition || 'Unknown';
      byCondition[condition] = (byCondition[condition] || 0) + 1;
    });

    // By location
    const byLocation = {};
    inventory.forEach(item => {
      const loc = item.location || 'Unassigned';
      if (!byLocation[loc]) {
        byLocation[loc] = { count: 0, value: 0 };
      }
      byLocation[loc].count++;
      byLocation[loc].value += item.currentValue || 0;
    });

    return {
      totalItems: inventory.length,
      totalValue,
      totalPurchase,
      depreciation: totalPurchase - totalValue,
      byCategory,
      byStatus,
      byCondition,
      byLocation,
    };
  }, [inventory]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return colors.available;
      case 'checked-out': return colors.checkedOut;
      case 'reserved': return colors.primary;
      case 'needs-attention': return colors.danger;
      case 'missing': return colors.textMuted;
      case 'low-stock': return colors.warning;
      default: return colors.textMuted;
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'checked-out': return 'Checked Out';
      case 'reserved': return 'Reserved';
      case 'needs-attention': return 'Needs Attention';
      case 'missing': return 'Missing';
      case 'low-stock': return 'Low Stock';
      default: return status;
    }
  };

  const formatCondition = (c) => {
    switch (c) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return c;
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Item ID', 'Name', 'Brand', 'Category', 'Status', 'Condition', 'Location', 'Serial Number', 'Purchase Date', 'Purchase Price', 'Current Value', 'Quantity'];
    const rows = filteredItems.map(item => [
      item.id,
      item.name,
      item.brand || '',
      item.category || '',
      item.status || '',
      item.condition || '',
      item.location || '',
      item.serialNumber || '',
      item.purchaseDate || '',
      item.purchasePrice || 0,
      item.currentValue || 0,
      item.quantity || 1,
    ]);

    const csvContent = [
      headers.map(h => sanitizeCSVCell(h)).join(','),
      ...rows.map(row => row.map(cell => sanitizeCSVCell(cell)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-summary-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Inventory Summary"
        subtitle="Complete breakdown of all inventory items"
        onBack={onBack}
        backLabel="Back to Reports"
        action={<Button onClick={handleExport} icon={Download}>Export CSV</Button>}
      />

      {/* Profile branding for print/export */}
      {currentUser?.profile && (() => {
        const p = currentUser.profile;
        const sf = p.showFields || {};
        const hasContent = Object.entries(sf).some(([k, v]) => v && p[k]);
        if (!hasContent) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4], padding: spacing[3], marginBottom: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
            {sf.logo && p.logo && <img src={p.logo} alt="" style={{ height: 36, objectFit: 'contain' }} />}
            <div>
              {sf.businessName && p.businessName && <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.textPrimary }}>{p.businessName}</div>}
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
                {sf.displayName && p.displayName && <span>{p.displayName}</span>}
                {sf.phone && p.phone && <span>{p.phone}</span>}
                {sf.email && p.email && <span>{p.email}</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: spacing[4], marginBottom: spacing[6] }}>
        <StatCard icon={Package} label="Total Items" value={stats.totalItems} color={colors.primary} />
        <StatCard icon={BarChart3} label="Total Value" value={formatMoney(stats.totalValue)} color={colors.available} />
        <StatCard icon={BarChart3} label="Purchase Value" value={formatMoney(stats.totalPurchase)} color={colors.accent1} />
        <StatCard icon={Layers} label="Categories" value={Object.keys(stats.byCategory).length} color={colors.checkedOut} />
        <StatCard icon={MapPin} label="Locations" value={Object.keys(stats.byLocation).length} color={colors.accent2} />
      </div>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main inventory table */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}>
          <CardHeader
            title="All Items"
            action={
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...categories.map(cat => ({ value: cat, label: cat }))
                  ]}
                  style={{ width: 140 }}
                  compact
                  aria-label="Filter by category"
                />
                <Select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  options={[
                    { value: 'name', label: 'Name' },
                    { value: 'value-desc', label: 'Value (High to Low)' },
                    { value: 'category', label: 'Category' },
                    { value: 'status', label: 'Status' },
                    { value: 'newest', label: 'Newest First' },
                  ]}
                  style={{ width: 160 }}
                  compact
                  aria-label="Sort by"
                />
              </div>
            }
          />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.bgDark, position: 'sticky', top: 0 }}>
                  <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Item</th>
                  <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Category</th>
                  <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Status</th>
                  <th style={{ padding: spacing[3], textAlign: 'right', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: spacing[3] }}>
                      <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.id}{item.brand ? ` \u2022 ${item.brand}` : ''}{item.location ? ` \u2022 ${item.location}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge text={item.category || 'None'} color={colors.primary} size="xs" />
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge text={formatStatus(item.status)} color={getStatusColor(item.status)} size="xs" />
                    </td>
                    <td style={{ padding: spacing[3], textAlign: 'right', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.available }}>
                      {formatMoney(item.currentValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: colors.bgDark, fontWeight: typography.fontWeight.semibold }}>
                  <td colSpan={3} style={{ padding: spacing[3], fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                    Total ({filteredItems.length} items)
                  </td>
                  <td style={{ padding: spacing[3], textAlign: 'right', fontSize: typography.fontSize.sm, color: colors.available }}>
                    {formatMoney(filteredItems.reduce((sum, i) => sum + (i.currentValue || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* By Status */}
          <Card padding={false}>
            <CardHeader title="By Status" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byStatus)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: getStatusColor(status) }} />
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>{formatStatus(status)}</span>
                    </div>
                    <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{count}</span>
                  </div>
                ))}
            </div>
          </Card>

          {/* By Category */}
          <Card padding={false}>
            <CardHeader title="By Category" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([category, data]) => (
                  <div key={category} style={{ marginBottom: spacing[3] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>{category}</span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                        {data.count} ({formatMoney(data.value)})
                      </span>
                    </div>
                    <div style={{ height: 6, background: colors.borderLight, borderRadius: borderRadius.full, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(data.count / stats.totalItems) * 100}%`,
                        background: colors.primary,
                        borderRadius: borderRadius.full,
                      }} />
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* By Condition */}
          <Card padding={false}>
            <CardHeader title="By Condition" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byCondition)
                .sort((a, b) => b[1] - a[1])
                .map(([condition, count]) => (
                  <div key={condition} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>{formatCondition(condition)}</span>
                    <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{count}</span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
InventoryReportPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    category: PropTypes.string,
    status: PropTypes.string,
    condition: PropTypes.string,
    location: PropTypes.string,
    serialNumber: PropTypes.string,
    purchaseDate: PropTypes.string,
    purchasePrice: PropTypes.number,
    currentValue: PropTypes.number,
    quantity: PropTypes.number,
    createdAt: PropTypes.string,
  })).isRequired,
  /** Available categories for filtering */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    profile: PropTypes.object,
  }),
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
