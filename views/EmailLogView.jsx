// =============================================================================
// Email Log (Admin Panel)
// The single answer to "did that email go out?": the last 200 rows of
// notification_log with status, recipient, type, Resend id and the error
// message for failures. Admins only (RLS: admin_notifications view).
// =============================================================================

import { memo, useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Mail, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDateTime } from '../utils';
import { Badge, Button, Card, EmptyState, PageHeader } from '../components/ui.jsx';
import { useData } from '../contexts/DataContext.js';

const STATUS_META = {
  sent: { color: colors.success, Icon: CheckCircle, label: 'Sent' },
  failed: { color: colors.danger, Icon: XCircle, label: 'Failed' },
  pending: { color: colors.warning, Icon: Clock, label: 'Pending' },
};

const TYPE_LABEL = {
  checkout_confirmation: 'Checkout confirmation',
  checkin_confirmation: 'Return confirmation',
  reservation_confirmation: 'Reservation confirmation',
  reservation_reminder: 'Reservation reminder',
  due_date_reminder: 'Due date reminder',
  overdue_notice: 'Overdue notice',
  maintenance_reminder: 'Maintenance reminder',
  damage_report: 'Damage report',
  low_stock_alert: 'Low stock alert',
  overdue_summary: 'Overdue summary',
  test_email: 'Test email',
};

const EmailLogView = memo(function EmailLogView({ onBack }) {
  const { getNotificationLog } = useData();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await getNotificationLog({ limit: 200 }));
    } catch (err) {
      setError(err?.message || 'Could not load the email log');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [getNotificationLog]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = (rows || []).reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Email Log"
        subtitle="Every notification the system tried to send, newest first"
        onBack={onBack}
        backLabel="Back to Admin Panel"
        action={
          <Button variant="secondary" onClick={load} icon={RefreshCw} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />

      {error && (
        <p role="alert" style={{ color: colors.danger, marginBottom: spacing[3] }}>
          {error}
        </p>
      )}

      {rows && rows.length > 0 && (
        <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[3], flexWrap: 'wrap' }}>
          {Object.entries(STATUS_META).map(([key, meta]) =>
            counts[key] ? (
              <Badge key={key} text={`${counts[key]} ${meta.label.toLowerCase()}`} color={meta.color} size="xs" />
            ) : null,
          )}
        </div>
      )}

      {rows && rows.length === 0 && !error && (
        <EmptyState
          icon={Mail}
          title="No emails yet"
          description="Checkout, return and reservation confirmations, reminders and admin alerts will appear here as they are sent. Use “Send me a test email” in Notification Settings to try it."
        />
      )}

      {rows && rows.length > 0 && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 720,
                borderCollapse: 'collapse',
                fontSize: typography.fontSize.sm,
              }}
            >
              <thead>
                <tr style={{ background: colors.bgMedium, color: colors.textMuted, textAlign: 'left' }}>
                  <th style={{ padding: spacing[3] }}>When</th>
                  <th style={{ padding: spacing[3] }}>Status</th>
                  <th style={{ padding: spacing[3] }}>Type</th>
                  <th style={{ padding: spacing[3] }}>To</th>
                  <th style={{ padding: spacing[3] }}>Subject</th>
                  <th style={{ padding: spacing[3] }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status] || STATUS_META.pending;
                  return (
                    <tr key={row.id} style={{ borderTop: `1px solid ${colors.borderLight}` }}>
                      <td style={{ padding: spacing[3], whiteSpace: 'nowrap', color: colors.textSecondary }}>
                        {formatDateTime(row.sent_at || row.created_at)}
                      </td>
                      <td style={{ padding: spacing[3], whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: meta.color,
                            background: withOpacity(meta.color, 12),
                            borderRadius: borderRadius.sm,
                            padding: `2px ${spacing[2]}px`,
                          }}
                        >
                          <meta.Icon size={14} /> {meta.label}
                        </span>
                      </td>
                      <td style={{ padding: spacing[3], color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                        {TYPE_LABEL[row.notification_type] || row.notification_type}
                      </td>
                      <td style={{ padding: spacing[3], color: colors.textPrimary }}>{row.email}</td>
                      <td style={{ padding: spacing[3], color: colors.textSecondary }}>{row.subject}</td>
                      <td style={{ padding: spacing[3], color: row.error_message ? colors.danger : colors.textMuted }}>
                        {row.error_message || (row.external_id ? `Resend ${row.external_id}` : row.item_id || '')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
});

EmailLogView.propTypes = {
  onBack: PropTypes.func.isRequired,
};

export default EmailLogView;
