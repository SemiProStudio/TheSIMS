// ============================================================================
// Bulk Photos Modal
// Attach many item photos at once: drop a folder of files named by item ID
// (CAM-00012.jpg) or serial number, review the matches, and every file runs
// through the image pipeline (downscale → two renditions → upload) and is
// written to its item — three at a time, with per-file results. Turns the
// 1k-item photo pass from ~5 clicks per item into one drag.
// ============================================================================

import { memo, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { ImagePlus, Upload, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button, Badge } from '../components/ui.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';
import {
  matchPhotosToItems,
  planForRow,
  runWithConcurrency,
  fileStem,
} from '../lib/bulkPhotos.js';
import { isImageFile, processImage } from '../lib/imageProcessing.js';
import { error as logError } from '../lib/logger.js';

const PLAN_LABEL = {
  upload: { text: 'Will add', color: colors.success },
  replace: { text: 'Will replace', color: colors.warning },
  'skip-existing': { text: 'Has photo — skipped', color: colors.textMuted },
  duplicate: { text: 'Duplicate — skipped', color: colors.textMuted },
  unmatched: { text: 'No matching item', color: colors.danger },
};

const STATUS_ICON = {
  done: { Icon: CheckCircle, color: colors.success, text: 'Uploaded' },
  failed: { Icon: XCircle, color: colors.danger, text: 'Failed' },
  cancelled: { Icon: AlertTriangle, color: colors.textMuted, text: 'Cancelled' },
};

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const BulkPhotosModal = memo(function BulkPhotosModal({ items, onApplyPhoto, onClose }) {
  const [files, setFiles] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [statuses, setStatuses] = useState({}); // filename → {state, message}
  const [summary, setSummary] = useState(null);
  const cancelRef = useRef(false);
  const inputRef = useRef(null);

  const rows = useMemo(() => matchPhotosToItems(files, items), [files, items]);
  const plans = useMemo(
    () => rows.map((row) => ({ row, plan: planForRow(row, { replaceExisting }) })),
    [rows, replaceExisting],
  );
  const actionable = plans.filter(({ plan }) => plan === 'upload' || plan === 'replace');
  const counts = plans.reduce((acc, { plan }) => {
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  const acceptFiles = (list) => {
    const picked = Array.from(list || []).filter(isImageFile);
    // Merge by name so a second drop adds to, rather than replaces, the batch
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name));
      return [...prev, ...picked.filter((f) => !seen.has(f.name))];
    });
    setStatuses({});
    setSummary(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!running) acceptFiles(e.dataTransfer?.files);
  };

  const handleStart = async () => {
    if (!actionable.length) return;
    setRunning(true);
    setSummary(null);
    cancelRef.current = false;
    const result = { done: 0, failed: 0, cancelled: 0 };
    const mark = (name, state, message) =>
      setStatuses((prev) => ({ ...prev, [name]: { state, message } }));

    await runWithConcurrency(
      actionable,
      async ({ row }) => {
        mark(row.file.name, 'working');
        try {
          const { full, thumb } = await processImage(row.file);
          const { storageService } = await import('../lib/index.js');
          const uploaded = await storageService.uploadRenditions({ full, thumb }, row.item.id);
          await onApplyPhoto(row.item.id, uploaded.url);
          result.done++;
          mark(row.file.name, 'done', formatBytes(full.size));
        } catch (err) {
          logError('Bulk photo failed:', row.file.name, err);
          result.failed++;
          mark(row.file.name, 'failed', err?.message || 'Upload failed');
        }
      },
      { concurrency: 3, shouldStop: () => cancelRef.current },
    );

    if (cancelRef.current) {
      actionable.forEach(({ row }) => {
        setStatuses((prev) =>
          prev[row.file.name] ? prev : { ...prev, [row.file.name]: { state: 'cancelled' } },
        );
      });
      result.cancelled = actionable.length - result.done - result.failed;
    }
    setSummary(result);
    setRunning(false);
  };

  const progressDone = Object.values(statuses).filter(
    (s) => s.state === 'done' || s.state === 'failed',
  ).length;

  return (
    <Modal onClose={running ? () => {} : onClose} maxWidth={760}>
      <ModalHeader title="Bulk Photos" onClose={running ? undefined : onClose} />
      <div className="modal-body" style={{ padding: spacing[4], maxHeight: '70vh', overflowY: 'auto' }}>
        <p
          style={{
            margin: `0 0 ${spacing[4]}px`,
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
          }}
        >
          Name each photo after the item it belongs to — its ID (
          <code>CAM-00012.jpg</code>) or serial number — then drop the whole folder here. Any
          size is fine; every photo is scaled down before upload. One photo per item; extra copies
          are skipped.
        </p>

        {/* Drop zone */}
        <div
          onClick={() => !running && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!running) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? colors.primary : colors.border}`,
            borderRadius: borderRadius.lg,
            padding: spacing[5],
            textAlign: 'center',
            cursor: running ? 'not-allowed' : 'pointer',
            marginBottom: spacing[4],
            background: isDragging ? withOpacity(colors.primary, 8) : 'transparent',
            opacity: running ? 0.6 : 1,
          }}
        >
          <Upload
            size={28}
            color={isDragging ? colors.primary : colors.textMuted}
            style={{ marginBottom: spacing[2] }}
          />
          <p style={{ color: colors.textPrimary, margin: `0 0 ${spacing[1]}px` }}>
            {files.length
              ? `${files.length} photo${files.length === 1 ? '' : 's'} selected — drop more to add`
              : 'Click to select photos'}
          </p>
          <p style={{ color: colors.textMuted, margin: 0, fontSize: typography.fontSize.sm }}>
            or drag a folder of images here
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              acceptFiles(e.target.files);
              if (e.target) e.target.value = '';
            }}
            style={{ display: 'none' }}
            disabled={running}
            aria-label="Select photos"
          />
        </div>

        {files.length > 0 && (
          <>
            {/* Options + tally */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: spacing[3],
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing[3],
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                  cursor: running ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  disabled={running}
                  style={{ accentColor: colors.primary }}
                />
                Replace photos on items that already have one
              </label>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
                {Object.entries(counts).map(([plan, n]) => (
                  <Badge key={plan} text={`${n} ${PLAN_LABEL[plan].text}`} color={PLAN_LABEL[plan].color} size="xs" />
                ))}
              </div>
            </div>

            {/* Rows */}
            <div style={{ overflowX: 'auto', border: `1px solid ${colors.borderLight}`, borderRadius: borderRadius.md }}>
              <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                <thead>
                  <tr style={{ background: colors.bgMedium, color: colors.textMuted, textAlign: 'left' }}>
                    <th style={{ padding: spacing[2] }}>Photo</th>
                    <th style={{ padding: spacing[2] }}>Item</th>
                    <th style={{ padding: spacing[2] }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map(({ row, plan }) => {
                    const status = statuses[row.file.name];
                    const planInfo = PLAN_LABEL[plan];
                    const statusInfo = status && STATUS_ICON[status.state];
                    return (
                      <tr key={row.file.name} style={{ borderTop: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: spacing[2], color: colors.textPrimary, whiteSpace: 'nowrap' }}>
                          {row.file.name}
                          <span style={{ color: colors.textMuted, marginLeft: spacing[2] }}>
                            {formatBytes(row.file.size)}
                          </span>
                        </td>
                        <td style={{ padding: spacing[2], color: row.item ? colors.textPrimary : colors.textMuted }}>
                          {row.item ? (
                            <>
                              <strong>{row.item.id}</strong> · {row.item.name}
                              {row.matchedBy === 'serial' && (
                                <span style={{ color: colors.textMuted }}> (by serial)</span>
                              )}
                            </>
                          ) : (
                            <>“{fileStem(row.file.name)}” matches no item ID or serial</>
                          )}
                        </td>
                        <td style={{ padding: spacing[2], whiteSpace: 'nowrap' }}>
                          {status?.state === 'working' ? (
                            <span style={{ color: colors.primary }}>Uploading…</span>
                          ) : statusInfo ? (
                            <span style={{ color: statusInfo.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <statusInfo.Icon size={14} /> {statusInfo.text}
                              {status.message && (
                                <span style={{ color: colors.textMuted }}> · {status.message}</span>
                              )}
                            </span>
                          ) : (
                            <span style={{ color: planInfo.color }}>{planInfo.text}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {running && (
          <p role="status" style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, margin: `${spacing[3]}px 0 0` }}>
            Uploading {progressDone} of {actionable.length}…
          </p>
        )}
        {summary && (
          <p role="status" style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm, margin: `${spacing[3]}px 0 0` }}>
            {summary.done} uploaded
            {summary.failed ? `, ${summary.failed} failed` : ''}
            {summary.cancelled ? `, ${summary.cancelled} cancelled` : ''}.
          </p>
        )}
      </div>
      <ModalFooter>
        {running ? (
          <Button variant="secondary" onClick={() => (cancelRef.current = true)}>
            Stop after current
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {summary ? 'Close' : 'Cancel'}
          </Button>
        )}
        <Button
          onClick={handleStart}
          disabled={running || !actionable.length || Boolean(summary)}
          icon={running ? null : ImagePlus}
        >
          {running
            ? 'Uploading…'
            : `Upload ${actionable.length} Photo${actionable.length === 1 ? '' : 's'}`}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

BulkPhotosModal.propTypes = {
  /** Inventory items (id, name, serialNumber, image) */
  items: PropTypes.array.isRequired,
  /** async (itemId, url) — persists the photo on the item; rejects on failure */
  onApplyPhoto: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
