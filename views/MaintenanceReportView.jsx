// ============================================================================
// Maintenance Report Panel View
// All maintenance records across inventory
// ============================================================================

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Wrench, Clock, AlertTriangle, DollarSign, Building2 } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { formatDate, formatMoney } from '../utils';
import { Badge, Card, CardHeader, StatCard, PageHeader } from '../components/ui.jsx';

export const MaintenanceReportPanel = memo(function MaintenanceReportPanel({ 
  inventory, 
  currentUser,
  onViewItem, 
  onBack 
}) {
  // Collect all maintenance records across all items
  const allMaintenanceRecords = useMemo(() => {
    const records = [];
    inventory.forEach(item => {
      if (item.maintenanceHistory && item.maintenanceHistory.length > 0) {
        (item.maintenanceHistory || []).forEach(record => {
          records.push({
            ...record,
            itemId: item.id,
            itemName: item.name,
            itemBrand: item.brand,
          });
        });
      }
    });
    return records;
  }, [inventory]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = allMaintenanceRecords.filter(r => r.status === 'completed');
    const pending = allMaintenanceRecords.filter(r => r.status === 'scheduled' || r.status === 'in-progress');
    const inProgress = allMaintenanceRecords.filter(r => r.status === 'in-progress');
    const totalCost = completed.filter(r => !r.warrantyWork).reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
    const warrantySavings = completed.filter(r => r.warrantyWork).reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

    // Group by type
    const byType = {};
    allMaintenanceRecords.forEach(r => {
      byType[r.type] = (byType[r.type] || 0) + 1;
    });

    // Top vendors by cost
    const vendorCosts = {};
    completed.forEach(r => {
      if (r.vendor) {
        vendorCosts[r.vendor] = (vendorCosts[r.vendor] || 0) + (Number(r.cost) || 0);
      }
    });
    const topVendors = Object.entries(vendorCosts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: allMaintenanceRecords.length,
      completed: completed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      totalCost,
      warrantySavings,
      byType,
      topVendors,
    };
  }, [allMaintenanceRecords]);

  // Sort records: pending first, then by date descending
  const sortedRecords = useMemo(() => {
    return [...allMaintenanceRecords].sort((a, b) => {
      const aIsPending = a.status === 'scheduled' || a.status === 'in-progress';
      const bIsPending = b.status === 'scheduled' || b.status === 'in-progress';
      if (aIsPending && !bIsPending) return -1;
      if (!aIsPending && bIsPending) return 1;
      const aDate = a.completedDate || a.scheduledDate || a.createdAt;
      const bDate = b.completedDate || b.scheduledDate || b.createdAt;
      return new Date(bDate) - new Date(aDate);
    });
  }, [allMaintenanceRecords]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.available;
      case 'in-progress': return colors.checkedOut;
      case 'scheduled': return colors.primary;
      case 'cancelled': return colors.textMuted;
      default: return colors.textMuted;
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'scheduled': return 'Scheduled';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <>
      <PageHeader 
        title="Maintenance Report" 
        subtitle="All maintenance records across inventory"
        onBack={onBack}
        backLabel="Back to Reports"
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
        <StatCard icon={Wrench} label="Total Records" value={stats.total} color={colors.primary} />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color={stats.pending > 0 ? colors.checkedOut : colors.textMuted} />
        <StatCard icon={AlertTriangle} label="In Progress" value={stats.inProgress} color={stats.inProgress > 0 ? colors.accent1 : colors.textMuted} />
        <StatCard icon={DollarSign} label="Total Cost" value={formatMoney(stats.totalCost)} color={colors.danger} />
        <StatCard icon={DollarSign} label="Warranty Savings" value={formatMoney(stats.warrantySavings)} color={colors.available} />
      </div>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main Records List */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 320px)' }}>
          <CardHeader title="All Maintenance Records" icon={Wrench} />
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            {sortedRecords.length === 0 ? (
              <div style={{ padding: spacing[6], textAlign: 'center', color: colors.textMuted }}>
                <Wrench size={32} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
                <p style={{ margin: 0 }}>No maintenance records found</p>
              </div>
            ) : (
              sortedRecords.map((record, idx) => (
                <div
                  key={record.id}
                  style={{
                    padding: spacing[4],
                    borderBottom: idx < sortedRecords.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    cursor: 'pointer',
                  }}
                  onClick={() => onViewItem(record.itemId)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                      <Badge text={record.type} color={getStatusColor(record.status)} size="xs" />
                      <Badge text={formatStatus(record.status)} color={getStatusColor(record.status)} size="xs" />
                      {record.warrantyWork && <Badge text="Warranty" color={colors.available} size="xs" />}
                    </div>
                    {record.cost > 0 && (
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                        {formatMoney(record.cost)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
                    {record.description}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] }}>
                    {record.itemName} ({record.itemId})
                    {record.vendor && ` • ${record.vendor}`}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {record.status === 'completed' && record.completedDate
                      ? `Completed ${formatDate(record.completedDate)}`
                      : record.scheduledDate
                      ? `Scheduled ${formatDate(record.scheduledDate)}`
                      : formatDate(record.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Sidebar Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* By Type */}
          <Card padding={false}>
            <CardHeader title="By Type" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(stats.byType).length === 0 ? (
                <p style={{ color: colors.textMuted, textAlign: 'center', margin: 0, fontSize: typography.fontSize.sm }}>No data</p>
              ) : (
                Object.entries(stats.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                      <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm }}>{type}</span>
                      <span style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>{count}</span>
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
                <p style={{ color: colors.textMuted, textAlign: 'center', margin: 0, fontSize: typography.fontSize.sm }}>No vendor data</p>
              ) : (
                stats.topVendors.map(([vendor, cost]) => (
                  <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <span style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{vendor}</span>
                    <span style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium, fontSize: typography.fontSize.sm }}>{formatMoney(cost)}</span>
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
  inventory: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    maintenanceHistory: PropTypes.arrayOf(PropTypes.shape({
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
    })),
  })).isRequired,
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
