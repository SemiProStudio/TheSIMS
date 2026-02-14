// ============================================================================
// Reports Panel View
// Overview of inventory, clients, and activity with navigation to detailed reports
// ============================================================================

import type { CSSProperties } from 'react';
import { memo, useMemo } from 'react';

import { Download, Package, BarChart3, AlertTriangle, Wrench, DollarSign, Building2, Eye } from 'lucide-react';
import { VIEWS } from '../constants';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme';
import { formatMoney } from '../utils';
import { Card, Button, PageHeader } from '../components/ui';

interface ReportsPanelProps {
  inventory: {
    id: string;
    status?: string;
    currentValue?: number;
    checkoutCount?: number;
    maintenanceHistory?: any[];
    reservations?: any[];
  }[];
  clients?: {
    id: string;
    name?: string;
  }[];
  onExport: (...args: any[]) => any;
  onBack: () => void;
  setCurrentView: (view: string) => void;
}

const buttonRowStyle: CSSProperties = { display: 'flex', gap: spacing[2] };

export const ReportsPanel = memo<ReportsPanelProps>(function ReportsPanel({
  inventory,
  clients = [],
  onExport,
  onBack,
  setCurrentView
}) {
  const alerts = inventory.filter(i => i.status === 'needs-attention');
  const totalVal = inventory.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalCheckouts = inventory.reduce((s, i) => s + i.checkoutCount, 0);
  
  // Calculate client stats
  const clientStats = useMemo(() => {
    const clientReservations = {};
    inventory.forEach(item => {
      (item.reservations || []).forEach(res => {
        if (res.clientId) {
          clientReservations[res.clientId] = (clientReservations[res.clientId] || 0) + 1;
        }
      });
    });
    const topClient = clients.length > 0 
      ? clients.reduce((top, c) => 
          (clientReservations[c.id] || 0) > (clientReservations[top?.id] || 0) ? c : top
        , clients[0])
      : null;
    return {
      total: clients.length,
      withReservations: Object.keys(clientReservations).length,
      topClient,
      topClientCount: topClient ? clientReservations[topClient.id] || 0 : 0,
    };
  }, [clients, inventory]);

  // Maintenance stats
  const maintenanceStats = useMemo(() => ({
    total: inventory.reduce((sum, i) => sum + (i.maintenanceHistory?.length || 0), 0),
    pending: inventory.reduce((sum, i) => sum + (i.maintenanceHistory?.filter(m => m.status === 'scheduled' || m.status === 'in-progress').length || 0), 0),
  }), [inventory]);

  return (
    <>
      <PageHeader 
        title="Reports" 
        subtitle="Overview of inventory, clients, and activity"
        onBack={onBack}
        backLabel="Back to Dashboard"
        action={<Button onClick={onExport} icon={Download}>Export All</Button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[4] }}>
        {/* Inventory Summary */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.primary, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} color={colors.primary} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Inventory Summary</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total items and value</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary }}>{inventory.length}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Items</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.available }}>{formatMoney(totalVal)}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Value</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.GEAR_LIST)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
        
        {/* Activity */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.accent1, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} color={colors.accent1} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Activity</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>Checkout statistics</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.accent1 }}>{totalCheckouts}</div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Checkouts</div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.SCHEDULE)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
        
        {/* Alerts */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.danger, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color={colors.danger} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Alerts</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>Items needing attention</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: alerts.length > 0 ? colors.danger : colors.textMuted }}>{alerts.length}</div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Need Attention</div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.GEAR_LIST)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
        
        {/* Maintenance Report */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.warning, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wrench size={20} color={colors.warning} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Maintenance Report</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>All maintenance records</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.warning }}>{maintenanceStats.total}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Records</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.checkedOut }}>{maintenanceStats.pending}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Pending</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.MAINTENANCE_REPORT)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
        
        {/* Insurance Report */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.available, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color={colors.available} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Insurance Report</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>Asset values for insurance</p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: spacing[4] }}>
            <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.available }}>{formatMoney(totalVal)}</div>
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Insurable Value</div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.INSURANCE_REPORT)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
        
        {/* Client Report */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[4] }}>
            <div style={{ width: 40, height: 40, borderRadius: borderRadius.md, background: `${withOpacity(colors.checkedOut, 15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} color={colors.checkedOut} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: colors.textPrimary }}>Client Report</h4>
              <p style={{ margin: `${spacing[1]}px 0 0`, fontSize: typography.fontSize.xs, color: colors.textMuted }}>Clients by activity</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.checkedOut }}>{clientStats.total}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Clients</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary }}>{clientStats.withReservations}</div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>With Projects</div>
            </div>
          </div>
          <div style={buttonRowStyle}>
            <Button variant="secondary" style={{ flex: 1 }} onClick={() => setCurrentView(VIEWS.CLIENT_REPORT)} icon={Eye}>View</Button>
            <Button variant="secondary" style={{ flex: 1 }} onClick={onExport} icon={Download}>Export</Button>
          </div>
        </Card>
      </div>
    </>
  );
});

