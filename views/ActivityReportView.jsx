// ============================================================================
// Activity Report Panel View
// Checkout activity over time (real checkout_history events), usage
// statistics, and trending items. The lifetime counters the report used to
// stop at gain a time axis: a trailing-window trend, day-of-week pattern,
// and a 30/90/365-day range selector.
// ============================================================================

import { memo, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download, BarChart3, TrendingUp, LogOut, Package, CalendarDays } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, downloadCSV } from '../utils';
import { Badge, Card, CardHeader, StatCard, Button, PageHeader } from '../components/ui.jsx';
import { ReportBranding } from '../components/ReportBranding.jsx';
import { TrendChart, ColumnChart, HBarChart } from '../components/charts.jsx';
import {
  computeActivityStats,
  bucketEvents,
  dayOfWeekCounts,
  csvForActivity,
} from '../lib/reportData.js';
import { useData } from '../contexts/DataContext.js';

const RANGE_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
];

export const ActivityReportPanel = memo(function ActivityReportPanel({
  inventory,
  currentUser,
  onViewItem,
  onBack,
}) {
  const { ensureCheckoutActivity, checkoutEvents, checkoutEventsLoaded } = useData();
  const [rangeDays, setRangeDays] = useState(90);

  useEffect(() => {
    ensureCheckoutActivity();
  }, [ensureCheckoutActivity]);

  const activityData = useMemo(() => computeActivityStats(inventory), [inventory]);

  // Checkout events only — checkins would double-count every cycle
  const checkoutsInWindow = useMemo(
    () => checkoutEvents.filter((e) => e.action === 'checkout'),
    [checkoutEvents],
  );
  const trendSeries = useMemo(
    () => bucketEvents(checkoutsInWindow, { days: rangeDays }),
    [checkoutsInWindow, rangeDays],
  );
  const trendTotal = useMemo(
    () => trendSeries.reduce((sum, b) => sum + b.value, 0),
    [trendSeries],
  );
  const dowSeries = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - (rangeDays - 1));
    return dayOfWeekCounts(
      checkoutsInWindow.filter((e) => {
        const d = new Date(e.timestamp);
        return d >= start && d <= now;
      }),
    );
  }, [checkoutsInWindow, rangeDays]);

  const frequencyBars = useMemo(() => {
    return Object.entries(activityData.frequencyBuckets).map(([range, count]) => ({
      label: range === '0' ? 'Never' : `${range} times`,
      value: count,
      color: range === '0' ? colors.textMuted : colors.primary,
    }));
  }, [activityData.frequencyBuckets]);

  const categoryBars = useMemo(
    () =>
      Object.entries(activityData.byCategory)
        .sort((a, b) => b[1].checkouts - a[1].checkouts)
        .map(([category, data]) => ({
          label: `${category} (${data.items} items)`,
          value: data.checkouts,
          color: colors.accent1,
        })),
    [activityData.byCategory],
  );

  const handleExport = () => {
    const { headers, rows, filename } = csvForActivity(inventory);
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
        title="Activity Report"
        subtitle="Checkout activity and usage statistics"
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
          icon={BarChart3}
          label="Total Checkouts"
          value={activityData.totalCheckouts}
          color={colors.primary}
        />
        <StatCard
          icon={LogOut}
          label="Currently Out"
          value={activityData.currentlyOut}
          color={activityData.currentlyOut > 0 ? colors.checkedOut : colors.textMuted}
        />
        <StatCard
          icon={TrendingUp}
          label="Utilization Rate"
          value={`${activityData.utilizationRate}%`}
          color={colors.available}
        />
        <StatCard
          icon={Package}
          label="Never Used"
          value={activityData.neverCheckedOut}
          color={activityData.neverCheckedOut > 0 ? colors.warning : colors.textMuted}
        />
      </div>

      {/* Checkout trend over time */}
      <Card padding={false} style={{ marginBottom: spacing[5] }}>
        <CardHeader
          title={`Checkout Trend — ${trendTotal} in the last ${
            RANGE_OPTIONS.find((r) => r.days === rangeDays)?.label
          }`}
          icon={CalendarDays}
          action={
            <div style={{ display: 'flex', gap: spacing[1] }} role="group" aria-label="Date range">
              {RANGE_OPTIONS.map(({ days, label }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  aria-pressed={rangeDays === days}
                  style={{
                    padding: `${spacing[1]}px ${spacing[3]}px`,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${rangeDays === days ? colors.primary : colors.border}`,
                    background:
                      rangeDays === days ? `${withOpacity(colors.primary, 20)}` : 'transparent',
                    color: rangeDays === days ? colors.primary : colors.textSecondary,
                    fontSize: typography.fontSize.xs,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        />
        <div style={{ padding: spacing[4] }}>
          {!checkoutEventsLoaded ? (
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
              role="status"
            >
              Loading checkout history…
            </p>
          ) : trendTotal === 0 ? (
            <p
              style={{
                margin: 0,
                textAlign: 'center',
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
            >
              No checkouts in this period
            </p>
          ) : (
            <TrendChart
              data={trendSeries}
              color={colors.primary}
              ariaLabel={`Checkouts per ${
                rangeDays <= 45 ? 'day' : rangeDays <= 180 ? 'week' : 'month'
              } over the last ${rangeDays} days`}
            />
          )}
        </div>
      </Card>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Most Checked Out */}
          <Card
            padding={false}
            style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
          >
            <CardHeader title="Most Checked Out Items" icon={TrendingUp} />
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
              {activityData.topItems.length === 0 ? (
                <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                  <BarChart3 size={32} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
                  <p style={{ margin: 0 }}>No checkout activity yet</p>
                </div>
              ) : (
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
                          width: 36,
                        }}
                      >
                        #
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
                        Checkouts
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.topItems.map((item, idx) => (
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
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 24,
                              height: 24,
                              borderRadius: borderRadius.full,
                              background:
                                idx < 3 ? `${withOpacity(colors.primary, 20)}` : colors.bgLight,
                              color: idx < 3 ? colors.primary : colors.textMuted,
                              fontSize: typography.fontSize.xs,
                              fontWeight: typography.fontWeight.semibold,
                            }}
                          >
                            {idx + 1}
                          </span>
                        </td>
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
                          <div
                            style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}
                          >
                            {item.id}
                            {item.brand ? ` • ${item.brand}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: spacing[3] }}>
                          <Badge
                            text={
                              item.status === 'checked-out'
                                ? 'Checked Out'
                                : item.status === 'available'
                                  ? 'Available'
                                  : item.status
                            }
                            color={
                              item.status === 'checked-out'
                                ? colors.checkedOut
                                : item.status === 'available'
                                  ? colors.available
                                  : colors.textMuted
                            }
                            size="xs"
                          />
                        </td>
                        <td style={{ padding: spacing[3], textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: typography.fontSize.sm,
                              fontWeight: typography.fontWeight.semibold,
                              color: colors.primary,
                            }}
                          >
                            {item.checkoutCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Currently Checked Out */}
          {activityData.checkedOutDetails.length > 0 && (
            <Card padding={false}>
              <CardHeader title="Currently Checked Out" icon={LogOut} />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {activityData.checkedOutDetails.map((item) => (
                  <button
                    type="button"
                    className="report-row"
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      padding: spacing[3],
                      borderBottom: `1px solid ${colors.borderLight}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.borrower}
                        {item.project ? ` • ${item.project}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {item.dueBack && (
                        <div
                          style={{
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.medium,
                            color: item.isOverdue ? colors.danger : colors.textSecondary,
                          }}
                        >
                          {item.isOverdue ? 'OVERDUE' : `Due ${formatDate(item.dueBack)}`}
                        </div>
                      )}
                      {item.checkedOutDate && (
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                          Out since {formatDate(item.checkedOutDate)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Busiest days */}
          <Card padding={false}>
            <CardHeader title="Checkouts by Day of Week" />
            <div style={{ padding: spacing[4] }}>
              {!checkoutEventsLoaded ? (
                <p
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    color: colors.textMuted,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  Loading…
                </p>
              ) : (
                <ColumnChart
                  data={dowSeries}
                  color={colors.accent1}
                  ariaLabel={`Checkouts by day of week over the last ${rangeDays} days`}
                />
              )}
            </div>
          </Card>

          {/* Checkout Frequency Distribution */}
          <Card padding={false}>
            <CardHeader title="Checkout Frequency" />
            <div style={{ padding: spacing[4] }}>
              <HBarChart
                data={frequencyBars}
                formatValue={(v) => `${v} items`}
                ariaLabel="Items grouped by lifetime checkout count"
              />
            </div>
          </Card>

          {/* Activity by Category */}
          <Card padding={false}>
            <CardHeader title="Checkouts by Category" />
            <div style={{ padding: spacing[4] }}>
              <HBarChart
                data={categoryBars}
                ariaLabel="Lifetime checkouts per category"
              />
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
ActivityReportPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      brand: PropTypes.string,
      category: PropTypes.string,
      status: PropTypes.string,
      checkoutCount: PropTypes.number,
      checkedOutTo: PropTypes.string,
      checkedOutDate: PropTypes.string,
      dueBack: PropTypes.string,
      checkoutProject: PropTypes.string,
    }),
  ).isRequired,
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    profile: PropTypes.object,
  }),
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
