// ============================================================================
// Checkout & Maintenance Handlers
// Extracted from App.jsx — manages check-out, check-in, and maintenance flows
// ============================================================================
import { useState, useCallback } from 'react';
import { STATUS, MODALS } from '../../constants.js';
import { getTodayISO, hasActiveReservation } from '../../utils';
import { error as logError } from '../../lib/logger.js';
import { resolveBorrowerUserId, companyNameFor } from '../../lib/emailTemplates.js';
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

  // Email sends are non-blocking, but a failure is no longer silent: the
  // operator sees why (recipient not on record, service unavailable, …).
  // Skips (recipient opted out, duplicate) stay quiet — nothing went wrong.
  const reportEmailResult = useCallback(
    (label, result) => {
      if (!result || result.success) return;
      addToast(`${label} email could not be sent: ${result.error || 'unknown error'}`, 'warning');
    },
    [addToast],
  );
  // Local state
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItemData, setCheckinItemData] = useState(null);
  const [maintenanceItem, setMaintenanceItem] = useState(null);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState(null);
  // Seed values for a NEW maintenance record (damage→repair handoff)
  const [maintenancePrefill, setMaintenancePrefill] = useState(null);

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

  // Batch checkout: one borrower/due date applied to many items at once
  // (reservation load-outs, bulk check-out). Persist-per-item so a single
  // failure doesn't block the rest; dataContext.checkOutItem patches local
  // inventory state itself.
  const processBatchCheckout = useCallback(
    async ({
      items,
      borrowerName,
      clientId = null,
      clientName = null,
      project = '',
      dueDate,
    }) => {
      let done = 0;
      const failed = [];
      // The borrower as a SIMS user — never the operator (that sent reminders
      // to whoever clicked Check Out)
      const borrowerUserId = resolveBorrowerUserId({
        borrowerName,
        clientId,
        users: dataContext?.users,
        currentUser,
      });
      for (const target of items) {
        try {
          await dataContext.checkOutItem(target.id, {
            userId: borrowerUserId,
            userName: borrowerName,
            clientId,
            clientName,
            project,
            dueBack: dueDate,
          });
        } catch (err) {
          logError('Batch checkout failed for', target.id, err);
          failed.push(target.name || target.id);
          continue;
        }
        done++;
        addAuditLog({
          type: 'item_checkout',
          description: `${target.name || target.id} checked out to ${borrowerName}`,
          user: currentUser?.name || 'Unknown',
          itemId: target.id,
        });
        addChangeLog({
          type: 'checkout',
          itemId: target.id,
          itemType: 'item',
          itemName: target.name || target.id,
          description: `Checked out to ${borrowerName} for ${project || 'unspecified project'}`,
          changes: [
            { field: 'status', oldValue: STATUS.AVAILABLE, newValue: STATUS.CHECKED_OUT },
            { field: 'checkedOutTo', newValue: borrowerName },
            { field: 'dueBack', newValue: dueDate },
          ],
        });
        if (selectedItem?.id === target.id) {
          setSelectedItem((prev) => ({
            ...prev,
            status: STATUS.CHECKED_OUT,
            checkedOutTo: borrowerName,
            checkedOutToUserId: currentUser?.id || null,
            dueBack: dueDate,
            checkoutProject: project,
            checkoutClientId: clientId || null,
          }));
        }
      }
      if (done) {
        addToast(`${done} item${done === 1 ? '' : 's'} checked out to ${borrowerName}`, 'success');
      }
      if (failed.length) {
        addToast(`Failed to check out: ${failed.join(', ')}`, 'error');
      }
      closeModal();
      return { done, failed };
    },
    [
      currentUser,
      selectedItem,
      setSelectedItem,
      closeModal,
      addAuditLog,
      addChangeLog,
      addToast,
      dataContext,
    ],
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

      // The borrower as a SIMS user (typed name/email matches a user) — never
      // the operator, which sent due-date reminders to whoever clicked Check Out
      const borrowerUserId = resolveBorrowerUserId({
        borrowerName,
        borrowerEmail,
        clientId: clientId || null,
        users: dataContext?.users,
        currentUser,
      });
      try {
        await dataContext.checkOutItem(itemId, {
          userId: borrowerUserId,
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
            companyName: companyNameFor(currentUser),
          })
          .then((result) => reportEmailResult('Checkout confirmation', result))
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
      reportEmailResult,
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
            companyName: companyNameFor(currentUser),
          })
          .then((result) => reportEmailResult('Return confirmation', result))
          .catch((err) => logError('Email send failed:', err));
      }

      // Damage reports go to every admin (each admin's own "Damage reports"
      // toggle is applied server-side)
      if (damageReported && dataContext?.sendDamageReportEmail) {
        const admins = (dataContext.users || []).filter((u) => u.roleId === 'role_admin' && u.email);
        if (admins.length) {
          dataContext
            .sendDamageReportEmail({
              admins,
              item: checkinItemData || currentItem || { id: itemId, name: itemId },
              reportedBy: returnedBy,
              borrowerName: borrowerName || 'Unknown',
              description: damageDescription || returnNotes || '',
              reportDate: new Date(),
              companyName: companyNameFor(currentUser),
            })
            .then((result) => reportEmailResult('Damage report', result))
            .catch((err) => logError('Damage report email failed:', err));
        }
      }

      addToast(`${checkinItemData?.name || 'Item'} checked in successfully`, 'success');
      closeModal();
      setCheckinItemData(null);

      // Damage → maintenance handoff: the damage description was just typed;
      // don't make the user re-find the item and re-type it. Opens a NEW
      // repair record pre-filled; Cancel simply skips logging.
      if (damageReported) {
        const damagedItem = checkinItemData ||
          currentItem || { id: itemId, name: itemId, maintenanceHistory: [] };
        setMaintenanceItem(damagedItem);
        setEditingMaintenanceRecord(null);
        setMaintenancePrefill({
          type: 'Repair',
          description: damageDescription || returnNotes || '',
        });
        openModal(MODALS.MAINTENANCE);
        addToast('Damage reported — log the repair, or cancel to skip', 'info');
      }
    },
    [
      currentUser,
      selectedItem,
      setSelectedItem,
      checkinItemData,
      reportEmailResult,
      closeModal,
      openModal,
      addAuditLog,
      addChangeLog,
      addToast,
      dataContext,
      inventory,
    ],
  );

  // Bulk check-in: the end-of-job cart comes back in one pass. Condition
  // stays as recorded (damage goes through the single check-in flow);
  // reservation-covered items return to 'reserved' exactly like the single
  // flow. dataContext.checkInItem patches local inventory itself.
  const processBatchCheckin = useCallback(
    async ({ itemIds, returnNotes = '' }) => {
      const returnedBy =
        currentUser?.name || currentUser?.email?.split('@')[0] || 'Unknown';
      const targets = inventory.filter(
        (i) => itemIds.includes(i.id) && i.status === STATUS.CHECKED_OUT,
      );
      let done = 0;
      const failed = [];
      for (const target of targets) {
        const hasReservationToday = hasActiveReservation(target, getTodayISO());
        try {
          await dataContext.checkInItem(target.id, {
            returnedBy,
            userId: currentUser?.id,
            condition: target.condition,
            conditionNotes: '',
            returnNotes,
            damageReported: false,
            damageDescription: '',
            returnStatus: hasReservationToday ? STATUS.RESERVED : undefined,
          });
        } catch (err) {
          logError('Bulk check-in failed for', target.id, err);
          failed.push(target.name || target.id);
          continue;
        }
        done++;
        addAuditLog({
          type: 'item_checkin',
          description: `${target.name || target.id} returned by ${returnedBy}`,
          user: currentUser?.name || 'Unknown',
          itemId: target.id,
        });
        addChangeLog({
          type: 'checkin',
          itemId: target.id,
          itemType: 'item',
          itemName: target.name || target.id,
          description: `Returned by ${returnedBy} (bulk check-in)`,
          changes: [
            {
              field: 'status',
              oldValue: STATUS.CHECKED_OUT,
              newValue: hasReservationToday ? STATUS.RESERVED : STATUS.AVAILABLE,
            },
          ],
        });
        if (selectedItem?.id === target.id) {
          setSelectedItem((prev) => ({
            ...prev,
            status: hasReservationToday ? STATUS.RESERVED : STATUS.AVAILABLE,
            checkedOutTo: null,
            checkedOutToUserId: null,
            checkedOutDate: null,
            dueBack: null,
          }));
        }
      }
      if (done) addToast(`${done} item${done === 1 ? '' : 's'} checked in`, 'success');
      if (failed.length) addToast(`Failed to check in: ${failed.join(', ')}`, 'error');
      closeModal();
      return { done, failed };
    },
    [
      currentUser,
      selectedItem,
      setSelectedItem,
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

      // Completing the LAST open record on a needs-attention item returns it
      // to Available — a finished repair used to leave the item stuck in the
      // alert bucket until someone edited its status by hand
      if (newStatus === 'completed' && currentItem?.status === STATUS.NEEDS_ATTENTION) {
        const stillOpen = applyStatus(prevHistory).some(
          (m) => m.status !== 'completed' && m.status !== 'cancelled',
        );
        if (!stillOpen) {
          try {
            await dataContext.updateItem(itemId, { status: STATUS.AVAILABLE });
            setSelectedItem((prev) =>
              prev && prev.id === itemId ? { ...prev, status: STATUS.AVAILABLE } : prev,
            );
            addToast(`${selectedItem.name} marked Available again`, 'success');
          } catch (err) {
            logError('Failed to clear needs-attention after repair:', err);
          }
        }
      }
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
    processBatchCheckout,
    processCheckin,
    processBatchCheckin,
    // Maintenance state
    maintenanceItem,
    setMaintenanceItem,
    editingMaintenanceRecord,
    setEditingMaintenanceRecord,
    maintenancePrefill,
    setMaintenancePrefill,
    // Maintenance handlers
    openMaintenanceModal,
    saveMaintenance,
    updateMaintenanceStatus,
  };
}
