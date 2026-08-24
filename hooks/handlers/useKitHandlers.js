// ============================================================================
// Kit, Accessories & Image Handlers
// Extracted from App.jsx — manages kit contents, required accessories and
// item images. (The original kit chain was deleted 2026-08-14 because it only
// patched React state against columns that never existed; these handlers are
// the rebuild on the real is_kit/kit_contents columns, persist-first.)
// ============================================================================
import { useCallback } from 'react';
import { error as logError } from '../../lib/logger.js';
import { useToast } from '../../contexts/ToastContext.js';

export function useKitHandlers({
  inventory,
  selectedItem,
  setSelectedItem,
  dataContext,
  closeModal,
  addChangeLog,
}) {
  const { addToast } = useToast();

  // ---- Kit contents ----
  // A kit is a container item: is_kit flags it, kit_contents holds member
  // item ids. Same persist-first contract as everything else: updateItem
  // writes the DB and patches inventory state; only then mirror selectedItem
  // and write the change log.

  const setKitStatus = useCallback(
    async (itemId, isKit) => {
      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem || Boolean(targetItem.isKit) === Boolean(isKit)) return;

      try {
        // Contents are kept when demoting — toggling back restores the kit
        await dataContext.updateItem(itemId, { isKit });
      } catch (err) {
        logError('Failed to update kit status:', err);
        addToast('Could not update the kit status. Please try again.', 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, isKit }));
      }

      addChangeLog({
        type: 'updated',
        itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: isKit ? 'Marked as a kit' : 'No longer a kit',
        changes: [{ field: 'isKit', oldValue: String(!isKit), newValue: String(isKit) }],
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  const addKitItems = useCallback(
    async (itemId, memberIds) => {
      if (!itemId || !memberIds || memberIds.length === 0) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      // Defensive guards the UI also enforces: no self-containment, no
      // nesting kits inside kits, no duplicates
      const existing = targetItem.kitItems || [];
      const additions = memberIds.filter((id) => {
        if (id === itemId) return false;
        const member = inventory.find((i) => i.id === id);
        return member && !member.isKit;
      });
      const newKitItems = [...new Set([...existing, ...additions])];
      if (newKitItems.length === existing.length) return;

      try {
        await dataContext.updateItem(itemId, { kitItems: newKitItems });
      } catch (err) {
        logError('Failed to save kit contents:', err);
        addToast('Could not save the kit contents. Please try again.', 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, kitItems: newKitItems }));
      }

      const addedItems = additions.map((id) => inventory.find((i) => i.id === id)).filter(Boolean);
      addChangeLog({
        type: 'updated',
        itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Added ${addedItems.length} item${addedItems.length === 1 ? '' : 's'} to kit`,
        changes: addedItems.map((member) => ({
          field: 'kitItems',
          oldValue: null,
          newValue: `${member.name} (${member.id})`,
        })),
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  const removeKitItem = useCallback(
    async (itemId, memberId) => {
      if (!itemId || !memberId) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      const existing = targetItem.kitItems || [];
      const newKitItems = existing.filter((id) => id !== memberId);
      if (newKitItems.length === existing.length) return;

      try {
        await dataContext.updateItem(itemId, { kitItems: newKitItems });
      } catch (err) {
        logError('Failed to remove kit item:', err);
        addToast('Could not remove the item from the kit. Please try again.', 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, kitItems: newKitItems }));
      }

      const removedItem = inventory.find((i) => i.id === memberId);
      addChangeLog({
        type: 'updated',
        itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Removed from kit: ${removedItem ? removedItem.name : memberId}`,
        changes: [
          {
            field: 'kitItems',
            oldValue: removedItem ? `${removedItem.name} (${removedItem.id})` : memberId,
            newValue: null,
          },
        ],
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  // ---- Required Accessories ----
  // Persist-first through the real update path. The old handlers only patched
  // local state (there was no DB column), so every accessory list vanished on
  // reload while the change log claimed success.

  const addRequiredAccessories = useCallback(
    async (itemId, accessoryIds) => {
      if (!itemId || !accessoryIds || accessoryIds.length === 0) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      const existingAccessories = targetItem.requiredAccessories || [];
      const newAccessories = [...new Set([...existingAccessories, ...accessoryIds])];

      try {
        // updateItem persists, then patches inventory state itself
        await dataContext.updateItem(itemId, { requiredAccessories: newAccessories });
      } catch (err) {
        logError('Failed to save required accessories:', err);
        addToast('Could not save required accessories. Please try again.', 'error');
        return;
      }

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
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  const removeRequiredAccessory = useCallback(
    async (itemId, accessoryId) => {
      if (!itemId || !accessoryId) return;

      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem) return;

      const removedItem = inventory.find((i) => i.id === accessoryId);
      const existingAccessories = targetItem.requiredAccessories || [];
      const newAccessories = existingAccessories.filter((id) => id !== accessoryId);

      try {
        await dataContext.updateItem(itemId, { requiredAccessories: newAccessories });
      } catch (err) {
        logError('Failed to remove required accessory:', err);
        addToast('Could not remove the accessory. Please try again.', 'error');
        return;
      }

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
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  // ---- Current value ----
  // The depreciation calculator's "Update Current Value" wrote only local
  // state until 2026-08-15 — the value looked applied and reverted on reload.

  const updateItemValue = useCallback(
    async (itemId, newValue) => {
      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem || !Number.isFinite(newValue)) return;
      if (targetItem.currentValue === newValue) return;

      try {
        await dataContext.updateItem(itemId, { currentValue: newValue });
      } catch (err) {
        logError('Failed to update item value:', err);
        addToast('Could not update the current value. Please try again.', 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, currentValue: newValue }));
      }

      addChangeLog({
        type: 'updated',
        itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Current value updated to $${newValue}`,
        changes: [{ field: 'currentValue', oldValue: targetItem.currentValue ?? null, newValue }],
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  // ---- Low-stock reminder (per-item opt-in, toggled from Item Details) ----

  const setLowStockAlert = useCallback(
    async (itemId, enabled) => {
      const targetItem = inventory.find((i) => i.id === itemId);
      if (!targetItem || Boolean(targetItem.lowStockAlert) === Boolean(enabled)) return;

      try {
        await dataContext.updateItem(itemId, { lowStockAlert: Boolean(enabled) });
      } catch (err) {
        logError('Failed to update low-stock reminder:', err);
        addToast('Could not update the low-stock reminder. Please try again.', 'error');
        return;
      }

      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => ({ ...prev, lowStockAlert: Boolean(enabled) }));
      }

      addChangeLog({
        type: 'updated',
        itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Low stock reminder turned ${enabled ? 'on' : 'off'}`,
        changes: [
          {
            field: 'lowStockAlert',
            oldValue: Boolean(targetItem.lowStockAlert),
            newValue: Boolean(enabled),
          },
        ],
      });
    },
    [inventory, selectedItem, setSelectedItem, addChangeLog, dataContext, addToast],
  );

  // ---- Image ----

  const selectImage = useCallback(
    async (image) => {
      if (selectedItem) {
        const oldImage = selectedItem.image;

        // Persist FIRST. Deleting the old storage object before the DB row
        // stopped referencing it meant a failed write left every other client
        // (and the next reload) pointing at a destroyed image.
        try {
          await dataContext.updateItem(selectedItem.id, { image });
        } catch (err) {
          logError('Failed to save image:', err);
          addToast('Could not save the image change. Please try again.', 'error');
          return; // keep the modal open — nothing was changed
        }

        setSelectedItem((prev) => ({ ...prev, image }));

        // The row no longer references the old object — safe to clean up.
        // Failure here only orphans a storage object, never breaks a reference.
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
      }
      closeModal();
    },
    [selectedItem, setSelectedItem, closeModal, dataContext, addToast],
  );

  return {
    setKitStatus,
    addKitItems,
    removeKitItem,
    addRequiredAccessories,
    removeRequiredAccessory,
    updateItemValue,
    setLowStockAlert,
    selectImage,
  };
}
