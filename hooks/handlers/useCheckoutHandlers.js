// ============================================================================
// Checkout & Maintenance Handlers
// Extracted from App.jsx — manages check-out, check-in, and maintenance flows
// ============================================================================
import { useState, useCallback } from 'react';
import { STATUS, MODALS } from '../../constants.js';
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

  const openCheckoutModal = useCallback((id) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setCheckoutItem(item);
      openModal(MODALS.CHECK_OUT);
    }
  }, [inventory, openModal]);

  const openCheckinModal = useCallback((id) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setCheckinItemData(item);
      openModal(MODALS.CHECK_IN);
    }
  }, [inventory, openModal]);

  const processCheckout = useCallback(async (checkoutData) => {
    const { itemId, borrowerName, borrowerEmail, clientId, clientName, project, projectType, dueDate, checkedOutDate } = checkoutData;

    try {
      await dataContext.checkOutItem(itemId, {
        userId: currentUser?.id,
        userName: borrowerName,
        clientId: clientId || null,
        clientName: clientName || null,
        project: project,
        dueBack: dueDate
      });
      
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => ({ 
          ...prev, 
          status: STATUS.CHECKED_OUT,
          checkedOutTo: borrowerName,
          checkedOutDate: checkedOutDate,
          dueBack: dueDate,
          checkoutProject: project,
          checkoutProjectType: projectType,
          checkoutCount: (prev.checkoutCount || 0) + 1
        }));
      }
      
      addAuditLog({
        type: 'item_checkout',
        description: `${checkoutItem?.name || itemId} checked out to ${borrowerName}`,
        user: currentUser?.name || 'Unknown',
        itemId: itemId
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
          { field: 'dueBack', newValue: dueDate }
        ]
      });
      
      if (borrowerEmail && dataContext?.sendCheckoutEmail) {
        dataContext.sendCheckoutEmail({
          borrowerEmail,
          borrowerName,
          item: checkoutItem || { id: itemId, name: itemId },
          checkoutDate: checkedOutDate,
          dueDate,
          project
        }).catch(err => logError('Email send failed:', err));
      }
      
      addToast(`${checkoutItem?.name || 'Item'} checked out to ${borrowerName}`, 'success');
    } catch (err) {
      logError('Checkout process failed:', err);
      addToast('Checkout failed: ' + (err.message || 'Please try again.'), 'error');
    } finally {
      closeModal();
      setCheckoutItem(null);
    }
  }, [currentUser, selectedItem, setSelectedItem, checkoutItem, closeModal, addAuditLog, addChangeLog, addToast, dataContext]);

  const processCheckin = useCallback(async (checkinData) => {
    const { itemId, returnedBy, condition, conditionChanged, conditionAtCheckout, conditionNotes, returnNotes, damageReported, damageDescription, returnDate } = checkinData;
    
    try {
    const currentItem = inventory.find(i => i.id === itemId);
    const newStatus = damageReported ? STATUS.NEEDS_ATTENTION : STATUS.AVAILABLE;
    
    await dataContext.checkInItem(itemId, {
      returnedBy,
      userId: currentUser?.id,
      condition,
      conditionNotes,
      returnNotes,
      damageReported,
      damageDescription
    });
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ 
        ...prev, 
        status: newStatus,
        condition: condition,
        checkedOutTo: null,
        checkedOutDate: null,
        dueBack: null,
        checkoutProject: null
      }));
    }
    
    addAuditLog({
      type: 'item_checkin',
      description: `${checkinItemData?.name || itemId} returned by ${returnedBy}${damageReported ? ' (damage reported)' : ''}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
    
    addChangeLog({
      type: 'checkin',
      itemId: itemId,
      itemType: 'item',
      itemName: checkinItemData?.name || itemId,
      description: `Returned by ${returnedBy}${conditionChanged ? ` (condition: ${conditionAtCheckout} → ${condition})` : ''}`,
      changes: [
        { field: 'status', oldValue: STATUS.CHECKED_OUT, newValue: damageReported ? STATUS.NEEDS_ATTENTION : STATUS.AVAILABLE },
        { field: 'returnedBy', newValue: returnedBy },
        ...(conditionChanged ? [{ field: 'condition', oldValue: conditionAtCheckout, newValue: condition }] : [])
      ]
    });
    
    const lastCheckout = currentItem?.checkoutHistory?.filter(h => h.type === 'checkout').pop();
    const borrowerEmail = lastCheckout?.borrowerEmail;
    if (borrowerEmail && dataContext?.sendCheckinEmail) {
      dataContext.sendCheckinEmail({
        borrowerEmail,
        borrowerName: returnedBy,
        item: checkinItemData || currentItem || { id: itemId, name: itemId },
        returnDate
      }).catch(err => logError('Email send failed:', err));
    }
    
    addToast(`${checkinItemData?.name || 'Item'} checked in successfully`, 'success');
    
    } catch (err) {
      logError('Checkin process failed:', err);
      addToast('Check-in failed: ' + (err.message || 'Please try again.'), 'error');
    } finally {
      closeModal();
      setCheckinItemData(null);
    }
  }, [currentUser, selectedItem, setSelectedItem, checkinItemData, closeModal, addAuditLog, addChangeLog, addToast, dataContext, inventory]);

  // ---- Maintenance ----

  const openMaintenanceModal = useCallback(() => {
    if (selectedItem) {
      setMaintenanceItem(selectedItem);
      setEditingMaintenanceRecord(null);
      openModal(MODALS.MAINTENANCE);
    }
  }, [selectedItem, openModal]);

  const saveMaintenance = useCallback(async (record) => {
    if (!maintenanceItem) return;

    const itemId = maintenanceItem.id;
    const isEdit = !!editingMaintenanceRecord;
    const tempId = record.id;

    // Capture previous state for rollback
    const currentItem = inventory.find(i => i.id === itemId);
    const prevHistory = currentItem?.maintenanceHistory || [];

    // Optimistic local update
    dataContext.patchInventoryItem(itemId, item => {
      const existingHistory = item.maintenanceHistory || [];
      let newHistory;
      
      if (isEdit) {
        newHistory = existingHistory.map(m => m.id === record.id ? record : m);
      } else {
        newHistory = [...existingHistory, record];
      }
      
      return { maintenanceHistory: newHistory };
    });

    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => {
        const existingHistory = prev.maintenanceHistory || [];
        let newHistory;
        
        if (isEdit) {
          newHistory = existingHistory.map(m => m.id === record.id ? record : m);
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
          const swapId = (history) => (history || []).map(m => 
            m.id === tempId ? { ...m, id: dbResult.id } : m
          );
          dataContext.patchInventoryItem(itemId, item => ({
            maintenanceHistory: swapId(item.maintenanceHistory)
          }));
          if (selectedItem?.id === itemId) {
            setSelectedItem(prev => ({ ...prev, maintenanceHistory: swapId(prev.maintenanceHistory) }));
          }
        }
      }
    } catch (err) {
      logError('Failed to save maintenance:', err);
      // Rollback optimistic update
      dataContext.patchInventoryItem(itemId, { maintenanceHistory: prevHistory });
      if (selectedItem?.id === itemId) {
        setSelectedItem(prev => ({ ...prev, maintenanceHistory: prevHistory }));
      }
      addToast('Maintenance save failed — changes reverted', 'error');
    }

    addAuditLog({
      type: isEdit ? 'maintenance_updated' : 'maintenance_added',
      description: `${isEdit ? 'Updated' : 'Added'} ${record.type} for ${maintenanceItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
    
    addChangeLog({
      type: 'maintenance',
      itemId: itemId,
      itemType: 'item',
      itemName: maintenanceItem.name,
      description: `${isEdit ? 'Updated' : 'Added'} maintenance: ${record.type}`,
      changes: [{ field: 'maintenance', newValue: `${record.type} - ${record.description || record.status}` }]
    });

    closeModal();
    setMaintenanceItem(null);
    setEditingMaintenanceRecord(null);
  }, [maintenanceItem, editingMaintenanceRecord, selectedItem, setSelectedItem, inventory, currentUser, closeModal, addAuditLog, addChangeLog, addToast, dataContext]);

  const updateMaintenanceStatus = useCallback((recordId, newStatus) => {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    const completedDate = newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null;

    dataContext.patchInventoryItem(itemId, item => ({
      maintenanceHistory: (item.maintenanceHistory || []).map(m => 
        m.id === recordId 
          ? { ...m, status: newStatus, completedDate: completedDate || m.completedDate, updatedAt: new Date().toISOString() }
          : m
      )
    }));

    setSelectedItem(prev => ({
      ...prev,
      maintenanceHistory: (prev.maintenanceHistory || []).map(m =>
        m.id === recordId
          ? { ...m, status: newStatus, completedDate: completedDate || m.completedDate, updatedAt: new Date().toISOString() }
          : m
      )
    }));

    addAuditLog({
      type: 'maintenance_status_changed',
      description: `Maintenance status changed to ${newStatus} for ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
  }, [selectedItem, setSelectedItem, currentUser, addAuditLog, dataContext]);

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
