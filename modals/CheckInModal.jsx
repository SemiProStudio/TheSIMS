// ============================================================================
// Check In Modal
// Handle item return with condition verification and damage reporting
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const CheckInModal = memo(function CheckInModal({ 
  item, 
  currentUser,
  onCheckIn, 
  onClose 
}) {
  const [formData, setFormData] = useState({
    condition: item?.condition || 'excellent',
    conditionChanged: false,
    conditionNotes: '',
    returnNotes: '',
    damageReported: false,
    damageDescription: '',
  });
  
  const [errors, setErrors] = useState({});
  
  const conditions = [
    { value: 'excellent', label: 'Excellent', description: 'Like new, no visible wear' },
    { value: 'good', label: 'Good', description: 'Minor wear, fully functional' },
    { value: 'fair', label: 'Fair', description: 'Noticeable wear, works properly' },
    { value: 'poor', label: 'Poor', description: 'Significant wear, may need attention' },
  ];
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Track if condition changed from original
    if (field === 'condition') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: value,
        conditionChanged: value !== item?.condition 
      }));
    }
  };
  
  const validate = () => {
    const newErrors = {};
    if (formData.damageReported && !formData.damageDescription.trim()) {
      newErrors.damageDescription = 'Please describe the damage';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (!validate()) return;
    
    onCheckIn({
      itemId: item.id,
      returnedBy: currentUser?.name || item.checkedOutTo,
      condition: formData.condition,
      conditionChanged: formData.conditionChanged,
      conditionAtCheckout: item.condition,
      conditionNotes: formData.conditionNotes.trim(),
      returnNotes: formData.returnNotes.trim(),
      damageReported: formData.damageReported,
      damageDescription: formData.damageDescription.trim(),
      returnDate: new Date().toISOString().split('T')[0],
      returnTime: new Date().toLocaleTimeString()
    });
  };
  
  if (!item) return null;
  
  // Calculate checkout duration
  const checkoutDate = item.checkedOutDate ? new Date(item.checkedOutDate) : null;
  const today = new Date();
  const daysOut = checkoutDate ? Math.ceil((today - checkoutDate) / (1000 * 60 * 60 * 24)) : 0;
  const isOverdue = item.dueBack && new Date(item.dueBack) < today;
  
  return (
    <Modal onClose={onClose} maxWidth={550}>
      <ModalHeader title="Check In Item" onClose={onClose} />
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
              {isOverdue && <Badge text="OVERDUE" color={colors.danger} />}
            </div>
            <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{item.name}</div>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{item.brand}</div>
          </div>
        </div>
        
        {/* Checkout Info */}
        <div style={{
          padding: spacing[3],
          background: colors.bgLight,
          borderRadius: borderRadius.md,
          marginBottom: spacing[4]
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], fontSize: typography.fontSize.sm }}>
            <div>
              <span style={{ color: colors.textMuted }}>Checked out to:</span>
              <div style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>{item.checkedOutTo}</div>
            </div>
            <div>
              <span style={{ color: colors.textMuted }}>Duration:</span>
              <div style={{ color: isOverdue ? colors.danger : colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
                {daysOut} day{daysOut !== 1 ? 's' : ''} {isOverdue && '(overdue)'}
              </div>
            </div>
            <div>
              <span style={{ color: colors.textMuted }}>Checkout date:</span>
              <div style={{ color: colors.textPrimary }}>{item.checkedOutDate}</div>
            </div>
            <div>
              <span style={{ color: colors.textMuted }}>Due date:</span>
              <div style={{ color: isOverdue ? colors.danger : colors.textPrimary }}>{item.dueBack || 'Not set'}</div>
            </div>
          </div>
        </div>
        
        {/* Condition Verification */}
        <div style={{ marginBottom: spacing[4] }}>
          <h4 style={{ margin: `0 0 ${spacing[3]}px`, color: colors.textPrimary, fontSize: typography.fontSize.base }}>
            Verify Condition
          </h4>
          <p style={{ color: colors.textMuted, fontSize: typography.fontSize.sm, marginBottom: spacing[3] }}>
            Item was <strong>{item.condition}</strong> at checkout. Please verify current condition:
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[2] }}>
            {conditions.map(cond => (
              <label
                key={cond.value}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[2],
                  padding: spacing[3],
                  background: formData.condition === cond.value ? `${withOpacity(colors.primary, 15)}` : colors.bgLight,
                  border: `1px solid ${formData.condition === cond.value ? colors.primary : colors.border}`,
                  borderRadius: borderRadius.md,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="condition"
                  value={cond.value}
                  checked={formData.condition === cond.value}
                  onChange={e => handleChange('condition', e.target.value)}
                  style={{ marginTop: 2, accentColor: colors.primary }}
                />
                <div>
                  <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{cond.label}</div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>{cond.description}</div>
                </div>
              </label>
            ))}
          </div>
          
          {formData.conditionChanged && (
            <div style={{
              marginTop: spacing[3],
              padding: spacing[3],
              background: `${withOpacity(colors.accent1, 15)}`,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.sm
            }}>
              <span style={{ color: colors.accent1 }}>⚠️ Condition changed from {item.condition} to {formData.condition}</span>
              <div style={{ marginTop: spacing[2] }}>
                <label style={styles.label}>Condition change notes</label>
                <textarea
                  value={formData.conditionNotes}
                  onChange={e => handleChange('conditionNotes', e.target.value)}
                  placeholder="Explain the condition change..."
                  rows={2}
                  style={{ ...styles.input, resize: 'vertical' }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Damage Report */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: spacing[2], 
            cursor: 'pointer',
            marginBottom: spacing[2]
          }}>
            <input
              type="checkbox"
              checked={formData.damageReported}
              onChange={e => handleChange('damageReported', e.target.checked)}
              style={{ accentColor: colors.danger }}
            />
            <span style={{ color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
              Report damage or issue
            </span>
          </label>
          
          {formData.damageReported && (
            <div style={{
              padding: spacing[3],
              background: `${withOpacity(colors.danger, 10)}`,
              border: `1px solid ${withOpacity(colors.danger, 30)}`,
              borderRadius: borderRadius.md
            }}>
              <label style={{ ...styles.label, color: !formData.damageDescription ? colors.danger : undefined }}>
                Describe the damage <span style={{ color: colors.danger }}>*</span>
              </label>
              <textarea
                value={formData.damageDescription}
                onChange={e => handleChange('damageDescription', e.target.value)}
                placeholder="Describe what's damaged and how it happened..."
                rows={3}
                style={{ 
                  ...styles.input, 
                  resize: 'vertical',
                  borderColor: !formData.damageDescription || errors.damageDescription ? colors.danger : colors.border 
                }}
              />
              {errors.damageDescription && (
                <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>
                  {errors.damageDescription}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Return Notes */}
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Return Notes (optional)</label>
          <textarea
            value={formData.returnNotes}
            onChange={e => handleChange('returnNotes', e.target.value)}
            placeholder="Any notes about this return..."
            rows={2}
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>
            Confirm Check In
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
CheckInModal.propTypes = {
  /** The item being checked in */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    brand: PropTypes.string,
    condition: PropTypes.string,
    image: PropTypes.string,
    status: PropTypes.string,
    checkout: PropTypes.shape({
      borrower: PropTypes.string,
      borrowerEmail: PropTypes.string,
      date: PropTypes.string,
      dueDate: PropTypes.string,
      project: PropTypes.string,
    }),
  }).isRequired,
  /** Currently logged in user */
  currentUser: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  /** Callback when check-in is confirmed */
  onCheckIn: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
