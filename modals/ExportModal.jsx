// ============================================================================
// Export Modal
// Configure and export inventory data in CSV or PDF format
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, styles, spacing, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const ExportModal = memo(function ExportModal({
  onExport,
  onClose,
  user: _user,
  selectionCount = 0,
  totalCount = 0,
  allowNotes = true,
}) {
  const [format, setFormat] = useState('csv');
  const [columns, setColumns] = useState(['id', 'name', 'category', 'status', 'value']);
  const [includeBranding, setIncludeBranding] = useState(false);
  // A lingering gear-list selection narrows the scope — give the user a
  // one-click way out instead of a silent surprise
  const [scope, setScope] = useState(selectionCount > 0 ? 'selection' : 'all');

  const allColumns = [
    { id: 'id', label: 'ID' },
    { id: 'name', label: 'Name' },
    { id: 'brand', label: 'Brand' },
    { id: 'category', label: 'Category' },
    { id: 'status', label: 'Status' },
    { id: 'condition', label: 'Condition' },
    { id: 'location', label: 'Location' },
    { id: 'purchaseDate', label: 'Purchase Date' },
    { id: 'purchasePrice', label: 'Purchase $' },
    { id: 'value', label: 'Current Value' },
    { id: 'serialNumber', label: 'Serial #' },
    // Note text is item_details data — hidden from roles that can't view it
    ...(allowNotes ? [{ id: 'notes', label: 'Notes' }] : []),
  ];

  const toggleColumn = (col) =>
    setColumns((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Export Data" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        {/* Scope: gear-list selection wins over exporting everything */}
        <div
          style={{
            marginBottom: spacing[4],
            padding: spacing[3],
            borderRadius: styles.card.borderRadius,
            background: `${withOpacity(colors.primary, 12)}`,
            border: `1px solid ${withOpacity(colors.primary, 30)}`,
            fontSize: typography.fontSize.sm,
            color: colors.textPrimary,
          }}
        >
          {scope === 'selection' && selectionCount > 0
            ? `Exporting ${selectionCount} selected item${selectionCount === 1 ? '' : 's'}`
            : `Exporting all ${totalCount} items`}
          {selectionCount > 0 && (
            <button
              type="button"
              onClick={() => setScope(scope === 'selection' ? 'all' : 'selection')}
              style={{
                display: 'block',
                marginTop: spacing[1],
                padding: 0,
                background: 'none',
                border: 'none',
                color: colors.primary,
                fontSize: typography.fontSize.sm,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {scope === 'selection'
                ? `Export all ${totalCount} items instead`
                : `Export only the ${selectionCount} selected`}
            </button>
          )}
        </div>
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Format</label>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {[
              ['csv', 'CSV'],
              ['pdf', 'PDF'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFormat(v)}
                style={{
                  ...styles.btnSec,
                  flex: 1,
                  justifyContent: 'center',
                  background: format === v ? `${withOpacity(colors.primary, 30)}` : 'transparent',
                  borderColor: format === v ? colors.primary : colors.border,
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Columns</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
            {allColumns.map((col) => (
              <button
                key={col.id}
                onClick={() => toggleColumn(col.id)}
                style={{
                  ...styles.btnSec,
                  background: columns.includes(col.id)
                    ? `${withOpacity(colors.primary, 20)}`
                    : 'transparent',
                  borderColor: columns.includes(col.id) ? colors.primary : colors.border,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>

        {/* Branding only exists on the PDF — showing the toggle for CSV
            promised something the format can't deliver */}
        {format === 'pdf' && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: spacing[4],
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeBranding}
              onChange={(e) => setIncludeBranding(e.target.checked)}
              style={{ accentColor: colors.primary }}
            />
            <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
              Include branding
            </span>
          </label>
        )}

        <Button
          fullWidth
          onClick={async () => {
            // Close only after the export finished — the modal used to close
            // before the async work, so a failed notes fetch toasted into a
            // screen with no modal left to retry from
            const result = await onExport({ format, columns, includeBranding, scope });
            if (result !== false) onClose();
          }}
          icon={Download}
        >
          Export
        </Button>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
ExportModal.propTypes = {
  /** Callback when export is triggered with options */
  onExport: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
  /** Current user (for branding options) */
  user: PropTypes.shape({
    name: PropTypes.string,
    organization: PropTypes.string,
  }),
  /** Items currently selected in the gear list (export scope) */
  selectionCount: PropTypes.number,
  /** Total inventory count (export scope when nothing is selected) */
  totalCount: PropTypes.number,
  /** Whether the role may export note text (item_details view) */
  allowNotes: PropTypes.bool,
};
