// ============================================================================
// Reservation Modal
// Add and edit reservations with multi-item search selection
// ============================================================================

import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Save, AlertTriangle, Search, X, Package } from 'lucide-react';
import { PROJECT_TYPES } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { getAllReservationConflicts } from '../utils';
import { Button, Badge } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

// ============================================================================
// Item Search Component
// ============================================================================
const ItemSearch = memo(function ItemSearch({ 
  inventory, 
  selectedItemIds, 
  onAddItem,
  placeholder = "Search items by name, ID, or brand..."
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Filter inventory based on search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return inventory
      .filter(item => 
        !selectedItemIds.includes(item.id) && // Exclude already selected
        (item.status === 'available' || item.status === 'reserved') && // Only available/reserved items
        (
          item.name?.toLowerCase().includes(q) ||
          item.id?.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q)
        )
      )
      .slice(0, 10); // Limit results
  }, [searchQuery, inventory, selectedItemIds]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (item) => {
    onAddItem(item);
    setSearchQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };
  
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search 
          size={16} 
          style={{ 
            position: 'absolute', 
            left: 12, 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: colors.textMuted 
          }} 
        />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{
            ...styles.input,
            paddingLeft: 40,
          }}
        />
      </div>
      
      {/* Search Results Dropdown */}
      {isOpen && searchQuery.trim() && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: colors.bgMedium,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.lg,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: 100,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {searchResults.length === 0 ? (
            <div style={{ 
              padding: spacing[4], 
              textAlign: 'center', 
              color: colors.textMuted,
              fontSize: typography.fontSize.sm 
            }}>
              No items found matching "{searchQuery}"
            </div>
          ) : (
            searchResults.map(item => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                style={{
                  padding: spacing[3],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  cursor: 'pointer',
                  borderBottom: `1px solid ${colors.borderLight}`,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = withOpacity(colors.primary, 15)}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt="" 
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: borderRadius.md, 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <div style={{ 
                    width: 40, 
                    height: 40, 
                    borderRadius: borderRadius.md, 
                    background: withOpacity(colors.primary, 15),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.textMuted,
                    fontSize: typography.fontSize.xs
                  }}>
                    <Package size={16} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: typography.fontWeight.medium, 
                    color: colors.textPrimary,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {item.name}
                  </div>
                  <div style={{ 
                    fontSize: typography.fontSize.sm, 
                    color: colors.textMuted,
                    display: 'flex',
                    gap: spacing[2],
                    alignItems: 'center'
                  }}>
                    <Badge text={item.id} color={colors.primary} />
                    <span>{item.brand}</span>
                    {item.status === 'reserved' && (
                      <Badge text="Has Reservations" color={colors.warning} />
                    )}
                  </div>
                </div>
                <Plus size={18} style={{ color: colors.primary }} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Selected Item Card
// ============================================================================
const SelectedItemCard = memo(function SelectedItemCard({ item, onRemove, conflicts }) {
  const hasConflict = conflicts?.hasConflicts;
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
      padding: spacing[3],
      background: hasConflict 
        ? withOpacity(colors.warning, 10) 
        : withOpacity(colors.primary, 10),
      border: `1px solid ${hasConflict ? colors.warning : withOpacity(colors.primary, 30)}`,
      borderRadius: borderRadius.md,
    }}>
      {item.image ? (
        <img 
          src={item.image} 
          alt="" 
          style={{ width: 48, height: 48, borderRadius: borderRadius.md, objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ 
          width: 48, 
          height: 48, 
          borderRadius: borderRadius.md, 
          background: colors.bgDark,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textMuted
        }}>
          <Package size={20} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: typography.fontWeight.medium, 
          color: colors.textPrimary,
          marginBottom: 2
        }}>
          {item.name}
        </div>
        <div style={{ 
          fontSize: typography.fontSize.sm, 
          color: colors.textMuted,
          display: 'flex',
          gap: spacing[2],
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <Badge text={item.id} color={colors.primary} />
          <span>{item.brand} • {item.category}</span>
        </div>
        {hasConflict && (
          <div style={{ 
            marginTop: spacing[1],
            fontSize: typography.fontSize.xs,
            color: colors.warning,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1]
          }}>
            <AlertTriangle size={12} />
            {conflicts.reservationConflicts?.length > 0 
              ? `${conflicts.reservationConflicts.length} scheduling conflict(s)`
              : 'Item currently checked out'}
          </div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={() => onRemove(item.id)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: spacing[1],
            cursor: 'pointer',
            color: colors.textMuted,
            borderRadius: borderRadius.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Remove item"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
});

// ============================================================================
// Main ReservationModal Component
// ============================================================================
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
  
  // Selected items - from props (single item) or from form (multiple)
  // Selected items - sync with props and form
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Reset selected items when modal opens/form resets
  useEffect(() => {
    if (item) {
      setSelectedItems([item]);
    } else if (reservationForm.itemIds?.length) {
      setSelectedItems(inventory.filter(i => reservationForm.itemIds.includes(i.id)));
    } else if (reservationForm.itemId) {
      const found = inventory.find(i => i.id === reservationForm.itemId);
      setSelectedItems(found ? [found] : []);
    } else {
      setSelectedItems([]);
    }
  }, [item, reservationForm.itemIds, reservationForm.itemId, inventory]);
  
  // Add item to selection
  const handleAddItem = useCallback((newItem) => {
    setSelectedItems(prev => [...prev, newItem]);
    // Update form with item IDs
    setReservationForm(prev => ({
      ...prev,
      itemIds: [...(prev.itemIds || []), newItem.id],
      itemId: newItem.id // Keep single itemId for backwards compatibility
    }));
  }, [setReservationForm]);
  
  // Remove item from selection
  const handleRemoveItem = useCallback((itemId) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId));
    setReservationForm(prev => {
      const newItemIds = (prev.itemIds || []).filter(id => id !== itemId);
      return {
        ...prev,
        itemIds: newItemIds,
        itemId: newItemIds[0] || ''
      };
    });
  }, [setReservationForm]);
  
  const handleChange = (field, value) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'start' || field === 'end') {
      setAcknowledgedConflicts(false);
    }
    if (field === 'start' && reservationForm.end && value > reservationForm.end) {
      setReservationForm(prev => ({ ...prev, start: value, end: value }));
    } else if (field === 'clientId' && value) {
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
  };
  
  // Get conflicts for each selected item
  const itemConflicts = useMemo(() => {
    const conflicts = {};
    if (reservationForm.start && reservationForm.end) {
      selectedItems.forEach(selectedItem => {
        conflicts[selectedItem.id] = getAllReservationConflicts(
          selectedItem,
          reservationForm.start,
          reservationForm.end,
          isEdit ? editingReservationId : null
        );
      });
    }
    return conflicts;
  }, [selectedItems, reservationForm.start, reservationForm.end, isEdit, editingReservationId]);
  
  // Check if any item has conflicts
  const hasAnyConflicts = useMemo(() => {
    return Object.values(itemConflicts).some(c => c.hasConflicts);
  }, [itemConflicts]);
  
  // Validation
  const dateValid = reservationForm.start && reservationForm.end && reservationForm.end >= reservationForm.start;
  const hasItems = selectedItems.length > 0;
  const valid = hasItems && reservationForm.project?.trim() && dateValid && reservationForm.user?.trim();
  const dateError = reservationForm.start && reservationForm.end && reservationForm.end < reservationForm.start;
  
  const canSave = valid && (!hasAnyConflicts || acknowledgedConflicts);
  
  const handleSave = useCallback(() => {
    setTouched({
      project: true,
      start: true,
      end: true,
      user: true,
      contactEmail: true,
    });
    
    if (canSave) {
      // Update form with selected item IDs before saving
      const itemIds = selectedItems.map(i => i.id);
      setReservationForm(prev => ({
        ...prev,
        itemIds,
        itemId: itemIds[0] || ''
      }));
      onSave();
    }
  }, [canSave, onSave, selectedItems, setReservationForm]);
  
  const showProjectError = touched.project && !reservationForm.project;
  const showStartError = touched.start && !reservationForm.start;
  const showEndError = touched.end && (!reservationForm.end || dateError);
  const showUserError = touched.user && !reservationForm.user;

  const getInputStyle = (hasError, isEmpty) => ({
    ...styles.input,
    borderColor: hasError || isEmpty ? colors.danger : colors.border,
    boxShadow: hasError ? `0 0 0 1px ${colors.danger}` : undefined
  });

  return (
    <Modal onClose={onClose} maxWidth={600}>
      <ModalHeader title={isEdit ? "Edit Reservation" : "Add Reservation"} onClose={onClose} />
      <div style={{ padding: spacing[4], maxHeight: '75vh', overflowY: 'auto' }}>
        
        {/* ============ SECTION 1: ITEM SELECTION ============ */}
        <div style={{ 
          marginBottom: spacing[4],
          paddingBottom: spacing[4],
          borderBottom: `1px solid ${colors.borderLight}`
        }}>
          <label style={{ 
            ...styles.label, 
            marginBottom: spacing[2],
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2]
          }}>
            <Package size={16} />
            {item ? 'Item to Reserve' : 'Select Items to Reserve'}
            {selectedItems.length === 0 && <span style={{ color: colors.danger }}>*</span>}
          </label>
          
          {/* Search Input - only show when not in single-item mode and not editing */}
          {!isEdit && !item && (
            <ItemSearch
              inventory={inventory}
              selectedItemIds={selectedItems.map(i => i.id)}
              onAddItem={handleAddItem}
            />
          )}
          
          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div style={{ 
              marginTop: spacing[3],
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[2]
            }}>
              {/* Only show count when multiple items */}
              {!item && selectedItems.length > 1 && (
                <div style={{ 
                  fontSize: typography.fontSize.sm, 
                  color: colors.textMuted,
                  marginBottom: spacing[1]
                }}>
                  {selectedItems.length} items selected:
                </div>
              )}
              {selectedItems.map(selectedItem => (
                <SelectedItemCard
                  key={selectedItem.id}
                  item={selectedItem}
                  onRemove={isEdit || item ? null : handleRemoveItem}
                  conflicts={itemConflicts[selectedItem.id]}
                />
              ))}
            </div>
          )}
          
          {/* No items selected warning */}
          {selectedItems.length === 0 && touched.project && (
            <p style={{ 
              color: colors.danger, 
              fontSize: typography.fontSize.sm, 
              marginTop: spacing[2] 
            }}>
              Please select at least one item to reserve
            </p>
          )}
        </div>
        
        {/* ============ SECTION 2: RESERVATION DETAILS ============ */}
        
        {/* Conflict Warning Banner */}
        {hasAnyConflicts && (
          <div style={{
            background: withOpacity(colors.warning, 15),
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
              <span>Scheduling Conflicts Detected</span>
            </div>
            <p style={{ 
              fontSize: typography.fontSize.sm, 
              color: colors.textSecondary,
              marginBottom: spacing[2]
            }}>
              One or more selected items have scheduling conflicts for the selected dates.
              You can still proceed if needed.
            </p>
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
                checked={acknowledgedConflicts}
                onChange={(e) => setAcknowledgedConflicts(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              I understand and want to proceed anyway
            </label>
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
            <label style={{ ...styles.label, color: showProjectError ? colors.danger : undefined }}>
              Project Name <span style={{ color: colors.danger }}>*</span>
            </label>
            <input 
              value={reservationForm.project || ''} 
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
            <label style={{ ...styles.label, color: showStartError ? colors.danger : undefined }}>
              Start Date <span style={{ color: colors.danger }}>*</span>
            </label>
            <DatePicker
              value={reservationForm.start || ''} 
              onChange={e => handleChange('start', e.target.value)} 
              error={showStartError}
              placeholder="Select start date"
              aria-label="Start date"
            />
            {showStartError && <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>Required</p>}
          </div>
          <div>
            <label style={{ ...styles.label, color: showEndError ? colors.danger : undefined }}>
              End Date / Due Back <span style={{ color: colors.danger }}>*</span>
            </label>
            <DatePicker
              value={reservationForm.end || ''} 
              onChange={e => handleChange('end', e.target.value)} 
              min={reservationForm.start || undefined}
              error={showEndError}
              placeholder="Select end date"
              aria-label="End date"
            />
            {dateError && (
              <p style={{ color: colors.danger, fontSize: typography.fontSize.xs, margin: `${spacing[1]}px 0 0` }}>
                End date must be on or after start date
              </p>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: showUserError ? colors.danger : undefined }}>
            Reserved By <span style={{ color: colors.danger }}>*</span>
          </label>
          <input 
            value={reservationForm.user || ''} 
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
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={!canSave} 
            icon={isEdit ? Save : Plus}
            style={hasAnyConflicts && acknowledgedConflicts ? { background: colors.warning } : undefined}
          >
            {isEdit 
              ? 'Save Changes' 
              : hasAnyConflicts && acknowledgedConflicts 
                ? 'Save Anyway' 
                : `Add Reservation${selectedItems.length > 1 ? ` (${selectedItems.length} items)` : ''}`
            }
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================

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
  itemId: PropTypes.string,
  itemIds: PropTypes.arrayOf(PropTypes.string),
});

const clientShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  company: PropTypes.string,
  phone: PropTypes.string,
  email: PropTypes.string,
});

const itemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string,
  brand: PropTypes.string,
  category: PropTypes.string,
  image: PropTypes.string,
  status: PropTypes.string,
  reservations: PropTypes.array,
});

ReservationModal.propTypes = {
  isEdit: PropTypes.bool,
  reservationForm: reservationFormShape.isRequired,
  setReservationForm: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  clients: PropTypes.arrayOf(clientShape),
  inventory: PropTypes.arrayOf(itemShape),
  item: itemShape,
  editingReservationId: PropTypes.string,
};
