// ============================================================================
// Maintenance Modal
// Add and edit maintenance records for equipment
// ============================================================================

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Save } from 'lucide-react';
import { MAINTENANCE_TYPES } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const MaintenanceModal = memo(function MaintenanceModal({
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
        <div style={{
          background: `${withOpacity(colors.primary, 10)}`,
          borderRadius: borderRadius.lg,
          padding: spacing[3],
          marginBottom: spacing[4],
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3]
        }}>
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
            <div style={{ 
              width: 48, 
              height: 48, 
              background: `${withOpacity(colors.primary, 20)}`, 
              borderRadius: borderRadius.md,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
              fontSize: typography.fontSize.xs
            }}>
              No img
            </div>
          )}
          <div>
            <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
              {item?.name}
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
              {item?.brand} • {item?.id}
            </div>
          </div>
        </div>

        {/* Type and Status row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[4] }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[4] }}>
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
              display: 'flex', 
              alignItems: 'center', 
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[4] }}>
          <div>
            <label style={styles.label}>Scheduled Date</label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={e => handleChange('scheduledDate', e.target.value)}
              style={styles.input}
            />
          </div>
          
          <div>
            <label style={styles.label}>Completed Date</label>
            <input
              type="date"
              value={formData.completedDate}
              onChange={e => handleChange('completedDate', e.target.value)}
              style={styles.input}
              disabled={formData.status === 'scheduled'}
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
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} icon={Save}>
            {isEdit ? 'Update Record' : 'Add Record'}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================

/** Shape for maintenance record */
const maintenanceRecordShape = PropTypes.shape({
  id: PropTypes.string,
  type: PropTypes.string,
  description: PropTypes.string,
  scheduledDate: PropTypes.string,
  completedDate: PropTypes.string,
  status: PropTypes.oneOf(['scheduled', 'in-progress', 'completed', 'cancelled']),
  cost: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  vendor: PropTypes.string,
  warrantyWork: PropTypes.bool,
  notes: PropTypes.string,
});

MaintenanceModal.propTypes = {
  /** The item receiving maintenance */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    condition: PropTypes.string,
  }).isRequired,
  /** Existing record if editing (null for new) */
  editingRecord: maintenanceRecordShape,
  /** Callback when save is clicked */
  onSave: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
