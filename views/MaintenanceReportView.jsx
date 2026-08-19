// ============================================================================
// Maintenance Report Panel View
// All maintenance records across inventory, with cost trend and type charts.
// Requires the FULL record set: ensureMaintenance() merges completed records
// in (Tier 2 only carries pending ones for the dashboard), so cost/vendor
// stats are real instead of $0-until-you-browsed-the-right-items.
// ============================================================================

import { memo, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Wrench, Clock, AlertTriangle, DollarSign, Building2, Download } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { formatDate, formatMoney, downloadCSV, getMaintenanceStatusColor } from '../utils';
import {
  Badge,
  Card,
  CardHeader,
  StatCard,
  Button,
  PageHeader,
  EmptyState,
} from '../components/ui.jsx';
import { ReportBranding } from '../components/ReportBranding.jsx';
import LoadErrorBanner from '../components/LoadErrorBanner.jsx';
import { ColumnChart, HBarChart } from '../components/charts.jsx';
import {
  collectMaintenanceRecords,
  computeMaintenanceStats,
  sortMaintenanceRecords,
  maintenanceCostSeries,
  csvForMaintenance,
} from '../lib/reportData.js';
import { useData } from '../contexts/DataContext.js';


export const MaintenanceReportPanel = memo(function MaintenanceReportPanel({
  inventory,
  currentUser,
  onViewItem,
  onBack,
}) {
  const { ensureMaintenance, maintenanceLoaded, lazyErrors } = useData();
  const maintenanceLoadFailed = Boolean(lazyErrors?.maintenance);

  useEffect(() => {
    ensureMaintenance();
  }, [ensureMaintenance]);

  const allMaintenanceRecords = useMemo(() => collectMaintenanceRecords(inventory), [inventory]);
  const stats = useMemo(() => computeMaintenanceStats(allMaintenanceRecords), [allMaintenanceRecords]);
  const sortedRecords = useMemo(
    () => sortMaintenanceRecords(allMaintenanceRecords),
    [allMaintenanceRecords],
  );
  const costSeries = useMemo(
    () => maintenanceCostSeries(allMaintenanceRecords),
    [allMaintenanceRecords],
  );
  const costByTypeBars = useMemo(
    () =>
      Object.entries(stats.costByType)
        .sort((a, b) => b[1] - a[1])
        .map(([type, cost]) => ({ label: type, value: cost, color: colors.warning })),
    [stats.costByType],
  );


  const formatStatus = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'scheduled':
        return 'Scheduled';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const handleExport = () => {
    const { headers, rows, filename } = csvForMaintenance(allMaintenanceRecords);
    downloadCSV(headers, rows, filename);
  };

  return (
    <>
      <PageHeader
        title="Maintenance Report"
        subtitle="All maintenance records across inventory"
        onBack={onBack}
        backLabel="Back to Reports"
        action={
          // Disabled until the FULL history loads — exporting during
          // "Loading records…" silently produced a pending-only CSV
          <Button onClick={handleExport} icon={Download} disabled={!maintenanceLoaded}>
            Export CSV
          </Button>
        }
      />

      <ReportBranding profile={currentUser?.profile} />

      {maintenanceLoadFailed ? (
        <LoadErrorBanner
          message="Couldn't load the full maintenance history — this report only covers pending records."
          onRetry={() => ensureMaintenance()}
        />
      ) : (
        !maintenanceLoaded && (
          <div
            style={{
              padding: spacing[3],
              marginBottom: spacing[4],
              fontSize: typography.fontSize.sm,
              color: colors.textMuted,
            }}
            role="status"
          >
            Loading full maintenance history…
          </div>
        )
      )}

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: spacing[4],
          marginBottom: spacing[6],
        }}
      >
        <StatCard icon={Wrench} label="Total Records" value={stats.total} color={colors.primary} />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color={stats.pending > 0 ? colors.checkedOut : colors.textMuted}
        />
        <StatCard
          icon={AlertTriangle}
          label="In Progress"
          value={stats.inProgress}
          color={stats.inProgress > 0 ? colors.accent1 : colors.textMuted}
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value={formatMoney(stats.totalCost)}
          color={colors.danger}
        />
        <StatCard
          icon={DollarSign}
          label="Warranty Savings"
          value={formatMoney(stats.warrantySavings)}
          color={colors.available}
        />
      </div>

      {/* Cost over time */}
      {maintenanceLoaded && stats.completed > 0 && (
        <Card padding={false} style={{ marginBottom: spacing[5] }}>
          <CardHeader title="Maintenance Cost — Last 12 Months" icon={DollarSign} />
          <div style={{ padding: spacing[4] }}>
            <ColumnChart
              data={costSeries}
              color={colors.warning}
              formatValue={formatMoney}
              ariaLabel="Completed non-warranty maintenance cost per month over the last 12 months"
            />
          </div>
        </Card>
      )}

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main Records List */}
        <Card
          padding={false}
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
        >
          <CardHeader title="All Maintenance Records" icon={Wrench} />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            {sortedRecords.length === 0 ? (
              maintenanceLoaded ? (
                <EmptyState icon={Wrench} title="No maintenance records yet" />
              ) : (
                <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                  Loading records…
                </div>
              )
            ) : (
              sortedRecords.map((record, idx) => (
                <button
                  type="button"
                  className="report-row"
                  key={record.id}
                  style={{
                    padding: spacing[4],
                    borderBottom:
                      idx < sortedRecords.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                  }}
                  onClick={() => onViewItem(record.itemId)}
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
                      <Badge text={record.type} color={getMaintenanceStatusColor(record.status)} size="xs" />
                      <Badge
                        text={formatStatus(record.status)}
                        color={getMaintenanceStatusColor(record.status)}
                        size="xs"
                      />
                      {record.warrantyWork && (
                        <Badge text="Warranty" color={colors.available} size="xs" />
                      )}
                    </div>
                    {record.cost > 0 && (
                      <span
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {formatMoney(record.cost)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textPrimary,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    {record.description}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      marginTop: spacing[1],
                    }}
                  >
                    {record.itemName} ({record.itemId}){record.vendor && ` • ${record.vendor}`}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {record.status === 'completed' && record.completedDate
                      ? `Completed ${formatDate(record.completedDate)}`
                      : record.scheduledDate
                        ? `Scheduled ${formatDate(record.scheduledDate)}`
                        : formatDate(record.createdAt)}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Sidebar Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Cost by Type */}
          <Card padding={false}>
            <CardHeader title="Cost by Type" />
            <div style={{ padding: spacing[4] }}>
              {costByTypeBars.length === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  No completed work yet
                </p>
              ) : (
                <HBarChart
                  data={costByTypeBars}
                  formatValue={formatMoney}
                  ariaLabel="Completed maintenance cost by record type"
                />
              )}
            </div>
          </Card>

          {/* By Type (counts) */}
          <Card padding={false}>
            <CardHeader title="Records by Type" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byType).length === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  No data
                </p>
              ) : (
                Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div
                      key={type}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: spacing[2],
                      }}
                    >
                      <span
                        style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}
                      >
                        {type}
                      </span>
                      <span
                        style={{
                          color: colors.textPrimary,
                          fontWeight: typography.fontWeight.medium,
                          fontSize: typography.fontSize.sm,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </Card>

          {/* Top Vendors */}
          <Card padding={false}>
            <CardHeader title="Top Vendors by Cost" icon={Building2} />
            <div style={{ padding: spacing[4] }}>
              {stats.topVendors.length === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  No vendor data
                </p>
              ) : (
                stats.topVendors.map(([vendor, cost]) => (
                  <div
                    key={vendor}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: spacing[2],
                    }}
                  >
                    <span
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.fontSize.sm,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 150,
                      }}
                    >
                      {vendor}
                    </span>
                    <span
                      style={{
                        color: colors.textPrimary,
                        fontWeight: typography.fontWeight.medium,
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      {formatMoney(cost)}
                    </span>
                  </div>
                ))
              )}
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
MaintenanceReportPanel.propTypes = {
  /** Full inventory array with maintenance history */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      brand: PropTypes.string,
      maintenanceHistory: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          type: PropTypes.string,
          description: PropTypes.string,
          status: PropTypes.oneOf(['scheduled', 'in-progress', 'completed', 'cancelled']),
          cost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          vendor: PropTypes.string,
          warrantyWork: PropTypes.bool,
          scheduledDate: PropTypes.string,
          completedDate: PropTypes.string,
          createdAt: PropTypes.string,
        }),
      ),
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
