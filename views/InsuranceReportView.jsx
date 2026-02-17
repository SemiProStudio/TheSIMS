// ============================================================================
// Insurance Report Panel View
// Asset values for insurance documentation
// ============================================================================

import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download, DollarSign, TrendingDown, Package } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { formatMoney, sanitizeCSVCell } from '../utils';
import { Badge, Card, CardHeader, StatCard, Button, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';

export const InsuranceReportPanel = memo(function InsuranceReportPanel({
  inventory,
  categories,
  currentUser,
  onViewItem,
  onBack,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('value-desc');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...inventory];

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'value-desc':
        items.sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
        break;
      case 'value-asc':
        items.sort((a, b) => (a.currentValue || 0) - (b.currentValue || 0));
        break;
      case 'purchase-desc':
        items.sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0));
        break;
      case 'name':
        items.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'category':
        items.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default:
        break;
    }

    return items;
  }, [inventory, selectedCategory, sortBy]);

  // Calculate totals
  const stats = useMemo(() => {
    const totalPurchase = inventory.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
    const totalCurrent = inventory.reduce((sum, i) => sum + (i.currentValue || 0), 0);
    const totalDepreciation = totalPurchase - totalCurrent;
    const itemCount = inventory.length;

    // By category
    const byCategory = {};
    inventory.forEach((item) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { count: 0, purchaseValue: 0, currentValue: 0 };
      }
      byCategory[item.category].count++;
      byCategory[item.category].purchaseValue += item.purchasePrice || 0;
      byCategory[item.category].currentValue += item.currentValue || 0;
    });

    // High value items (top 10)
    const highValueItems = [...inventory]
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
      .slice(0, 10);

    return {
      totalPurchase,
      totalCurrent,
      totalDepreciation,
      itemCount,
      averageValue: itemCount > 0 ? totalCurrent / itemCount : 0,
      byCategory,
      highValueItems,
    };
  }, [inventory]);

  // Generate CSV export
  const handleExport = () => {
    const headers = [
      'Item ID',
      'Name',
      'Brand',
      'Category',
      'Serial Number',
      'Purchase Date',
      'Purchase Price',
      'Current Value',
      'Condition',
      'Location',
      'Status',
    ];
    const rows = filteredItems.map((item) => [
      item.id,
      item.name,
      item.brand,
      item.category,
      item.serialNumber || '',
      item.purchaseDate || '',
      item.purchasePrice || 0,
      item.currentValue || 0,
      item.condition || '',
      item.location || '',
      item.status,
    ]);

    const csvContent = [
      headers.map((h) => sanitizeCSVCell(h)).join(','),
      ...rows.map((row) => row.map((cell) => sanitizeCSVCell(cell)).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insurance-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Insurance Report"
        subtitle="Asset values for insurance documentation"
        onBack={onBack}
        backLabel="Back to Reports"
        action={
          <Button onClick={handleExport} icon={Download}>
            Export CSV
          </Button>
        }
      />

      {/* Profile branding for print/export */}
      {currentUser?.profile &&
        (() => {
          const p = currentUser.profile;
          const sf = p.showFields || {};
          const hasContent = Object.entries(sf).some(([k, v]) => v && p[k]);
          if (!hasContent) return null;
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[4],
                padding: spacing[3],
                marginBottom: spacing[4],
                borderBottom: `1px solid ${colors.borderLight}`,
              }}
            >
              {sf.logo && p.logo && (
                <img src={p.logo} alt="" style={{ height: 36, objectFit: 'contain' }} />
              )}
              <div>
                {sf.businessName && p.businessName && (
                  <div
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.textPrimary,
                    }}
                  >
                    {p.businessName}
                  </div>
                )}
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textMuted,
                    display: 'flex',
                    gap: spacing[3],
                    flexWrap: 'wrap',
                  }}
                >
                  {sf.displayName && p.displayName && <span>{p.displayName}</span>}
                  {sf.phone && p.phone && <span>{p.phone}</span>}
                  {sf.email && p.email && <span>{p.email}</span>}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[6],
        }}
      >
        <StatCard
          icon={DollarSign}
          label="Total Current Value"
          value={formatMoney(stats.totalCurrent)}
          color={colors.available}
        />
        <StatCard
          icon={DollarSign}
          label="Total Purchase Value"
          value={formatMoney(stats.totalPurchase)}
          color={colors.primary}
        />
        <StatCard
          icon={TrendingDown}
          label="Total Depreciation"
          value={formatMoney(stats.totalDepreciation)}
          color={colors.danger}
        />
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.itemCount}
          color={colors.accent1}
        />
        <StatCard
          icon={DollarSign}
          label="Average Item Value"
          value={formatMoney(stats.averageValue)}
          color={colors.accent2}
        />
      </div>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main inventory list */}
        <Card
          padding={false}
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
        >
          <CardHeader
            title="Inventory Schedule"
            action={
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...categories.map((cat) => ({ value: cat, label: cat })),
                  ]}
                  style={{ width: 140 }}
                  compact
                  aria-label="Filter by category"
                />
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { value: 'value-desc', label: 'Value (High to Low)' },
                    { value: 'value-asc', label: 'Value (Low to High)' },
                    { value: 'purchase-desc', label: 'Purchase Price' },
                    { value: 'name', label: 'Name' },
                    { value: 'category', label: 'Category' },
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
                  <th
                    style={{
                      padding: spacing[3],
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Item
                  </th>
                  <th
                    style={{
                      padding: spacing[3],
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: spacing[3],
                      textAlign: 'right',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Purchase
                  </th>
                  <th
                    style={{
                      padding: spacing[3],
                      textAlign: 'right',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Current
                  </th>
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
                      <div
                        style={{
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                          fontSize: typography.fontSize.sm,
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.id} • {item.brand}
                      </div>
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge text={item.category} color={colors.primary} size="xs" />
                    </td>
                    <td
                      style={{
                        padding: spacing[3],
                        textAlign: 'right',
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      {formatMoney(item.purchasePrice)}
                    </td>
                    <td
                      style={{
                        padding: spacing[3],
                        textAlign: 'right',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.available,
                      }}
                    >
                      {formatMoney(item.currentValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{ background: colors.bgDark, fontWeight: typography.fontWeight.semibold }}
                >
                  <td
                    colSpan={2}
                    style={{
                      padding: spacing[3],
                      fontSize: typography.fontSize.sm,
                      color: colors.textPrimary,
                    }}
                  >
                    Total ({filteredItems.length} items)
                  </td>
                  <td
                    style={{
                      padding: spacing[3],
                      textAlign: 'right',
                      fontSize: typography.fontSize.sm,
                      color: colors.textSecondary,
                    }}
                  >
                    {formatMoney(filteredItems.reduce((sum, i) => sum + (i.purchasePrice || 0), 0))}
                  </td>
                  <td
                    style={{
                      padding: spacing[3],
                      textAlign: 'right',
                      fontSize: typography.fontSize.sm,
                      color: colors.available,
                    }}
                  >
                    {formatMoney(filteredItems.reduce((sum, i) => sum + (i.currentValue || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Value by Category */}
          <Card padding={false}>
            <CardHeader title="Value by Category" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1].currentValue - a[1].currentValue)
                .map(([category, data]) => (
                  <div key={category} style={{ marginBottom: spacing[3] }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: spacing[1],
                      }}
                    >
                      <span
                        style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}
                      >
                        {category}
                      </span>
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {formatMoney(data.currentValue)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: colors.borderLight,
                          borderRadius: borderRadius.full,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(data.currentValue / stats.totalCurrent) * 100}%`,
                            background: colors.primary,
                            borderRadius: borderRadius.full,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textMuted,
                          minWidth: 35,
                        }}
                      >
                        {data.count} items
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* High Value Items */}
          <Card padding={false}>
            <CardHeader title="Highest Value Items" />
            <div style={{ padding: spacing[4], maxHeight: 250, overflowY: 'auto' }}>
              {stats.highValueItems.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onViewItem(item.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: spacing[2],
                    cursor: 'pointer',
                    borderRadius: borderRadius.md,
                    marginBottom: spacing[1],
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: idx < 3 ? colors.primary : colors.borderLight,
                        color: idx < 3 ? colors.textPrimary : colors.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.id}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.available,
                    }}
                  >
                    {formatMoney(item.currentValue)}
                  </span>
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
InsuranceReportPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      brand: PropTypes.string,
      category: PropTypes.string,
      serialNumber: PropTypes.string,
      purchaseDate: PropTypes.string,
      purchasePrice: PropTypes.number,
      currentValue: PropTypes.number,
      condition: PropTypes.string,
      location: PropTypes.string,
      status: PropTypes.string,
    }),
  ).isRequired,
  /** Available categories for filtering */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
