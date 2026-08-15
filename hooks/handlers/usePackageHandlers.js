// ============================================================================
// Package Handlers
// Extracted from App.jsx — manages adding items to packages from ItemDetail
// ============================================================================
import { useCallback } from 'react';
import { error as logError } from '../../lib/logger.js';
import { useToast } from '../../contexts/ToastContext.js';

export function usePackageHandlers({ packages, inventory, addChangeLog, dataContext }) {
  const { addToast } = useToast();

  /**
   * Add an item to a package — persists to DB via updatePackage,
   * with optimistic local update via patchPackage.
   */
  const addItemToPackage = useCallback(
    async (packageId, itemId) => {
      const pkg = packages.find((p) => p.id === packageId);
      const item = inventory.find((i) => i.id === itemId);

      if (pkg && item && !pkg.items.includes(itemId)) {
        const newItems = [...pkg.items, itemId];

        // Optimistic local update
        dataContext.patchPackage(packageId, { items: newItems });

        // Persist to DB
        if (dataContext?.updatePackage) {
          try {
            await dataContext.updatePackage(packageId, { items: newItems });
          } catch (err) {
            logError('Failed to persist addItemToPackage:', err);
            // Revert — and TELL the user; the item used to just blink out
            // while a change-log entry recorded an add that never happened
            dataContext.patchPackage(packageId, { items: pkg.items });
            addToast(`Could not add "${item.name}" to ${pkg.name}. Please try again.`, 'error');
            return;
          }
        }

        addChangeLog({
          type: 'updated',
          itemId: packageId,
          itemType: 'package',
          itemName: pkg.name,
          description: `Added "${item.name}" to package "${pkg.name}"`,
          changes: [
            {
              field: 'packageContents',
              oldValue: null,
              newValue: `+ ${item.name} (${item.id})`,
            },
          ],
        });
      }
    },
    [packages, inventory, addChangeLog, dataContext, addToast],
  );

  return { addItemToPackage };
}
