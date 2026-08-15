// ============================================================================
// Reports Panel View
// Overview hub: each card carries a real mini-visual and the SAME numbers as
// the detail report it links to (shared assembly in lib/reportData.js).
// Card-level Export buttons export that report's data — Activity and Alerts
// used to open the generic inventory export instead.
// ============================================================================

import { memo, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Download,
  Package,
  BarChart3,
  AlertTriangle,
  Wrench,
  DollarSign,
  Building2,
  Eye,
} from 'lucide-react';
import { VIEWS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatMoney, downloadCSV, getStatusColor } from '../utils';
import { STATUS_LABELS } from '../constants.js';
import { Card, Button, PageHeader } from '../components/ui.jsx';
import { DonutChart, Sparkline } from '../components/charts.jsx';
import {
  computeAlertData,
  computeClientReportStats,
  collectMaintenanceRecords,
  computeMaintenanceStats,
  computeInventoryStats,
  bucketEvents,
  csvForActivity,
  csvForAlerts,
  csvForMaintenance,
  csvForInsurance,
  csvForClients,
} from '../lib/reportData.js';
import { useData } from '../contexts/DataContext.js';

const cardHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: spacing[3],
  marginBottom: spacing[4],
};

const iconBoxStyle = (color) => ({
  width: 40,
  height: 40,
  borderRadius: borderRadius.md,
  background: `${withOpacity(color, 15)}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const cardSubtitleStyle = {
  margin: `${spacing[1]}px 0 0`,
  fontSize: typography.fontSize.xs,
  color: colors.textMuted,
};

const bigNumberStyle = (color) => ({
  fontSize: typography.fontSize['2xl'],
  fontWeight: typography.fontWeight.bold,
  color,
});

const smallLabelStyle = { fontSize: typography.fontSize.xs, color: colors.textMuted };

export const ReportsPanel = memo(function ReportsPanel({
  inventory,
  clients = [],
  onExport,
  onBack,
  setCurrentView,
}) {
  const {
    ensureClients,
    ensureMaintenance,
    ensureCheckoutActivity,
    maintenanceLoaded,
    checkoutEvents,
    checkoutEventsLoaded,
    categorySettings,
  } = useData();

  // Lazy-load everything the cards visualize
  useEffect(() => {
    ensureClients();
    ensureMaintenance();
    ensureCheckoutActivity();
  }, [ensureClients, ensureMaintenance, ensureCheckoutActivity]);

  const inventoryStats = useMemo(() => computeInventoryStats(inventory), [inventory]);
  const alertData = useMemo(
    () => computeAlertData(inventory, categorySettings),
    [inventory, categorySettings],
  );
  const clientStats = useMemo(() => computeClientReportStats(clients, inventory), [clients, inventory]);
  const maintenanceRecords = useMemo(() => collectMaintenanceRecords(inventory), [inventory]);
  const maintenanceStats = useMemo(
    () => computeMaintenanceStats(maintenanceRecords),
    [maintenanceRecords],
  );
  const totalCheckouts = useMemo(
    () => inventory.reduce((s, i) => s + (i.checkoutCount || 0), 0),
    [inventory],
  );

  // 12-week checkout sparkline
  const checkoutSpark = useMemo(
    () =>
      bucketEvents(
        checkoutEvents.filter((e) => e.action === 'checkout'),
        { days: 84 },
      ).map((b) => b.value),
    [checkoutEvents],
  );

  const statusSegments = useMemo(
    () =>
      Object.entries(inventoryStats.byStatus)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({
          label: STATUS_LABELS[status] || status,
          value: count,
          color: getStatusColor(status),
        })),
    [inventoryStats.byStatus],
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

  const exportCSV = (builder) => () => {
    const { headers, rows, filename } = builder();
    downloadCSV(headers, rows, filename);
  };

  const buttonRowStyle = { display: 'flex', gap: spacing[2], marginTop: 'auto' };
  const cardStyle = { display: 'flex', flexDirection: 'column' };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Overview of inventory, clients, and activity"
        onBack={onBack}
        backLabel="Back to Dashboard"
        action={
          <Button onClick={onExport} icon={Download}>
            Export All
          </Button>
        }
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: spacing[4],
        }}
      >
        {/* Inventory Summary */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.primary)}>
              <Package size={20} color={colors.primary} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Inventory Summary</h4>
              <p style={cardSubtitleStyle}>
                {inventoryStats.totalItems} items • {formatMoney(inventoryStats.totalValue)}
              </p>
            </div>
          </div>
          <div style={{ marginBottom: spacing[4] }}>
            <DonutChart
              data={statusSegments}
              size={104}
              thickness={14}
              centerLabel="items"
              ariaLabel={`Inventory by status: ${statusSegments
                .map((s) => `${s.label} ${s.value}`)
                .join(', ')}`}
            />
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.INVENTORY_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>
              Export
            </Button>
          </div>
        </Card>

        {/* Activity */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.accent1)}>
              <BarChart3 size={20} color={colors.accent1} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Activity</h4>
              <p style={cardSubtitleStyle}>Checkout statistics</p>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div>
              <div style={bigNumberStyle(colors.accent1)}>{totalCheckouts}</div>
              <div style={smallLabelStyle}>Total Checkouts</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {checkoutEventsLoaded ? (
                <>
                  <Sparkline
                    data={checkoutSpark}
                    color={colors.accent1}
                    ariaLabel="Checkouts per week over the last 90 days"
                  />
                  {/* 90 days spans 13 Monday-start weeks with partial edge
                      weeks — "12 weeks" overpromised full weeks */}
                  <div style={smallLabelStyle}>Weekly, last 90 days</div>
                </>
              ) : (
                <div style={smallLabelStyle}>Loading trend…</div>
              )}
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.ACTIVITY_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={exportCSV(() => csvForActivity(inventory))}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Alerts */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.danger)}>
              <AlertTriangle size={20} color={colors.danger} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Alerts</h4>
              <p style={cardSubtitleStyle}>
                {formatMoney(alertData.valueAtRisk)} at risk
              </p>
            </div>
          </div>
          <div style={{ marginBottom: spacing[4] }}>
            {alertData.totalAlerts === 0 ? (
              <div style={{ textAlign: 'center' }}>
                <div style={bigNumberStyle(colors.textMuted)}>0</div>
                <div style={smallLabelStyle}>No alerts — all clear</div>
              </div>
            ) : (
              <DonutChart
                data={severitySegments}
                size={104}
                thickness={14}
                centerLabel="alerts"
                centerValue={alertData.totalAlerts}
                ariaLabel={`Alerts: ${severitySegments
                  .map((s) => `${s.label} ${s.value}`)
                  .join(', ')}`}
              />
            )}
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.ALERTS_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={exportCSV(() => csvForAlerts(alertData.allAlerts))}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Maintenance Report */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.warning)}>
              <Wrench size={20} color={colors.warning} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Maintenance Report</h4>
              <p style={cardSubtitleStyle}>
                {maintenanceLoaded
                  ? `${formatMoney(maintenanceStats.totalCost)} lifetime cost`
                  : 'Loading history…'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.warning)}>{maintenanceStats.total}</div>
              <div style={smallLabelStyle}>Total Records</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.checkedOut)}>{maintenanceStats.pending}</div>
              <div style={smallLabelStyle}>Pending</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.MAINTENANCE_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={exportCSV(() => csvForMaintenance(maintenanceRecords))}
              icon={Download}
              // Until the FULL history loads this would silently export
              // pending-only records
              disabled={!maintenanceLoaded}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Insurance Report */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.available)}>
              <DollarSign size={20} color={colors.available} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Insurance Report</h4>
              <p style={cardSubtitleStyle}>Asset values for insurance</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.available)}>
                {formatMoney(inventoryStats.totalValue)}
              </div>
              <div style={smallLabelStyle}>Insurable Value</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.danger)}>
                {formatMoney(inventoryStats.depreciation)}
              </div>
              <div style={smallLabelStyle}>Depreciation</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.INSURANCE_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={exportCSV(() =>
                csvForInsurance(
                  [...inventory].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0)),
                ),
              )}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Client Report */}
        <Card style={cardStyle}>
          <div style={cardHeaderStyle}>
            <div style={iconBoxStyle(colors.checkedOut)}>
              <Building2 size={20} color={colors.checkedOut} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Client Report</h4>
              <p style={cardSubtitleStyle}>
                {clientStats.topClient && clientStats.topClient.reservationCount > 0
                  ? `Top: ${clientStats.topClient.name} (${clientStats.topClient.reservationCount})`
                  : 'Clients by activity'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.checkedOut)}>{clients.length}</div>
              <div style={smallLabelStyle}>Total Clients</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={bigNumberStyle(colors.primary)}>{clientStats.activeClients}</div>
              <div style={smallLabelStyle}>With Bookings</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={() => setCurrentView(VIEWS.CLIENT_REPORT)}
              icon={Eye}
            >
              View
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onClick={exportCSV(() => csvForClients(clientStats.clientsWithStats))}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
ReportsPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      status: PropTypes.string,
      currentValue: PropTypes.number,
      checkoutCount: PropTypes.number,
      maintenanceHistory: PropTypes.array,
      reservations: PropTypes.array,
    }),
  ).isRequired,
  /** Array of clients */
  clients: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
    }),
  ),
  /** Callback to export data (opens the configurable inventory export) */
  onExport: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
  /** Function to change current view */
  setCurrentView: PropTypes.func.isRequired,
};
