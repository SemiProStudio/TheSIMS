// ============================================================================
// Reports Panel View
// Overview of inventory, clients, and activity with navigation to detailed reports
// ============================================================================

import { memo, useMemo } from 'react';
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
import { formatMoney, sanitizeCSVCell } from '../utils';
import { Card, Button, PageHeader } from '../components/ui.jsx';

export const ReportsPanel = memo(function ReportsPanel({
  inventory,
  clients = [],
  onExport,
  onBack,
  setCurrentView,
}) {
  const alerts = inventory.filter((i) => i.status === 'needs-attention');
  const totalVal = inventory.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalCheckouts = inventory.reduce((s, i) => s + (i.checkoutCount || 0), 0);

  // Calculate client stats
  const clientStats = useMemo(() => {
    const clientReservations = {};
    inventory.forEach((item) => {
      (item.reservations || []).forEach((res) => {
        if (res.clientId) {
          clientReservations[res.clientId] = (clientReservations[res.clientId] || 0) + 1;
        }
      });
    });
    const topClient =
      clients.length > 0
        ? clients.reduce(
            (top, c) =>
              (clientReservations[c.id] || 0) > (clientReservations[top?.id] || 0) ? c : top,
            clients[0],
          )
        : null;
    return {
      total: clients.length,
      withReservations: Object.keys(clientReservations).length,
      topClient,
      topClientCount: topClient ? clientReservations[topClient.id] || 0 : 0,
    };
  }, [clients, inventory]);

  // Maintenance stats
  const maintenanceStats = useMemo(
    () => ({
      total: inventory.reduce((sum, i) => sum + (i.maintenanceHistory?.length || 0), 0),
      pending: inventory.reduce(
        (sum, i) =>
          sum +
          (i.maintenanceHistory?.filter(
            (m) => m.status === 'scheduled' || m.status === 'in-progress',
          ).length || 0),
        0,
      ),
    }),
    [inventory],
  );

  // CSV download helper
  const downloadCSV = (headers, rows, filename) => {
    const csvContent = [
      headers.map((h) => sanitizeCSVCell(h)).join(','),
      ...rows.map((row) => row.map((cell) => sanitizeCSVCell(cell)).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Direct CSV export: Maintenance
  const exportMaintenance = () => {
    const records = [];
    inventory.forEach((item) => {
      (item.maintenanceHistory || []).forEach((record) => {
        records.push({ ...record, itemId: item.id, itemName: item.name });
      });
    });
    const sorted = records.sort((a, b) => {
      const aP = a.status === 'scheduled' || a.status === 'in-progress';
      const bP = b.status === 'scheduled' || b.status === 'in-progress';
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return (
        new Date(b.completedDate || b.scheduledDate || b.createdAt) -
        new Date(a.completedDate || a.scheduledDate || a.createdAt)
      );
    });
    downloadCSV(
      [
        'Item',
        'Item ID',
        'Type',
        'Description',
        'Status',
        'Vendor',
        'Cost',
        'Warranty',
        'Scheduled Date',
        'Completed Date',
      ],
      sorted.map((r) => [
        r.itemName,
        r.itemId,
        r.type,
        r.description || '',
        r.status,
        r.vendor || '',
        r.cost || 0,
        r.warrantyWork ? 'Yes' : 'No',
        r.scheduledDate || '',
        r.completedDate || '',
      ]),
      `maintenance-report-${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  // Direct CSV export: Insurance
  const exportInsurance = () => {
    const items = [...inventory].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
    downloadCSV(
      [
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
      ],
      items.map((i) => [
        i.id,
        i.name,
        i.brand,
        i.category,
        i.serialNumber || '',
        i.purchaseDate || '',
        i.purchasePrice || 0,
        i.currentValue || 0,
        i.condition || '',
        i.location || '',
        i.status,
      ]),
      `insurance-inventory-${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  // Direct CSV export: Clients
  const exportClients = () => {
    const reservationCounts = {};
    const totalValues = {};
    inventory.forEach((item) => {
      (item.reservations || []).forEach((res) => {
        if (res.clientId) {
          reservationCounts[res.clientId] = (reservationCounts[res.clientId] || 0) + 1;
          totalValues[res.clientId] = (totalValues[res.clientId] || 0) + (res.value || 0);
        }
      });
    });
    const rows = clients
      .map((c) => ({
        ...c,
        reservationCount: reservationCounts[c.id] || 0,
        totalValue: totalValues[c.id] || 0,
      }))
      .sort((a, b) => b.reservationCount - a.reservationCount);
    downloadCSV(
      [
        'Client Name',
        'Type',
        'Company',
        'Email',
        'Phone',
        'Reservations',
        'Total Value',
        'Favorite',
      ],
      rows.map((c) => [
        c.name,
        c.type,
        c.company || '',
        c.email || '',
        c.phone || '',
        c.reservationCount,
        c.totalValue,
        c.favorite ? 'Yes' : 'No',
      ]),
      `client-report-${new Date().toISOString().split('T')[0]}.csv`,
    );
  };

  const buttonRowStyle = { display: 'flex', gap: spacing[2] };

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
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: spacing[4],
        }}
      >
        {/* Inventory Summary */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.primary, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={20} color={colors.primary} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Inventory Summary</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Total items and value
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                }}
              >
                {inventory.length}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Items
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.available,
                }}
              >
                {formatMoney(totalVal)}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Value
              </div>
            </div>
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
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.accent1, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart3 size={20} color={colors.accent1} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Activity</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Checkout statistics
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.accent1,
              }}
            >
              {totalCheckouts}
            </div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
              Total Checkouts
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>
              Export
            </Button>
          </div>
        </Card>

        {/* Alerts */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.danger, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={20} color={colors.danger} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Alerts</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Items needing attention
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: alerts.length > 0 ? colors.danger : colors.textMuted,
              }}
            >
              {alerts.length}
            </div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
              Need Attention
            </div>
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>
              Export
            </Button>
          </div>
        </Card>

        {/* Maintenance Report */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.warning, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wrench size={20} color={colors.warning} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Maintenance Report</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                All maintenance records
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.warning,
                }}
              >
                {maintenanceStats.total}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Records
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.checkedOut,
                }}
              >
                {maintenanceStats.pending}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Pending
              </div>
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
              onClick={exportMaintenance}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Insurance Report */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.available, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DollarSign size={20} color={colors.available} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Insurance Report</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Asset values for insurance
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div
              style={{
                fontSize: typography.fontSize['2xl'],
                fontWeight: typography.fontWeight.bold,
                color: colors.available,
              }}
            >
              {formatMoney(totalVal)}
            </div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
              Total Insurable Value
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
              onClick={exportInsurance}
              icon={Download}
            >
              Export
            </Button>
          </div>
        </Card>

        {/* Client Report */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: borderRadius.md,
                background: `${withOpacity(colors.checkedOut, 15)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={20} color={colors.checkedOut} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Client Report</h4>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Clients by activity
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.checkedOut,
                }}
              >
                {clientStats.total}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Clients
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                }}
              >
                {clientStats.withReservations}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                With Projects
              </div>
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
            <Button variant="secondary" style={{ flex: 1 }} onClick={exportClients} icon={Download}>
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
  /** Callback to export data */
  onExport: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
  /** Function to change current view */
  setCurrentView: PropTypes.func.isRequired,
};
