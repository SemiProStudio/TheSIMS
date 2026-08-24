// ============================================================================
// Reservation Handlers
// Extracted from App.jsx — manages reservation CRUD flows
// ============================================================================
import { useCallback } from 'react';
import { VIEWS, MODALS } from '../../constants.js';
import { generateId, formatPhoneNumber, getTodayISO, hasActiveReservation } from '../../utils';
import { error as logError } from '../../lib/logger.js';
import { companyNameFor } from '../../lib/emailTemplates.js';
import { useToast } from '../../contexts/ToastContext.js';

export function useReservationHandlers({
  inventory,
  selectedItem,
  setSelectedItem,
  dataContext,
  openModal,
  closeModal,
  addChangeLog,
  addAuditLog,
  currentUser,
  // Reservation-specific state (from navigation/modal contexts)
  reservationForm,
  setReservationForm,
  editingReservationId,
  setEditingReservationId,
  selectedReservationItem,
  selectedReservation,
  setSelectedReservation,
  setCurrentView,
  resetReservationForm,
  navigateToReservation,
  showConfirm,
}) {
  const { addToast } = useToast();

  // Move an item between 'available' and 'reserved' based on whether any of
  // the given reservations covers today. Never touches other statuses
  // (checked-out, missing, needs-attention) — those own their transitions.
  const reconcileItemReservedStatus = useCallback(
    async (itemId, reservationsForItem) => {
      const invItem = inventory.find((i) => i.id === itemId);
      if (!invItem) return;
      if (invItem.status !== 'reserved' && invItem.status !== 'available') return;
      const desired = hasActiveReservation({ reservations: reservationsForItem }, getTodayISO())
        ? 'reserved'
        : 'available';
      if (desired === invItem.status) return;
      try {
        await dataContext.updateItem(itemId, { status: desired });
      } catch (err) {
        // Non-fatal: the reservation change itself already persisted
        logError('Failed to reconcile item status after reservation change:', err);
      }
    },
    [inventory, dataContext],
  );

  const saveReservation = useCallback(async () => {
    if (editingReservationId) {
      // Collect every row of this reservation group. Rows created together
      // share group_id; legacy rows (NULL group_id) fall back to matching the
      // ORIGINAL project+dates — from selectedReservation, never the edited
      // form values. Editing must update the whole group: updating only the
      // first row silently split multi-item reservations.
      const original = selectedReservation || {};
      const relatedByItem = new Map(); // itemId -> reservations of that item in this group
      inventory.forEach((invItem) => {
        (invItem.reservations || []).forEach((r) => {
          const inGroup =
            r.id === editingReservationId ||
            (original.groupId
              ? r.groupId === original.groupId
              : r.project === original.project &&
                r.start === original.start &&
                r.end === original.end);
          if (inGroup) {
            if (!relatedByItem.has(invItem.id)) relatedByItem.set(invItem.id, []);
            relatedByItem.get(invItem.id).push(r.id);
          }
        });
      });
      const rowIds = [...new Set([...relatedByItem.values()].flat())];
      if (rowIds.length === 0) rowIds.push(editingReservationId);

      try {
        // Single UPDATE ... IN (ids) — the whole group changes or none of it
        await dataContext.updateReservationRows(rowIds, reservationForm);
      } catch (err) {
        // Leave local state untouched — patching it would show an update
        // that never landed
        logError('Failed to update reservation:', err);
        addToast('Failed to update reservation: ' + (err.message || 'Please try again.'), 'error');
        return;
      }

      // Merge the form over each affected row so non-form fields (notes,
      // groupId, clientId) survive locally
      const applyForm = (r) =>
        rowIds.includes(r.id) ? { ...r, ...reservationForm, dueBack: reservationForm.end } : r;
      dataContext.mapInventory((invItem) =>
        relatedByItem.has(invItem.id)
          ? { ...invItem, reservations: (invItem.reservations || []).map(applyForm) }
          : invItem,
      );
      if (selectedItem && relatedByItem.has(selectedItem.id)) {
        setSelectedItem((prev) => ({
          ...prev,
          reservations: (prev.reservations || []).map(applyForm),
        }));
      }
      setSelectedReservation((prev) =>
        prev ? { ...prev, ...reservationForm, dueBack: reservationForm.end } : prev,
      );

      // Date moves can start or stop covering today
      for (const affectedItemId of relatedByItem.keys()) {
        const invItem = inventory.find((i) => i.id === affectedItemId);
        await reconcileItemReservedStatus(
          affectedItemId,
          (invItem?.reservations || []).map(applyForm),
        );
      }

      // Structural edit: the item list can change now. Added items get new
      // rows in the same group; removed items get their rows CANCELLED (not
      // hard-deleted) so history survives.
      const currentIds = [...relatedByItem.keys()];
      const desiredIds = reservationForm.itemIds?.length ? reservationForm.itemIds : currentIds;
      const toAdd = desiredIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !desiredIds.includes(id));

      for (const targetItemId of toAdd) {
        const targetItem = inventory.find((i) => i.id === targetItemId);
        if (!targetItem) continue;
        const newRow = {
          id: generateId(),
          ...reservationForm,
          groupId: original.groupId || null,
          notes: [],
          dueBack: reservationForm.end,
        };
        try {
          const dbResult = await dataContext.createReservation(targetItemId, {
            ...reservationForm,
            groupId: original.groupId || null,
            createdById: currentUser?.id || null,
            createdByName: currentUser?.name || null,
          });
          if (dbResult?.id) newRow.id = dbResult.id;
        } catch (err) {
          logError('Failed to add item to reservation:', targetItemId, err);
          addToast(`Failed to add ${targetItem.name} to the reservation`, 'error');
          continue;
        }
        dataContext.patchInventoryItem(targetItemId, (invItem) => ({
          reservations: [...(invItem.reservations || []), newRow],
        }));
        if (selectedItem?.id === targetItemId) {
          setSelectedItem((prev) => ({
            ...prev,
            reservations: [...(prev.reservations || []), newRow],
          }));
        }
        await reconcileItemReservedStatus(targetItemId, [
          ...(targetItem.reservations || []),
          newRow,
        ]);
      }

      for (const removeItemId of toRemove) {
        const rowIdsForItem = relatedByItem.get(removeItemId) || [];
        if (!rowIdsForItem.length) continue;
        const invItem = inventory.find((i) => i.id === removeItemId);
        try {
          await dataContext.cancelReservations(rowIdsForItem);
        } catch (err) {
          logError('Failed to remove item from reservation:', removeItemId, err);
          addToast(
            `Failed to remove ${invItem?.name || removeItemId} from the reservation`,
            'error',
          );
          continue;
        }
        const remaining = (invItem?.reservations || []).filter(
          (r) => !rowIdsForItem.includes(r.id),
        );
        dataContext.patchInventoryItem(removeItemId, (patchItem) => ({
          reservations: (patchItem.reservations || []).filter((r) => !rowIdsForItem.includes(r.id)),
        }));
        if (selectedItem?.id === removeItemId) {
          setSelectedItem((prev) => ({
            ...prev,
            reservations: (prev.reservations || []).filter((r) => !rowIdsForItem.includes(r.id)),
          }));
        }
        await reconcileItemReservedStatus(removeItemId, remaining);
      }

      const groupSize = relatedByItem.size || 1;
      const groupSuffix = groupSize > 1 ? ` (${groupSize} items)` : '';
      addChangeLog({
        type: 'updated',
        itemId: selectedReservationItem?.id,
        itemType: 'item',
        itemName: groupSize > 1 ? `${groupSize} items` : selectedReservationItem?.name,
        description: `Updated reservation for ${reservationForm.project}${groupSuffix}`,
        changes: [
          {
            field: 'reservation',
            newValue: `${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})`,
          },
        ],
      });
      addAuditLog?.({
        type: 'reservation_updated',
        description: `Updated reservation: ${reservationForm.project}${groupSuffix}`,
        itemId: selectedReservationItem?.id,
        user: currentUser?.name || 'Unknown',
      });

      setEditingReservationId(null);
    } else {
      // Creating new reservation(s) - support multiple items
      const itemIds = reservationForm.itemIds?.length
        ? reservationForm.itemIds
        : reservationForm.itemId
          ? [reservationForm.itemId]
          : [selectedItem?.id || selectedReservationItem?.id].filter(Boolean);

      if (itemIds.length === 0) {
        logError('No items selected for reservation');
        return;
      }

      // One shared group id for every row created by this save — this is
      // what lets edit/cancel treat them as a single reservation later
      const groupId =
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;

      const rowPayload = {
        ...reservationForm,
        groupId,
        createdById: currentUser?.id || null,
        createdByName: currentUser?.name || null,
      };

      let firstCreatedReservation = null;
      let createdCount = 0;
      const createdItems = [];
      const createdReservationIds = [];
      for (const targetItemId of itemIds) {
        const targetItem = inventory.find((i) => i.id === targetItemId);
        if (!targetItem) {
          logError('Item not found:', targetItemId);
          continue;
        }

        const reservation = {
          id: generateId(),
          ...reservationForm,
          groupId,
          notes: [],
          dueBack: reservationForm.end,
        };

        try {
          const dbResult = await dataContext.createReservation(targetItemId, rowPayload);
          if (dbResult?.id) {
            reservation.id = dbResult.id;
          }
        } catch (err) {
          // Skip local injection entirely — a ghost reservation here would
          // block real bookings until reload while not existing server-side
          logError('Failed to create reservation for', targetItemId, err);
          addToast(
            `Failed to reserve ${targetItem.name}: ` + (err.message || 'Please try again.'),
            'error',
          );
          continue;
        }

        createdCount++;
        createdItems.push(targetItem);
        createdReservationIds.push(reservation.id);
        if (!firstCreatedReservation) {
          firstCreatedReservation = { reservation, item: targetItem };
        }

        dataContext.patchInventoryItem(targetItemId, (item) => ({
          reservations: [...(item.reservations || []), reservation],
        }));

        if (selectedItem?.id === targetItemId) {
          setSelectedItem((prev) => ({
            ...prev,
            reservations: [...(prev.reservations || []), reservation],
          }));
        }

        // A reservation starting today makes an available item 'reserved'
        // (the service no longer does this blindly — it used to clobber
        // checked-out items too)
        await reconcileItemReservedStatus(targetItemId, [
          ...(targetItem.reservations || []),
          reservation,
        ]);

        addChangeLog({
          type: 'reservation_added',
          itemId: targetItemId,
          itemType: 'item',
          itemName: targetItem.name,
          description: `New reservation: ${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})`,
          changes: [{ field: 'reservation', newValue: reservationForm.project }],
        });
        addAuditLog?.({
          type: 'reservation_created',
          description: `Created reservation: ${reservationForm.project} for ${targetItem.name}`,
          itemId: targetItemId,
          user: currentUser?.name || 'Unknown',
        });
      }

      // Every insert failed: keep the modal open with the user's selections
      // intact — the per-item toasts already explain what went wrong
      if (createdCount === 0) {
        return;
      }

      // Send reservation confirmation email (non-blocking) - send once for all
      // items, and only if at least one reservation was actually created
      const userEmail = reservationForm.contactEmail;
      const firstItemId = itemIds[0];
      const firstItem = inventory.find((i) => i.id === firstItemId);
      if (firstCreatedReservation && userEmail && dataContext?.sendReservationEmail && firstItem) {
        dataContext
          .sendReservationEmail({
            userEmail,
            userName: reservationForm.user,
            item: firstItem,
            reservation: {
              ...reservationForm,
              id: firstCreatedReservation.id,
              itemCount: itemIds.length,
            },
            companyName: companyNameFor(currentUser),
          })
          .then((result) => {
            if (result && !result.success) {
              addToast(
                `Reservation saved, but the confirmation email could not be sent: ${result.error || 'unknown error'}`,
                'warning',
              );
            }
          })
          .catch((err) => logError('Email send failed:', err));
      }

      if (firstCreatedReservation) {
        // Navigate with the full group view — the detail page should show
        // every item just created, not only the first row
        navigateToReservation(
          {
            ...firstCreatedReservation.reservation,
            items: createdItems,
            itemCount: createdItems.length,
            reservationIds: createdReservationIds,
          },
          firstCreatedReservation.item,
        );
      }
    }

    closeModal();
    resetReservationForm();
  }, [
    reservationForm,
    editingReservationId,
    selectedItem,
    setSelectedItem,
    selectedReservationItem,
    closeModal,
    resetReservationForm,
    navigateToReservation,
    addChangeLog,
    addAuditLog,
    addToast,
    currentUser,
    setSelectedReservation,
    setEditingReservationId,
    dataContext,
    inventory,
    selectedReservation,
    reconcileItemReservedStatus,
  ]);

  const openEditReservation = useCallback(
    (reservation) => {
      setEditingReservationId(reservation.id);
      // Seed the full group's items so edit mode can add/remove items —
      // same group matching as saveReservation (group_id, legacy fallback)
      const groupItemIds = [];
      inventory.forEach((invItem) => {
        const inGroup = (invItem.reservations || []).some(
          (r) =>
            r.id === reservation.id ||
            (reservation.groupId
              ? r.groupId === reservation.groupId
              : r.project === reservation.project &&
                r.start === reservation.start &&
                r.end === reservation.end),
        );
        if (inGroup) groupItemIds.push(invItem.id);
      });
      setReservationForm({
        project: reservation.project,
        projectType: reservation.projectType || 'Other',
        start: reservation.start,
        end: reservation.end,
        user: reservation.user,
        // Carry the client link — omitting it made the edit form show "no
        // client" for reservations that have one
        clientId: reservation.clientId || '',
        contactPhone: formatPhoneNumber(reservation.contactPhone) || '',
        contactEmail: reservation.contactEmail || '',
        location: reservation.location || '',
        itemIds: groupItemIds,
        itemId: groupItemIds[0] || '',
      });
      openModal(MODALS.ADD_RESERVATION);
    },
    [openModal, setEditingReservationId, setReservationForm, inventory],
  );

  const deleteReservation = useCallback(
    (itemId, resId) => {
      const item = inventory.find((i) => i.id === itemId);
      const reservation = item?.reservations?.find((r) => r.id === resId);

      if (!itemId || !resId) {
        logError('[deleteReservation] Missing itemId or resId:', { itemId, resId });
        return;
      }

      const projectName = reservation?.project || 'Unknown';
      const itemName = item?.name || itemId;
      const currentSelectedItemId = selectedItem?.id;
      const currentSelectedResId = selectedReservation?.id;

      // Find every row of this reservation group — by shared group_id when
      // present, else legacy project+dates matching. Name matching is why a
      // renamed row used to survive "cancelling" its group, and why two
      // unrelated same-named reservations could be cancelled together.
      const relatedReservations = [];
      const affectedItemIds = [];

      if (reservation) {
        inventory.forEach((invItem) => {
          (invItem.reservations || []).forEach((r) => {
            const inGroup =
              r.id === resId ||
              (reservation.groupId
                ? r.groupId === reservation.groupId
                : r.project === reservation.project &&
                  r.start === reservation.start &&
                  r.end === reservation.end);
            if (inGroup) {
              relatedReservations.push({ itemId: invItem.id, reservationId: r.id });
              if (!affectedItemIds.includes(invItem.id)) {
                affectedItemIds.push(invItem.id);
              }
            }
          });
        });
      }

      const itemCount = relatedReservations.length || 1;

      const message =
        itemCount > 1
          ? `Are you sure you want to cancel this reservation for ${itemCount} items?`
          : 'Are you sure you want to cancel this reservation?';

      const reservationIdsToCancel = relatedReservations.length
        ? relatedReservations.map((r) => r.reservationId)
        : [resId];
      const itemIdsAffected = affectedItemIds.length ? [...affectedItemIds] : [itemId];

      showConfirm({
        title: 'Cancel Reservation',
        message,
        confirmText: 'Cancel Reservation',
        cancelText: 'Keep',
        variant: 'danger',
        onConfirm: async () => {
          // Persist-first: one statement cancels the whole group (status =
          // 'cancelled', so the history survives). On failure nothing moves
          // locally and no logs are written.
          try {
            await dataContext.cancelReservations(reservationIdsToCancel);
          } catch (err) {
            logError('Failed to cancel reservations:', err);
            addToast(
              'Failed to cancel reservation: ' + (err.message || 'Please try again.'),
              'error',
            );
            return;
          }

          dataContext.mapInventory((invItem) => {
            if (itemIdsAffected.includes(invItem.id)) {
              return {
                ...invItem,
                reservations: (invItem.reservations || []).filter(
                  (r) => !reservationIdsToCancel.includes(r.id),
                ),
              };
            }
            return invItem;
          });

          if (itemIdsAffected.includes(currentSelectedItemId)) {
            setSelectedItem((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                reservations: (prev.reservations || []).filter(
                  (r) => !reservationIdsToCancel.includes(r.id),
                ),
              };
            });
          }

          if (reservationIdsToCancel.includes(currentSelectedResId)) {
            setSelectedReservation(null);
            setCurrentView(VIEWS.SCHEDULE);
          }

          // A cancelled reservation may have been the only thing keeping an
          // item 'reserved'
          for (const affectedItemId of itemIdsAffected) {
            const invItem = inventory.find((i) => i.id === affectedItemId);
            const remaining = (invItem?.reservations || []).filter(
              (r) => !reservationIdsToCancel.includes(r.id),
            );
            await reconcileItemReservedStatus(affectedItemId, remaining);
          }

          addChangeLog({
            type: 'reservation_removed',
            itemId: itemId,
            itemType: 'item',
            itemName: itemCount > 1 ? `${itemCount} items` : itemName,
            description: `Cancelled reservation: ${projectName}`,
            changes: [{ field: 'reservation', oldValue: projectName }],
          });
          addAuditLog?.({
            type: 'reservation_cancelled',
            description: `Cancelled reservation: ${projectName}${itemCount > 1 ? ` (${itemCount} items)` : ''}`,
            itemId: itemId,
            user: currentUser?.name || 'Unknown',
          });
        },
      });
    },
    [
      inventory,
      addChangeLog,
      addAuditLog,
      addToast,
      currentUser,
      dataContext,
      selectedItem?.id,
      selectedReservation?.id,
      showConfirm,
      setCurrentView,
      setSelectedItem,
      setSelectedReservation,
      reconcileItemReservedStatus,
    ],
  );

  return {
    saveReservation,
    openEditReservation,
    deleteReservation,
  };
}
