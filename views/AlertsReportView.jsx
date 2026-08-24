// ============================================================================
// Alerts Report Panel View
// Items needing attention with severity composition and value-at-risk charts.
// Low-stock and overdue are DERIVED states — computeAlertData uses the shared
// matchers, so this report catches what a stored-status equality check never
// could (the Search-round lesson, finally applied here).
// ============================================================================

import { memo, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, Clock, Package, MapPin, TrendingDown } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { formatDate, formatMoney, getTodayISO } from '../utils';
import { Badge, Card, CardHeader, StatCard, EmptyState } from '../components/ui.jsx';
import { ReportHeader, ReportStatGrid } from '../components/reports.jsx';
import { DonutChart, HBarChart } from '../components/charts.jsx';
import { computeAlertData, csvForAlerts } from '../lib/reportData.js';
import { useData } from '../contexts/DataContext.js';

export const AlertsReportPanel = memo(function AlertsReportPanel({
  inventory,
  currentUser,
  onViewItem,
  onBack,
}) {
  const { categorySettings } = useData();

  // "Today" ticks hourly and on tab re-focus — the overdue set is a function
  // of today's date, and a tab left open past midnight kept yesterday's
  const [todayTick, setTodayTick] = useState(() => getTodayISO());
  useEffect(() => {
    const update = () => setTodayTick(getTodayISO());
    const id = setInterval(update, 60 * 60 * 1000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const alertData = useMemo(
    () => computeAlertData(inventory, categorySettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayTick re-derives the date-dependent overdue set
    [inventory, categorySettings, todayTick],
  );

  const severitySegments = useMemo(
    () =>
      [
        { label: 'Needs Attention', value: alertData.needsAttention, color: colors.danger },
        { label: 'Overdue', value: alertData.overdue, color: colors.checkedOut },
        { label: 'Missing', value: alertData.missing, color: colors.warning },
        { label: 'Low Stock', value: alertData.lowStock, color: colors.accent2 },
        { label: 'Poor Condition', value: alertData.poorCondition, color: colors.accent1 },
      ].filter((s) => s.value > 0),
    [alertData],
  );

  const valueAtRiskBars = useMemo(
    () =>
      Object.entries(alertData.valueByCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([category, value]) => ({ label: category, value, color: colors.danger })),
    [alertData.valueByCategory],
  );

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Needs Attention':
        return colors.danger;
      case 'Missing':
        return colors.warning;
      case 'Low Stock':
        return colors.accent2;
      case 'Overdue':
        return colors.checkedOut;
      case 'Poor Condition':
        return colors.accent1;
      default:
        return colors.textMuted;
    }
  };

  return (
    <>
      <ReportHeader
        title="Alerts Report"
        subtitle="Items needing attention, missing, overdue, low on stock, or in poor condition"
        onBack={onBack}
        buildCsv={() => csvForAlerts(alertData.allAlerts)}
        profile={currentUser?.profile}
      />

      {/* Summary Stats */}
      <ReportStatGrid>
        <StatCard
          icon={AlertTriangle}
          label="Total Alerts"
          value={alertData.totalAlerts}
          color={alertData.totalAlerts > 0 ? colors.danger : colors.textMuted}
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs Attention"
          value={alertData.needsAttention}
          color={alertData.needsAttention > 0 ? colors.danger : colors.textMuted}
        />
        <StatCard
          icon={Clock}
          label="Overdue"
          value={alertData.overdue}
          color={alertData.overdue > 0 ? colors.checkedOut : colors.textMuted}
        />
        <StatCard
          icon={Package}
          label="Missing"
          value={alertData.missing}
          color={alertData.missing > 0 ? colors.warning : colors.textMuted}
        />
        <StatCard
          icon={TrendingDown}
          label="Value at Risk"
          value={formatMoney(alertData.valueAtRisk)}
          color={alertData.valueAtRisk > 0 ? colors.danger : colors.textMuted}
        />
      </ReportStatGrid>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main alerts list */}
        <Card
          padding={false}
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
        >
          <CardHeader title="All Alert Items" icon={AlertTriangle} />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            {alertData.allAlerts.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="No Alerts"
                description="All items are in good standing. No issues found."
              />
            ) : (
              alertData.allAlerts.map((item, idx) => (
                <button
                  type="button"
                  className="report-row"
                  key={item.id}
                  onClick={() => onViewItem(item.id)}
                  style={{
                    padding: spacing[4],
                    borderBottom:
                      idx < alertData.allAlerts.length - 1
                        ? `1px solid ${colors.borderLight}`
                        : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: spacing[2],
                    }}
                  >
                    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                      {item.reasons.map((reason) => (
                        <Badge
                          key={reason}
                          text={reason}
                          color={getReasonColor(reason)}
                          size="xs"
                        />
                      ))}
                    </div>
                    {(item.currentValue || 0) > 0 && (
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {formatMoney(item.currentValue)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      marginTop: spacing[1],
                    }}
                  >
                    {item.id}
                    {item.brand ? ` • ${item.brand}` : ''}
                    {item.category ? ` • ${item.category}` : ''}
                  </div>
                  {item.checkedOutTo && (
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                      Checked out to {item.checkedOutTo}
                      {item.dueBack ? ` • Due ${formatDate(item.dueBack)}` : ''}
                    </div>
                  )}
                  {item.location && (
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <MapPin size={10} /> {item.location}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Severity composition */}
          <Card padding={false}>
            <CardHeader title="Alert Breakdown" />
            <div style={{ padding: spacing[4] }}>
              {alertData.totalAlerts === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  No alerts
                </p>
              ) : (
                <DonutChart
                  data={severitySegments}
                  centerLabel="alerts"
                  centerValue={alertData.totalAlerts}
                  ariaLabel={`Alert breakdown: ${severitySegments
                    .map((s) => `${s.label} ${s.value}`)
                    .join(', ')}`}
                />
              )}
            </div>
          </Card>

          {/* Value at risk by category */}
          {valueAtRiskBars.length > 0 && (
            <Card padding={false}>
              <CardHeader title="Value at Risk by Category" />
              <div style={{ padding: spacing[4] }}>
                <HBarChart
                  data={valueAtRiskBars}
                  formatValue={formatMoney}
                  ariaLabel="Current value of alert items grouped by category"
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
AlertsReportPanel.propTypes = {
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
      currentValue: PropTypes.number,
      checkedOutTo: PropTypes.string,
      dueBack: PropTypes.string,
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
