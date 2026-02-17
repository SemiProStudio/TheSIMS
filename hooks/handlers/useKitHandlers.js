// ============================================================================
// Kit, Accessories & Image Handlers
// Extracted from App.jsx — manages kit/container items, accessories, and images
// ============================================================================
import { useCallback } from 'react';
import { error as logError } from '../../lib/logger.js';

export function useKitHandlers({
  inventory,
  selectedItem,
  setSelectedItem,
  dataContext,
  currentUser,
  closeModal,
  addAuditLog,
  addChangeLog,
}) {
  // ---- Kit / Container ----

  const setItemAsKit = useCallback(
    (kitType) => {
      if (!selectedItem) return;

      dataContext.patchInventoryItem(selectedItem.id, {
        isKit: true,
        kitType: kitType,
        childItemIds: [],
      });

      setSelectedItem((prev) => ({
        ...prev,
        isKit: true,
        kitType: kitType,
        childItemIds: [],
      }));

      addAuditLog({
        type: 'item_converted_to_kit',
        description: `${selectedItem.name} converted to ${kitType}`,
        user: currentUser?.name || 'Unknown',
        itemId: selectedItem.id,
      });

      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Converted "${selectedItem.name}" to ${kitType}`,
        changes: [{ field: 'kitType', oldValue: null, newValue: kitType }],
      });
    },
    [selectedItem, setSelectedItem, currentUser, addAuditLog, addChangeLog, dataContext],
  );

  const addItemsToKit = useCallback(
    (childIds) => {
      if (!selectedItem || !selectedItem.isKit) return;

      const newChildIds = [...(selectedItem.childItemIds || []), ...childIds];
      const addedItems = inventory.filter((i) => childIds.includes(i.id));

      dataContext.mapInventory((item) => {
        if (item.id === selectedItem.id) return { ...item, childItemIds: newChildIds };
        if (childIds.includes(item.id)) return { ...item, parentKitId: selectedItem.id };
        return item;
      });

      setSelectedItem((prev) => ({
        ...prev,
        childItemIds: newChildIds,
      }));

      addAuditLog({
        type: 'items_added_to_kit',
        description: `${childIds.length} item(s) added to kit ${selectedItem.name}`,
        user: currentUser?.name || 'Unknown',
        itemId: selectedItem.id,
      });

      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Added ${childIds.length} item(s) to kit "${selectedItem.name}"`,
        changes: addedItems.map((item) => ({
          field: 'kitContents',
          oldValue: null,
          newValue: `+ ${item.name} (${item.id})`,
        })),
      });
    },
    [selectedItem, setSelectedItem, currentUser, inventory, addAuditLog, addChangeLog, dataContext],
  );

  const removeItemFromKit = useCallback(
    (childId) => {
      if (!selectedItem || !selectedItem.isKit) return;

      const removedItem = inventory.find((i) => i.id === childId);
      const newChildIds = (selectedItem.childItemIds || []).filter((id) => id !== childId);

      dataContext.mapInventory((item) => {
        if (item.id === selectedItem.id) return { ...item, childItemIds: newChildIds };
        if (item.id === childId) return { ...item, parentKitId: null };
        return item;
      });

      setSelectedItem((prev) => ({
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
          changes: [
            {
              field: 'kitContents',
              oldValue: `${removedItem.name} (${removedItem.id})`,
              newValue: null,
            },
          ],
        });
      }
    },
    [selectedItem, setSelectedItem, inventory, addChangeLog, dataContext],
  );

  const clearKitItems = useCallback(() => {
    if (!selectedItem || !selectedItem.isKit) return;

    const childIds = selectedItem.childItemIds || [];
    const clearedItems = inventory.filter((i) => childIds.includes(i.id));
    const childIdSet = new Set(childIds);

    dataContext.mapInventory((item) => {
      if (item.id === selectedItem.id) return { ...item, childItemIds: [] };
      if (childIdSet.has(item.id)) return { ...item, parentKitId: null };
      return item;
    });

    setSelectedItem((prev) => ({
      ...prev,
      childItemIds: [],
    }));

    addAuditLog({
      type: 'kit_cleared',
      description: `All items removed from kit ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id,
    });

    if (clearedItems.length > 0) {
      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Cleared all ${clearedItems.length} item(s) from kit "${selectedItem.name}"`,
        changes: clearedItems.map((item) => ({
          field: 'kitContents',
          oldValue: `${item.name} (${item.id})`,
          newValue: null,
        })),
      });
    }
  }, [
    selectedItem,
    setSelectedItem,
    currentUser,
    inventory,
    addAuditLog,
    addChangeLog,
    dataContext,
  ]);

  // ---- Required Accessories ----

  const addRequiredAccessories = useCallback(
    (itemId, accessoryIds) => {
      if (!itemId || !accessoryIds || accessoryIds.length === 0) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      const existingAccessories = targetItem.requiredAccessories || [];
      const newAccessories = [...new Set([...existingAccessories, ...accessoryIds])];

      dataContext.patchInventoryItem(itemId, { requiredAccessories: newAccessories });

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, requiredAccessories: newAccessories }));
      }

      const addedItems = accessoryIds
        .map((id) => inventory.find((i) => i.id === id))
        .filter(Boolean);
      addChangeLog({
        type: 'updated',
        itemId: itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Added ${addedItems.length} required accessor${addedItems.length === 1 ? 'y' : 'ies'}`,
        changes: addedItems.map((item) => ({
          field: 'requiredAccessories',
          oldValue: null,
          newValue: `${item.name} (${item.id})`,
        })),
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext],
  );

  const removeRequiredAccessory = useCallback(
    (itemId, accessoryId) => {
      if (!itemId || !accessoryId) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      const removedItem = inventory.find((i) => i.id === accessoryId);
      const existingAccessories = targetItem.requiredAccessories || [];
      const newAccessories = existingAccessories.filter((id) => id !== accessoryId);

      dataContext.patchInventoryItem(itemId, { requiredAccessories: newAccessories });

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, requiredAccessories: newAccessories }));
      }

      if (removedItem) {
        addChangeLog({
          type: 'updated',
          itemId: itemId,
          itemType: 'item',
          itemName: targetItem.name,
          description: `Removed required accessory: ${removedItem.name}`,
          changes: [
            {
              field: 'requiredAccessories',
              oldValue: `${removedItem.name} (${removedItem.id})`,
              newValue: null,
            },
          ],
        });
      }
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext],
  );

  // ---- Image ----

  const selectImage = useCallback(
    async (image) => {
      if (selectedItem) {
        // Clean up old image from storage if replacing or removing
        const oldImage = selectedItem.image;
        if (oldImage && oldImage !== image) {
          try {
            const { storageService, isStorageUrl, getStoragePathFromUrl } =
              await import('../../lib/index.js');
            if (isStorageUrl(oldImage)) {
              const oldPath = getStoragePathFromUrl(oldImage);
              if (oldPath) await storageService.deleteImage(oldPath).catch(() => {});
            }
          } catch (_e) {
            /* non-fatal */
          }
        }

        dataContext.patchInventoryItem(selectedItem.id, { image });
        setSelectedItem((prev) => ({ ...prev, image }));

        try {
          await dataContext.updateItem(selectedItem.id, { image });
        } catch (err) {
          logError('Failed to save image:', err);
        }
      }
      closeModal();
    },
    [selectedItem, setSelectedItem, closeModal, dataContext],
  );

  return {
    setItemAsKit,
    addItemsToKit,
    removeItemFromKit,
    clearKitItems,
    addRequiredAccessories,
    removeRequiredAccessory,
    selectImage,
  };
}
