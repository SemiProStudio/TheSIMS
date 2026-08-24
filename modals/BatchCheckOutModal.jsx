// ============================================================================
// Batch Check Out Modal
// One borrower + due date applied to a whole reservation's items — the
// load-out flow. Items that aren't available are listed but skipped.
// ============================================================================

import { memo, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, LogOut } from 'lucide-react';
import { STATUS } from '../constants.js';
import { error as logError } from '../lib/logger.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { getTodayISO, getStatusColor, getStatusLabel } from '../utils';
import { Badge, Button, Input } from '../components/ui.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';

export const BatchCheckOutModal = memo(function BatchCheckOutModal({
  reservation,
  items,
  currentUser,
  onConfirm,
  onClose,
}) {
  const [borrowerName, setBorrowerName] = useState(reservation?.user || currentUser?.name || '');
  const [dueDate, setDueDate] = useState(reservation?.end || getTodayISO());
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { checkoutable, skipped } = useMemo(() => {
    const ok = [];
    const skip = [];
    (items || []).forEach((item) => {
      if (item.status === STATUS.AVAILABLE || item.status === STATUS.RESERVED) ok.push(item);
      else skip.push(item);
    });
    return { checkoutable: ok, skipped: skip };
  }, [items]);

  const canConfirm =
    borrowerName.trim() && dueDate && acknowledged && checkoutable.length > 0 && !submitting;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      // onConfirm closes the modal on completion
      await onConfirm({
        items: checkoutable,
        borrowerName: borrowerName.trim(),
        clientId: reservation?.clientId || null,
        clientName: reservation?.clientName || null,
        project: reservation?.project || '',
        dueDate,
      });
    } catch (err) {
      logError('Batch checkout failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <ModalHeader title="Check Out Reservation" onClose={onClose} />
      <div
        className="modal-body"
        style={{ padding: spacing[4], maxHeight: '70vh', overflowY: 'auto' }}
      >
        <p
          style={{
            margin: `0 0 ${spacing[4]}px`,
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
          }}
        >
          {reservation?.project ? `${reservation.project}: ` : ''}
          one borrower and due date applied to every item below.
        </p>

        <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
          <Input
            label="Borrower"
            required
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Who is taking the gear"
          />
          <div>
            <label className="label">
              Due Back{' '}
              <span aria-hidden="true" style={{ color: colors.danger }}>
                *
              </span>
            </label>
            <DatePicker
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              aria-label="Due back date"
            />
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: spacing[4] }}>
          {checkoutable.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: `${spacing[2]}px ${spacing[3]}px`,
                borderRadius: borderRadius.md,
                background: withOpacity(colors.primary, 8),
                border: `1px solid ${colors.borderLight}`,
                marginBottom: spacing[1],
              }}
            >
              <LogOut size={14} color={colors.primary} />
              <span
                style={{ flex: 1, color: colors.textPrimary, fontSize: typography.fontSize.sm }}
              >
                {item.name}
              </span>
              <Badge text={item.id} color={colors.primary} size="xs" />
            </div>
          ))}
          {skipped.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: `${spacing[2]}px ${spacing[3]}px`,
                borderRadius: borderRadius.md,
                border: `1px dashed ${colors.border}`,
                marginBottom: spacing[1],
                opacity: 0.7,
              }}
            >
              <AlertTriangle size={14} color={colors.warning} />
              <span style={{ flex: 1, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
                {item.name} — skipped
              </span>
              <Badge
                text={getStatusLabel(item.status)}
                color={getStatusColor(item.status)}
                size="xs"
              />
            </div>
          ))}
          {checkoutable.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, margin: 0 }}>
              None of this reservation&apos;s items can be checked out right now.
            </p>
          )}
        </div>

        {/* Single acknowledgment for the batch */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[2],
            fontSize: typography.fontSize.sm,
            color: colors.textSecondary,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          I confirm the listed gear is being handed out in its recorded condition
        </label>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!canConfirm} icon={LogOut}>
          {submitting
            ? 'Checking Out...'
            : `Check Out ${checkoutable.length} Item${checkoutable.length === 1 ? '' : 's'}`}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

BatchCheckOutModal.propTypes = {
  reservation: PropTypes.object,
  items: PropTypes.array,
  currentUser: PropTypes.object,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default BatchCheckOutModal;
