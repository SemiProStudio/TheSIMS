// ============================================================================
// Reservation Modal
// Add and edit reservations with conflict detection
// ============================================================================

import React, { memo, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Save, AlertTriangle } from 'lucide-react';
import { PROJECT_TYPES } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { getAllReservationConflicts, formatDate } from '../utils.js';
import { validateReservation, isValidEmail } from '../lib/validators.js';
import { Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const ReservationModal = memo(function ReservationModal({ 
  isEdit, 
  reservationForm, 
  setReservationForm, 
  onSave, 
  onClose, 
  clients = [],
  inventory = [],
  item = null,
  editingReservationId = null
}) {
  const [touched, setTouched] = useState({});
  const [acknowledgedConflicts, setAcknowledgedConflicts] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  // Selected item - from props or from form
  const selectedItem = item || inventory.find(i => i.id === reservationForm.itemId);
  
  const handleChange = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Clear validation error on change
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
    // Reset conflict acknowledgment when dates change
    if (field === 'start' || field === 'end') {
      setAcknowledgedConflicts(false);
    }
    // If changing start date and end date is before it, update end date too
    if (field === 'start' && reservationForm.end && value > reservationForm.end) {
      setReservationForm(prev => ({ ...prev, start: value, end: value }));
    } else if (field === 'clientId' && value) {
      // Auto-fill contact info from client
      const client = clients.find(c => c.id === value);
      if (client) {
        setReservationForm(prev => ({ 
          ...prev, 
          clientId: value,
          contactPhone: client.phone || prev.contactPhone,
          contactEmail: client.email || prev.contactEmail,
        }));
      } else {
        setReservationForm(prev => ({ ...prev, [field]: value }));
      }
    } else {
      setReservationForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Validate on blur
    const validation = validateReservation(reservationForm, {
      existingReservations: item?.reservations || [],
      editingId: editingReservationId,
    });
    if (validation.errors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: validation.errors[field] }));
    }
  };
  
  // Run full validation
  const validation = useMemo(() => {
    return validateReservation(reservationForm, {
      existingReservations: selectedItem?.reservations || [],
      editingId: editingReservationId,
    });
  }, [reservationForm, selectedItem?.reservations, editingReservationId]);
  
  // Conflict detection
  const conflicts = useMemo(() => {
    if (!selectedItem || !reservationForm.start || !reservationForm.end) {
      return { reservationConflicts: [], checkoutConflict: null, hasConflicts: false };
    }
    return getAllReservationConflicts(
      selectedItem, 
      reservationForm.start, 
      reservationForm.end, 
      isEdit ? editingReservationId : null
    );
  }, [selectedItem, reservationForm.start, reservationForm.end, isEdit, editingReservationId]);
  
  // Validation - combine custom and validators.js
  const dateValid = reservationForm.start && reservationForm.end && reservationForm.end >= reservationForm.start;
  const hasItem = selectedItem || reservationForm.itemId;
  const valid = hasItem && reservationForm.project?.trim() && dateValid && reservationForm.user?.trim() && validation.isValid;
  const dateError = reservationForm.start && reservationForm.end && reservationForm.end < reservationForm.start;
  
  // Can save if valid and either no conflicts or conflicts acknowledged
  const canSave = valid && (!conflicts.hasConflicts || acknowledgedConflicts);
  
  // Handle save with validation
  const handleSave = useCallback(() => {
    // Mark all fields as touched
    setTouched({
      project: true,
      start: true,
      end: true,
      user: true,
      contactEmail: true,
    });
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      // Focus first error field
      const firstError = Object.keys(validation.errors)[0];
      if (firstError) {
        const element = document.querySelector(`[name="${firstError}"]`);
        element?.focus();
      }
      return;
    }
    
    if (canSave) {
      onSave();
    }
  }, [validation, canSave, onSave]);
  
  // Field error states (only show after touched)
  const getFieldError = (field) => {
    if (!touched[field]) return null;
    return validationErrors[field] || validation.errors[field] || null;
  };
  
  const showProjectError = touched.project && !reservationForm.project;
  const showStartError = touched.start && !reservationForm.start;
  const showEndError = touched.end && (!reservationForm.end || dateError);
  const showUserError = touched.user && !reservationForm.user;
  const showEmailError = touched.contactEmail && reservationForm.contactEmail && !isValidEmail(reservationForm.contactEmail);

  const getInputStyle = (hasError, isEmpty) => ({
    ...styles.input,
    borderColor: hasError || isEmpty ? colors.danger : colors.border,
    boxShadow: hasError ? `0 0 0 1px ${colors.danger}` : undefined
  });

  return (
    <Modal onClose={onClose} maxWidth={550}>
      <ModalHeader title={isEdit ? "Edit Reservation" : "Add Reservation"} onClose={onClose} />
      <div style={{ padding: spacing[4], maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Conflict Warning Banner */}
        {conflicts.hasConflicts && (
          <div style={{
            background: `${withOpacity(colors.warning, 15)}`,
            border: `1px solid ${colors.warning}`,
            borderRadius: borderRadius.lg,
            padding: spacing[3],
            marginBottom: spacing[4],
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing[2], 
              marginBottom: spacing[2],
              color: colors.warning,
              fontWeight: typography.fontWeight.semibold,
            }}>
              <AlertTriangle size={18} />
              <span>Scheduling Conflict Detected</span>
            </div>
            
            {/* Checkout conflict */}
            {conflicts.checkoutConflict && (
              <div style={{ 
                fontSize: typography.fontSize.sm, 
                color: colors.textPrimary,
                marginBottom: spacing[2],
                padding: spacing[2],
                background: colors.bgDark,
                borderRadius: borderRadius.md,
              }}>
                <strong style={{ color: colors.checkedOut }}>Currently Checked Out:</strong>
                <div style={{ marginTop: spacing[1] }}>
                  {conflicts.checkoutConflict.message}
                </div>
              </div>
            )}
            
            {/* Reservation conflicts */}
            {conflicts.reservationConflicts.length > 0 && (
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                <strong style={{ color: colors.reserved }}>
                  {conflicts.reservationConflicts.length} Overlapping Reservation{conflicts.reservationConflicts.length > 1 ? 's' : ''}:
                </strong>
                <div style={{ marginTop: spacing[2], display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
                  {conflicts.reservationConflicts.slice(0, 3).map((res, idx) => (
                    <div 
                      key={res.id || idx}
                      style={{
                        padding: spacing[2],
                        background: colors.bgDark,
                        borderRadius: borderRadius.md,
                        borderLeft: `3px solid ${colors.reserved}`,
                      }}
                    >
                      <div style={{ fontWeight: typography.fontWeight.medium }}>{res.project}</div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {formatDate(res.start)} - {formatDate(res.end)} • {res.user}
                      </div>
                    </div>
                  ))}
                  {conflicts.reservationConflicts.length > 3 && (
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, fontStyle: 'italic' }}>
                      ...and {conflicts.reservationConflicts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Acknowledge checkbox */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing[2], 
              marginTop: spacing[3],
              cursor: 'pointer',
              fontSize: typography.fontSize.sm,
              color: colors.textSecondary,
            }}>
              <input 
                type="checkbox" 
                checked={acknowledgedConflicts}
                onChange={(e) => setAcknowledgedConflicts(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              I understand there are conflicts and want to proceed anyway
            </label>
          </div>
        )}
        
        {/* Item selector - show when no item is pre-selected and inventory available */}
        {!item && inventory.length > 0 && (
          <div style={{ marginBottom: spacing[3] }}>
            <label style={{ ...styles.label, color: !reservationForm.itemId && !selectedItem ? colors.danger : undefined }}>
              Item to Reserve <span style={{ color: colors.danger }}>*</span>
            </label>
            <Select 
              value={reservationForm.itemId || ''} 
              onChange={e => handleChange('itemId', e.target.value)} 
              options={[
                { value: '', label: '-- Select an item --' },
                ...inventory
                  .filter(i => i.status === 'available' || i.status === 'reserved')
                  .map(i => ({ 
                    value: i.id, 
                    label: `${i.name} (${i.id})${i.status === 'reserved' ? ' - Has Reservations' : ''}` 
                  }))
              ]}
              aria-label="Item to reserve"
            />
          </div>
        )}
        
        {/* Show selected item info */}
        {selectedItem && (
          <div style={{ 
            marginBottom: spacing[3], 
            padding: spacing[3], 
            background: `${withOpacity(colors.primary, 10)}`,
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3]
          }}>
            {selectedItem.image ? (
              <img src={selectedItem.image} alt="" style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: borderRadius.md, background: colors.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontSize: typography.fontSize.xs }}>No img</div>
            )}
            <div>
              <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{selectedItem.name}</div>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{selectedItem.brand} • {selectedItem.category}</div>
            </div>
          </div>
        )}
        
        {/* Client selector */}
        {clients.length > 0 && (
          <div style={{ marginBottom: spacing[3] }}>
            <label style={styles.label}>Client (Optional)</label>
            <Select 
              value={reservationForm.clientId || ''} 
              onChange={e => handleChange('clientId', e.target.value)} 
              options={[
                { value: '', label: '-- Select a client --' },
                ...clients.map(c => ({ 
                  value: c.id, 
                  label: c.name + (c.company ? ` (${c.company})` : '') 
                }))
              ]}
              aria-label="Client"
            />
          </div>
        )}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
          <div>
            <label style={{ ...styles.label, color: !reservationForm.project ? colors.danger : undefined }}>
              Project Name <span style={{ color: colors.danger }}>*</span>
            </label>
            <input 
              value={reservationForm.project} 
              onChange={e => handleChange('project', e.target.value)} 
              onBlur={() => handleBlur('project')}
              placeholder="e.g., Wedding - Smith/Jones"
              style={getInputStyle(showProjectError, !reservationForm.project)} 
            />
            {showProjectError && <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>Required</p>}
          </div>
          <div>
            <label style={styles.label}>Project Type</label>
            <Select 
              value={reservationForm.projectType || 'Other'} 
              onChange={e => handleChange('projectType', e.target.value)} 
              options={PROJECT_TYPES.map(t => ({ value: t, label: t }))}
              aria-label="Project type"
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
          <div>
            <label style={{ ...styles.label, color: !reservationForm.start ? colors.danger : undefined }}>
              Start Date <span style={{ color: colors.danger }}>*</span>
            </label>
            <input 
              type="date" 
              value={reservationForm.start} 
              onChange={e => handleChange('start', e.target.value)} 
              onBlur={() => handleBlur('start')}
              style={getInputStyle(showStartError, !reservationForm.start)} 
            />
            {showStartError && <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>Required</p>}
          </div>
          <div>
            <label style={{ ...styles.label, color: !reservationForm.end ? colors.danger : undefined }}>
              End Date / Due Back <span style={{ color: colors.danger }}>*</span>
            </label>
            <input 
              type="date" 
              value={reservationForm.end} 
              onChange={e => handleChange('end', e.target.value)} 
              onBlur={() => handleBlur('end')}
              min={reservationForm.start || undefined}
              style={getInputStyle(showEndError, !reservationForm.end)} 
            />
            {dateError && (
              <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>
                End date must be on or after start date
              </p>
            )}
            {showEndError && !dateError && <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>Required</p>}
          </div>
        </div>
        
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: !reservationForm.user ? colors.danger : undefined }}>
            Reserved By <span style={{ color: colors.danger }}>*</span>
          </label>
          <input 
            value={reservationForm.user} 
            onChange={e => handleChange('user', e.target.value)} 
            onBlur={() => handleBlur('user')}
            placeholder="e.g., John Smith"
            style={getInputStyle(showUserError, !reservationForm.user)} 
          />
          {showUserError && <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>Required</p>}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
          <div>
            <label style={styles.label}>Contact Phone</label>
            <input 
              type="tel" 
              value={reservationForm.contactPhone || ''} 
              onChange={e => handleChange('contactPhone', e.target.value)} 
              placeholder="555-123-4567" 
              style={styles.input} 
            />
          </div>
          <div>
            <label style={styles.label}>Contact Email</label>
            <input 
              type="email" 
              value={reservationForm.contactEmail || ''} 
              onChange={e => handleChange('contactEmail', e.target.value)} 
              placeholder="email@example.com" 
              style={styles.input} 
            />
          </div>
        </div>
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Location</label>
          <input 
            value={reservationForm.location || ''} 
            onChange={e => handleChange('location', e.target.value)} 
            placeholder="Address or venue name" 
            style={styles.input} 
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave} 
            icon={isEdit ? Save : Plus}
            style={conflicts.hasConflicts && acknowledgedConflicts ? { background: colors.warning } : undefined}
          >
            {isEdit ? 'Save Changes' : (conflicts.hasConflicts && acknowledgedConflicts ? 'Save Anyway' : 'Add Reservation')}
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================

/** Shape for reservation form data */
const reservationFormShape = PropTypes.shape({
  project: PropTypes.string,
  projectType: PropTypes.string,
  start: PropTypes.string,
  end: PropTypes.string,
  user: PropTypes.string,
  clientId: PropTypes.string,
  contactPhone: PropTypes.string,
  contactEmail: PropTypes.string,
  location: PropTypes.string,
});

/** Shape for client */
const clientShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  company: PropTypes.string,
  phone: PropTypes.string,
  email: PropTypes.string,
});

/** Shape for item with reservations */
const itemWithReservationsShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  status: PropTypes.string,
  checkout: PropTypes.object,
  reservations: PropTypes.array,
});

ReservationModal.propTypes = {
  /** Whether this is editing an existing reservation */
  isEdit: PropTypes.bool,
  /** Current reservation form data */
  reservationForm: reservationFormShape.isRequired,
  /** Setter for reservation form data */
  setReservationForm: PropTypes.func.isRequired,
  /** Callback when save is clicked */
  onSave: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
  /** Available clients for selection */
  clients: PropTypes.arrayOf(clientShape),
  /** Available inventory items for selection */
  inventory: PropTypes.arrayOf(itemWithReservationsShape),
  /** Item the reservation is for (for conflict detection) */
  item: itemWithReservationsShape,
  /** ID of reservation being edited (for conflict exclusion) */
  editingReservationId: PropTypes.string,
};
