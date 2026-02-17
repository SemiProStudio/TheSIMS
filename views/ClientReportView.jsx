// ============================================================================
// Client Report Panel View
// Clients ranked by reservation activity
// ============================================================================

import { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Download, Building2, Users, FileText, DollarSign } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatMoney, sanitizeCSVCell } from '../utils';
import {
  Badge,
  Card,
  CardHeader,
  StatCard,
  EmptyState,
  Button,
  PageHeader,
} from '../components/ui.jsx';

export const ClientReportPanel = memo(function ClientReportPanel({
  clients = [],
  inventory = [],
  currentUser,
  onViewClient,
  onBack,
}) {
  // Calculate reservation counts for each client
  const clientsWithStats = useMemo(() => {
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

    return clients
      .map((client) => ({
        ...client,
        reservationCount: reservationCounts[client.id] || 0,
        totalValue: totalValues[client.id] || 0,
      }))
      .sort((a, b) => b.reservationCount - a.reservationCount);
  }, [clients, inventory]);

  // Summary stats
  const stats = useMemo(() => {
    const totalReservations = clientsWithStats.reduce((sum, c) => sum + c.reservationCount, 0);
    const totalValue = clientsWithStats.reduce((sum, c) => sum + c.totalValue, 0);
    const activeClients = clientsWithStats.filter((c) => c.reservationCount > 0).length;

    return { totalReservations, totalValue, activeClients };
  }, [clientsWithStats]);

  // Export CSV
  const handleExport = () => {
    const headers = [
      'Client Name',
      'Type',
      'Company',
      'Email',
      'Phone',
      'Reservations',
      'Total Value',
      'Favorite',
    ];
    const rows = clientsWithStats.map((c) => [
      c.name,
      c.type,
      c.company || '',
      c.email || '',
      c.phone || '',
      c.reservationCount,
      c.totalValue,
      c.favorite ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.map((h) => sanitizeCSVCell(h)).join(','),
      ...rows.map((row) => row.map((cell) => sanitizeCSVCell(cell)).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Client Report"
        subtitle="Clients ranked by reservation activity"
        onBack={onBack}
        backLabel="Back to Reports"
        action={
          <Button onClick={handleExport} icon={Download}>
            Export CSV
          </Button>
        }
      />

      {/* Profile branding for print/export */}
      {currentUser?.profile &&
        (() => {
          const p = currentUser.profile;
          const sf = p.showFields || {};
          const hasContent = Object.entries(sf).some(([k, v]) => v && p[k]);
          if (!hasContent) return null;
          return (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[4],
                padding: spacing[3],
                marginBottom: spacing[4],
                borderBottom: `1px solid ${colors.borderLight}`,
              }}
            >
              {sf.logo && p.logo && (
                <img src={p.logo} alt="" style={{ height: 36, objectFit: 'contain' }} />
              )}
              <div>
                {sf.businessName && p.businessName && (
                  <div
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.textPrimary,
                    }}
                  >
                    {p.businessName}
                  </div>
                )}
                <div
                  style={{
                    fontSize: typography.fontSize.xs,
                    color: colors.textMuted,
                    display: 'flex',
                    gap: spacing[3],
                    flexWrap: 'wrap',
                  }}
                >
                  {sf.displayName && p.displayName && <span>{p.displayName}</span>}
                  {sf.phone && p.phone && <span>{p.phone}</span>}
                  {sf.email && p.email && <span>{p.email}</span>}
                </div>
              </div>
            </div>
          );
        })()}

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
          icon={Building2}
          label="Total Clients"
          value={clients.length}
          color={colors.primary}
        />
        <StatCard
          icon={Users}
          label="Active Clients"
          value={stats.activeClients}
          color={colors.available}
        />
        <StatCard
          icon={FileText}
          label="Total Reservations"
          value={stats.totalReservations}
          color={colors.checkedOut}
        />
        <StatCard
          icon={DollarSign}
          label="Total Value"
          value={formatMoney(stats.totalValue)}
          color={colors.accent1}
        />
      </div>

      {/* Client List */}
      <Card
        padding={false}
        style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
      >
        <CardHeader title="Clients by Reservation Count" />
        {clientsWithStats.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No Clients"
            description="Add clients to see them in this report."
          />
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                  <th
                    style={{
                      padding: spacing[3],
                      textAlign: 'left',
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      fontWeight: typography.fontWeight.medium,
                    }}
                  >
                    Rank
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
                    Client
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
                    Type
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
                    Contact
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
                    Reservations
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
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientsWithStats.map((client, idx) => (
                  <tr
                    key={client.id}
                    onClick={() => onViewClient?.(client)}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: onViewClient ? 'pointer' : 'default',
                      background:
                        idx % 2 === 0 ? 'transparent' : `${withOpacity(colors.bgLight, 50)}`,
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <span
                          style={{
                            fontWeight: typography.fontWeight.medium,
                            color: colors.textPrimary,
                          }}
                        >
                          {client.name}
                        </span>
                        {client.favorite && <span style={{ color: '#f59e0b' }}>★</span>}
                      </div>
                      {client.company && client.type === 'Individual' && (
                        <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                          {client.company}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: spacing[3] }}>
                      <Badge
                        text={client.type}
                        color={client.type === 'Company' ? colors.primary : colors.accent1}
                      />
                    </td>
                    <td
                      style={{
                        padding: spacing[3],
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      {client.email || client.phone || '—'}
                    </td>
                    <td style={{ padding: spacing[3], textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: typography.fontWeight.semibold,
                          color: client.reservationCount > 0 ? colors.checkedOut : colors.textMuted,
                        }}
                      >
                        {client.reservationCount}
                      </span>
                    </td>
                    <td style={{ padding: spacing[3], textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: typography.fontWeight.medium,
                          color: client.totalValue > 0 ? colors.available : colors.textMuted,
                        }}
                      >
                        {client.totalValue > 0 ? formatMoney(client.totalValue) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
ClientReportPanel.propTypes = {
  /** Array of clients */
  clients: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      company: PropTypes.string,
      email: PropTypes.string,
      phone: PropTypes.string,
      favorite: PropTypes.bool,
    }),
  ),
  /** Full inventory for reservation stats */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      reservations: PropTypes.arrayOf(
        PropTypes.shape({
          clientId: PropTypes.string,
          value: PropTypes.number,
        }),
      ),
    }),
  ),
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    profile: PropTypes.object,
  }),
  /** Callback when client is clicked */
  onViewClient: PropTypes.func,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
