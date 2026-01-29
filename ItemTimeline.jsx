// ============================================================================
// Item Timeline Component
// Displays a unified chronological history of all item events
// ============================================================================

import React, { memo, useState, useMemo } from 'react';
import { 
  Clock, CheckCircle, RefreshCw, Wrench, MessageSquare, Calendar, 
  Bell, AlertTriangle, DollarSign, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from './theme.js';
import { formatDate, formatDateTime, formatMoney } from './utils.js';
import { Badge, Card, CardHeader, Button } from './components/ui.jsx';
import { Select } from './components/Select.jsx';

// Event type configuration
const EVENT_TYPES = {
  checkout: {
    icon: CheckCircle,
    color: colors.checkedOut,
    label: 'Checked Out',
    category: 'checkout'
  },
  checkin: {
    icon: RefreshCw,
    color: colors.available,
    label: 'Returned',
    category: 'checkout'
  },
  maintenance_scheduled: {
    icon: Wrench,
    color: colors.primary,
    label: 'Maintenance Scheduled',
    category: 'maintenance'
  },
  maintenance_started: {
    icon: Wrench,
    color: colors.checkedOut,
    label: 'Maintenance Started',
    category: 'maintenance'
  },
  maintenance_completed: {
    icon: Wrench,
    color: colors.available,
    label: 'Maintenance Completed',
    category: 'maintenance'
  },
  note_added: {
    icon: MessageSquare,
    color: colors.accent1,
    label: 'Note Added',
    category: 'notes'
  },
  reservation_created: {
    icon: Calendar,
    color: colors.primary,
    label: 'Reservation Created',
    category: 'reservations'
  },
  reminder_created: {
    icon: Bell,
    color: colors.accent2,
    label: 'Reminder Set',
    category: 'reminders'
  },
  reminder_completed: {
    icon: Bell,
    color: colors.available,
    label: 'Reminder Completed',
    category: 'reminders'
  },
  condition_changed: {
    icon: AlertTriangle,
    color: colors.danger,
    label: 'Condition Changed',
    category: 'status'
  },
  value_updated: {
    icon: DollarSign,
    color: colors.accent1,
    label: 'Value Updated',
    category: 'value'
  },
};

// Single timeline event component
const TimelineEvent = memo(function TimelineEvent({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_TYPES[event.type] || {
    icon: Clock,
    color: colors.textMuted,
    label: event.type,
    category: 'other'
  };
  const Icon = config.icon;

  return (
    <div style={{ display: 'flex', gap: spacing[3] }}>
      {/* Timeline line and dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: withOpacity(config.color, 20),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            flexShrink: 0,
          }}
        >
          <Icon size={16} />
        </div>
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: colors.borderLight,
              marginTop: spacing[1],
              marginBottom: spacing[1],
            }}
          />
        )}
      </div>

      {/* Event content */}
      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : spacing[4],
        }}
      >
        <div
          onClick={() => event.details && setExpanded(!expanded)}
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: borderRadius.lg,
            padding: spacing[3],
            cursor: event.details ? 'pointer' : 'default',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge text={config.label} color={config.color} size="xs" />
              {event.important && (
                <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>●</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                {formatDateTime(event.date)}
              </span>
              {event.details && (
                <span style={{ color: colors.textMuted }}>
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
            {event.summary}
          </div>

          {/* User */}
          {event.user && (
            <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] }}>
              By: {event.user}
            </div>
          )}

          {/* Expanded details */}
          {expanded && event.details && (
            <div
              style={{
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTop: `1px solid ${colors.borderLight}`,
              }}
            >
              {Object.entries(event.details).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>
                    {typeof value === 'number' && key.toLowerCase().includes('cost') 
                      ? formatMoney(value) 
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Main Timeline component
function ItemTimeline({ item }) {
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  // Build unified timeline from all item data
  const allEvents = useMemo(() => {
    const events = [];

    // Add checkout history events
    if (item.checkoutHistory) {
      item.checkoutHistory.forEach(entry => {
        if (entry.type === 'checkout') {
          events.push({
            id: `checkout-${entry.id}`,
            type: 'checkout',
            date: entry.checkedOutDate,
            summary: `Checked out to ${entry.borrowerName}${entry.project ? ` for ${entry.project}` : ''}`,
            user: entry.borrowerName,
            details: {
              project: entry.project,
              dueDate: entry.dueDate,
              notes: entry.notes,
            },
          });
        } else if (entry.type === 'return') {
          events.push({
            id: `return-${entry.id}`,
            type: 'checkin',
            date: entry.returnDate,
            summary: `Returned by ${entry.returnedBy}${entry.conditionChanged ? ' - condition changed' : ''}`,
            user: entry.returnedBy,
            important: entry.damageReported,
            details: entry.damageReported ? {
              conditionAtReturn: entry.conditionAtReturn,
              damageReported: 'Yes',
              damageDescription: entry.damageDescription,
            } : null,
          });
        }
      });
    }

    // Add maintenance history events
    if (item.maintenanceHistory) {
      (item.maintenanceHistory || []).forEach(record => {
        // Add scheduled event
        if (record.scheduledDate) {
          events.push({
            id: `maint-sched-${record.id}`,
            type: 'maintenance_scheduled',
            date: record.createdAt || record.scheduledDate,
            summary: `${record.type}: ${record.description}`,
            details: {
              vendor: record.vendor,
              estimatedCost: record.cost,
              scheduledFor: record.scheduledDate,
            },
          });
        }

        // Add completed event if completed
        if (record.status === 'completed' && record.completedDate) {
          events.push({
            id: `maint-done-${record.id}`,
            type: 'maintenance_completed',
            date: record.completedDate,
            summary: `${record.type} completed${record.vendor ? ` by ${record.vendor}` : ''}`,
            details: {
              description: record.description,
              cost: record.cost,
              warrantyWork: record.warrantyWork ? 'Yes' : 'No',
              notes: record.notes,
            },
          });
        }
      });
    }

    // Add notes events
    if (item.notes) {
      (item.notes || []).filter(n => !n.deleted).forEach(note => {
        events.push({
          id: `note-${note.id}`,
          type: 'note_added',
          date: note.date,
          summary: note.text.length > 100 ? note.text.substring(0, 100) + '...' : note.text,
          user: note.user,
        });
      });
    }

    // Add reservation events
    if (item.reservations) {
      (item.reservations || []).forEach(res => {
        events.push({
          id: `res-${res.id}`,
          type: 'reservation_created',
          date: res.start, // Use start date as the event date
          summary: `Reserved for ${res.project} (${formatDate(res.start)} - ${formatDate(res.end)})`,
          user: res.user,
          details: {
            project: res.project,
            projectType: res.projectType,
            startDate: res.start,
            endDate: res.end,
            location: res.location,
          },
        });
      });
    }

    // Add reminder events
    if (item.reminders) {
      (item.reminders || []).forEach(rem => {
        events.push({
          id: `rem-${rem.id}`,
          type: rem.completed ? 'reminder_completed' : 'reminder_created',
          date: rem.completed ? rem.completedAt || rem.dueDate : rem.createdAt || rem.dueDate,
          summary: rem.title + (rem.description ? `: ${rem.description}` : ''),
          details: {
            dueDate: rem.dueDate,
            recurrence: rem.recurrence,
            completed: rem.completed ? 'Yes' : 'No',
          },
        });
      });
    }

    // Sort by date descending (newest first)
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    return events;
  }, [item]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter(e => {
      const config = EVENT_TYPES[e.type];
      return config && config.category === filter;
    });
  }, [allEvents, filter]);

  // Limit display unless "show all" is clicked
  const displayedEvents = showAll ? filteredEvents : filteredEvents.slice(0, 5);

  const filterOptions = [
    { value: 'all', label: 'All Events' },
    { value: 'checkout', label: 'Checkouts' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'notes', label: 'Notes' },
    { value: 'reservations', label: 'Reservations' },
    { value: 'reminders', label: 'Reminders' },
  ];

  return (
    <Card padding={false}>
      <CardHeader
        title="Item Timeline"
        icon={Clock}
        action={
          <Select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            options={filterOptions}
            style={{ width: 120 }}
            aria-label="Filter timeline"
          />
        }
      />
      <div style={{ padding: spacing[4] }}>
        {displayedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing[6], color: colors.textMuted }}>
            <Clock size={32} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
              No events recorded yet
            </p>
          </div>
        ) : (
          <>
            {displayedEvents.map((event, idx) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isLast={idx === displayedEvents.length - 1}
              />
            ))}
            
            {filteredEvents.length > 5 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  ...styles.btnSec,
                  width: '100%',
                  marginTop: spacing[3],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                }}
              >
                <ChevronDown size={16} />
                Show Full Timeline ({filteredEvents.length} events)
              </button>
            )}
            
            {showAll && filteredEvents.length > 5 && (
              <button
                onClick={() => setShowAll(false)}
                style={{
                  ...styles.btnSec,
                  width: '100%',
                  marginTop: spacing[3],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                }}
              >
                <ChevronUp size={16} />
                Hide Full Timeline
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default memo(ItemTimeline);
