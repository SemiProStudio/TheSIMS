// ============================================================================
// Database Export Modal
// Full backup/export of all inventory data
// ============================================================================

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const DatabaseExportModal = memo(function DatabaseExportModal({ 
  inventory, 
  packages, 
  users, 
  categories,
  specs,
  auditLog,
  packLists,
  onClose 
}) {
  const [exportFormat, setExportFormat] = useState('json');
  const [includeOptions, setIncludeOptions] = useState({
    inventory: true,
    packages: true,
    users: false,
    categories: true,
    specs: true,
    auditLog: false,
    packLists: true
  });
  
  const toggleOption = (key) => {
    setIncludeOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (exportFormat === 'json') {
      // Full JSON backup
      const data = {};
      if (includeOptions.inventory) data.inventory = inventory;
      if (includeOptions.packages) data.packages = packages;
      if (includeOptions.users) data.users = users.map(u => ({ ...u, password: undefined }));
      if (includeOptions.categories) data.categories = categories;
      if (includeOptions.specs) data.specs = specs;
      if (includeOptions.auditLog) data.auditLog = auditLog;
      if (includeOptions.packLists) data.packLists = packLists;
      
      data.exportedAt = new Date().toISOString();
      data.version = '2.0';
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sims-backup-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export (inventory only)
      const headers = ['id', 'name', 'brand', 'category', 'status', 'condition', 'location', 
        'purchaseDate', 'purchasePrice', 'currentValue', 'serialNumber'];
      
      // Add dynamic spec headers
      const specHeaders = new Set();
      inventory.forEach(item => {
        if (item.specs) {
          Object.keys(item.specs).forEach(key => specHeaders.add(`spec:${key}`));
        }
      });
      const allHeaders = [...headers, ...Array.from(specHeaders)];
      
      const rows = inventory.map(item => {
        const row = headers.map(h => {
          const val = item[h];
          if (val === null || val === undefined) return '';
          return String(val);
        });
        
        // Add spec values
        Array.from(specHeaders).forEach(specHeader => {
          const specName = specHeader.replace('spec:', '');
          row.push(item.specs?.[specName] || '');
        });
        
        return row.map(cell => 
          cell.includes(',') || cell.includes('"') || cell.includes('\n') 
            ? `"${cell.replace(/"/g, '""')}"` 
            : cell
        ).join(',');
      });
      
      const csvContent = [allHeaders.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sims-inventory-${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    onClose();
  };
  
  const exportOptions = [
    { key: 'inventory', label: 'Inventory', count: inventory.length },
    { key: 'packages', label: 'Kits & Packages', count: packages.length },
    { key: 'categories', label: 'Categories', count: categories.length },
    { key: 'specs', label: 'Specifications', count: Object.keys(specs).length },
    { key: 'packLists', label: 'Pack Lists', count: packLists.length },
    { key: 'users', label: 'Users (no passwords)', count: users.length },
    { key: 'auditLog', label: 'Audit Log', count: auditLog.length },
  ];
  
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
                background: exportFormat === 'json' ? `${withOpacity(colors.primary, 30)}` : 'transparent',
                borderColor: exportFormat === 'json' ? colors.primary : colors.border
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
                background: exportFormat === 'csv' ? `${withOpacity(colors.primary, 30)}` : 'transparent',
                borderColor: exportFormat === 'csv' ? colors.primary : colors.border
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
              {exportOptions.map(opt => (
                <label 
                  key={opt.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    cursor: 'pointer',
                    padding: spacing[2],
                    borderRadius: borderRadius.md,
                    background: includeOptions[opt.key] ? `${withOpacity(colors.primary, 10)}` : 'transparent'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={includeOptions[opt.key]}
                    onChange={() => toggleOption(opt.key)}
                    style={{ accentColor: colors.primary }}
                  />
                  <span style={{ flex: 1, color: colors.textPrimary }}>{opt.label}</span>
                  <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
                    {opt.count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        {/* Info text */}
        <p style={{ 
          color: colors.textMuted, 
          fontSize: typography.fontSize.sm, 
          marginBottom: spacing[4],
          padding: spacing[3],
          background: colors.bgLight,
          borderRadius: borderRadius.md
        }}>
          {exportFormat === 'json' 
            ? 'JSON backup includes all selected data and can be used to restore your inventory later.'
            : 'CSV export contains inventory items only, suitable for spreadsheet applications.'}
        </p>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} icon={Download}>
            Export {exportFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
DatabaseExportModal.propTypes = {
  /** Full inventory array */
  inventory: PropTypes.array.isRequired,
  /** Packages/kits array */
  packages: PropTypes.array,
  /** Users array (passwords excluded from export) */
  users: PropTypes.array,
  /** Categories array */
  categories: PropTypes.array,
  /** Specs configuration object */
  specs: PropTypes.object,
  /** Audit log entries */
  auditLog: PropTypes.array,
  /** Pack lists array */
  packLists: PropTypes.array,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
