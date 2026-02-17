// ============================================================================
// Activity Report Panel View
// Checkout activity, usage statistics, and trending items
// ============================================================================

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Download, BarChart3, TrendingUp, LogOut, Package } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, sanitizeCSVCell } from '../utils';
import { Badge, Card, CardHeader, StatCard, Button, PageHeader } from '../components/ui.jsx';

export const ActivityReportPanel = memo(function ActivityReportPanel({
  inventory,
  currentUser,
  onViewItem,
  onBack
}) {
  // Compile checkout activity across all items
  const activityData = useMemo(() => {
    const totalCheckouts = inventory.reduce((sum, i) => sum + (i.checkoutCount || 0), 0);
    const currentlyOut = inventory.filter(i => i.status === 'checked-out');

    // Most checked-out items (top 15)
    const topItems = [...inventory]
      .filter(i => (i.checkoutCount || 0) > 0)
      .sort((a, b) => (b.checkoutCount || 0) - (a.checkoutCount || 0))
      .slice(0, 15);

    // Never checked out
    const neverCheckedOut = inventory.filter(i => !i.checkoutCount || i.checkoutCount === 0);

    // Items by checkout frequency
    const frequencyBuckets = { '0': 0, '1-5': 0, '6-10': 0, '11-25': 0, '26-50': 0, '50+': 0 };
    inventory.forEach(i => {
      const count = i.checkoutCount || 0;
      if (count === 0) frequencyBuckets['0']++;
      else if (count <= 5) frequencyBuckets['1-5']++;
      else if (count <= 10) frequencyBuckets['6-10']++;
      else if (count <= 25) frequencyBuckets['11-25']++;
      else if (count <= 50) frequencyBuckets['26-50']++;
      else frequencyBuckets['50+']++;
    });

    // Checkout activity by category
    const byCategory = {};
    inventory.forEach(item => {
      const cat = item.category || 'Uncategorized';
      if (!byCategory[cat]) {
        byCategory[cat] = { checkouts: 0, items: 0 };
      }
      byCategory[cat].checkouts += item.checkoutCount || 0;
      byCategory[cat].items++;
    });

    // Currently checked out details
    const checkedOutDetails = currentlyOut
      .sort((a, b) => new Date(a.dueBack || '9999') - new Date(b.dueBack || '9999'))
      .map(item => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        borrower: item.checkedOutTo || 'Unknown',
        checkedOutDate: item.checkedOutDate,
        dueBack: item.dueBack,
        project: item.checkoutProject,
        isOverdue: item.dueBack && new Date(item.dueBack) < new Date(),
      }));

    // Utilization rate: items that have been checked out at least once
    const utilizedCount = inventory.filter(i => (i.checkoutCount || 0) > 0).length;
    const utilizationRate = inventory.length > 0 ? Math.round((utilizedCount / inventory.length) * 100) : 0;

    return {
      totalCheckouts,
      currentlyOut: currentlyOut.length,
      topItems,
      neverCheckedOut: neverCheckedOut.length,
      frequencyBuckets,
      byCategory,
      checkedOutDetails,
      utilizationRate,
    };
  }, [inventory]);

  // Export CSV
  const handleExport = () => {
    const headers = ['Item ID', 'Name', 'Brand', 'Category', 'Status', 'Checkout Count', 'Currently Checked Out To', 'Checked Out Date', 'Due Back', 'Project'];
    const rows = [...inventory]
      .sort((a, b) => (b.checkoutCount || 0) - (a.checkoutCount || 0))
      .map(item => [
        item.id,
        item.name,
        item.brand || '',
        item.category || '',
        item.status || '',
        item.checkoutCount || 0,
        item.checkedOutTo || '',
        item.checkedOutDate || '',
        item.dueBack || '',
        item.checkoutProject || '',
      ]);

    const csvContent = [
      headers.map(h => sanitizeCSVCell(h)).join(','),
      ...rows.map(row => row.map(cell => sanitizeCSVCell(cell)).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Activity Report"
        subtitle="Checkout activity and usage statistics"
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
        <StatCard icon={BarChart3} label="Total Checkouts" value={activityData.totalCheckouts} color={colors.primary} />
        <StatCard icon={LogOut} label="Currently Out" value={activityData.currentlyOut} color={activityData.currentlyOut > 0 ? colors.checkedOut : colors.textMuted} />
        <StatCard icon={TrendingUp} label="Utilization Rate" value={`${activityData.utilizationRate}%`} color={colors.available} />
        <StatCard icon={Package} label="Never Used" value={activityData.neverCheckedOut} color={activityData.neverCheckedOut > 0 ? colors.warning : colors.textMuted} />
      </div>

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Most Checked Out */}
          <Card padding={false} style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}>
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
                      <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium, width: 36 }}>#</th>
                      <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Item</th>
                      <th style={{ padding: spacing[3], textAlign: 'left', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Status</th>
                      <th style={{ padding: spacing[3], textAlign: 'right', fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.medium }}>Checkouts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityData.topItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => onViewItem(item.id)}
                        style={{
                          borderBottom: `1px solid ${colors.borderLight}`,
                          cursor: 'pointer',
                        }}
                      >
                        <td style={{ padding: spacing[3] }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 24,
                            height: 24,
                            borderRadius: borderRadius.full,
                            background: idx < 3 ? `${withOpacity(colors.primary, 20)}` : colors.bgLight,
                            color: idx < 3 ? colors.primary : colors.textMuted,
                            fontSize: typography.fontSize.xs,
                            fontWeight: typography.fontWeight.semibold,
                          }}>
                            {idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: spacing[3] }}>
                          <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                            {item.id}{item.brand ? ` \u2022 ${item.brand}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: spacing[3] }}>
                          <Badge
                            text={item.status === 'checked-out' ? 'Checked Out' : item.status === 'available' ? 'Available' : item.status}
                            color={item.status === 'checked-out' ? colors.checkedOut : item.status === 'available' ? colors.available : colors.textMuted}
                            size="xs"
                          />
                        </td>
                        <td style={{ padding: spacing[3], textAlign: 'right' }}>
                          <span style={{
                            fontSize: typography.fontSize.sm,
                            fontWeight: typography.fontWeight.semibold,
                            color: colors.primary,
                          }}>
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
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      padding: spacing[3],
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.borrower}{item.project ? ` \u2022 ${item.project}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {item.dueBack && (
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.medium,
                          color: item.isOverdue ? colors.danger : colors.textSecondary,
                        }}>
                          {item.isOverdue ? 'OVERDUE' : `Due ${formatDate(item.dueBack)}`}
                        </div>
                      )}
                      {item.checkedOutDate && (
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                          Out since {formatDate(item.checkedOutDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {/* Checkout Frequency Distribution */}
          <Card padding={false}>
            <CardHeader title="Checkout Frequency" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(activityData.frequencyBuckets).map(([range, count]) => {
                const maxCount = Math.max(...Object.values(activityData.frequencyBuckets));
                return (
                  <div key={range} style={{ marginBottom: spacing[3] }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                      <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                        {range === '0' ? 'Never' : `${range} times`}
                      </span>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                        {count} items
                      </span>
                    </div>
                    <div style={{ height: 6, background: colors.borderLight, borderRadius: borderRadius.full, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                        background: range === '0' ? colors.textMuted : colors.primary,
                        borderRadius: borderRadius.full,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Activity by Category */}
          <Card padding={false}>
            <CardHeader title="Checkouts by Category" />
            <div style={{ padding: spacing[4] }}>
              {Object.entries(activityData.byCategory)
                .sort((a, b) => b[1].checkouts - a[1].checkouts)
                .map(([category, data]) => (
                  <div key={category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                    <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{category}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{data.checkouts}</span>
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginLeft: spacing[1] }}>({data.items} items)</span>
                    </div>
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
ActivityReportPanel.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.arrayOf(PropTypes.shape({
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
