// ============================================================================
// Bulk Operation Modals
// Modals for bulk status, location, category changes and deletion
// ============================================================================

import { memo, useState, useEffect, useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { STATUS } from '../constants';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme';
import { flattenLocations } from '../utils';
import { Button } from '../components/ui';
import { Select } from '../components/Select';
import { Modal, ModalHeader } from './ModalBase';

// ============================================================================
// Interfaces
// ============================================================================
interface InventoryItem {
  id: string;
  name: string;
  status?: string;
  category?: string;
  location?: string;
  reservations?: any[];
}

interface BulkStatusModalProps {
  selectedIds: string[];
  inventory: InventoryItem[];
  onApply: (newStatus: string) => void;
  onClose: () => void;
}

interface BulkLocationModalProps {
  selectedIds: string[];
  locations?: any[];
  onApply: (newLocation: string) => void;
  onClose: () => void;
}

interface BulkCategoryModalProps {
  selectedIds: string[];
  categories: string[];
  onApply: (newCategory: string) => void;
  onClose: () => void;
}

interface BulkDeleteModalProps {
  selectedIds: string[];
  inventory: InventoryItem[];
  onConfirm: () => void;
  onClose: () => void;
}

// ============================================================================
// Bulk Status Modal
// ============================================================================
export const BulkStatusModal = memo<BulkStatusModalProps>(function BulkStatusModal({ selectedIds = [], inventory = [], onApply, onClose }) {
  const [newStatus, setNewStatus] = useState(STATUS.AVAILABLE);
  
  const idList = Array.isArray(selectedIds) ? selectedIds : [];
  const invList = Array.isArray(inventory) ? inventory : [];
  const selectedItems = invList.filter(item => idList.includes(item.id));
  const checkedOutCount = selectedItems.filter(i => i.status === STATUS.CHECKED_OUT).length;
  
  const statusOptions = [
    { value: STATUS.AVAILABLE, label: 'Available' },
    { value: STATUS.NEEDS_ATTENTION, label: 'Needs Attention' },
    { value: STATUS.MISSING, label: 'Missing' },
  ];

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <ModalHeader title="Change Status" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
          Change status for <strong style={{ color: colors.textPrimary }}>{idList.length}</strong> selected items
        </p>
        
        {checkedOutCount > 0 && (
          <div style={{
            background: `${withOpacity(colors.warning, 15)}`,
            border: `1px solid ${colors.warning}`,
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: spacing[4],
            fontSize: typography.fontSize.sm,
          }}>
            <strong style={{ color: colors.warning }}>Note:</strong> {checkedOutCount} item(s) are currently checked out. 
            Use Check-In to properly return those items.
          </div>
        )}
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>New Status</label>
          <Select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            options={statusOptions}
            aria-label="New status"
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(newStatus)}>Apply to {idList.length} Items</Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// Bulk Location Modal
// ============================================================================
export const BulkLocationModal = memo<BulkLocationModalProps>(function BulkLocationModal({ selectedIds = [], locations = [], onApply, onClose }) {
  const idList = Array.isArray(selectedIds) ? selectedIds : [];
  const [newLocation, setNewLocation] = useState('');

  const locationList = useMemo(() => {
    // If locations is already an array of strings, use it directly
    if (Array.isArray(locations) && locations.length > 0 && typeof locations[0] === 'string') {
      return locations;
    }
    // Otherwise flatten hierarchical locations and extract paths
    return flattenLocations(locations).map(loc => loc.fullPath);
  }, [locations]);

  // Set initial location on mount
  useEffect(() => {
    if (locationList.length > 0 && !newLocation) {
      setNewLocation(locationList[0]);
    }
  }, [locationList, newLocation]);

  // If no locations available, show message
  if (locationList.length === 0) {
    return (
      <Modal onClose={onClose} maxWidth={450}>
        <ModalHeader title="Update Location" onClose={onClose} />
        <div style={{ padding: spacing[4] }}>
          <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
            No locations configured. Please add locations in Admin Panel → Manage Locations first.
          </p>
          <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <ModalHeader title="Update Location" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
          Update location for <strong style={{ color: colors.textPrimary }}>{idList.length}</strong> selected items
        </p>
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>New Location</label>
          <Select
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            options={locationList.map(loc => ({ value: loc, label: loc }))}
            aria-label="New location"
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(newLocation)}>Apply to {idList.length} Items</Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// Bulk Category Modal
// ============================================================================
export const BulkCategoryModal = memo<BulkCategoryModalProps>(function BulkCategoryModal({ selectedIds = [], categories = [], onApply, onClose }) {
  const categoryList = Array.isArray(categories) ? categories : [];
  const idList = Array.isArray(selectedIds) ? selectedIds : [];
  const [newCategory, setNewCategory] = useState('');

  // Set initial category on mount
  useEffect(() => {
    if (categoryList.length > 0 && !newCategory) {
      setNewCategory(categoryList[0]);
    }
  }, [categoryList, newCategory]);

  // If no categories available, show message
  if (categoryList.length === 0) {
    return (
      <Modal onClose={onClose} maxWidth={450}>
        <ModalHeader title="Change Category" onClose={onClose} />
        <div style={{ padding: spacing[4] }}>
          <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
            No categories configured.
          </p>
          <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <ModalHeader title="Change Category" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <p style={{ color: colors.textSecondary, marginBottom: spacing[4] }}>
          Change category for <strong style={{ color: colors.textPrimary }}>{idList.length}</strong> selected items
        </p>
        
        <div style={{
          background: `${withOpacity(colors.warning, 15)}`,
          border: `1px solid ${colors.warning}`,
          borderRadius: borderRadius.md,
          padding: spacing[3],
          marginBottom: spacing[4],
          fontSize: typography.fontSize.sm,
        }}>
          <strong style={{ color: colors.warning }}>Note:</strong> Changing category will reset category-specific specs for affected items.
        </div>
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>New Category</label>
          <Select
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            options={categoryList.map(cat => ({ value: cat, label: cat }))}
            aria-label="New category"
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onApply(newCategory)}>Apply to {idList.length} Items</Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// Bulk Delete Modal
// ============================================================================
export const BulkDeleteModal = memo<BulkDeleteModalProps>(function BulkDeleteModal({ selectedIds = [], inventory = [], onConfirm, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  
  const idList = Array.isArray(selectedIds) ? selectedIds : [];
  const invList = Array.isArray(inventory) ? inventory : [];
  const selectedItems = invList.filter(item => idList.includes(item.id));
  const checkedOutCount = selectedItems.filter(i => i.status === STATUS.CHECKED_OUT).length;
  const reservedCount = selectedItems.filter(i => i.reservations && i.reservations.length > 0).length;
  
  const canDelete = confirmText === 'DELETE';

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Delete Items" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <div style={{
          background: `${withOpacity(colors.danger, 15)}`,
          border: `1px solid ${colors.danger}`,
          borderRadius: borderRadius.md,
          padding: spacing[4],
          marginBottom: spacing[4],
        }}>
          <p style={{ color: colors.danger, fontWeight: typography.fontWeight.semibold, margin: 0, marginBottom: spacing[2] }}>
            ⚠️ Warning: This action cannot be undone!
          </p>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: typography.fontSize.sm }}>
            You are about to permanently delete <strong style={{ color: colors.textPrimary }}>{idList.length}</strong> items
            including all their reservations, maintenance history, and notes.
          </p>
        </div>
        
        {(checkedOutCount > 0 || reservedCount > 0) && (
          <div style={{
            background: `${withOpacity(colors.warning, 15)}`,
            border: `1px solid ${colors.warning}`,
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: spacing[4],
            fontSize: typography.fontSize.sm,
          }}>
            {checkedOutCount > 0 && (
              <p style={{ margin: 0, marginBottom: reservedCount > 0 ? spacing[2] : 0 }}>
                <strong>{checkedOutCount}</strong> item(s) are currently checked out
              </p>
            )}
            {reservedCount > 0 && (
              <p style={{ margin: 0 }}>
                <strong>{reservedCount}</strong> item(s) have active reservations
              </p>
            )}
          </div>
        )}
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Type DELETE to confirm</label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value.toUpperCase())}
            placeholder="DELETE"
            style={{
              ...styles.input,
              borderColor: confirmText && !canDelete ? colors.danger : colors.border,
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            danger 
            onClick={onConfirm} 
            disabled={!canDelete}
            icon={Trash2}
          >
            Delete {idList.length} Items
          </Button>
        </div>
      </div>
    </Modal>
  );
});

