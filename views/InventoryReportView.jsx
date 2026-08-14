// ============================================================================
// Inventory Summary Report Panel View
// Full inventory breakdown with status composition, value-by-category, and
// an acquisition curve (cumulative value by purchase month).
// ============================================================================

import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download, Package, Layers, MapPin, BarChart3, TrendingUp } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { formatMoney, downloadCSV, getStatusColor } from '../utils';
import { STATUS_LABELS } from '../constants.js';
import { Badge, Card, CardHeader, StatCard, Button, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { ReportBranding } from '../components/ReportBranding.jsx';
import { DonutChart, HBarChart, TrendChart } from '../components/charts.jsx';
import { computeInventoryStats, acquisitionSeries, csvForInventory } from '../lib/reportData.js';

const statusLabel = (status) => STATUS_LABELS[status] || status;

export const InventoryReportPanel = memo(function InventoryReportPanel({
  inventory,
  categories,
  currentUser,
  onViewItem,
  onBack,
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let items = [...inventory];

    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.category === selectedCategory);
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

  const stats = useMemo(() => computeInventoryStats(inventory), [inventory]);

  const statusSegments = useMemo(
    () =>
      Object.entries(stats.byStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({
          label: statusLabel(status),
          value: count,
          color: getStatusColor(status),
        })),
    [stats.byStatus],
  );

  const categoryValueBars = useMemo(
    () =>
      Object.entries(stats.byCategory)
        .sort((a, b) => b[1].value - a[1].value)
        .map(([category, data]) => ({
          label: `${category} (${data.count})`,
          value: data.value,
          color: colors.primary,
        })),
    [stats.byCategory],
  );

  const acquisition = useMemo(() => acquisitionSeries(inventory), [inventory]);

  const formatCondition = (c) => {
    switch (c) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return c;
    }
  };

  const handleExport = () => {
    const { headers, rows, filename } = csvForInventory(filteredItems);
    downloadCSV(headers, rows, filename);
  };

  const handleRowKeyDown = (event, itemId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onViewItem(itemId);
    }
  };

  return (
    <>
      <PageHeader
        title="Inventory Summary"
        subtitle="Complete breakdown of all inventory items"
        onBack={onBack}
        backLabel="Back to Reports"
        action={
          <Button onClick={handleExport} icon={Download}>
            Export CSV
          </Button>
        }
      />

      <ReportBranding profile={currentUser?.profile} />

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[6],
        }}
      >
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color={colors.primary}
        />
        <StatCard
          icon={BarChart3}
          label="Total Value"
          value={formatMoney(stats.totalValue)}
          color={colors.available}
        />
        <StatCard
          icon={BarChart3}
          label="Purchase Value"
          value={formatMoney(stats.totalPurchase)}
          color={colors.accent1}
        />
        <StatCard
          icon={Layers}
          label="Categories"
          value={Object.keys(stats.byCategory).length}
          color={colors.checkedOut}
        />
        <StatCard
          icon={MapPin}
          label="Locations"
          value={Object.keys(stats.byLocation).length}
          color={colors.accent2}
        />
      </div>

      {/* Value growth */}
      {acquisition.datedItems > 0 && (
        <Card padding={false} style={{ marginBottom: spacing[5] }}>
          <CardHeader title="Inventory Value Growth — Last 24 Months" icon={TrendingUp} />
          <div style={{ padding: spacing[4] }}>
            <TrendChart
              data={acquisition.series}
              color={colors.available}
              formatValue={formatMoney}
              showPoints={false}
              ariaLabel="Cumulative current value of inventory by purchase month over the last 24 months"
            />
            {acquisition.undatedItems > 0 && (
              <p
                style={{
                  margin: `${spacing[2]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                {acquisition.undatedItems} item{acquisition.undatedItems === 1 ? '' : 's'} without a
                purchase date not shown
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main inventory table */}
        <Card
          padding={false}
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
        >
          <CardHeader
            title="All Items"
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
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Status
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
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="report-tr"
                    tabIndex={0}
                    onClick={() => onViewItem(item.id)}
                    onKeyDown={(e) => handleRowKeyDown(e, item.id)}
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
                        {item.id}
                        {item.brand ? ` • ${item.brand}` : ''}
                        {item.location ? ` • ${item.location}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge text={item.category || 'None'} color={colors.primary} size="xs" />
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge
                        text={statusLabel(item.status)}
                        color={getStatusColor(item.status)}
                        size="xs"
                      />
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
                    colSpan={3}
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
          {/* By Status */}
          <Card padding={false}>
            <CardHeader title="By Status" />
            <div style={{ padding: spacing[4] }}>
              <DonutChart
                data={statusSegments}
                centerLabel="items"
                ariaLabel={`Items by status: ${statusSegments
                  .map((s) => `${s.label} ${s.value}`)
                  .join(', ')}`}
              />
            </div>
          </Card>

          {/* Value by Category */}
          <Card padding={false}>
            <CardHeader title="Value by Category" />
            <div style={{ padding: spacing[4] }}>
              <HBarChart
                data={categoryValueBars}
                formatValue={formatMoney}
                ariaLabel="Current inventory value per category"
              />
            </div>
          </Card>

          {/* By Condition */}
          <Card padding={false}>
            <CardHeader title="By Condition" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byCondition)
                .sort((a, b) => b[1] - a[1])
                .map(([condition, count]) => (
                  <div
                    key={condition}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: spacing[2],
                    }}
                  >
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                      {formatCondition(condition)}
                    </span>
                    <span
                      style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.textPrimary,
                      }}
                    >
                      {count}
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
InventoryReportPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
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
    }),
  ).isRequired,
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
