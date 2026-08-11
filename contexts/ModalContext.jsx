// =============================================================================
// ModalContext
// Provides modal state via context so opening/closing modals only
// re-renders modal-dependent components — not the entire App tree.
//
// NOTE: modals are opened with openModal(MODALS.X) plus the shared form/
// editing state below. A previous generation of per-modal helpers
// (openEditItemModal, openImageSelectorModal, bulk-action openers, ...) was
// never wired to the running app and was removed — do not reintroduce a
// second modal-opening API alongside this one.
// =============================================================================

import { useState, useCallback, useMemo } from 'react';
import { EMPTY_ITEM_FORM, EMPTY_RESERVATION_FORM } from '../constants.js';
import ModalContext from './ModalContext.js';

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

  // ============================================================================
  // Modal Handlers
  // ============================================================================

  const openModal = useCallback((modalId) => {
    setActiveModal(modalId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  // ============================================================================
  // Confirm Dialog
  // ============================================================================

  const showConfirm = useCallback(
    ({
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
    },
    [],
  );

  const closeConfirm = useCallback(() => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    closeConfirm();
  }, [confirmDialog, closeConfirm]);

  const handleCancel = useCallback(() => {
    if (confirmDialog.onCancel) confirmDialog.onCancel();
    closeConfirm();
  }, [confirmDialog, closeConfirm]);

  // ============================================================================
  // Form Helpers
  // ============================================================================

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
  const value = useMemo(
    () => ({
      activeModal,
      setActiveModal,
      openModal,
      closeModal,
      editingItemId,
      setEditingItemId,
      editingReservationId,
      setEditingReservationId,
      isEditing: editingItemId !== null || editingReservationId !== null,
      itemForm,
      setItemForm,
      resetItemForm,
      reservationForm,
      setReservationForm,
      resetReservationForm,
      confirmDialog,
      showConfirm,
      closeConfirm,
      handleConfirm,
      handleCancel,
    }),
    [
      activeModal,
      editingItemId,
      editingReservationId,
      itemForm,
      reservationForm,
      confirmDialog,
      openModal,
      closeModal,
      resetItemForm,
      resetReservationForm,
      showConfirm,
      closeConfirm,
      handleConfirm,
      handleCancel,
    ],
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}
