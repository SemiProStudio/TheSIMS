// ============================================================================
// Insurance Report Panel View
// Asset values for insurance documentation, with the depreciation story per
// category (purchase vs. current paired bars) and a value distribution.
// ============================================================================

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { DollarSign, TrendingDown, Package, BarChart3 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { formatMoney } from '../utils';
import { Badge, Card, CardHeader, StatCard } from '../components/ui.jsx';
import {
  ReportHeader,
  ReportStatGrid,
  ReportFilterBar,
  ReportTable,
} from '../components/reports.jsx';
import { HBarChart, ColumnChart } from '../components/charts.jsx';
import { computeInventoryStats, valueDistribution, csvForInsurance } from '../lib/reportData.js';
import { useReportItemFilter } from '../hooks/useReportItemFilter.js';

const SORT_OPTIONS = [
  { value: 'value-desc', label: 'Value (High to Low)' },
  { value: 'value-asc', label: 'Value (Low to High)' },
  { value: 'purchase-desc', label: 'Purchase Price' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
];

const TABLE_COLUMNS = [
  { key: 'item', label: 'Item' },
  { key: 'category', label: 'Category' },
  { key: 'purchase', label: 'Purchase', align: 'right' },
  { key: 'current', label: 'Current', align: 'right' },
];

export const InsuranceReportPanel = memo(function InsuranceReportPanel({
  inventory,
  categories,
  currentUser,
  onViewItem,
  onBack,
}) {
  // Filter and sort items
  const { selectedCategory, setSelectedCategory, sortBy, setSortBy, filteredItems } =
    useReportItemFilter(inventory, 'value-desc');

  const stats = useMemo(() => {
    const inv = computeInventoryStats(inventory);
    const highValueItems = [...inventory]
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
      .slice(0, 10);
    return {
      ...inv,
      averageValue: inv.totalItems > 0 ? inv.totalValue / inv.totalItems : 0,
      highValueItems,
    };
  }, [inventory]);

  const depreciationBars = useMemo(
    () =>
      Object.entries(stats.byCategory)
        .sort((a, b) => b[1].value - a[1].value)
        .map(([category, data]) => {
          const purchase = inventory
            .filter((i) => (i.category || 'Uncategorized') === category)
            .reduce((sum, i) => sum + (i.purchasePrice || 0), 0);
          return {
            label: `${category} (${data.count})`,
            value: data.value,
            color: colors.available,
            secondaryValue: purchase,
            secondaryColor: colors.textMuted,
          };
        }),
    [stats.byCategory, inventory],
  );

  const distribution = useMemo(() => valueDistribution(inventory), [inventory]);

  return (
    <>
      <ReportHeader
        title="Insurance Report"
        subtitle="Asset values for insurance documentation"
        onBack={onBack}
        buildCsv={() => csvForInsurance(filteredItems)}
        profile={currentUser?.profile}
      />

      {/* Summary Stats */}
      <ReportStatGrid minWidth={200}>
        <StatCard
          icon={DollarSign}
          label="Total Current Value"
          value={formatMoney(stats.totalValue)}
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
          value={formatMoney(stats.depreciation)}
          color={colors.danger}
        />
        <StatCard
          icon={Package}
          label="Total Items"
          value={stats.totalItems}
          color={colors.accent1}
        />
        <StatCard
          icon={DollarSign}
          label="Average Item Value"
          value={formatMoney(stats.averageValue)}
          color={colors.accent2}
        />
      </ReportStatGrid>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main inventory list */}
        <ReportTable
          title="Inventory Schedule"
          headerAction={
            <ReportFilterBar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              sortOptions={SORT_OPTIONS}
            />
          }
          columns={TABLE_COLUMNS}
          rows={filteredItems}
          onRowActivate={(item) => onViewItem(item.id)}
          renderCells={(item) => (
            <>
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
                </div>
              </td>
              <td style={{ padding: spacing[3] }}>
                <Badge text={item.category || 'None'} color={colors.primary} size="xs" />
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
            </>
          )}
          footerCells={
            <>
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
            </>
          }
        />

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Purchase vs Current by Category */}
          <Card padding={false}>
            <CardHeader title="Current vs. Purchase by Category" icon={TrendingDown} />
            <div style={{ padding: spacing[4] }}>
              <HBarChart
                data={depreciationBars}
                formatValue={formatMoney}
                ariaLabel="Current value versus purchase value per category"
              />
              <p
                style={{
                  margin: `${spacing[2]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Top bar: current value • bottom bar: purchase value
              </p>
            </div>
          </Card>

          {/* Value distribution */}
          <Card padding={false}>
            <CardHeader title="Value Distribution" icon={BarChart3} />
            <div style={{ padding: spacing[4] }}>
              <ColumnChart
                data={distribution}
                color={colors.accent2}
                formatValue={(v) => `${v} items`}
                ariaLabel="Number of items per value band"
              />
            </div>
          </Card>

          {/* High Value Items */}
          <Card padding={false}>
            <CardHeader title="Highest Value Items" />
            <div style={{ padding: spacing[4], maxHeight: 250, overflowY: 'auto' }}>
              {stats.highValueItems.map((item, idx) => (
                <button
                  type="button"
                  className="report-row"
                  key={item.id}
                  onClick={() => onViewItem(item.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: spacing[2],
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
                </button>
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
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    profile: PropTypes.object,
  }),
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
