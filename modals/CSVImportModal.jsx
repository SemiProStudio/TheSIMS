// ============================================================================
// CSV Import Modal
// Import inventory items from CSV with template download.
// Parsing/validation live in lib/csv.js + lib/importItems.js (RFC 4180,
// BOM-tolerant, header aliases for every SIMS export flavor). Import runs
// through the REAL create path — results are reported honestly, including
// per-row failures.
// ============================================================================

import { memo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, Download } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';
import { downloadCSV, formatMoney } from '../utils';
import { parseCSV } from '../lib/csv.js';
import { buildImportItems } from '../lib/importItems.js';

const TEMPLATE_HEADERS = [
  'name',
  'brand',
  'category',
  'status',
  'condition',
  'location',
  'purchaseDate',
  'purchasePrice',
  'currentValue',
  'serialNumber',
  'quantity',
  'notes',
];

const TEMPLATE_ROWS = [
  ['Sony A7S III', 'Sony', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 1', '2023-06-15', '3498', '2800', 'SN-A7S3-001', '1', 'Great condition'],
  ['Canon RF 24-70mm f/2.8', 'Canon', 'Lenses', 'available', 'good', 'Lens Cabinet', '2023-03-20', '2399', '2100', 'SN-RF2470-002', '1', ''],
  ['Aputure 600d Pro', 'Aputure', 'Lighting', 'checked-out', 'excellent', 'Lighting Storage', '2023-01-10', '1699', '1400', 'SN-600D-003', '1', ''],
];

const noticeBoxStyle = (color) => ({
  background: `${withOpacity(color, 15)}`,
  border: `1px solid ${withOpacity(color, 40)}`,
  borderRadius: borderRadius.md,
  padding: spacing[3],
  marginBottom: spacing[4],
  color,
  fontSize: typography.fontSize.sm,
  whiteSpace: 'pre-line',
  maxHeight: 140,
  overflowY: 'auto',
});

const capList = (list, max = 6) =>
  list.slice(0, max).join('\n') + (list.length > max ? `\n… and ${list.length - max} more` : '');

export const CSVImportModal = memo(function CSVImportModal({
  categories,
  specs,
  existingSerials = [],
  onImport,
  onClose,
}) {
  const [file, setFile] = useState(null);
  const [prepared, setPrepared] = useState(null); // {items, errors, warnings}
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(null); // {done, total}
  const [result, setResult] = useState(null); // {created, failed, noteFailures}
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const prepareFile = async (selectedFile) => {
    setFile(selectedFile);
    setParseError(null);
    setPrepared(null);
    setResult(null);
    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setPrepared(buildImportItems(parsed, { categories, existingSerials }));
    } catch (err) {
      setParseError(err.message);
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv'))) {
      await prepareFile(droppedFile);
    } else if (droppedFile) {
      setParseError('Please drop a CSV file');
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) await prepareFile(selectedFile);
  };

  const downloadTemplate = () => {
    // Spec columns for every category ride along as optional extras
    const specColumns = [];
    Object.values(specs || {}).forEach((specList) => {
      if (Array.isArray(specList)) {
        specList.forEach((spec) => {
          const col = `spec:${spec.name}`;
          if (!specColumns.includes(col)) specColumns.push(col);
        });
      }
    });
    const headers = [...TEMPLATE_HEADERS, ...specColumns];
    const rows = TEMPLATE_ROWS.map((row) => {
      const padded = [...row];
      while (padded.length < headers.length) padded.push('');
      return padded;
    });
    downloadCSV(headers, rows, 'sims-import-template.csv');
  };

  const handleImport = async () => {
    if (!prepared || prepared.errors.length > 0 || prepared.items.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: prepared.items.length });
    try {
      const summary = await onImport(prepared.items, (done, total) =>
        setProgress({ done, total }),
      );
      if (summary && (summary.failed.length > 0 || summary.noteFailures > 0)) {
        // Partial failure: stay open and say exactly what happened. Import is
        // disabled from here — re-running would duplicate the created rows.
        setResult(summary);
      } else {
        onClose();
      }
    } catch (err) {
      setParseError(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const canImport =
    prepared && prepared.errors.length === 0 && prepared.items.length > 0 && !importing && !result;

  return (
    <Modal onClose={onClose} maxWidth={600}>
      <ModalHeader title="Import from CSV" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        {/* Template download */}
        <div
          style={{
            background: `${withOpacity(colors.primary, 10)}`,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[4],
          }}
        >
          <h4
            style={{
              margin: `0 0 ${spacing[2]}px`,
              color: colors.textPrimary,
              fontSize: typography.fontSize.base,
            }}
          >
            Need a template?
          </h4>
          <p
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing[3],
            }}
          >
            Download our CSV template with all available columns and example data. Exports from
            SIMS re-import as-is.
          </p>
          <Button variant="secondary" onClick={downloadTemplate} icon={Download}>
            Download Template
          </Button>
        </div>

        {/* File upload */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? colors.primary : colors.border}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: spacing[4],
            transition: 'border-color 0.2s',
            background: isDragging ? `${withOpacity(colors.primary, 8)}` : 'transparent',
          }}
        >
          <Upload
            size={32}
            color={isDragging ? colors.primary : colors.textMuted}
            style={{ marginBottom: spacing[2] }}
          />
          <p style={{ color: colors.textPrimary, margin: `0 0 ${spacing[1]}px` }}>
            {file ? file.name : 'Click to select CSV file'}
          </p>
          <p
            style={{
              color: isDragging ? colors.primary : colors.textMuted,
              margin: 0,
              fontSize: typography.fontSize.sm,
            }}
          >
            {isDragging ? 'Drop CSV file here' : 'or drag and drop'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        {/* Parse-level error */}
        {parseError && <div style={noticeBoxStyle(colors.danger)}>{parseError}</div>}

        {/* Row errors block the import */}
        {prepared && prepared.errors.length > 0 && (
          <div style={noticeBoxStyle(colors.danger)} role="alert">
            {`Fix these rows before importing:\n${capList(prepared.errors)}`}
          </div>
        )}

        {/* Warnings don't block, but the user should see them */}
        {prepared && prepared.warnings.length > 0 && (
          <div style={noticeBoxStyle(colors.warning)}>
            {`Warnings:\n${capList(prepared.warnings)}`}
          </div>
        )}

        {/* Import result: partial failures keep the modal open and honest */}
        {result && (
          <div style={noticeBoxStyle(result.failed.length ? colors.danger : colors.warning)} role="alert">
            {[
              `Imported ${result.created.length} of ${result.created.length + result.failed.length} items.`,
              result.failed.length
                ? `Failed:\n${capList(result.failed.map((f) => `${f.name}: ${f.error}`))}`
                : '',
              result.noteFailures ? `${result.noteFailures} note(s) could not be saved.` : '',
            ]
              .filter(Boolean)
              .join('\n')}
          </div>
        )}

        {/* Preview */}
        {prepared && !result && (
          <div style={{ marginBottom: spacing[4] }}>
            <h4 style={{ margin: `0 0 ${spacing[2]}px`, color: colors.textPrimary }}>
              Preview ({prepared.items.length} importable items)
            </h4>
            <div
              style={{
                background: colors.bgLight,
                borderRadius: borderRadius.md,
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: typography.fontSize.sm,
                }}
              >
                <thead>
                  <tr>
                    {['Name', 'Brand', 'Category', 'Status', 'Price'].map((col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: col === 'Price' ? 'right' : 'left',
                          padding: spacing[2],
                          borderBottom: `1px solid ${colors.border}`,
                          color: colors.textMuted,
                          fontWeight: typography.fontWeight.medium,
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prepared.items.slice(0, 5).map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: spacing[2], borderBottom: `1px solid ${colors.borderLight}`, color: colors.textPrimary }}>
                        {item.name}
                      </td>
                      <td style={{ padding: spacing[2], borderBottom: `1px solid ${colors.borderLight}`, color: colors.textPrimary }}>
                        {item.brand || '-'}
                      </td>
                      <td style={{ padding: spacing[2], borderBottom: `1px solid ${colors.borderLight}`, color: colors.textPrimary }}>
                        {item.category}
                      </td>
                      <td style={{ padding: spacing[2], borderBottom: `1px solid ${colors.borderLight}`, color: colors.textPrimary }}>
                        {item.status}
                      </td>
                      <td style={{ padding: spacing[2], borderBottom: `1px solid ${colors.borderLight}`, color: colors.textPrimary, textAlign: 'right' }}>
                        {item.purchasePrice ? formatMoney(item.purchasePrice) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prepared.items.length > 5 && (
                <p
                  style={{
                    color: colors.textMuted,
                    fontSize: typography.fontSize.xs,
                    textAlign: 'center',
                    padding: spacing[2],
                    margin: 0,
                  }}
                >
                  ... and {prepared.items.length - 5} more items
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {importing && progress && (
          <p
            role="status"
            style={{
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              marginBottom: spacing[3],
            }}
          >
            Importing {progress.done} of {progress.total}…
          </p>
        )}

      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        <Button
          onClick={handleImport}
          disabled={!canImport}
          icon={importing ? null : Upload}
        >
          {importing
            ? 'Importing...'
            : `Import ${prepared?.items.length || 0} Items`}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
CSVImportModal.propTypes = {
  /** Available categories for import */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Spec configuration by category */
  specs: PropTypes.objectOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        required: PropTypes.bool,
      }),
    ),
  ),
  /** Serial numbers already in inventory — duplicates warn before import */
  existingSerials: PropTypes.arrayOf(PropTypes.string),
  /** async (items, onProgress) => {created, failed, noteFailures} */
  onImport: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
