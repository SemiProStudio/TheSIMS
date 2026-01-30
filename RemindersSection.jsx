// ============================================================================
// Reminders Section Component
// Allows users to set one-time or recurring reminders for items
// ============================================================================

import React, { memo, useState, useCallback } from 'react';
import { Bell, Plus, Trash2, Calendar, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from './theme.js';
import { formatDate, generateId, getTodayISO, getNextDueDate, isReminderDue } from './utils.js';
import { Button } from './components/ui.jsx';
import { Select } from './components/Select.jsx';
import { DatePicker } from './components/DatePicker.jsx';

// Recurrence options
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' }
];

// Individual Reminder Item
const ReminderItem = memo(function ReminderItem({ 
  reminder, 
  onComplete,
  onUncomplete,
  onDelete,
  panelColor
}) {
  const today = getTodayISO();
  const isCompleted = reminder.completed;
  const isDue = !isCompleted && reminder.dueDate <= today;
  const isPast = !isCompleted && reminder.dueDate < today;
  
  // Use CSS variables with withOpacity for dynamic colors
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  
  // Determine background/border colors based on state
  let bgColor, borderColor, iconBgColor;
  if (isCompleted) {
    bgColor = withOpacity(colors.available, 20);
    borderColor = withOpacity(colors.available, 50);
    iconBgColor = withOpacity(colors.available, 25);
  } else if (isDue) {
    bgColor = withOpacity(colors.needsAttention, 20);
    borderColor = withOpacity(colors.needsAttention, 50);
    iconBgColor = withOpacity(colors.needsAttention, 25);
  } else {
    bgColor = withOpacity(effectivePanelColor, 20);
    borderColor = withOpacity(effectivePanelColor, 50);
    iconBgColor = withOpacity(effectivePanelColor, 25);
  }
  
  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: borderRadius.md,
      padding: spacing[3],
      marginBottom: spacing[2],
      opacity: isCompleted ? 0.7 : 1
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[3] }}>
        {/* Status icon */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: borderRadius.md,
          background: iconBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isCompleted ? (
            <CheckCircle size={16} color={colors.available} />
          ) : isDue ? (
            <AlertTriangle size={16} color={colors.needsAttention} />
          ) : (
            <Bell size={16} color={effectivePanelColor} />
          )}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            color: isCompleted ? colors.textMuted : colors.textPrimary,
            marginBottom: spacing[1],
            textDecoration: isCompleted ? 'line-through' : 'none'
          }}>
            {reminder.title}
          </div>
          
          {reminder.description && (
            <div style={{
              fontSize: typography.fontSize.xs,
              color: colors.textSecondary,
              marginBottom: spacing[1]
            }}>
              {reminder.description}
            </div>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            flexWrap: 'wrap'
          }}>
            {isCompleted ? (
              <span style={{
                fontSize: typography.fontSize.xs,
                color: colors.available,
                fontWeight: typography.fontWeight.medium
              }}>
                <CheckCircle size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Completed {reminder.completedDate ? formatDate(reminder.completedDate) : ''}
              </span>
            ) : (
              <span style={{
                fontSize: typography.fontSize.xs,
                color: isDue ? colors.needsAttention : colors.textMuted,
                fontWeight: isDue ? typography.fontWeight.medium : typography.fontWeight.normal
              }}>
                <Calendar size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {isPast ? 'Overdue: ' : isDue ? 'Due: ' : ''}{formatDate(reminder.dueDate)}
              </span>
            )}
            
            {reminder.recurrence !== 'none' && (
              <span style={{
                fontSize: typography.fontSize.xs,
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <RefreshCw size={10} />
                {RECURRENCE_OPTIONS.find(o => o.value === reminder.recurrence)?.label}
              </span>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing[1], flexShrink: 0 }}>
          {isCompleted ? (
            <button
              onClick={() => onUncomplete(reminder.id)}
              title="Mark incomplete"
              style={{
                ...styles.btnSec,
                padding: spacing[1],
                fontSize: typography.fontSize.xs,
              }}
            >
              ↩
            </button>
          ) : (
            <button
              onClick={() => onComplete(reminder.id)}
              title="Mark complete"
              style={{
                ...styles.btn,
                padding: spacing[1],
                fontSize: typography.fontSize.xs,
                background: colors.success
              }}
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onDelete(reminder.id)}
            title="Delete reminder"
            style={{
              ...styles.btnSec,
              padding: spacing[1],
              color: colors.danger
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

// Add Reminder Form
const AddReminderForm = memo(function AddReminderForm({ onAdd, onCancel }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    recurrence: 'none'
  });
  const [touched, setTouched] = useState({});
  
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    if (!form.title.trim() || !form.dueDate) return;
    
    onAdd({
      id: generateId(),
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate,
      recurrence: form.recurrence,
      completed: false,
      createdAt: getTodayISO()
    });
  };
  
  const isValid = form.title.trim() && form.dueDate;
  const showTitleError = touched.title && !form.title.trim();
  const showDateError = touched.dueDate && !form.dueDate;
  
  return (
    <div style={{
      padding: spacing[3],
      background: withOpacity(colors.primary, 10),
      borderRadius: borderRadius.md,
      border: `1px solid ${withOpacity(colors.primary, 30)}`,
      marginBottom: spacing[3]
    }}>
      <div style={{ marginBottom: spacing[3] }}>
        <label style={{ ...styles.label, color: showTitleError ? colors.danger : undefined }}>
          Reminder Title *
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => handleChange('title', e.target.value)}
          onBlur={() => setTouched(prev => ({ ...prev, title: true }))}
          placeholder="e.g., Sensor cleaning due"
          style={{
            ...styles.input,
            borderColor: showTitleError ? colors.danger : undefined
          }}
        />
      </div>
      
      <div style={{ marginBottom: spacing[3] }}>
        <label style={styles.label}>Description (optional)</label>
        <input
          type="text"
          value={form.description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Additional details..."
          style={styles.input}
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
        <div>
          <label style={{ ...styles.label, color: showDateError ? colors.danger : undefined }}>
            Due Date *
          </label>
          <DatePicker
            value={form.dueDate}
            onChange={e => handleChange('dueDate', e.target.value)}
            min={getTodayISO()}
            error={showDateError}
            placeholder="Select due date"
            aria-label="Due date"
          />
        </div>
        
        <div>
          <label style={styles.label}>Recurrence</label>
          <Select
            value={form.recurrence}
            onChange={e => handleChange('recurrence', e.target.value)}
            options={RECURRENCE_OPTIONS}
            aria-label="Recurrence"
          />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!isValid} icon={Plus}>
          Add Reminder
        </Button>
      </div>
    </div>
  );
});

// Main Reminders Section
function RemindersSection({
  reminders = [],
  onAddReminder,
  onCompleteReminder,
  onUncompleteReminder,
  onDeleteReminder,
  panelColor
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  const handleAdd = useCallback((reminder) => {
    onAddReminder(reminder);
    setShowAddForm(false);
  }, [onAddReminder]);
  
  // Sort reminders: incomplete due first, then incomplete not due, then completed
  const sortedReminders = [...reminders]
    .sort((a, b) => {
      // Completed items go to the bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      
      // For incomplete items, due first
      if (!a.completed && !b.completed) {
        const aDue = isReminderDue(a);
        const bDue = isReminderDue(b);
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
      }
      
      // Then by date
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  
  const activeReminders = sortedReminders.filter(r => !r.completed);
  const dueCount = activeReminders.filter(r => isReminderDue(r)).length;
  
  return (
    <>
      <div style={{ padding: spacing[4] }}>
        {/* Add button or form */}
        {!showAddForm ? (
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(true)}
            icon={Plus}
            style={{ width: '100%', justifyContent: 'center', marginBottom: sortedReminders.length > 0 ? spacing[3] : 0 }}
          >
            Add Reminder
          </Button>
        ) : (
          <AddReminderForm
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        
        {/* Reminders list */}
        {sortedReminders.length > 0 ? (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {sortedReminders.map(reminder => (
              <ReminderItem
                key={reminder.id}
                reminder={reminder}
                onComplete={onCompleteReminder}
                onUncomplete={onUncompleteReminder}
                onDelete={onDeleteReminder}
                panelColor={panelColor}
              />
            ))}
          </div>
        ) : !showAddForm && (
          <p style={{
            color: colors.textMuted,
            textAlign: 'center',
            fontSize: typography.fontSize.sm,
            margin: `${spacing[4]}px 0 0`
          }}>
            No reminders set
          </p>
        )}
      </div>
    </>
  );
}

export default memo(RemindersSection);
