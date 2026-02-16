// ============================================================================
// Check Out Modal
// Handle item checkout process with borrower info and due dates
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const CheckOutModal = memo(function CheckOutModal({
  item,
  users: _users,
  clients = [],
  currentUser,
  onCheckOut,
  onClose
}) {
  const [formData, setFormData] = useState({
    borrowerName: currentUser?.name || '',
    borrowerEmail: currentUser?.email || '',
    borrowerPhone: '',
    clientId: '',
    project: '',
    projectType: 'General',
    dueDate: '',
    expectedReturn: '',
    notes: '',
    condition: item?.condition || 'excellent',
    acknowledgeCondition: false
  });
  
  const [errors, setErrors] = useState({});
  
  // Project types
  const projectTypes = ['General', 'Wedding', 'Corporate', 'Documentary', 'Music Video', 'Commercial', 'Film', 'Event', 'Personal', 'Other'];
  
  // Quick due date options
  const dueDateOptions = [
    { label: 'End of day', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: '3 days', days: 3 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
  ];
  
  const setQuickDueDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setFormData(prev => ({ ...prev, dueDate: date.toISOString().split('T')[0] }));
  };
  
  const handleChange = (field, value) => {
    if (field === 'clientId' && value) {
      // Auto-populate contact info from selected client
      const client = clients.find(c => c.id === value);
      if (client) {
        setFormData(prev => ({
          ...prev,
          clientId: value,
          borrowerEmail: client.email || prev.borrowerEmail,
          borrowerPhone: client.phone || prev.borrowerPhone,
        }));
      } else {
        setFormData(prev => ({ ...prev, clientId: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    if (!formData.borrowerName.trim()) newErrors.borrowerName = 'Borrower name is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    if (!formData.acknowledgeCondition) newErrors.acknowledgeCondition = 'Please acknowledge the item condition';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validate()) return;
    
    const selectedClient = formData.clientId ? clients.find(c => c.id === formData.clientId) : null;
    onCheckOut({
      itemId: item.id,
      borrowerName: formData.borrowerName.trim(),
      borrowerEmail: formData.borrowerEmail.trim(),
      borrowerPhone: formData.borrowerPhone.trim(),
      clientId: formData.clientId || null,
      clientName: selectedClient?.name || null,
      project: formData.project.trim(),
      projectType: formData.projectType,
      dueDate: formData.dueDate,
      expectedReturn: formData.expectedReturn || formData.dueDate,
      notes: formData.notes.trim(),
      conditionAtCheckout: formData.condition,
      checkedOutDate: new Date().toISOString().split('T')[0],
      checkedOutTime: new Date().toLocaleTimeString()
    });
  };
  
  if (!item) return null;
  
  return (
    <Modal onClose={onClose} maxWidth={550}>
      <ModalHeader title="Check Out Item" onClose={onClose} />
      <div style={{ padding: spacing[4], maxHeight: '75vh', overflowY: 'auto' }}>
        
        {/* Item Summary */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          padding: spacing[3],
          background: `${withOpacity(colors.primary, 10)}`,
          borderRadius: borderRadius.lg,
          marginBottom: spacing[4]
        }}>
          {item.image ? (
            <img src={item.image} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: borderRadius.md }} />
          ) : (
            <div style={{ width: 60, height: 60, background: `${withOpacity(colors.primary, 20)}`, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: typography.fontSize.xs }}>
              No img
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: spacing[1], marginBottom: spacing[1] }}>
              <Badge text={item.id} color={colors.primary} />
              <Badge text={item.condition} color={colors.available} />
            </div>
            <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{item.name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{item.brand}</div>
          </div>
        </div>
        
        {/* Borrower Section */}
        <div style={{ marginBottom: spacing[4] }}>
          <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.base }}>
            Borrower Information
          </h4>
          
          <div style={{ marginBottom: spacing[3] }}>
            <label style={{ ...styles.label, color: !formData.borrowerName || errors.borrowerName ? colors.danger : undefined }}>
              Borrower Name <span style={{ color: colors.danger }}>*</span>
            </label>
            <input
              value={formData.borrowerName}
              onChange={e => handleChange('borrowerName', e.target.value)}
              placeholder="Who is taking this item?"
              style={{ ...styles.input, borderColor: !formData.borrowerName || errors.borrowerName ? colors.danger : colors.border }}
            />
            {errors.borrowerName && <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{errors.borrowerName}</span>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
            <div>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={formData.borrowerEmail}
                onChange={e => handleChange('borrowerEmail', e.target.value)}
                placeholder="email@example.com"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                value={formData.borrowerPhone}
                onChange={e => handleChange('borrowerPhone', e.target.value)}
                placeholder="555-123-4567"
                style={styles.input}
              />
            </div>
          </div>
        </div>
        
        {/* Client Selection (optional) */}
        {clients.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <label style={styles.label}>Client (Optional)</label>
            <Select
              value={formData.clientId}
              onChange={e => handleChange('clientId', e.target.value)}
              options={[
                { value: '', label: '-- No client --' },
                ...clients.map(c => ({
                  value: c.id,
                  label: c.name + (c.company ? ` (${c.company})` : '')
                }))
              ]}
              aria-label="Client"
            />
            {formData.clientId && (
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] }}>
                Contact info auto-populated from client record
              </div>
            )}
          </div>
        )}

        {/* Project Section */}
        <div style={{ marginBottom: spacing[4] }}>
          <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.base }}>
            Project Details
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
            <div>
              <label style={styles.label}>Project Name</label>
              <input
                value={formData.project}
                onChange={e => handleChange('project', e.target.value)}
                placeholder="e.g., Smith Wedding, TechCorp Video"
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>Type</label>
              <Select
                value={formData.projectType}
                onChange={e => handleChange('projectType', e.target.value)}
                options={projectTypes.map(type => ({ value: type, label: type }))}
                aria-label="Project type"
              />
            </div>
          </div>
        </div>
        
        {/* Due Date Section */}
        <div style={{ marginBottom: spacing[4] }}>
          <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.base }}>
            Return Schedule
          </h4>
          
          <div style={{ marginBottom: spacing[3] }}>
            <label style={styles.label}>Quick Select</label>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {dueDateOptions.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => setQuickDueDate(opt.days)}
                  style={{
                    ...styles.btnSec,
                    padding: `${spacing[1]}px ${spacing[3]}px`,
                    fontSize: typography.fontSize.sm
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label style={{ ...styles.label, color: !formData.dueDate || errors.dueDate ? colors.danger : undefined }}>
              Due Date <span style={{ color: colors.danger }}>*</span>
            </label>
            <DatePicker
              value={formData.dueDate}
              onChange={e => handleChange('dueDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              error={!formData.dueDate || errors.dueDate}
              placeholder="Select due date"
              aria-label="Due date"
            />
            {errors.dueDate && <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{errors.dueDate}</span>}
          </div>
        </div>
        
        {/* Notes */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Checkout Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => handleChange('notes', e.target.value)}
            placeholder="Any special instructions or notes for this checkout..."
            rows={3}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>
        
        {/* Condition Acknowledgment */}
        <div style={{
          padding: spacing[3],
          background: `${withOpacity(colors.accent1, 15)}`,
          borderRadius: borderRadius.md,
          marginBottom: spacing[4]
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2], cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formData.acknowledgeCondition}
              onChange={e => handleChange('acknowledgeCondition', e.target.checked)}
              style={{ marginTop: 4, accentColor: colors.primary }}
            />
            <div>
              <span style={{ color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                I confirm the item is in <strong>{item.condition}</strong> condition at checkout
              </span>
              <p style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>
                You&apos;ll be asked to verify the condition again at check-in
              </p>
            </div>
          </label>
          {errors.acknowledgeCondition && (
            <span style={{ color: colors.danger, fontSize: typography.fontSize.xs, display: 'block', marginTop: spacing[1] }}>
              {errors.acknowledgeCondition}
            </span>
          )}
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            Confirm Check Out
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
CheckOutModal.propTypes = {
  /** The item being checked out */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    condition: PropTypes.string,
    image: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  /** Available users for borrower selection */
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
  })),
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  /** Callback when checkout is confirmed */
  onCheckOut: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
