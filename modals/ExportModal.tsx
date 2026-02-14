// ============================================================================
// Export Modal
// Configure and export inventory data in CSV or PDF format
// ============================================================================

import { memo, useState } from 'react';
import { Download } from 'lucide-react';
import { colors, styles, spacing, typography, withOpacity } from '../theme';
import { Button } from '../components/ui';
import { Modal, ModalHeader } from './ModalBase';

interface ExportModalProps {
  onExport: (options: { format: string; columns: string[]; includeBranding: boolean }) => void;
  onClose: () => void;
  user?: {
    name?: string;
    organization?: string;
  };
}

export const ExportModal = memo<ExportModalProps>(function ExportModal({ onExport, onClose, user }) {
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
          <div style={{ ...styles.flexCenter, gap: spacing[2] }}>
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
          <div style={{ ...styles.flexWrap, gap: spacing[2] }}>
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
        
        <label style={{ ...styles.flexCenter, gap: spacing[2], marginBottom: spacing[4], cursor: 'pointer' }}>
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

