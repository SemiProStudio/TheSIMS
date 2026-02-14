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

export const ExportModal = memo(function ExportModal({ onExport, onClose, user: _user }) {
  const [format, setFormat] = useState('csv');
  const [columns, setColumns] = useState(['id', 'name', 'category', 'status', 'value']);
  const [includeBranding, setIncludeBranding] = useState(false);

  const allColumns = [
    { id: 'id', label: 'ID' }, 
    { id: 'name', label: 'Name' }, 
    { id: 'brand', label: 'Brand' },
    { id: 'category', label: 'Category' }, 
    { id: 'status', label: 'Status' }, 
    { id: 'condition', label: 'Condition' },
    { id: 'location', label: 'Location' }, 
    { id: 'value', label: 'Value' }, 
    { id: 'serialNumber', label: 'Serial #' }
  ];

  const toggleColumn = (col) => setColumns(prev => 
    prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
  );

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Export Data" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Format</label>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            {[['csv', 'CSV'], ['pdf', 'PDF']].map(([v, l]) => (
              <button 
                key={v} 
                onClick={() => setFormat(v)} 
                style={{ 
                  ...styles.btnSec, 
                  flex: 1, 
                  justifyContent: 'center', 
                  background: format === v ? `${withOpacity(colors.primary, 30)}` : 'transparent', 
                  borderColor: format === v ? colors.primary : colors.border 
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
            {allColumns.map(col => (
              <button 
                key={col.id} 
                onClick={() => toggleColumn(col.id)} 
                style={{ 
                  ...styles.btnSec, 
                  background: columns.includes(col.id) ? `${withOpacity(colors.primary, 20)}` : 'transparent', 
                  borderColor: columns.includes(col.id) ? colors.primary : colors.border, 
                  fontSize: typography.fontSize.sm 
                }}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4], cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={includeBranding} 
            onChange={e => setIncludeBranding(e.target.checked)} 
            style={{ accentColor: colors.primary }} 
          />
          <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm }}>Include branding</span>
        </label>
        
        <Button fullWidth onClick={() => onExport({ format, columns, includeBranding })} icon={Download}>
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
};
