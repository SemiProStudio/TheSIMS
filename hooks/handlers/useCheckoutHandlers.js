// ============================================================================
// Checkout & Maintenance Handlers
// Extracted from App.jsx — manages check-out, check-in, and maintenance flows
// ============================================================================
import { useState, useCallback } from 'react';
import { STATUS, MODALS } from '../../constants.js';
import { getTodayISO, hasActiveReservation } from '../../utils';
import { error as logError } from '../../lib/logger.js';
import { useToast } from '../../contexts/ToastContext.js';

export function useCheckoutHandlers({
  inventory,
  selectedItem,
  setSelectedItem,
  dataContext,
  currentUser,
  openModal,
  closeModal,
  addAuditLog,
  addChangeLog,
}) {
  const { addToast } = useToast();
  // Local state
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItemData, setCheckinItemData] = useState(null);
  const [maintenanceItem, setMaintenanceItem] = useState(null);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState(null);

  // ---- Checkout ----

  const openCheckoutModal = useCallback(
    (id) => {
      const item = inventory.find((i) => i.id === id);
      if (item) {
        setCheckoutItem(item);
        openModal(MODALS.CHECK_OUT);
      }
    },
    [inventory, openModal],
  );

  const openCheckinModal = useCallback(
    (id) => {
      const item = inventory.find((i) => i.id === id);
      if (item) {
        setCheckinItemData(item);
        openModal(MODALS.CHECK_IN);
      }
    },
    [inventory, openModal],
  );

  const processCheckout = useCallback(
    async (checkoutData) => {
      const {
        itemId,
        borrowerName,
        borrowerEmail,
        clientId,
        clientName,
        project,
        projectType,
        dueDate,
        checkedOutDate,
      } = checkoutData;

      try {
        await dataContext.checkOutItem(itemId, {
          userId: currentUser?.id,
          userName: borrowerName,
          clientId: clientId || null,
          clientName: clientName || null,
          project: project,
          dueBack: dueDate,
        });
      } catch (err) {
        // Keep the modal open with the form intact — closing it here made a
        // failed checkout look like a dead button with the item unchanged
        logError('Checkout process failed:', err);
        addToast('Checkout failed: ' + (err.message || 'Please try again.'), 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({
          ...prev,
          status: STATUS.CHECKED_OUT,
          checkedOutTo: borrowerName,
          checkedOutToUserId: currentUser?.id || null,
          checkedOutDate: checkedOutDate,
          dueBack: dueDate,
          checkoutProject: project,
          checkoutProjectType: projectType,
          checkoutClientId: clientId || null,
          checkoutCount: (prev.checkoutCount || 0) + 1,
        }));
      }

      addAuditLog({
        type: 'item_checkout',
        description: `${checkoutItem?.name || itemId} checked out to ${borrowerName}`,
        user: currentUser?.name || 'Unknown',
        itemId: itemId,
      });

      addChangeLog({
        type: 'checkout',
        itemId: itemId,
        itemType: 'item',
        itemName: checkoutItem?.name || itemId,
        description: `Checked out to ${borrowerName} for ${project || 'unspecified project'}`,
        changes: [
          { field: 'status', oldValue: STATUS.AVAILABLE, newValue: STATUS.CHECKED_OUT },
          { field: 'checkedOutTo', newValue: borrowerName },
          { field: 'dueBack', newValue: dueDate },
        ],
      });

      if (borrowerEmail && dataContext?.sendCheckoutEmail) {
        dataContext
          .sendCheckoutEmail({
            borrowerEmail,
            borrowerName,
            item: checkoutItem || { id: itemId, name: itemId },
            checkoutDate: checkedOutDate,
            dueDate,
            project,
          })
          .catch((err) => logError('Email send failed:', err));
      }

      addToast(`${checkoutItem?.name || 'Item'} checked out to ${borrowerName}`, 'success');

      closeModal();
      setCheckoutItem(null);
    },
    [
      currentUser,
      selectedItem,
      setSelectedItem,
      checkoutItem,
      closeModal,
      addAuditLog,
      addChangeLog,
      addToast,
      dataContext,
    ],
  );

  const processCheckin = useCallback(
    async (checkinData) => {
      const {
        itemId,
        returnedBy,
        condition,
        conditionChanged,
        conditionAtCheckout,
        conditionNotes,
        returnNotes,
        damageReported,
        damageDescription,
        returnDate,
      } = checkinData;

      const currentItem = inventory.find((i) => i.id === itemId);
      // A returned item goes back to 'reserved' — not 'available' — when a
      // confirmed reservation covers today; damage always wins
      const hasReservationToday = hasActiveReservation(currentItem, getTodayISO());
      const newStatus = damageReported
        ? STATUS.NEEDS_ATTENTION
        : hasReservationToday
          ? STATUS.RESERVED
          : STATUS.AVAILABLE;
      // Borrower details must be captured before check-in clears them
      const borrowerName = currentItem?.checkedOutTo;
      const checkoutClientId = currentItem?.checkoutClientId;

      try {
        await dataContext.checkInItem(itemId, {
          returnedBy,
          userId: currentUser?.id,
          condition,
          conditionNotes,
          returnNotes,
          damageReported,
          damageDescription,
          returnStatus: hasReservationToday ? STATUS.RESERVED : undefined,
        });
      } catch (err) {
        // Keep the modal open with the notes/damage description intact —
        // closing it here made a failed check-in look like a dead button
        // and threw away everything the user typed
        logError('Checkin process failed:', err);
        addToast('Check-in failed: ' + (err.message || 'Please try again.'), 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({
          ...prev,
          status: newStatus,
          condition: condition,
          checkedOutTo: null,
          checkedOutToUserId: null,
          checkedOutDate: null,
          dueBack: null,
          checkoutProject: null,
          checkoutClientId: null,
        }));
      }

      addAuditLog({
        type: 'item_checkin',
        description: `${checkinItemData?.name || itemId} returned by ${returnedBy}${damageReported ? ' (damage reported)' : ''}`,
        user: currentUser?.name || 'Unknown',
        itemId: itemId,
      });

      addChangeLog({
        type: 'checkin',
        itemId: itemId,
        itemType: 'item',
        itemName: checkinItemData?.name || itemId,
        description: `Returned by ${returnedBy}${conditionChanged ? ` (condition: ${conditionAtCheckout} → ${condition})` : ''}`,
        changes: [
          {
            field: 'status',
            oldValue: STATUS.CHECKED_OUT,
            newValue: newStatus,
          },
          { field: 'returnedBy', newValue: returnedBy },
          ...(conditionChanged
            ? [{ field: 'condition', oldValue: conditionAtCheckout, newValue: condition }]
            : []),
        ],
      });

      // Return-confirmation email. checkout_history stores no email address,
      // so the old lookup (checkoutHistory → borrowerEmail) never found one
      // and the email silently never sent. Resolve the recipient the way
      // checkout derived it: the linked client first, then a user record
      // matching the borrower's name.
      let borrowerEmail = null;
      if (checkoutClientId && dataContext?.getClientById) {
        borrowerEmail = (await dataContext.getClientById(checkoutClientId))?.email || null;
      }
      if (!borrowerEmail && borrowerName) {
        borrowerEmail =
          (dataContext?.users || []).find((u) => u.name === borrowerName)?.email || null;
      }
      if (borrowerEmail && dataContext?.sendCheckinEmail) {
        dataContext
          .sendCheckinEmail({
            borrowerEmail,
            borrowerName: borrowerName || returnedBy,
            item: checkinItemData || currentItem || { id: itemId, name: itemId },
            returnDate,
          })
          .catch((err) => logError('Email send failed:', err));
      }

      addToast(`${checkinItemData?.name || 'Item'} checked in successfully`, 'success');
      closeModal();
      setCheckinItemData(null);
    },
    [
      currentUser,
      selectedItem,
      setSelectedItem,
      checkinItemData,
      closeModal,
      addAuditLog,
      addChangeLog,
      addToast,
      dataContext,
      inventory,
    ],
  );

  // ---- Maintenance ----

  const openMaintenanceModal = useCallback(() => {
    if (selectedItem) {
      setMaintenanceItem(selectedItem);
      setEditingMaintenanceRecord(null);
      openModal(MODALS.MAINTENANCE);
    }
  }, [selectedItem, openModal]);

  const saveMaintenance = useCallback(
    async (record) => {
      if (!maintenanceItem) return;

      const itemId = maintenanceItem.id;
      const isEdit = !!editingMaintenanceRecord;
      const tempId = record.id;

      // Capture previous state for rollback
      const currentItem = inventory.find((i) => i.id === itemId);
      const prevHistory = currentItem?.maintenanceHistory || [];

      // Optimistic local update
      dataContext.patchInventoryItem(itemId, (item) => {
        const existingHistory = item.maintenanceHistory || [];
        let newHistory;

        if (isEdit) {
          newHistory = existingHistory.map((m) => (m.id === record.id ? record : m));
        } else {
          newHistory = [...existingHistory, record];
        }

        return { maintenanceHistory: newHistory };
      });

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => {
          const existingHistory = prev.maintenanceHistory || [];
          let newHistory;

          if (isEdit) {
            newHistory = existingHistory.map((m) => (m.id === record.id ? record : m));
          } else {
            newHistory = [...existingHistory, record];
          }

          return { ...prev, maintenanceHistory: newHistory };
        });
      }

      try {
        if (isEdit) {
          await dataContext.updateMaintenance(record.id, record);
        } else {
          const dbResult = await dataContext.addMaintenance(itemId, record);
          if (dbResult?.id && dbResult.id !== tempId) {
            const swapId = (history) =>
              (history || []).map((m) => (m.id === tempId ? { ...m, id: dbResult.id } : m));
            dataContext.patchInventoryItem(itemId, (item) => ({
              maintenanceHistory: swapId(item.maintenanceHistory),
            }));
            if (selectedItem?.id === itemId) {
              setSelectedItem((prev) => ({
                ...prev,
                maintenanceHistory: swapId(prev.maintenanceHistory),
              }));
            }
          }
        }
      } catch (err) {
        logError('Failed to save maintenance:', err);
        // Rollback optimistic update. The modal STAYS OPEN with the typed
        // record intact — CheckIn/CheckOut in this file set that contract,
        // but this path closed and discarded the form on failure.
        dataContext.patchInventoryItem(itemId, { maintenanceHistory: prevHistory });
        if (selectedItem?.id === itemId) {
          setSelectedItem((prev) => ({ ...prev, maintenanceHistory: prevHistory }));
        }
        addToast('Maintenance save failed: ' + (err.message || 'Please try again.'), 'error');
        return; // Don't write audit/change log entries for a failed save
      }

      addAuditLog({
        type: isEdit ? 'maintenance_updated' : 'maintenance_added',
        description: `${isEdit ? 'Updated' : 'Added'} ${record.type} for ${maintenanceItem.name}`,
        user: currentUser?.name || 'Unknown',
        itemId: itemId,
      });

      addChangeLog({
        type: 'maintenance',
        itemId: itemId,
        itemType: 'item',
        itemName: maintenanceItem.name,
        description: `${isEdit ? 'Updated' : 'Added'} maintenance: ${record.type}`,
        changes: [
          {
            field: 'maintenance',
            newValue: `${record.type} - ${record.description || record.status}`,
          },
        ],
      });

      closeModal();
      setMaintenanceItem(null);
      setEditingMaintenanceRecord(null);
    },
    [
      maintenanceItem,
      editingMaintenanceRecord,
      selectedItem,
      setSelectedItem,
      inventory,
      currentUser,
      closeModal,
      addAuditLog,
      addChangeLog,
      addToast,
      dataContext,
    ],
  );

  const updateMaintenanceStatus = useCallback(
    async (recordId, newStatus) => {
      if (!selectedItem) return;

      const itemId = selectedItem.id;
      const completedDate =
        newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null;

      // Capture previous state for rollback
      const currentItem = inventory.find((i) => i.id === itemId);
      const prevHistory = currentItem?.maintenanceHistory || [];
      const prevSelectedHistory = selectedItem.maintenanceHistory || [];

      const applyStatus = (history) =>
        (history || []).map((m) =>
          m.id === recordId
            ? {
                ...m,
                status: newStatus,
                completedDate: completedDate || m.completedDate,
                updatedAt: new Date().toISOString(),
              }
            : m,
        );

      // Optimistic local update
      dataContext.patchInventoryItem(itemId, (item) => ({
        maintenanceHistory: applyStatus(item.maintenanceHistory),
      }));
      setSelectedItem((prev) => ({
        ...prev,
        maintenanceHistory: applyStatus(prev.maintenanceHistory),
      }));

      // Persist — this handler previously only patched local state, so status
      // changes showed success and silently reverted on reload
      try {
        const dbUpdates = { status: newStatus };
        if (completedDate) dbUpdates.completed_date = completedDate;
        await dataContext.updateMaintenance(recordId, dbUpdates);
      } catch (err) {
        logError('Failed to persist maintenance status:', err);
        dataContext.patchInventoryItem(itemId, { maintenanceHistory: prevHistory });
        setSelectedItem((prev) => ({ ...prev, maintenanceHistory: prevSelectedHistory }));
        addToast('Failed to update maintenance status — change reverted', 'error');
        return;
      }

      addAuditLog({
        type: 'maintenance_status_changed',
        description: `Maintenance status changed to ${newStatus} for ${selectedItem.name}`,
        user: currentUser?.name || 'Unknown',
        itemId: itemId,
      });
    },
    [selectedItem, setSelectedItem, inventory, currentUser, addAuditLog, addToast, dataContext],
  );

  return {
    // Checkout state
    checkoutItem,
    checkinItemData,
    // Checkout handlers
    openCheckoutModal,
    openCheckinModal,
    processCheckout,
    processCheckin,
    // Maintenance state
    maintenanceItem,
    setMaintenanceItem,
    editingMaintenanceRecord,
    setEditingMaintenanceRecord,
    // Maintenance handlers
    openMaintenanceModal,
    saveMaintenance,
    updateMaintenanceStatus,
  };
}
