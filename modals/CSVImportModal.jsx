// ============================================================================
// CSV Import Modal
// Import inventory items from CSV file with template download
// ============================================================================

import { memo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, Download } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const CSVImportModal = memo(function CSVImportModal({ categories, specs, onImport, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [mapping, setMapping] = useState({});
  const fileInputRef = useRef(null);
  
  // CSV column definitions
  const requiredColumns = ['name', 'category'];
  const optionalColumns = ['brand', 'status', 'condition', 'location', 'purchaseDate', 'purchasePrice', 'currentValue', 'serialNumber', 'notes'];
  const allColumns = [...requiredColumns, ...optionalColumns];
  
  // Generate CSV template
  const downloadTemplate = () => {
    const headers = ['name', 'brand', 'category', 'status', 'condition', 'location', 'purchaseDate', 'purchasePrice', 'currentValue', 'serialNumber', 'notes'];
    
    // Add spec columns for each category
    const specColumns = [];
    Object.entries(specs).forEach(([category, specList]) => {
      if (Array.isArray(specList)) {
        specList.forEach(spec => {
          const colName = `spec:${spec.name}`;
          if (!specColumns.includes(colName)) {
            specColumns.push(colName);
          }
        });
      }
    });
    
    const allHeaders = [...headers, ...specColumns];
    
    // Example rows
    const exampleRows = [
      ['Sony A7S III', 'Sony', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 1', '2023-06-15', '3498', '2800', 'SN-A7S3-001', 'Great condition'],
      ['Canon RF 24-70mm f/2.8', 'Canon', 'Lenses', 'available', 'good', 'Lens Cabinet', '2023-03-20', '2399', '2100', 'SN-RF2470-002', ''],
      ['Aputure 600d Pro', 'Aputure', 'Lighting', 'checked-out', 'excellent', 'Lighting Storage', '2023-01-10', '1699', '1400', 'SN-600D-003', '']
    ];
    
    // Pad example rows to match header count
    const paddedRows = exampleRows.map(row => {
      while (row.length < allHeaders.length) row.push('');
      return row;
    });
    
    const csvContent = [
      allHeaders.join(','),
      ...paddedRows.map(row => row.map(cell => 
        cell.includes(',') || cell.includes('"') ? `"${cell.replace(/"/g, '""')}"` : cell
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sims-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have a header row and at least one data row');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Check for required columns
    const missingRequired = requiredColumns.filter(col => 
      !headers.some(h => h.toLowerCase() === col.toLowerCase())
    );
    if (missingRequired.length > 0) {
      throw new Error(`Missing required columns: ${missingRequired.join(', ')}`);
    }
    
    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every(v => !v.trim())) continue;
      
      const row = {};
      headers.forEach((header, idx) => {
        row[header.toLowerCase()] = values[idx] || '';
      });
      rows.push(row);
    }
    
    return { headers, rows };
  };
  
  // Parse a single CSV line handling quotes
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current.trim());
    
    return result;
  };
  
  // Handle file selection
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setPreview(null);
    
    try {
      const text = await selectedFile.text();
      const parsed = parseCSV(text);
      setPreview(parsed);
      
      // Auto-map columns
      const autoMapping = {};
      parsed.headers.forEach(header => {
        const lower = header.toLowerCase();
        if (allColumns.includes(lower)) {
          autoMapping[header] = lower;
        } else if (lower.startsWith('spec:')) {
          autoMapping[header] = header;
        }
      });
      setMapping(autoMapping);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Validate and import
  const handleImport = async () => {
    if (!preview) return;
    
    setImporting(true);
    setError(null);
    
    try {
      const items = [];
      const errors = [];
      
      preview.rows.forEach((row, idx) => {
        // Validate required fields
        if (!row.name?.trim()) {
          errors.push(`Row ${idx + 2}: Missing name`);
          return;
        }
        if (!row.category?.trim()) {
          errors.push(`Row ${idx + 2}: Missing category`);
          return;
        }
        if (!categories.includes(row.category)) {
          errors.push(`Row ${idx + 2}: Unknown category "${row.category}"`);
          return;
        }
        
        // Build item object
        const item = {
          name: row.name.trim(),
          brand: row.brand?.trim() || '',
          category: row.category.trim(),
          status: row.status?.trim() || 'available',
          condition: row.condition?.trim() || 'excellent',
          location: row.location?.trim() || '',
          purchaseDate: row.purchasedate?.trim() || row.purchaseDate?.trim() || '',
          purchasePrice: parseFloat(row.purchaseprice || row.purchasePrice) || 0,
          currentValue: parseFloat(row.currentvalue || row.currentValue) || 0,
          serialNumber: row.serialnumber?.trim() || row.serialNumber?.trim() || '',
          notes: row.notes?.trim() ? [{ 
            id: `imported_${Date.now()}_${idx}`, 
            user: 'Import', 
            date: new Date().toISOString().split('T')[0], 
            text: row.notes.trim(),
            replies: [],
            deleted: false 
          }] : [],
          specs: {},
          reservations: [],
          reminders: [],
          viewCount: 0,
          checkoutCount: 0
        };
        
        // Extract specs from spec: columns
        Object.entries(row).forEach(([key, value]) => {
          if (key.startsWith('spec:') && value?.trim()) {
            const specName = key.substring(5);
            item.specs[specName] = value.trim();
          }
        });
        
        items.push(item);
      });
      
      if (errors.length > 0) {
        setError(`Import errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
        setImporting(false);
        return;
      }
      
      // Call import handler
      await onImport(items);
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <Modal onClose={onClose} maxWidth={600}>
      <ModalHeader title="Import from CSV" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        
        {/* Template download */}
        <div style={{
          background: `${withOpacity(colors.primary, 10)}`,
          borderRadius: borderRadius.lg,
          padding: spacing[4],
          marginBottom: spacing[4]
        }}>
          <h4 style={{ margin: `0 0 ${spacing[2]}px`, color: colors.textPrimary, fontSize: typography.fontSize.base }}>
            Need a template?
          </h4>
          <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
            Download our CSV template with all available columns and example data.
          </p>
          <Button variant="secondary" onClick={downloadTemplate} icon={Download}>
            Download Template
          </Button>
        </div>
        
        {/* File upload */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${colors.border}`,
            borderRadius: borderRadius.lg,
            padding: spacing[6],
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: spacing[4],
            transition: 'border-color 0.2s',
          }}
        >
          <Upload size={32} color={colors.textMuted} style={{ marginBottom: spacing[2] }} />
          <p style={{ color: colors.textPrimary, margin: `0 0 ${spacing[1]}px` }}>
            {file ? file.name : 'Click to select CSV file'}
          </p>
          <p style={{ color: colors.textMuted, margin: 0, fontSize: typography.fontSize.sm }}>
            or drag and drop
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        
        {/* Error display */}
        {error && (
          <div style={{
            background: `${withOpacity(colors.danger, 20)}`,
            border: `1px solid ${withOpacity(colors.danger, 50)}`,
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: spacing[4],
            color: colors.danger,
            fontSize: typography.fontSize.sm,
            whiteSpace: 'pre-line'
          }}>
            {error}
          </div>
        )}
        
        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: spacing[4] }}>
            <h4 style={{ margin: `0 0 ${spacing[2]}px`, color: colors.textPrimary }}>
              Preview ({preview.rows.length} items)
            </h4>
            <div style={{
              background: colors.bgLight,
              borderRadius: borderRadius.md,
              maxHeight: 200,
              overflowY: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                <thead>
                  <tr>
                    {['name', 'brand', 'category', 'status'].map(col => (
                      <th key={col} style={{
                        textAlign: 'left',
                        padding: spacing[2],
                        borderBottom: `1px solid ${colors.border}`,
                        color: colors.textMuted,
                        fontWeight: typography.fontWeight.medium
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      {['name', 'brand', 'category', 'status'].map(col => (
                        <td key={col} style={{
                          padding: spacing[2],
                          borderBottom: `1px solid ${colors.borderLight}`,
                          color: colors.textPrimary
                        }}>
                          {row[col] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 5 && (
                <p style={{
                  color: colors.textMuted,
                  fontSize: typography.fontSize.xs,
                  textAlign: 'center',
                  padding: spacing[2],
                  margin: 0
                }}>
                  ... and {preview.rows.length - 5} more items
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={!preview || importing}
            icon={importing ? null : Upload}
          >
            {importing ? 'Importing...' : `Import ${preview?.rows.length || 0} Items`}
          </Button>
        </div>
      </div>
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
    PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string.isRequired,
      required: PropTypes.bool,
    }))
  ),
  /** Callback when import is confirmed with items array */
  onImport: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
