// ============================================================================
// Database Export Modal
// Complete backup fetched from the database at export time. The old version
// serialized React memory: lazy tables exported empty, item notes and
// checkout history never exported at all, and the audit log stopped at the
// 100 rows the UI loads. Counts shown are real table counts, and the JSON
// contains raw table rows (version 3.0) — a faithful snapshot.
// ============================================================================

import { memo, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';
import { downloadCSV, getTodayISO } from '../utils';
import { backupService } from '../lib/services.js';
import {
  BACKUP_SECTIONS,
  DEFAULT_BACKUP_INCLUDE,
  tablesForInclude,
  assembleBackup,
} from '../lib/backupExport.js';
import { error as logError } from '../lib/logger.js';
import { INVENTORY_COLUMNS } from '../lib/inventoryCsv.js';

const ALL_TABLES = BACKUP_SECTIONS.flatMap((s) => s.tables);

// Inventory-only CSV flavor: raw DB rows → the camelCase id headers the CSV
// importer recognizes, so this export round-trips back in. Columns come from
// the shared inventory definition (lib/inventoryCsv.js); this exporter uses
// ids as headers and the dbValue getters (it fetches raw snake_case rows).
const INVENTORY_CSV_COLUMNS = INVENTORY_COLUMNS.map((c) => [c.id, c.dbValue]);

export const DatabaseExportModal = memo(function DatabaseExportModal({ onClose }) {
  const [exportFormat, setExportFormat] = useState('json');
  const [includeOptions, setIncludeOptions] = useState(DEFAULT_BACKUP_INCLUDE);
  const [counts, setCounts] = useState(null); // {table: count|null}
  const [exporting, setExporting] = useState(false);
  const [progressLabel, setProgressLabel] = useState(null);
  const [error, setError] = useState(null);

  // Real table counts — not whatever fraction the UI happens to have loaded
  useEffect(() => {
    let cancelled = false;
    backupService
      .tableCounts(ALL_TABLES)
      .then((result) => {
        if (!cancelled) setCounts(result);
      })
      .catch((err) => {
        logError('Failed to load table counts:', err);
        if (!cancelled) setCounts({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleOption = (key) => {
    setIncludeOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    const timestamp = getTodayISO();
    setError(null);
    setExporting(true);

    try {
      if (exportFormat === 'json') {
        const tables = tablesForInclude(includeOptions);
        if (tables.length === 0) {
          setError('Select at least one section to export.');
          return;
        }
        const data = await assembleBackup(includeOptions, backupService.fetchAllRows, {
          onProgress: (table, done, total) =>
            setProgressLabel(`Fetching ${table}… (${done + 1}/${total})`),
        });

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sims-backup-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setProgressLabel('Fetching inventory…');
        const rows = await backupService.fetchAllRows('inventory');

        const specHeaders = new Set();
        rows.forEach((r) => {
          Object.keys(r.specs || {}).forEach((key) => specHeaders.add(key));
        });
        const specList = Array.from(specHeaders);

        const headers = [
          ...INVENTORY_CSV_COLUMNS.map(([h]) => h),
          ...specList.map((s) => `spec:${s}`),
        ];
        const csvRows = rows.map((r) => [
          ...INVENTORY_CSV_COLUMNS.map(([, get]) => get(r) ?? ''),
          ...specList.map((s) => r.specs?.[s] ?? ''),
        ]);
        downloadCSV(headers, csvRows, `sims-inventory-${timestamp}.csv`);
      }
      onClose();
    } catch (err) {
      logError('Database export failed:', err);
      setError(`Export failed: ${err.message || 'unknown error'}`);
    } finally {
      setExporting(false);
      setProgressLabel(null);
    }
  };

  // A section's headline count is its primary (first) table
  const sectionCount = (section) => {
    if (!counts) return '…';
    const count = counts[section.tables[0]];
    return count === null || count === undefined ? '—' : count;
  };

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Export Database" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        {/* Format selection */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Export Format</label>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <button
              onClick={() => setExportFormat('json')}
              style={{
                ...styles.btnSec,
                flex: 1,
                justifyContent: 'center',
                background:
                  exportFormat === 'json' ? `${withOpacity(colors.primary, 30)}` : 'transparent',
                borderColor: exportFormat === 'json' ? colors.primary : colors.border,
              }}
            >
              JSON (Full Backup)
            </button>
            <button
              onClick={() => setExportFormat('csv')}
              style={{
                ...styles.btnSec,
                flex: 1,
                justifyContent: 'center',
                background:
                  exportFormat === 'csv' ? `${withOpacity(colors.primary, 30)}` : 'transparent',
                borderColor: exportFormat === 'csv' ? colors.primary : colors.border,
              }}
            >
              CSV (Inventory Only)
            </button>
          </div>
        </div>

        {/* Include options (only for JSON) */}
        {exportFormat === 'json' && (
          <div style={{ marginBottom: spacing[4] }}>
            <label style={styles.label}>Include in Export</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
              {BACKUP_SECTIONS.map((section) => (
                <label
                  key={section.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    cursor: 'pointer',
                    padding: spacing[2],
                    borderRadius: borderRadius.md,
                    background: includeOptions[section.key]
                      ? `${withOpacity(colors.primary, 10)}`
                      : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!includeOptions[section.key]}
                    onChange={() => toggleOption(section.key)}
                    style={{ accentColor: colors.primary }}
                  />
                  <span style={{ flex: 1, color: colors.textPrimary }}>{section.label}</span>
                  <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
                    {sectionCount(section)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              background: `${withOpacity(colors.danger, 15)}`,
              border: `1px solid ${withOpacity(colors.danger, 40)}`,
              borderRadius: borderRadius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
              color: colors.danger,
              fontSize: typography.fontSize.sm,
            }}
          >
            {error}
          </div>
        )}

        {/* Info text */}
        <p
          style={{
            color: colors.textMuted,
            fontSize: typography.fontSize.sm,
            marginBottom: spacing[4],
            padding: spacing[3],
            background: colors.bgLight,
            borderRadius: borderRadius.md,
          }}
        >
          {exportFormat === 'json'
            ? 'Fetches complete tables from the database — including item notes, full maintenance and checkout history, and cancelled reservations. Passwords are never included.'
            : 'CSV export contains all inventory items, suitable for spreadsheets. Its columns re-import through Import CSV — as NEW items with fresh ids, not a restore.'}
        </p>

        {/* Progress */}
        {exporting && progressLabel && (
          <p
            role="status"
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing[3],
            }}
          >
            {progressLabel}
          </p>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button onClick={handleExport} icon={Download} disabled={exporting}>
          {exporting ? 'Exporting…' : `Export ${exportFormat.toUpperCase()}`}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
DatabaseExportModal.propTypes = {
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
