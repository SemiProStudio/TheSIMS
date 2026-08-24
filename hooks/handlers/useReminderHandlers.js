// ============================================================================
// Reminder Handlers
// Extracted from App.jsx — manages item reminder CRUD.
// Optimistic-with-rollback: every operation awaits its persist; failures
// restore the previous reminders and toast. (The old handlers fired
// complete/uncomplete/delete without awaiting and swallowed every failure —
// a "completed" reminder came back due on reload, a deleted one resurrected,
// and the audit entry was written whether or not the write happened.)
// ============================================================================
import { useCallback } from 'react';
import { getTodayISO } from '../../utils';
import { useToast } from '../../contexts/ToastContext.js';

export function useReminderHandlers({
  selectedItem,
  setSelectedItem,
  dataContext,
  currentUser,
  showConfirm,
}) {
  const { addToast } = useToast();

  // Apply a reminders array to both state copies
  const applyReminders = useCallback(
    (itemId, reminders) => {
      dataContext.patchInventoryItem(itemId, () => ({ reminders }));
      setSelectedItem((prev) => (prev?.id === itemId ? { ...prev, reminders } : prev));
    },
    [dataContext, setSelectedItem],
  );

  const addReminder = useCallback(
    async (reminder) => {
      if (!selectedItem) return;

      const tempId = reminder.id;
      const previousReminders = selectedItem.reminders || [];
      applyReminders(selectedItem.id, [...previousReminders, reminder]);

      const dbResult = await dataContext.addItemReminder(selectedItem.id, {
        ...reminder,
        createdBy: currentUser.name,
      });
      if (!dbResult) {
        applyReminders(selectedItem.id, previousReminders);
        addToast('Could not save the reminder. Please try again.', 'error');
        return;
      }
      if (dbResult.id && dbResult.id !== tempId) {
        const swapId = (reminders) =>
          (reminders || []).map((r) => (r.id === tempId ? { ...r, id: dbResult.id } : r));
        dataContext.patchInventoryItem(selectedItem.id, (item) => ({
          reminders: swapId(item.reminders),
        }));
        setSelectedItem((prev) => ({ ...prev, reminders: swapId(prev.reminders) }));
      }

      dataContext.addAuditLog({
        type: 'reminder_added',
        description: `Reminder "${reminder.title}" added to ${selectedItem.name}`,
        user: currentUser.name,
        itemId: selectedItem.id,
      });
    },
    [selectedItem, setSelectedItem, currentUser, dataContext, applyReminders, addToast],
  );

  // Shared by complete/uncomplete: patch, await, roll back on failure
  const setCompletion = useCallback(
    async (reminderId, completed) => {
      if (!selectedItem) return;

      const previousReminders = selectedItem.reminders || [];
      const reminder = previousReminders.find((r) => r.id === reminderId);
      if (!reminder) return;

      const completedDate = completed ? getTodayISO() : null;
      applyReminders(
        selectedItem.id,
        previousReminders.map((r) =>
          r.id === reminderId ? { ...r, completed, completedDate } : r,
        ),
      );

      const ok = await dataContext.updateItemReminder(reminderId, { completed, completedDate });
      if (ok === null || ok === false) {
        applyReminders(selectedItem.id, previousReminders);
        addToast('Could not update the reminder. Please try again.', 'error');
        return false;
      }
      return true;
    },
    [selectedItem, dataContext, applyReminders, addToast],
  );

  const completeReminder = useCallback(
    async (reminderId) => {
      if (!selectedItem) return;
      const reminder = (selectedItem.reminders || []).find((r) => r.id === reminderId);
      if (!reminder) return;

      const ok = await setCompletion(reminderId, true);
      if (!ok) return;

      dataContext.addAuditLog({
        type: 'reminder_completed',
        description: `Reminder "${reminder.title}" completed for ${selectedItem.name}`,
        user: currentUser.name,
        itemId: selectedItem.id,
      });
    },
    [selectedItem, currentUser, dataContext, setCompletion],
  );

  const uncompleteReminder = useCallback(
    (reminderId) => setCompletion(reminderId, false),
    [setCompletion],
  );

  const deleteReminder = useCallback(
    (reminderId) => {
      if (!selectedItem) return;

      const reminder = (selectedItem.reminders || []).find((r) => r.id === reminderId);

      showConfirm({
        title: 'Delete Reminder',
        message: `Are you sure you want to delete "${reminder?.title || 'this reminder'}"?`,
        confirmText: 'Delete',
        variant: 'danger',
        onConfirm: async () => {
          const previousReminders = selectedItem.reminders || [];
          applyReminders(
            selectedItem.id,
            previousReminders.filter((r) => r.id !== reminderId),
          );
          const ok = await dataContext.deleteItemReminder(reminderId);
          if (ok === null || ok === false) {
            applyReminders(selectedItem.id, previousReminders);
            addToast('Could not delete the reminder. Please try again.', 'error');
          }
        },
      });
    },
    [selectedItem, dataContext, showConfirm, applyReminders, addToast],
  );

  return { addReminder, completeReminder, uncompleteReminder, deleteReminder };
}
