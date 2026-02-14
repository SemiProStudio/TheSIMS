// ============================================================================
// Reservation Handlers
// Extracted from App.jsx — manages reservation CRUD flows
// ============================================================================
import { useCallback } from 'react';
import { VIEWS, MODALS } from '../../constants';
import { generateId } from '../../utils';
import { error as logError } from '../../lib/logger';

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
  const saveReservation = useCallback(async () => {
    if (editingReservationId) {
      const updatedReservation = {
        ...reservationForm,
        id: editingReservationId,
        dueBack: reservationForm.end
      };

      const currentItem = inventory.find(i => i.id === selectedReservationItem.id);
      const updatedReservations = (currentItem.reservations || []).map(r => 
        r.id === editingReservationId ? updatedReservation : r
      );
      
      {
        try {
          await dataContext.updateReservation(editingReservationId, reservationForm);
        } catch (err) {
          logError('Failed to update reservation:', err);
        }
      }
      
      dataContext.patchInventoryItem(selectedReservationItem.id, item => ({
        reservations: (item.reservations || []).map(r => 
          r.id === editingReservationId ? updatedReservation : r
        )
      }));

      setSelectedReservation(updatedReservation);
      if (selectedItem?.id === selectedReservationItem.id) {
        setSelectedItem(prev => ({
          ...prev,
          reservations: (prev.reservations || []).map(r => 
            r.id === editingReservationId ? updatedReservation : r
          )
        }));
      }
      
      addChangeLog({
        type: 'updated',
        itemId: selectedReservationItem.id,
        itemType: 'item',
        itemName: selectedReservationItem.name,
        description: `Updated reservation for ${reservationForm.project}`,
        changes: [{ field: 'reservation', newValue: `${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})` }]
      });
      addAuditLog?.({
        type: 'reservation_updated',
        description: `Updated reservation: ${reservationForm.project} for ${selectedReservationItem.name}`,
        itemId: selectedReservationItem.id,
        user: currentUser?.name || 'Unknown',
      });
      
      setEditingReservationId(null);
    } else {
      // Creating new reservation(s) - support multiple items
      const itemIds = reservationForm.itemIds?.length 
        ? reservationForm.itemIds 
        : (reservationForm.itemId ? [reservationForm.itemId] : [selectedItem?.id || selectedReservationItem?.id].filter(Boolean));
      
      if (itemIds.length === 0) {
        logError('No items selected for reservation');
        return;
      }
      
      let firstCreatedReservation = null;
      for (const targetItemId of itemIds) {
        const targetItem = inventory.find(i => i.id === targetItemId);
        if (!targetItem) {
          logError('Item not found:', targetItemId);
          continue;
        }
        
        const reservation = {
          id: generateId(),
          ...reservationForm,
          notes: [],
          dueBack: reservationForm.end
        };

        try {
          const dbResult = await dataContext.createReservation(targetItemId, reservationForm);
          if (dbResult?.id) {
            reservation.id = dbResult.id;
          }
        } catch (err) {
          logError('Failed to create reservation for', targetItemId, err);
        }
        
        if (!firstCreatedReservation) {
          firstCreatedReservation = { reservation, item: targetItem };
        }
        
        dataContext.patchInventoryItem(targetItemId, item => ({
          reservations: [...(item.reservations || []), reservation]
        }));

        if (selectedItem?.id === targetItemId) {
          setSelectedItem(prev => ({
            ...prev,
            reservations: [...(prev.reservations || []), reservation]
          }));
        }
        
        addChangeLog({
          type: 'reservation_added',
          itemId: targetItemId,
          itemType: 'item',
          itemName: targetItem.name,
          description: `New reservation: ${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})`,
          changes: [{ field: 'reservation', newValue: reservationForm.project }]
        });
        addAuditLog?.({
          type: 'reservation_created',
          description: `Created reservation: ${reservationForm.project} for ${targetItem.name}`,
          itemId: targetItemId,
          user: currentUser?.name || 'Unknown',
        });
      }
      
      // Send reservation confirmation email (non-blocking) - send once for all items
      const userEmail = reservationForm.contactEmail;
      const firstItemId = itemIds[0];
      const firstItem = inventory.find(i => i.id === firstItemId);
      if (userEmail && dataContext?.sendReservationEmail && firstItem) {
        dataContext.sendReservationEmail({
          userEmail,
          userName: reservationForm.user,
          item: firstItem,
          reservation: {
            ...reservationForm,
            itemCount: itemIds.length
          }
        }).catch(err => logError('Email send failed:', err));
      }
      
      if (firstCreatedReservation) {
        navigateToReservation(firstCreatedReservation.reservation, firstCreatedReservation.item);
      }
    }
    
    closeModal();
    resetReservationForm();
  }, [reservationForm, editingReservationId, selectedItem, selectedReservationItem, closeModal, resetReservationForm, navigateToReservation, addChangeLog, dataContext, inventory]);

  const openEditReservation = useCallback((reservation) => {
    setEditingReservationId(reservation.id);
    setReservationForm({
      project: reservation.project,
      projectType: reservation.projectType || 'Other',
      start: reservation.start,
      end: reservation.end,
      user: reservation.user,
      contactPhone: reservation.contactPhone || '',
      contactEmail: reservation.contactEmail || '',
      location: reservation.location || ''
    });
    openModal(MODALS.ADD_RESERVATION);
  }, [openModal]);

  const deleteReservation = useCallback((itemId, resId) => {
    const item = inventory.find(i => i.id === itemId);
    const reservation = item?.reservations?.find(r => r.id === resId);
    
    if (!itemId || !resId) {
      logError('[deleteReservation] Missing itemId or resId:', { itemId, resId });
      return;
    }
    
    const projectName = reservation?.project || 'Unknown';
    const startDate = reservation?.start;
    const endDate = reservation?.end;
    const itemName = item?.name || itemId;
    const currentSelectedItemId = selectedItem?.id;
    const currentSelectedResId = selectedReservation?.id;
    
    // Find ALL reservations that are part of this multi-item reservation
    const relatedReservations = [];
    const affectedItemIds = [];
    
    if (reservation) {
      inventory.forEach(invItem => {
        (invItem.reservations || []).forEach(r => {
          if (r.project === projectName && 
              r.start === startDate && 
              r.end === endDate) {
            relatedReservations.push({ itemId: invItem.id, reservationId: r.id });
            if (!affectedItemIds.includes(invItem.id)) {
              affectedItemIds.push(invItem.id);
            }
          }
        });
      });
    }
    
    const itemCount = relatedReservations.length;
    
    const message = itemCount > 1 
      ? `Are you sure you want to cancel this reservation for ${itemCount} items? This action cannot be undone.`
      : 'Are you sure you want to cancel this reservation? This action cannot be undone.';
    
    const reservationIdsToDelete = relatedReservations.map(r => r.reservationId);
    const itemIdsAffected = [...affectedItemIds];
    
    showConfirm({
      title: 'Cancel Reservation',
      message,
      confirmText: 'Cancel Reservation',
      cancelText: 'Keep',
      variant: 'danger',
      onConfirm: async () => {
        {
          try {
            for (const resIdToDelete of reservationIdsToDelete) {
              await dataContext.deleteReservation(resIdToDelete);
            }
          } catch (err) {
            logError('Failed to delete reservations:', err);
          }
        }
        
        dataContext.mapInventory(invItem => {
          if (itemIdsAffected.includes(invItem.id)) {
            return {
              ...invItem,
              reservations: (invItem.reservations || []).filter(r => !reservationIdsToDelete.includes(r.id))
            };
          }
          return invItem;
        });
        
        if (itemIdsAffected.includes(currentSelectedItemId)) {
          setSelectedItem(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              reservations: (prev.reservations || []).filter(r => !reservationIdsToDelete.includes(r.id))
            };
          });
        }
        
        if (reservationIdsToDelete.includes(currentSelectedResId)) {
          setSelectedReservation(null);
          setCurrentView(VIEWS.SCHEDULE);
        }
        
        addChangeLog({
          type: 'reservation_removed',
          itemId: itemId,
          itemType: 'item',
          itemName: itemCount > 1 ? `${itemCount} items` : itemName,
          description: `Cancelled reservation: ${projectName}`,
          changes: [{ field: 'reservation', oldValue: projectName }]
        });
        addAuditLog?.({
          type: 'reservation_deleted',
          description: `Deleted reservation: ${projectName}`,
          itemId: itemId,
          user: currentUser?.name || 'Unknown',
        });
      }
    });
  }, [inventory, addChangeLog, addAuditLog, currentUser, dataContext, selectedItem?.id, selectedReservation?.id, showConfirm, setCurrentView, setSelectedItem, setSelectedReservation]);

  return {
    saveReservation,
    openEditReservation,
    deleteReservation,
  };
}
