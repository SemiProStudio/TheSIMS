// ============================================================================
// Alerts Report Panel View
// Items needing attention with status breakdown and actionable details
// ============================================================================

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Download, AlertTriangle, Clock, Package, MapPin, TrendingDown } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { formatDate, formatMoney, sanitizeCSVCell } from '../utils';
import { Badge, Card, CardHeader, StatCard, EmptyState, Button, PageHeader } from '../components/ui.jsx';

export const AlertsReportPanel = memo(function AlertsReportPanel({
  inventory,
  currentUser,
  onViewItem,
  onBack
}) {
  // Compile all items with problems
  const alertData = useMemo(() => {
    const needsAttention = inventory.filter(i => i.status === 'needs-attention');
    const missing = inventory.filter(i => i.status === 'missing');
    const lowStock = inventory.filter(i => i.status === 'low-stock');
    const overdue = inventory.filter(i => {
      if (i.status !== 'checked-out') return false;
      return i.dueBack && new Date(i.dueBack) < new Date();
    });
    const poorCondition = inventory.filter(i => i.condition === 'poor');

    // All alert items combined and deduplicated
    const alertItemMap = new Map();
    const addAlert = (item, reason) => {
      if (alertItemMap.has(item.id)) {
        alertItemMap.get(item.id).reasons.push(reason);
      } else {
        alertItemMap.set(item.id, { ...item, reasons: [reason] });
      }
    };

    needsAttention.forEach(i => addAlert(i, 'Needs Attention'));
    missing.forEach(i => addAlert(i, 'Missing'));
    lowStock.forEach(i => addAlert(i, 'Low Stock'));
    overdue.forEach(i => addAlert(i, 'Overdue'));
    poorCondition.forEach(i => addAlert(i, 'Poor Condition'));

    const allAlerts = Array.from(alertItemMap.values());

    // Sort: items with most issues first, then by name
    allAlerts.sort((a, b) => {
      if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
      return (a.name || '').localeCompare(b.name || '');
    });

    // Value at risk
    const valueAtRisk = allAlerts.reduce((sum, i) => sum + (i.currentValue || 0), 0);

    // By category
    const byCategory = {};
    allAlerts.forEach(item => {
      const cat = item.category || 'Uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    return {
      needsAttention: needsAttention.length,
      missing: missing.length,
      lowStock: lowStock.length,
      overdue: overdue.length,
      poorCondition: poorCondition.length,
      totalAlerts: allAlerts.length,
      valueAtRisk,
      allAlerts,
      byCategory,
    };
  }, [inventory]);

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Needs Attention': return colors.danger;
      case 'Missing': return colors.textMuted;
      case 'Low Stock': return colors.warning;
      case 'Overdue': return colors.checkedOut;
      case 'Poor Condition': return colors.accent1;
      default: return colors.textMuted;
    }
  };

  // Export CSV
  const handleExport = () => {
    const headers = ['Item ID', 'Name', 'Brand', 'Category', 'Status', 'Condition', 'Location', 'Current Value', 'Alert Reasons', 'Due Back', 'Checked Out To'];
    const rows = alertData.allAlerts.map(item => [
      item.id,
      item.name,
      item.brand || '',
      item.category || '',
      item.status || '',
      item.condition || '',
      item.location || '',
      item.currentValue || 0,
      item.reasons.join('; '),
      item.dueBack || '',
      item.checkedOutTo || '',
    ]);

    const csvContent = [
      headers.map(h => sanitizeCSVCell(h)).join(','),
      ...rows.map(row => row.map(cell => sanitizeCSVCell(cell)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Alerts Report"
        subtitle="Items needing attention, missing, overdue, or in poor condition"
        onBack={onBack}
        backLabel="Back to Reports"
        action={<Button onClick={handleExport} icon={Download}>Export CSV</Button>}
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
        <StatCard icon={AlertTriangle} label="Total Alerts" value={alertData.totalAlerts} color={alertData.totalAlerts > 0 ? colors.danger : colors.textMuted} />
        <StatCard icon={AlertTriangle} label="Needs Attention" value={alertData.needsAttention} color={alertData.needsAttention > 0 ? colors.danger : colors.textMuted} />
        <StatCard icon={Clock} label="Overdue" value={alertData.overdue} color={alertData.overdue > 0 ? colors.checkedOut : colors.textMuted} />
        <StatCard icon={Package} label="Missing" value={alertData.missing} color={alertData.missing > 0 ? colors.warning : colors.textMuted} />
        <StatCard icon={TrendingDown} label="Value at Risk" value={formatMoney(alertData.valueAtRisk)} color={alertData.valueAtRisk > 0 ? colors.danger : colors.textMuted} />
      </div>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main alerts list */}
        <Card padding={false} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}>
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
                <div
                  key={item.id}
                  onClick={() => onViewItem(item.id)}
                  style={{
                    padding: spacing[4],
                    borderBottom: idx < alertData.allAlerts.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                    <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                      {item.reasons.map(reason => (
                        <Badge key={reason} text={reason} color={getReasonColor(reason)} size="xs" />
                      ))}
                    </div>
                    {(item.currentValue || 0) > 0 && (
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                        {formatMoney(item.currentValue)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] }}>
                    {item.id}{item.brand ? ` \u2022 ${item.brand}` : ''}{item.category ? ` \u2022 ${item.category}` : ''}
                  </div>
                  {item.checkedOutTo && (
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                      Checked out to {item.checkedOutTo}
                      {item.dueBack ? ` \u2022 Due ${formatDate(item.dueBack)}` : ''}
                    </div>
                  )}
                  {item.location && (
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <MapPin size={10} /> {item.location}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Alert Type Breakdown */}
          <Card padding={false}>
            <CardHeader title="Alert Breakdown" />
            <div style={{ padding: spacing[4] }}>
              {[
                { label: 'Needs Attention', count: alertData.needsAttention, color: colors.danger },
                { label: 'Overdue', count: alertData.overdue, color: colors.checkedOut },
                { label: 'Missing', count: alertData.missing, color: colors.warning },
                { label: 'Low Stock', count: alertData.lowStock, color: colors.warning },
                { label: 'Poor Condition', count: alertData.poorCondition, color: colors.accent1 },
              ].filter(a => a.count > 0).map(alert => (
                <div key={alert.label} style={{ marginBottom: spacing[3] }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: alert.color }} />
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>{alert.label}</span>
                    </div>
                    <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{alert.count}</span>
                  </div>
                  <div style={{ height: 6, background: colors.borderLight, borderRadius: borderRadius.full, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: alertData.totalAlerts > 0 ? `${(alert.count / alertData.totalAlerts) * 100}%` : '0%',
                      background: alert.color,
                      borderRadius: borderRadius.full,
                    }} />
                  </div>
                </div>
              ))}
              {alertData.totalAlerts === 0 && (
                <p style={{ color: colors.textMuted, textAlign: 'center', margin: 0, fontSize: typography.fontSize.sm }}>No alerts</p>
              )}
            </div>
          </Card>

          {/* By Category */}
          {Object.keys(alertData.byCategory).length > 0 && (
            <Card padding={false}>
              <CardHeader title="Alerts by Category" />
              <div style={{ padding: spacing[4] }}>
                {Object.entries(alertData.byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{category}</span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{count}</span>
                    </div>
                  ))}
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
  inventory: PropTypes.arrayOf(PropTypes.shape({
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
  })).isRequired,
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    profile: PropTypes.object,
  }),
  /** Callback when item is clicked */
  onViewItem: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
