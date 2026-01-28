// =============================================================================
// useModals Hook
// Manages modal state and confirm dialogs
// =============================================================================

import { useState, useCallback } from 'react';
import { MODALS, EMPTY_ITEM_FORM, EMPTY_RESERVATION_FORM } from '../constants.js';

/**
 * Custom hook for managing modal state and confirm dialogs
 * @returns {Object} Modal state and handlers
 */
export function useModals() {
  // Active modal
  const [activeModal, setActiveModal] = useState(null);
  
  // Editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingReservationId, setEditingReservationId] = useState(null);
  
  // Form state
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [reservationForm, setReservationForm] = useState(EMPTY_RESERVATION_FORM);
  
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default', // 'default', 'danger', 'warning'
    onConfirm: null,
    onCancel: null,
  });

  // Modal-specific data
  const [modalData, setModalData] = useState(null);

  // ============================================================================
  // Modal Handlers
  // ============================================================================

  /**
   * Open a modal
   * @param {string} modalId - The modal identifier
   * @param {Object} data - Optional data to pass to the modal
   */
  const openModal = useCallback((modalId, data = null) => {
    setActiveModal(modalId);
    setModalData(data);
  }, []);

  /**
   * Close the active modal
   */
  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  /**
   * Check if a specific modal is open
   * @param {string} modalId - The modal identifier
   * @returns {boolean}
   */
  const isModalOpen = useCallback((modalId) => {
    return activeModal === modalId;
  }, [activeModal]);

  // ============================================================================
  // Item Modal Handlers
  // ============================================================================

  /**
   * Open the add item modal
   * @param {Object} initialData - Optional initial form data
   */
  const openAddItemModal = useCallback((initialData = null) => {
    setEditingItemId(null);
    setItemForm(initialData || { ...EMPTY_ITEM_FORM });
    setActiveModal(MODALS.ADD_ITEM);
  }, []);

  /**
   * Open the edit item modal
   * @param {Object} item - The item to edit
   */
  const openEditItemModal = useCallback((item) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name || '',
      code: item.code || '',
      category: item.category || '',
      subcategory: item.subcategory || '',
      status: item.status || 'available',
      condition: item.condition || 'excellent',
      location: item.location || '',
      sublocation: item.sublocation || '',
      value: item.value || '',
      serialNumber: item.serialNumber || '',
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      purchaseDate: item.purchaseDate || '',
      purchasePrice: item.purchasePrice || '',
      vendor: item.vendor || '',
      warrantyExpires: item.warrantyExpires || '',
      description: item.description || '',
      image: item.image || '',
      tags: item.tags || [],
      specs: item.specs || {},
      customFields: item.customFields || {},
    });
    setActiveModal(MODALS.ADD_ITEM);
  }, []);

  /**
   * Close item modal and reset form
   */
  const closeItemModal = useCallback(() => {
    setActiveModal(null);
    setEditingItemId(null);
    setItemForm({ ...EMPTY_ITEM_FORM });
  }, []);

  // ============================================================================
  // Reservation Modal Handlers
  // ============================================================================

  /**
   * Open the add reservation modal
   * @param {Object} item - The item to make reservation for
   */
  const openAddReservationModal = useCallback((item) => {
    setEditingReservationId(null);
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setModalData(item);
    setActiveModal(MODALS.ADD_RESERVATION);
  }, []);

  /**
   * Open the edit reservation modal
   * @param {Object} reservation - The reservation to edit
   * @param {Object} item - The item the reservation is for
   */
  const openEditReservationModal = useCallback((reservation, item) => {
    setEditingReservationId(reservation.id);
    setReservationForm({
      name: reservation.name || '',
      start: reservation.start || '',
      end: reservation.end || '',
      clientId: reservation.clientId || '',
      clientName: reservation.clientName || '',
      project: reservation.project || '',
      notes: reservation.notes || '',
      status: reservation.status || 'pending',
    });
    setModalData(item);
    setActiveModal(MODALS.ADD_RESERVATION);
  }, []);

  /**
   * Close reservation modal and reset form
   */
  const closeReservationModal = useCallback(() => {
    setActiveModal(null);
    setEditingReservationId(null);
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setModalData(null);
  }, []);

  // ============================================================================
  // Check-Out/Check-In Modal Handlers
  // ============================================================================

  /**
   * Open check-out modal
   * @param {Object} item - The item to check out
   */
  const openCheckOutModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.CHECK_OUT);
  }, []);

  /**
   * Open check-in modal
   * @param {Object} item - The item to check in
   */
  const openCheckInModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.CHECK_IN);
  }, []);

  // ============================================================================
  // Other Modal Handlers
  // ============================================================================

  /**
   * Open QR code modal
   * @param {Object} item - The item to show QR for
   */
  const openQRModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.QR_CODE);
  }, []);

  /**
   * Open export modal
   * @param {Object} options - Export options
   */
  const openExportModal = useCallback((options = {}) => {
    setModalData(options);
    setActiveModal(MODALS.EXPORT);
  }, []);

  /**
   * Open maintenance modal
   * @param {Object} item - The item for maintenance
   * @param {Object} record - Optional existing maintenance record
   */
  const openMaintenanceModal = useCallback((item, record = null) => {
    setModalData({ item, record });
    setActiveModal(MODALS.MAINTENANCE);
  }, []);

  /**
   * Open CSV import modal
   */
  const openCSVImportModal = useCallback(() => {
    setActiveModal(MODALS.CSV_IMPORT);
  }, []);

  /**
   * Open QR scanner modal
   */
  const openQRScannerModal = useCallback(() => {
    setActiveModal(MODALS.QR_SCANNER);
  }, []);

  /**
   * Open image selector modal
   * @param {Function} onSelect - Callback when image is selected
   */
  const openImageSelectorModal = useCallback((onSelect) => {
    setModalData({ onSelect });
    setActiveModal(MODALS.IMAGE_SELECTOR);
  }, []);

  // ============================================================================
  // Bulk Action Modal Handlers
  // ============================================================================

  /**
   * Open bulk status modal
   * @param {Array} ids - Selected item IDs
   */
  const openBulkStatusModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_STATUS);
  }, []);

  /**
   * Open bulk location modal
   * @param {Array} ids - Selected item IDs
   */
  const openBulkLocationModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_LOCATION);
  }, []);

  /**
   * Open bulk category modal
   * @param {Array} ids - Selected item IDs
   */
  const openBulkCategoryModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_CATEGORY);
  }, []);

  /**
   * Open bulk delete modal
   * @param {Array} ids - Selected item IDs
   */
  const openBulkDeleteModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_DELETE);
  }, []);

  // ============================================================================
  // Confirm Dialog Handlers
  // ============================================================================

  /**
   * Show confirm dialog
   * @param {Object} options - Dialog options
   */
  const showConfirm = useCallback(({
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
  }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      cancelText,
      variant,
      onConfirm,
      onCancel,
    });
  }, []);

  /**
   * Show delete confirmation dialog
   * @param {string} itemName - Name of item being deleted
   * @param {Function} onConfirm - Callback on confirmation
   */
  const showDeleteConfirm = useCallback((itemName, onConfirm) => {
    showConfirm({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm,
    });
  }, [showConfirm]);

  /**
   * Close confirm dialog
   */
  const closeConfirm = useCallback(() => {
    setConfirmDialog(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * Handle confirm dialog confirmation
   */
  const handleConfirm = useCallback(() => {
    if (confirmDialog.onConfirm) {
      confirmDialog.onConfirm();
    }
    closeConfirm();
  }, [confirmDialog.onConfirm, closeConfirm]);

  /**
   * Handle confirm dialog cancellation
   */
  const handleCancel = useCallback(() => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    closeConfirm();
  }, [confirmDialog.onCancel, closeConfirm]);

  // ============================================================================
  // Form Update Handlers
  // ============================================================================

  /**
   * Update item form field
   * @param {string} field - Field name
   * @param {any} value - New value
   */
  const updateItemForm = useCallback((field, value) => {
    setItemForm(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Update reservation form field
   * @param {string} field - Field name
   * @param {any} value - New value
   */
  const updateReservationForm = useCallback((field, value) => {
    setReservationForm(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Reset item form to empty state
   */
  const resetItemForm = useCallback(() => {
    setItemForm({ ...EMPTY_ITEM_FORM });
    setEditingItemId(null);
  }, []);

  /**
   * Reset reservation form to empty state
   */
  const resetReservationForm = useCallback(() => {
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setEditingReservationId(null);
  }, []);

  return {
    // Active modal state
    activeModal,
    setActiveModal,
    modalData,
    setModalData,
    openModal,
    closeModal,
    isModalOpen,
    
    // Editing state
    editingItemId,
    setEditingItemId,
    editingReservationId,
    setEditingReservationId,
    isEditing: editingItemId !== null || editingReservationId !== null,
    
    // Form state
    itemForm,
    setItemForm,
    updateItemForm,
    resetItemForm,
    reservationForm,
    setReservationForm,
    updateReservationForm,
    resetReservationForm,
    
    // Item modal handlers
    openAddItemModal,
    openEditItemModal,
    closeItemModal,
    
    // Reservation modal handlers
    openAddReservationModal,
    openEditReservationModal,
    closeReservationModal,
    
    // Check-out/Check-in handlers
    openCheckOutModal,
    openCheckInModal,
    
    // Other modal handlers
    openQRModal,
    openExportModal,
    openMaintenanceModal,
    openCSVImportModal,
    openQRScannerModal,
    openImageSelectorModal,
    
    // Bulk action handlers
    openBulkStatusModal,
    openBulkLocationModal,
    openBulkCategoryModal,
    openBulkDeleteModal,
    
    // Confirm dialog
    confirmDialog,
    showConfirm,
    showDeleteConfirm,
    closeConfirm,
    handleConfirm,
    handleCancel,
  };
}

export default useModals;
