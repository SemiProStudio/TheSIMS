// ============================================================================
// Accessories & Image Handlers
// Extracted from App.jsx — manages required accessories and item images.
// (The kit/container handlers that used to live here were deleted: they only
// ever patched React state — no DB column has ever existed for childItemIds/
// parentKitId — and the KitSection UI that called them was unmounted, so the
// whole chain was a dead feature masquerading as saved.)
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
            const { storageService, isStorageUrl, getStoragePathFromUrl } = await import(
              '../../lib/index.js'
            );
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
    addRequiredAccessories,
    removeRequiredAccessory,
    selectImage,
  };
}
