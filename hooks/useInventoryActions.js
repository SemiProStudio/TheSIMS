// =============================================================================
// useInventoryActions Hook
// Encapsulates all inventory CRUD operations with Supabase persistence
// =============================================================================

import { useCallback, useState } from 'react';
import { generateItemCode, updateById } from '../utils.js';
import { VIEWS, STATUS, MODALS } from '../constants.js';

import { error as logError } from '../lib/logger.js';

/**
 * Custom hook for inventory CRUD operations
 * Integrates with DataContext for Supabase persistence
 * 
 * @param {Object} params - Hook parameters
 * @param {Object} params.dataContext - DataContext with Supabase-integrated methods
 * @param {Function} params.dataContext.createItem - Creates item in Supabase + local state
 * @param {Function} params.dataContext.updateItem - Updates item in Supabase + local state
 * @param {Function} params.dataContext.deleteItem - Deletes item from Supabase + local state
 */
export function useInventoryActions({
  // DataContext for Supabase persistence
  dataContext,
  
  // State setters (for operations not yet in DataContext)
  setInventory,
  setSelectedItem,
  setCurrentView,
  setAuditLog,
  setChangeLog,
  setConfirmDialog,
  
  // Current state for operations
  inventory,
  selectedItem,
  currentUser,
  currentView,
  specs,
  
  // Modal state
  editingItemId,
  setEditingItemId,
  itemForm,
  setItemForm,
  resetItemForm,
  closeModal,
  openModal,
}) {
  // ============================================================================
  // Loading/Error State for async operations
  // ============================================================================
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ============================================================================
  // Bulk Action State
  // ============================================================================
  const [bulkActionIds, setBulkActionIds] = useState([]);

  // ============================================================================
  // Audit Log Helper
  // ============================================================================
  
  const addAuditLog = useCallback((entry) => {
    if (dataContext?.addAuditLog) {
      dataContext.addAuditLog({
        ...entry,
        user: currentUser?.name || 'Unknown',
      });
    }
  }, [dataContext, currentUser]);

  // ============================================================================
  // Change Log Helper
  // ============================================================================
  
  const addChangeLog = useCallback((entry) => {
    setChangeLog(prev => [...prev, {
      ...entry,
      id: `CL${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: currentUser?.name || 'Unknown',
    }]);
  }, [currentUser, setChangeLog]);

  // ============================================================================
  // Create Item - NOW PERSISTS TO SUPABASE
  // ============================================================================
  
  const createItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const id = generateItemCode(itemForm.category, inventory.map(i => i.id));
      const itemSpecs = {};
      (specs[itemForm.category] || []).forEach(f => {
        if (itemForm.specs[f.name]) itemSpecs[f.name] = itemForm.specs[f.name];
      });

      const newItem = {
        ...itemForm,
        id,
        status: STATUS.AVAILABLE,
        purchasePrice: Number(itemForm.purchasePrice) || 0,
        currentValue: Number(itemForm.currentValue) || Number(itemForm.purchasePrice) || 0,
        quantity: Number(itemForm.quantity) || 1,
        reorderPoint: Number(itemForm.reorderPoint) || 0,
        specs: itemSpecs,
        notes: [],
        reservations: [],
        reminders: [],
        maintenanceHistory: [],
        viewCount: 0,
        checkoutCount: 0
      };

      // Use DataContext method - persists to Supabase AND updates local state
      if (dataContext?.createItem) {
        await dataContext.createItem(newItem);
      } else {
        // Fallback to local state only (demo mode without DataContext)
        setInventory(prev => [...prev, newItem]);
      }
      
      // Log the creation
      addChangeLog({
        type: 'created',
        itemId: id,
        itemType: 'item',
        itemName: newItem.name,
        description: `Created new item: ${newItem.name}`,
        changes: [{ field: 'item', newValue: newItem.name }]
      });
      addAuditLog({
        type: 'item_created',
        description: `Created item: ${newItem.name} (${id})`,
        itemId: id,
      });
      
      closeModal();
      resetItemForm?.();
      
      // If on the Add Item page, navigate back to Gear List
      if (currentView === VIEWS.ADD_ITEM) {
        setCurrentView(VIEWS.GEAR_LIST);
      }
      
      return newItem;
    } catch (err) {
      logError('Failed to create item:', err);
      setError(err.message || 'Failed to create item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [itemForm, inventory, specs, closeModal, resetItemForm, currentView, setCurrentView, setInventory, addChangeLog, dataContext]);

  // ============================================================================
  // Update Item - NOW PERSISTS TO SUPABASE
  // ============================================================================
  
  const updateItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const itemSpecs = {};
      (specs[itemForm.category] || []).forEach(f => {
        if (itemForm.specs[f.name]) itemSpecs[f.name] = itemForm.specs[f.name];
      });

      const updates = {
        ...itemForm,
        specs: itemSpecs,
        purchasePrice: Number(itemForm.purchasePrice) || 0,
        currentValue: Number(itemForm.currentValue) || 0,
        quantity: Number(itemForm.quantity) || 1,
        reorderPoint: Number(itemForm.reorderPoint) || 0,
      };

      // Find the original item to track changes
      const originalItem = inventory.find(i => i.id === editingItemId);
      const changes = [];
      if (originalItem) {
        const fieldsToTrack = [
          { key: 'name', label: 'name' },
          { key: 'brand', label: 'brand' },
          { key: 'category', label: 'category' },
          { key: 'condition', label: 'condition' },
          { key: 'location', label: 'location' },
          { key: 'serialNumber', label: 'serialNumber' },
          { key: 'purchasePrice', label: 'purchasePrice' },
          { key: 'currentValue', label: 'currentValue' },
          { key: 'purchaseDate', label: 'purchaseDate' },
          { key: 'quantity', label: 'quantity' },
          { key: 'reorderPoint', label: 'reorderPoint' },
        ];
        
        fieldsToTrack.forEach(({ key, label }) => {
          const oldVal = originalItem[key];
          const newVal = updates[key];
          if (String(oldVal || '') !== String(newVal || '')) {
            changes.push({ field: label, oldValue: oldVal, newValue: newVal });
          }
        });
      }

      // Use DataContext method - persists to Supabase AND updates local state
      if (dataContext?.updateItem) {
        await dataContext.updateItem(editingItemId, updates);
      } else {
        // Fallback to local state only
        setInventory(prev => updateById(prev, editingItemId, updates));
      }
      
      // Update selected item if it's the one being edited
      if (selectedItem?.id === editingItemId) {
        setSelectedItem(prev => ({ ...prev, ...updates }));
      }
      
      // Log the update
      if (changes.length > 0) {
        addChangeLog({
          type: 'updated',
          itemId: editingItemId,
          itemType: 'item',
          itemName: updates.name,
          description: `Updated item: ${updates.name}`,
          changes
        });
        addAuditLog({
          type: 'item_updated',
          description: `Updated item: ${updates.name} (${changes.map(c => c.field).join(', ')})`,
          itemId: editingItemId,
        });
      }
      
      closeModal();
      setEditingItemId(null);
    } catch (err) {
      logError('Failed to update item:', err);
      setError(err.message || 'Failed to update item');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [itemForm, editingItemId, selectedItem, specs, closeModal, inventory, setInventory, setSelectedItem, setEditingItemId, addChangeLog, dataContext]);

  // ============================================================================
  // Delete Item - NOW PERSISTS TO SUPABASE (with confirmation)
  // ============================================================================
  
  const deleteItem = useCallback((id) => {
    const itemToDelete = inventory.find(i => i.id === id);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This action cannot be undone.',
      onConfirm: async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          // Use DataContext method - deletes from Supabase AND updates local state
          if (dataContext?.deleteItem) {
            await dataContext.deleteItem(id);
          } else {
            // Fallback to local state only
            setInventory(prev => prev.filter(i => i.id !== id));
          }
          
          // Log the deletion
          addChangeLog({
            type: 'deleted',
            itemId: id,
            itemType: 'item',
            itemName: itemToDelete?.name || 'Unknown',
            description: `Deleted item: ${itemToDelete?.name || id}`,
            changes: [{ field: 'item', oldValue: itemToDelete?.name }]
          });
          addAuditLog({
            type: 'item_deleted',
            description: `Deleted item: ${itemToDelete?.name || id}`,
            itemId: id,
          });
          
          // Clear selection if deleted item was selected
          if (selectedItem?.id === id) {
            setSelectedItem(null);
            setCurrentView(VIEWS.GEAR_LIST);
          }
          
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          logError('Failed to delete item:', err);
          setError(err.message || 'Failed to delete item');
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        } finally {
          setIsLoading(false);
        }
      }
    });
  }, [selectedItem, inventory, setInventory, setSelectedItem, setCurrentView, setConfirmDialog, addChangeLog, dataContext]);

  // ============================================================================
  // Bulk Action Handler
  // ============================================================================
  
  const handleBulkAction = useCallback((action, ids) => {
    setBulkActionIds(ids);
    switch (action) {
      case 'status':
        openModal(MODALS.BULK_STATUS);
        break;
      case 'location':
        openModal(MODALS.BULK_LOCATION);
        break;
      case 'category':
        openModal(MODALS.BULK_CATEGORY);
        break;
      case 'delete':
        openModal(MODALS.BULK_DELETE);
        break;
      default:
        break;
    }
  }, [openModal]);

  // ============================================================================
  // Bulk Operations - NOW PERSIST TO SUPABASE
  // ============================================================================
  
  const applyBulkStatus = useCallback(async (newStatus) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedItems = [];
      
      // Update each item
      for (const itemId of bulkActionIds) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
          updatedItems.push({ id: item.id, name: item.name, oldStatus: item.status });
          
          if (dataContext?.updateItem) {
            await dataContext.updateItem(itemId, { status: newStatus });
          }
        }
      }
      
      // If no dataContext, update local state directly
      if (!dataContext?.updateItem) {
        setInventory(prev => prev.map(item => {
          if (bulkActionIds.includes(item.id)) {
            return { ...item, status: newStatus };
          }
          return item;
        }));
      }
      
      addChangeLog({
        type: 'bulk_update',
        itemType: 'item',
        description: `Changed status to "${newStatus}" for ${bulkActionIds.length} items`,
        changes: updatedItems.map(i => ({ 
          field: `${i.id} (${i.name})`, 
          oldValue: i.oldStatus, 
          newValue: newStatus 
        }))
      });
      addAuditLog({
        type: 'bulk_status_change',
        description: `Bulk status change to "${newStatus}" for ${bulkActionIds.length} items`,
      });
      
      closeModal();
      setBulkActionIds([]);
    } catch (err) {
      logError('Failed to apply bulk status:', err);
      setError(err.message || 'Failed to update items');
    } finally {
      setIsLoading(false);
    }
  }, [bulkActionIds, inventory, setInventory, addChangeLog, closeModal, dataContext]);

  const applyBulkLocation = useCallback(async (newLocation) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedItems = [];
      
      for (const itemId of bulkActionIds) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
          updatedItems.push({ id: item.id, name: item.name, oldLocation: item.location });
          
          if (dataContext?.updateItem) {
            await dataContext.updateItem(itemId, { location: newLocation });
          }
        }
      }
      
      if (!dataContext?.updateItem) {
        setInventory(prev => prev.map(item => {
          if (bulkActionIds.includes(item.id)) {
            return { ...item, location: newLocation };
          }
          return item;
        }));
      }
      
      addChangeLog({
        type: 'bulk_update',
        itemType: 'item',
        description: `Changed location to "${newLocation}" for ${bulkActionIds.length} items`,
        changes: updatedItems.map(i => ({ 
          field: `${i.id} (${i.name})`, 
          oldValue: i.oldLocation || '-', 
          newValue: newLocation 
        }))
      });
      addAuditLog({
        type: 'bulk_location_change',
        description: `Bulk location change to "${newLocation}" for ${bulkActionIds.length} items`,
      });
      
      closeModal();
      setBulkActionIds([]);
    } catch (err) {
      logError('Failed to apply bulk location:', err);
      setError(err.message || 'Failed to update items');
    } finally {
      setIsLoading(false);
    }
  }, [bulkActionIds, inventory, setInventory, addChangeLog, addAuditLog, closeModal, dataContext]);

  const applyBulkCategory = useCallback(async (newCategory) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedItems = [];
      
      for (const itemId of bulkActionIds) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
          updatedItems.push({ id: item.id, name: item.name, oldCategory: item.category });
          
          if (dataContext?.updateItem) {
            await dataContext.updateItem(itemId, { category: newCategory, specs: {} });
          }
        }
      }
      
      if (!dataContext?.updateItem) {
        setInventory(prev => prev.map(item => {
          if (bulkActionIds.includes(item.id)) {
            return { ...item, category: newCategory, specs: {} };
          }
          return item;
        }));
      }
      
      addChangeLog({
        type: 'bulk_update',
        itemType: 'item',
        description: `Changed category to "${newCategory}" for ${bulkActionIds.length} items`,
        changes: updatedItems.map(i => ({ 
          field: `${i.id} (${i.name})`, 
          oldValue: i.oldCategory, 
          newValue: newCategory 
        }))
      });
      addAuditLog({
        type: 'bulk_category_change',
        description: `Bulk category change to "${newCategory}" for ${bulkActionIds.length} items`,
      });
      
      closeModal();
      setBulkActionIds([]);
    } catch (err) {
      logError('Failed to apply bulk category:', err);
      setError(err.message || 'Failed to update items');
    } finally {
      setIsLoading(false);
    }
  }, [bulkActionIds, inventory, setInventory, addChangeLog, addAuditLog, closeModal, dataContext]);

  const applyBulkDelete = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const deletedItems = inventory.filter(i => bulkActionIds.includes(i.id));
      
      // Delete each item
      for (const itemId of bulkActionIds) {
        if (dataContext?.deleteItem) {
          await dataContext.deleteItem(itemId);
        }
      }
      
      if (!dataContext?.deleteItem) {
        setInventory(prev => prev.filter(item => !bulkActionIds.includes(item.id)));
      }
      
      // Clear selection if current item was deleted
      if (selectedItem && bulkActionIds.includes(selectedItem.id)) {
        setSelectedItem(null);
        setCurrentView(VIEWS.GEAR_LIST);
      }
      
      addChangeLog({
        type: 'bulk_delete',
        itemType: 'item',
        description: `Deleted ${bulkActionIds.length} items`,
        changes: deletedItems.map(i => ({ 
          field: 'deleted', 
          oldValue: `${i.id} - ${i.name}`, 
          newValue: null 
        }))
      });
      addAuditLog({
        type: 'bulk_delete',
        description: `Bulk deleted ${bulkActionIds.length} items`,
      });
      
      closeModal();
      setBulkActionIds([]);
    } catch (err) {
      logError('Failed to apply bulk delete:', err);
      setError(err.message || 'Failed to delete items');
    } finally {
      setIsLoading(false);
    }
  }, [bulkActionIds, inventory, selectedItem, setInventory, setSelectedItem, setCurrentView, addChangeLog, closeModal, dataContext]);

  // ============================================================================
  // Edit Item Helper
  // ============================================================================
  
  const openEditItem = useCallback((item) => {
    setEditingItemId(item.id);
    setItemForm({
      name: item.name || '',
      brand: item.brand || '',
      category: item.category || 'Cameras',
      location: item.location || '',
      purchaseDate: item.purchaseDate || '',
      purchasePrice: item.purchasePrice || '',
      currentValue: item.currentValue || '',
      serialNumber: item.serialNumber || '',
      condition: item.condition || 'Excellent',
      image: item.image || null,
      specs: { ...(item.specs || {}) },
      quantity: item.quantity ?? 1,
      reorderPoint: item.reorderPoint ?? 0,
    });
    openModal(MODALS.EDIT_ITEM);
  }, [setEditingItemId, setItemForm, openModal]);

  return {
    // Loading/Error state
    isLoading,
    error,
    clearError: () => setError(null),
    
    // CRUD Operations (now async, persist to Supabase)
    createItem,
    updateItem,
    deleteItem,
    
    // Bulk Action State
    bulkActionIds,
    setBulkActionIds,
    
    // Bulk Operations (now async, persist to Supabase)
    handleBulkAction,
    applyBulkStatus,
    applyBulkLocation,
    applyBulkCategory,
    applyBulkDelete,
    
    // Helpers
    openEditItem,
    addChangeLog,
  };
}

export default useInventoryActions;
