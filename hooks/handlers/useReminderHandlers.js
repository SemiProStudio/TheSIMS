// ============================================================================
// Reminder Handlers
// Extracted from App.jsx — manages item reminder CRUD
// ============================================================================
import { useCallback } from 'react';
import { getTodayISO, updateById } from '../../utils.js';

export function useReminderHandlers({
  selectedItem,
  setSelectedItem,
  setInventory,
  setAuditLog,
  dataContext,
  currentUser,
  showConfirm,
}) {
  const addReminder = useCallback(async (reminder) => {
    if (!selectedItem) return;
    
    const tempId = reminder.id;
    const updatedReminders = [...(selectedItem.reminders || []), reminder];
    
    setInventory(prev => updateById(prev, selectedItem.id, item => ({
      reminders: [...(item.reminders || []), reminder]
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    const dbResult = await dataContext.addItemReminder(selectedItem.id, {
      ...reminder,
      createdBy: currentUser.name
    });
    if (dbResult?.id && dbResult.id !== tempId) {
      const swapId = (reminders) => (reminders || []).map(r => 
        r.id === tempId ? { ...r, id: dbResult.id } : r
      );
      setInventory(prev => updateById(prev, selectedItem.id, item => ({
        reminders: swapId(item.reminders)
      })));
      setSelectedItem(prev => ({ ...prev, reminders: swapId(prev.reminders) }));
    }
    
    setAuditLog(prev => [...prev, {
      type: 'reminder_added',
      timestamp: new Date().toISOString(),
      description: `Reminder "${reminder.title}" added to ${selectedItem.name}`,
      user: currentUser.name,
      itemId: selectedItem.id
    }]);
  }, [selectedItem, currentUser, dataContext]);

  const completeReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    if (!reminder) return;
    
    const updatedReminders = (selectedItem.reminders || []).map(r =>
      r.id === reminderId ? { ...r, completed: true, completedDate: getTodayISO() } : r
    );
    
    setInventory(prev => updateById(prev, selectedItem.id, () => ({
      reminders: updatedReminders
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    {
      dataContext.updateItemReminder(reminderId, { completed: true, completedDate: getTodayISO() });
    }
    
    setAuditLog(prev => [...prev, {
      type: 'reminder_completed',
      timestamp: new Date().toISOString(),
      description: `Reminder "${reminder.title}" completed for ${selectedItem.name}`,
      user: currentUser.name,
      itemId: selectedItem.id
    }]);
  }, [selectedItem, currentUser, dataContext]);

  const uncompleteReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    if (!reminder) return;
    
    const updatedReminders = (selectedItem.reminders || []).map(r =>
      r.id === reminderId ? { ...r, completed: false, completedDate: null } : r
    );
    
    setInventory(prev => updateById(prev, selectedItem.id, () => ({
      reminders: updatedReminders
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    {
      dataContext.updateItemReminder(reminderId, { completed: false, completedDate: null });
    }
  }, [selectedItem, dataContext]);

  const deleteReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    
    showConfirm({
      title: 'Delete Reminder',
      message: `Are you sure you want to delete "${reminder?.title || 'this reminder'}"?`,
      confirmText: 'Delete',
      variant: 'danger',
      onConfirm: () => {
        const updatedReminders = (selectedItem.reminders || []).filter(r => r.id !== reminderId);
        
        setInventory(prev => updateById(prev, selectedItem.id, () => ({
          reminders: updatedReminders
        })));
        setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
        
        {
          dataContext.deleteItemReminder(reminderId);
        }
      }
    });
  }, [selectedItem, dataContext, showConfirm, setInventory, setSelectedItem]);

  return {
    addReminder,
    completeReminder,
    uncompleteReminder,
    deleteReminder,
  };
}
