// ============================================================================
// Maintenance Modal
// Add and edit maintenance records for equipment
// ============================================================================

import { memo, useState } from 'react';
import { Save } from 'lucide-react';
import { MAINTENANCE_TYPES } from '../constants';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme';
import { Button } from '../components/ui';
import { Select } from '../components/Select';
import { DatePicker } from '../components/DatePicker';
import { Modal, ModalHeader } from './ModalBase';

// ============================================================================
// Module-level style constants
// ============================================================================
const itemBannerStyle = {
  background: `${withOpacity(colors.primary, 10)}`,
  borderRadius: borderRadius.lg,
  padding: spacing[3],
  marginBottom: spacing[4],
  ...styles.flexCenter,
  gap: spacing[3],
} as const;

const noImgStyle = {
  width: 48,
  height: 48,
  background: `${withOpacity(colors.primary, 20)}`,
  borderRadius: borderRadius.md,
  ...styles.flexColCenter,
  color: colors.textMuted,
  fontSize: typography.fontSize.xs,
} as const;

const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: spacing[3],
  marginBottom: spacing[4],
} as const;

const actionRowStyle = {
  ...styles.flexCenter,
  gap: spacing[3],
  justifyContent: 'flex-end',
} as const;

interface MaintenanceRecord {
  id?: string;
  type?: string;
  description?: string;
  scheduledDate?: string;
  completedDate?: string;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  cost?: string | number;
  vendor?: string;
  vendorContact?: string;
  warrantyWork?: boolean;
  notes?: string;
  createdAt?: string;
  [key: string]: any;
}

interface MaintenanceModalProps {
  item: {
    id: string;
    name: string;
    brand?: string;
    condition?: string;
    image?: string;
  };
  editingRecord?: MaintenanceRecord;
  onSave: (record: Record<string, any>) => void;
  onClose: () => void;
}

export const MaintenanceModal = memo<MaintenanceModalProps>(function MaintenanceModal({
  item,
  editingRecord,
  onSave,
  onClose
}) {
  const isEdit = !!editingRecord;
  
  // Helper to format date for input
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Otherwise try to parse and format
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
  
  const [formData, setFormData] = useState(() => {
    if (editingRecord) {
      return { 
        ...editingRecord,
        scheduledDate: formatDateForInput(editingRecord.scheduledDate),
        completedDate: formatDateForInput(editingRecord.completedDate),
      };
    }
    return {
      type: 'Repair',
      description: '',
      vendor: '',
      vendorContact: '',
      cost: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      completedDate: '',
      status: 'scheduled',
      notes: '',
      warrantyWork: false,
    };
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.type) newErrors.type = 'Type is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (formData.cost && isNaN(Number(formData.cost))) newErrors.cost = 'Cost must be a number';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const record = {
      ...formData,
      id: editingRecord?.id || `maint-${Date.now()}`,
      cost: formData.cost ? Number(formData.cost) : 0,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If marking as completed but no completedDate, set it to today
    if (formData.status === 'completed' && !formData.completedDate) {
      record.completedDate = new Date().toISOString().split('T')[0];
    }

    onSave(record);
  };

  return (
    <Modal onClose={onClose} maxWidth={550}>
      <ModalHeader 
        title={isEdit ? 'Edit Maintenance Record' : 'Add Maintenance Record'} 
        onClose={onClose} 
      />
      <div style={{ padding: spacing[4] }}>
        {/* Item info banner */}
        <div style={itemBannerStyle}>
          {item?.image ? (
            <img 
              src={item.image} 
              alt="" 
              style={{ 
                width: 48, 
                height: 48, 
                objectFit: 'cover', 
                borderRadius: borderRadius.md 
              }} 
            />
          ) : (
            <div style={noImgStyle}>
              No img
            </div>
          )}
          <div>
            <div style={styles.subheading}>
              {item?.name}
            </div>
            <div style={styles.textSmMuted}>
              {item?.brand} • {item?.id}
            </div>
          </div>
        </div>

        {/* Type and Status row */}
        <div style={twoColGrid}>
          <div>
            <label style={{ ...styles.label, color: !formData.type || errors.type ? colors.danger : undefined }}>
              Maintenance Type <span style={{ color: colors.danger }}>*</span>
            </label>
            <Select
              value={formData.type}
              onChange={e => handleChange('type', e.target.value)}
              options={MAINTENANCE_TYPES.map(type => ({ value: type, label: type }))}
              aria-label="Maintenance type"
            />
            {errors.type && (
              <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                {errors.type}
              </span>
            )}
          </div>
          
          <div>
            <label style={styles.label}>Status</label>
            <Select
              value={formData.status}
              onChange={e => handleChange('status', e.target.value)}
              options={[
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              aria-label="Status"
            />
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={{ ...styles.label, color: !formData.description || errors.description ? colors.danger : undefined }}>
            Description <span style={{ color: colors.danger }}>*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Describe the maintenance work..."
            rows={2}
            style={{ 
              ...styles.input, 
              resize: 'vertical',
              borderColor: !formData.description || errors.description ? colors.danger : colors.border 
            }}
          />
          {errors.description && (
            <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
              {errors.description}
            </span>
          )}
        </div>

        {/* Vendor row */}
        <div style={twoColGrid}>
          <div>
            <label style={styles.label}>Vendor / Service Provider</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={e => handleChange('vendor', e.target.value)}
              placeholder="e.g., Canon Service Center"
              style={styles.input}
            />
          </div>
          
          <div>
            <label style={styles.label}>Vendor Contact</label>
            <input
              type="text"
              value={formData.vendorContact}
              onChange={e => handleChange('vendorContact', e.target.value)}
              placeholder="Phone or email"
              style={styles.input}
            />
          </div>
        </div>

        {/* Cost and Warranty */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[4] }}>
          <div>
            <label style={styles.label}>Cost ($)</label>
            <input
              type="text"
              value={formData.cost}
              onChange={e => handleChange('cost', e.target.value)}
              placeholder="0.00"
              style={{ 
                ...styles.input, 
                borderColor: errors.cost ? colors.danger : colors.border 
              }}
            />
            {errors.cost && (
              <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                {errors.cost}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: spacing[2] }}>
            <label style={{ 
              ...styles.flexCenter,
              gap: spacing[2], 
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
            }}>
              <input
                type="checkbox"
                checked={formData.warrantyWork}
                onChange={e => handleChange('warrantyWork', e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Warranty Work
            </label>
          </div>
        </div>

        {/* Dates row */}
        <div style={twoColGrid}>
          <div>
            <label style={styles.label}>Scheduled Date</label>
            <DatePicker
              value={formData.scheduledDate}
              onChange={e => handleChange('scheduledDate', e.target.value)}
              placeholder="Select scheduled date"
              aria-label="Scheduled date"
            />
          </div>
          
          <div>
            <label style={styles.label}>Completed Date</label>
            <DatePicker
              value={formData.completedDate}
              onChange={e => handleChange('completedDate', e.target.value)}
              disabled={formData.status === 'scheduled'}
              placeholder="Select completed date"
              aria-label="Completed date"
            />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Additional notes about this maintenance..."
            rows={2}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={actionRowStyle}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} icon={Save}>
            {isEdit ? 'Update Record' : 'Add Record'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

