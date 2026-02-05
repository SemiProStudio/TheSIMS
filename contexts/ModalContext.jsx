// =============================================================================
// ModalContext
// Provides modal state via context so opening/closing modals only
// re-renders modal-dependent components — not the entire App tree.
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { MODALS, EMPTY_ITEM_FORM, EMPTY_RESERVATION_FORM } from '../constants.js';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
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
    variant: 'default',
    onConfirm: null,
    onCancel: null,
  });

  // Modal-specific data
  const [modalData, setModalData] = useState(null);

  // ============================================================================
  // Modal Handlers
  // ============================================================================

  const openModal = useCallback((modalId, data = null) => {
    setActiveModal(modalId);
    setModalData(data);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  const isModalOpen = useCallback((modalId) => activeModal === modalId, [activeModal]);

  // ============================================================================
  // Item Modal Handlers
  // ============================================================================

  const openAddItemModal = useCallback((initialData = null) => {
    setEditingItemId(null);
    setItemForm(initialData || { ...EMPTY_ITEM_FORM });
    setActiveModal(MODALS.ADD_ITEM);
  }, []);

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

  const closeItemModal = useCallback(() => {
    setActiveModal(null);
    setEditingItemId(null);
    setItemForm({ ...EMPTY_ITEM_FORM });
  }, []);

  // ============================================================================
  // Reservation Modal Handlers
  // ============================================================================

  const openAddReservationModal = useCallback((item) => {
    setEditingReservationId(null);
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setModalData(item);
    setActiveModal(MODALS.ADD_RESERVATION);
  }, []);

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

  const closeReservationModal = useCallback(() => {
    setActiveModal(null);
    setEditingReservationId(null);
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setModalData(null);
  }, []);

  // ============================================================================
  // Check-Out/Check-In
  // ============================================================================

  const openCheckOutModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.CHECK_OUT);
  }, []);

  const openCheckInModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.CHECK_IN);
  }, []);

  // ============================================================================
  // Other Modal Handlers
  // ============================================================================

  const openQRModal = useCallback((item) => {
    setModalData(item);
    setActiveModal(MODALS.QR_CODE);
  }, []);

  const openExportModal = useCallback((options = {}) => {
    setModalData(options);
    setActiveModal(MODALS.EXPORT);
  }, []);

  const openMaintenanceModal = useCallback((item, record = null) => {
    setModalData({ item, record });
    setActiveModal(MODALS.MAINTENANCE);
  }, []);

  const openCSVImportModal = useCallback(() => setActiveModal(MODALS.CSV_IMPORT), []);
  const openQRScannerModal = useCallback(() => setActiveModal(MODALS.QR_SCANNER), []);

  const openImageSelectorModal = useCallback((onSelect) => {
    setModalData({ onSelect });
    setActiveModal(MODALS.IMAGE_SELECTOR);
  }, []);

  // ============================================================================
  // Bulk Action Handlers
  // ============================================================================

  const openBulkStatusModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_STATUS);
  }, []);

  const openBulkLocationModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_LOCATION);
  }, []);

  const openBulkCategoryModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_CATEGORY);
  }, []);

  const openBulkDeleteModal = useCallback((ids) => {
    setModalData({ ids });
    setActiveModal(MODALS.BULK_DELETE);
  }, []);

  // ============================================================================
  // Confirm Dialog
  // ============================================================================

  const showConfirm = useCallback(({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default', onConfirm, onCancel }) => {
    setConfirmDialog({ isOpen: true, title, message, confirmText, cancelText, variant, onConfirm, onCancel });
  }, []);

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

  const closeConfirm = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    closeConfirm();
  }, [confirmDialog.onConfirm, closeConfirm]);

  const handleCancel = useCallback(() => {
    if (confirmDialog.onCancel) confirmDialog.onCancel();
    closeConfirm();
  }, [confirmDialog.onCancel, closeConfirm]);

  // ============================================================================
  // Form Helpers
  // ============================================================================

  const updateItemForm = useCallback((field, value) => {
    setItemForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateReservationForm = useCallback((field, value) => {
    setReservationForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetItemForm = useCallback(() => {
    setItemForm({ ...EMPTY_ITEM_FORM });
    setEditingItemId(null);
  }, []);

  const resetReservationForm = useCallback(() => {
    setReservationForm({ ...EMPTY_RESERVATION_FORM });
    setEditingReservationId(null);
  }, []);

  // ============================================================================
  // Memoized context value
  // ============================================================================
  const value = useMemo(() => ({
    activeModal, setActiveModal, modalData, setModalData, openModal, closeModal, isModalOpen,
    editingItemId, setEditingItemId, editingReservationId, setEditingReservationId,
    isEditing: editingItemId !== null || editingReservationId !== null,
    itemForm, setItemForm, updateItemForm, resetItemForm,
    reservationForm, setReservationForm, updateReservationForm, resetReservationForm,
    openAddItemModal, openEditItemModal, closeItemModal,
    openAddReservationModal, openEditReservationModal, closeReservationModal,
    openCheckOutModal, openCheckInModal,
    openQRModal, openExportModal, openMaintenanceModal,
    openCSVImportModal, openQRScannerModal, openImageSelectorModal,
    openBulkStatusModal, openBulkLocationModal, openBulkCategoryModal, openBulkDeleteModal,
    confirmDialog, setConfirmDialog, showConfirm, showDeleteConfirm,
    closeConfirm, handleConfirm, handleCancel,
  }), [
    activeModal, modalData, editingItemId, editingReservationId,
    itemForm, reservationForm, confirmDialog,
    openModal, closeModal, isModalOpen,
    updateItemForm, resetItemForm, updateReservationForm, resetReservationForm,
    openAddItemModal, openEditItemModal, closeItemModal,
    openAddReservationModal, openEditReservationModal, closeReservationModal,
    openCheckOutModal, openCheckInModal,
    openQRModal, openExportModal, openMaintenanceModal,
    openCSVImportModal, openQRScannerModal, openImageSelectorModal,
    openBulkStatusModal, openBulkLocationModal, openBulkCategoryModal, openBulkDeleteModal,
    showConfirm, showDeleteConfirm, closeConfirm, handleConfirm, handleCancel,
  ]);

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModalContext must be used within ModalProvider');
  return ctx;
}

export default ModalContext;
