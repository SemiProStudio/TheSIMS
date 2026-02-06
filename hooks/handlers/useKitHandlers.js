// ============================================================================
// Kit, Accessories & Image Handlers
// Extracted from App.jsx — manages kit/container items, accessories, and images
// ============================================================================
import { useCallback } from 'react';
import { updateById } from '../utils.js';
import { error as logError } from '../lib/logger.js';

export function useKitHandlers({
  inventory,
  setInventory,
  selectedItem,
  setSelectedItem,
  dataContext,
  currentUser,
  closeModal,
  addAuditLog,
  addChangeLog,
}) {
  // ---- Kit / Container ----

  const setItemAsKit = useCallback((kitType) => {
    if (!selectedItem) return;

    setInventory(prev => updateById(prev, selectedItem.id, {
      isKit: true,
      kitType: kitType,
      childItemIds: [],
    }));

    setSelectedItem(prev => ({
      ...prev,
      isKit: true,
      kitType: kitType,
      childItemIds: [],
    }));

    addAuditLog({
      type: 'item_converted_to_kit',
      description: `${selectedItem.name} converted to ${kitType}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    addChangeLog({
      type: 'updated',
      itemId: selectedItem.id,
      itemType: 'item',
      itemName: selectedItem.name,
      description: `Converted "${selectedItem.name}" to ${kitType}`,
      changes: [{ field: 'kitType', oldValue: null, newValue: kitType }]
    });
  }, [selectedItem, currentUser, addAuditLog, addChangeLog]);

  const addItemsToKit = useCallback((childIds) => {
    if (!selectedItem || !selectedItem.isKit) return;

    const newChildIds = [...(selectedItem.childItemIds || []), ...childIds];
    const addedItems = inventory.filter(i => childIds.includes(i.id));

    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: newChildIds });
      childIds.forEach(childId => {
        updated = updateById(updated, childId, { parentKitId: selectedItem.id });
      });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: newChildIds,
    }));

    addAuditLog({
      type: 'items_added_to_kit',
      description: `${childIds.length} item(s) added to kit ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    addChangeLog({
      type: 'updated',
      itemId: selectedItem.id,
      itemType: 'item',
      itemName: selectedItem.name,
      description: `Added ${childIds.length} item(s) to kit "${selectedItem.name}"`,
      changes: addedItems.map(item => ({ 
        field: 'kitContents', 
        oldValue: null, 
        newValue: `+ ${item.name} (${item.id})` 
      }))
    });
  }, [selectedItem, currentUser, inventory, addAuditLog, addChangeLog]);

  const removeItemFromKit = useCallback((childId) => {
    if (!selectedItem || !selectedItem.isKit) return;

    const removedItem = inventory.find(i => i.id === childId);
    const newChildIds = (selectedItem.childItemIds || []).filter(id => id !== childId);

    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: newChildIds });
      updated = updateById(updated, childId, { parentKitId: null });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: newChildIds,
    }));
    
    if (removedItem) {
      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Removed "${removedItem.name}" from kit "${selectedItem.name}"`,
        changes: [{ 
          field: 'kitContents', 
          oldValue: `${removedItem.name} (${removedItem.id})`, 
          newValue: null 
        }]
      });
    }
  }, [selectedItem, inventory, addChangeLog]);

  const clearKitItems = useCallback(() => {
    if (!selectedItem || !selectedItem.isKit) return;

    const childIds = selectedItem.childItemIds || [];
    const clearedItems = inventory.filter(i => childIds.includes(i.id));

    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: [] });
      childIds.forEach(childId => {
        updated = updateById(updated, childId, { parentKitId: null });
      });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: [],
    }));

    addAuditLog({
      type: 'kit_cleared',
      description: `All items removed from kit ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    if (clearedItems.length > 0) {
      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Cleared all ${clearedItems.length} item(s) from kit "${selectedItem.name}"`,
        changes: clearedItems.map(item => ({ 
          field: 'kitContents', 
          oldValue: `${item.name} (${item.id})`, 
          newValue: null 
        }))
      });
    }
  }, [selectedItem, currentUser, inventory, addAuditLog, addChangeLog]);

  // ---- Required Accessories ----

  const addRequiredAccessories = useCallback((itemId, accessoryIds) => {
    if (!itemId || !accessoryIds || accessoryIds.length === 0) return;
    
    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;
    
    const existingAccessories = targetItem.requiredAccessories || [];
    const newAccessories = [...new Set([...existingAccessories, ...accessoryIds])];
    
    setInventory(prev => updateById(prev, itemId, { requiredAccessories: newAccessories }));
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ ...prev, requiredAccessories: newAccessories }));
    }
    
    const addedItems = accessoryIds.map(id => inventory.find(i => i.id === id)).filter(Boolean);
    addChangeLog({
      type: 'updated',
      itemId: itemId,
      itemType: 'item',
      itemName: targetItem.name,
      description: `Added ${addedItems.length} required accessor${addedItems.length === 1 ? 'y' : 'ies'}`,
      changes: addedItems.map(item => ({ 
        field: 'requiredAccessories', 
        oldValue: null, 
        newValue: `${item.name} (${item.id})` 
      }))
    });
  }, [inventory, selectedItem, addChangeLog]);

  const removeRequiredAccessory = useCallback((itemId, accessoryId) => {
    if (!itemId || !accessoryId) return;
    
    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;
    
    const removedItem = inventory.find(i => i.id === accessoryId);
    const existingAccessories = targetItem.requiredAccessories || [];
    const newAccessories = existingAccessories.filter(id => id !== accessoryId);
    
    setInventory(prev => updateById(prev, itemId, { requiredAccessories: newAccessories }));
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ ...prev, requiredAccessories: newAccessories }));
    }
    
    if (removedItem) {
      addChangeLog({
        type: 'updated',
        itemId: itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Removed required accessory: ${removedItem.name}`,
        changes: [{ 
          field: 'requiredAccessories', 
          oldValue: `${removedItem.name} (${removedItem.id})`, 
          newValue: null 
        }]
      });
    }
  }, [inventory, selectedItem, addChangeLog]);

  // ---- Image ----

  const selectImage = useCallback(async (image) => {
    if (selectedItem) {
      setInventory(prev => updateById(prev, selectedItem.id, { image }));
      setSelectedItem(prev => ({ ...prev, image }));
      
      {
        try {
          await dataContext.updateItem(selectedItem.id, { image });
        } catch (err) {
          logError('Failed to save image:', err);
        }
      }
    }
    closeModal();
  }, [selectedItem, closeModal, dataContext]);

  return {
    // Kit
    setItemAsKit,
    addItemsToKit,
    removeItemFromKit,
    clearKitItems,
    // Accessories
    addRequiredAccessories,
    removeRequiredAccessory,
    // Image
    selectImage,
  };
}
