// ============================================================================
// Reminder Handlers
// Extracted from App.jsx — manages item reminder CRUD
// ============================================================================
import { useCallback } from 'react';
import { getTodayISO } from '../../utils';

export function useReminderHandlers({
  selectedItem,
  setSelectedItem,
  dataContext,
  currentUser,
  showConfirm,
}) {
  const addReminder = useCallback(
    async (reminder) => {
      if (!selectedItem) return;

      const tempId = reminder.id;
      const updatedReminders = [...(selectedItem.reminders || []), reminder];

      dataContext.patchInventoryItem(selectedItem.id, (item) => ({
        reminders: [...(item.reminders || []), reminder],
      }));
      setSelectedItem((prev) => ({ ...prev, reminders: updatedReminders }));

      const dbResult = await dataContext.addItemReminder(selectedItem.id, {
        ...reminder,
        createdBy: currentUser.name,
      });
      if (dbResult?.id && dbResult.id !== tempId) {
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
    [selectedItem, setSelectedItem, currentUser, dataContext],
  );

  const completeReminder = useCallback(
    (reminderId) => {
      if (!selectedItem) return;

      const reminder = (selectedItem.reminders || []).find((r) => r.id === reminderId);
      if (!reminder) return;

      const updatedReminders = (selectedItem.reminders || []).map((r) =>
        r.id === reminderId ? { ...r, completed: true, completedDate: getTodayISO() } : r,
      );

      dataContext.patchInventoryItem(selectedItem.id, () => ({
        reminders: updatedReminders,
      }));
      setSelectedItem((prev) => ({ ...prev, reminders: updatedReminders }));
      dataContext.updateItemReminder(reminderId, { completed: true, completedDate: getTodayISO() });

      dataContext.addAuditLog({
        type: 'reminder_completed',
        description: `Reminder "${reminder.title}" completed for ${selectedItem.name}`,
        user: currentUser.name,
        itemId: selectedItem.id,
      });
    },
    [selectedItem, setSelectedItem, currentUser, dataContext],
  );

  const uncompleteReminder = useCallback(
    (reminderId) => {
      if (!selectedItem) return;

      const reminder = (selectedItem.reminders || []).find((r) => r.id === reminderId);
      if (!reminder) return;

      const updatedReminders = (selectedItem.reminders || []).map((r) =>
        r.id === reminderId ? { ...r, completed: false, completedDate: null } : r,
      );

      dataContext.patchInventoryItem(selectedItem.id, () => ({
        reminders: updatedReminders,
      }));
      setSelectedItem((prev) => ({ ...prev, reminders: updatedReminders }));
      dataContext.updateItemReminder(reminderId, { completed: false, completedDate: null });
    },
    [selectedItem, setSelectedItem, dataContext],
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
        onConfirm: () => {
          const updatedReminders = (selectedItem.reminders || []).filter(
            (r) => r.id !== reminderId,
          );

          dataContext.patchInventoryItem(selectedItem.id, () => ({
            reminders: updatedReminders,
          }));
          setSelectedItem((prev) => ({ ...prev, reminders: updatedReminders }));
          dataContext.deleteItemReminder(reminderId);
        },
      });
    },
    [selectedItem, dataContext, showConfirm, setSelectedItem],
  );

  return { addReminder, completeReminder, uncompleteReminder, deleteReminder };
}
