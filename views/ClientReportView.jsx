// ============================================================================
// Client Report Panel View
// Clients ranked by grouped booking activity, with a top-clients chart and a
// bookings-over-time trend. Counts come from computeClientReportStats — the
// same source the hub card uses, so the two can't disagree.
// ============================================================================

import { memo, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Download, Building2, Users, FileText, TrendingUp } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { downloadCSV } from '../utils';
import {
  Badge,
  Card,
  CardHeader,
  StatCard,
  EmptyState,
  Button,
  PageHeader,
} from '../components/ui.jsx';
import { ReportBranding } from '../components/ReportBranding.jsx';
import { HBarChart, TrendChart } from '../components/charts.jsx';
import { computeClientReportStats, bookingsSeries, csvForClients } from '../lib/reportData.js';
import { useData } from '../contexts/DataContext.js';

export const ClientReportPanel = memo(function ClientReportPanel({
  clients = [],
  inventory = [],
  currentUser,
  onViewClient,
  onBack,
}) {
  const { ensureClients } = useData();

  // Lazy-load clients on mount
  useEffect(() => {
    ensureClients();
  }, [ensureClients]);

  const stats = useMemo(() => computeClientReportStats(clients, inventory), [clients, inventory]);
  const { clientsWithStats } = stats;

  const topClientBars = useMemo(
    () =>
      clientsWithStats
        .filter((c) => c.reservationCount > 0)
        .slice(0, 10)
        .map((c) => ({ label: c.name, value: c.reservationCount, color: colors.checkedOut })),
    [clientsWithStats],
  );

  const bookingsTrend = useMemo(() => bookingsSeries(inventory), [inventory]);
  const bookingsTotal = useMemo(
    () => bookingsTrend.reduce((sum, b) => sum + b.value, 0),
    [bookingsTrend],
  );

  const handleExport = () => {
    const { headers, rows, filename } = csvForClients(clientsWithStats);
    downloadCSV(headers, rows, filename);
  };

  const handleRowKeyDown = (event, client) => {
    if ((event.key === 'Enter' || event.key === ' ') && onViewClient) {
      event.preventDefault();
      onViewClient(client);
    }
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
          label="Total Bookings"
          value={stats.totalReservations}
          color={colors.checkedOut}
        />
      </div>

      {/* Bookings over time */}
      {bookingsTotal > 0 && (
        <Card padding={false} style={{ marginBottom: spacing[5] }}>
          <CardHeader title="Bookings — Last 12 Months" icon={TrendingUp} />
          <div style={{ padding: spacing[4] }}>
            <TrendChart
              data={bookingsTrend}
              color={colors.checkedOut}
              ariaLabel="Grouped bookings per month over the last 12 months"
            />
          </div>
        </Card>
      )}

      <div className="responsive-two-col" style={{ display: 'grid', gap: spacing[5] }}>
        {/* Client List */}
        <Card
          padding={false}
          style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 380px)' }}
        >
          <CardHeader title="Clients by Booking Count" />
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
                      Bookings
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientsWithStats.map((client, idx) => (
                    <tr
                      key={client.id}
                      className="report-tr"
                      tabIndex={onViewClient ? 0 : undefined}
                      onClick={() => onViewClient?.(client)}
                      onKeyDown={(e) => handleRowKeyDown(e, client)}
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
                          {client.favorite && <span style={{ color: colors.warning }}>★</span>}
                        </div>
                        {client.company && client.type === 'Individual' && (
                          <div
                            style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}
                          >
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
                            color:
                              client.reservationCount > 0 ? colors.checkedOut : colors.textMuted,
                          }}
                        >
                          {client.reservationCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          <Card padding={false}>
            <CardHeader title="Top Clients" icon={Users} />
            <div style={{ padding: spacing[4] }}>
              {topClientBars.length === 0 ? (
                <p
                  style={{
                    color: colors.textMuted,
                    textAlign: 'center',
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                  }}
                >
                  No bookings yet
                </p>
              ) : (
                <HBarChart
                  data={topClientBars}
                  formatValue={(v) => `${v}`}
                  ariaLabel="Top clients by grouped booking count"
                />
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
