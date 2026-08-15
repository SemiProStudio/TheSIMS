// ============================================================================
// Item Timeline Component
// Displays a unified chronological history of all item events
// ============================================================================

import { memo, useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle,
  RefreshCw,
  Wrench,
  MessageSquare,
  Calendar,
  Bell,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, formatDateTime, formatMoney, parseLocalDate } from '../utils';
import { MAINTENANCE_STATUS } from '../constants.js';
import { Badge } from './ui.jsx';

// Drop empty detail rows — rendering String(undefined) printed literal
// "undefined" next to every absent field. Returns null when nothing survives
// so the card doesn't offer an expand chevron over an empty block.
const pruneDetails = (details) => {
  const entries = Object.entries(details).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Date-only strings (reservation start, reminder due) must parse as LOCAL
// midnight — new Date('2026-08-16') is UTC midnight, which shifted same-day
// events against real timestamps by the UTC offset (the H15 class).
const eventTime = (d) => {
  if (!d) return 0;
  const t = (DATE_ONLY.test(d) ? parseLocalDate(d) : new Date(d)).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// Date-only events have no meaningful time — showing ", 12:00 AM" implied one
const formatEventDate = (d) => (DATE_ONLY.test(d || '') ? formatDate(d) : formatDateTime(d));

// Event type configuration
const EVENT_TYPES = {
  checkout: {
    icon: CheckCircle,
    color: colors.checkedOut,
    label: 'Checked Out',
    category: 'checkout',
  },
  checkin: {
    icon: RefreshCw,
    color: colors.available,
    label: 'Returned',
    category: 'checkout',
  },
  maintenance_scheduled: {
    icon: Wrench,
    color: colors.primary,
    label: 'Maintenance Scheduled',
    category: 'maintenance',
  },
  maintenance_completed: {
    icon: Wrench,
    color: colors.available,
    label: 'Maintenance Completed',
    category: 'maintenance',
  },
  note_added: {
    icon: MessageSquare,
    color: colors.accent1,
    label: 'Note Added',
    category: 'notes',
  },
  note_reply: {
    icon: MessageSquare,
    color: colors.accent1,
    label: 'Reply Added',
    category: 'notes',
  },
  reservation_created: {
    icon: Calendar,
    color: colors.primary,
    label: 'Reservation Created',
    category: 'reservations',
  },
  reminder_created: {
    icon: Bell,
    color: colors.accent2,
    label: 'Reminder Set',
    category: 'reminders',
  },
  reminder_completed: {
    icon: Bell,
    color: colors.available,
    label: 'Reminder Completed',
    category: 'reminders',
  },
  // maintenance_started / condition_changed / value_updated were defined here
  // for years but no code path ever emitted them — removed 2026-08-15. The
  // unknown-type fallback below covers any stray stored value.
};

// Single timeline event component
const TimelineEvent = memo(function TimelineEvent({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_TYPES[event.type] || {
    icon: Clock,
    color: colors.textMuted,
    label: event.type,
    category: 'other',
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
          role={event.details ? 'button' : undefined}
          tabIndex={event.details ? 0 : undefined}
          aria-expanded={event.details ? expanded : undefined}
          aria-label={event.details ? `Toggle details: ${event.summary}` : undefined}
          onKeyDown={
            event.details
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(!expanded);
                  }
                }
              : undefined
          }
          style={{
            background: colors.bgCard,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: borderRadius.lg,
            padding: spacing[3],
            cursor: event.details ? 'pointer' : 'default',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: spacing[1],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge text={config.label} color={config.color} size="xs" />
              {event.important && (
                <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>●</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                {formatEventDate(event.date)}
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
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textMuted,
                marginTop: spacing[1],
              }}
            >
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
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: spacing[1],
                  }}
                >
                  <span
                    style={{
                      fontSize: typography.fontSize.xs,
                      color: colors.textMuted,
                      textTransform: 'capitalize',
                    }}
                  >
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
  const [showAll, setShowAll] = useState(false);

  // Build unified timeline from all item data
  const allEvents = useMemo(() => {
    const events = [];

    // Add checkout history events. Only fields checkout_history actually has:
    // dueDate/damageReported/conditionChanged never existed on these rows, so
    // the old detail block rendered "Due Date undefined" and the damage arm
    // was dead.
    if (item.checkoutHistory) {
      item.checkoutHistory.forEach((entry) => {
        if (entry.type === 'checkout') {
          events.push({
            id: `checkout-${entry.id}`,
            type: 'checkout',
            date: entry.checkedOutDate,
            summary: `Checked out to ${entry.borrowerName}${entry.project ? ` for ${entry.project}` : ''}`,
            user: entry.borrowerName,
            details: pruneDetails({
              project: entry.project,
              condition: entry.conditionAtAction,
              notes: entry.notes,
            }),
          });
        } else if (entry.type === 'return') {
          events.push({
            id: `return-${entry.id}`,
            type: 'checkin',
            date: entry.returnDate,
            summary: `Returned by ${entry.returnedBy}`,
            user: entry.returnedBy,
            details: pruneDetails({
              condition: entry.conditionAtAction,
              notes: entry.notes,
            }),
          });
        }
      });
    }

    // Add maintenance history events. Cancelled records used to keep their
    // "Maintenance Scheduled" entry with no hint of the cancellation.
    if (item.maintenanceHistory) {
      (item.maintenanceHistory || []).forEach((record) => {
        // Add scheduled event
        if (record.scheduledDate && record.status !== MAINTENANCE_STATUS.CANCELLED) {
          events.push({
            id: `maint-sched-${record.id}`,
            type: 'maintenance_scheduled',
            date: record.createdAt || record.scheduledDate,
            summary: record.description ? `${record.type}: ${record.description}` : record.type,
            details: pruneDetails({
              vendor: record.vendor,
              estimatedCost: record.cost,
              scheduledFor: record.scheduledDate,
            }),
          });
        }

        // Add completed event if completed
        if (record.status === MAINTENANCE_STATUS.COMPLETED && record.completedDate) {
          events.push({
            id: `maint-done-${record.id}`,
            type: 'maintenance_completed',
            date: record.completedDate,
            summary: `${record.type} completed${record.vendor ? ` by ${record.vendor}` : ''}`,
            details: pruneDetails({
              description: record.description,
              cost: record.cost,
              warrantyWork: record.warrantyWork ? 'Yes' : 'No',
              notes: record.notes,
            }),
          });
        }
      });
    }

    // Add notes events. item.notes is threaded (roots with nested replies) —
    // replies never appeared in the timeline until they were flattened here.
    if (item.notes) {
      const truncate = (text) => {
        const t = text || '';
        return t.length > 100 ? t.substring(0, 100) + '...' : t;
      };
      (item.notes || [])
        .filter((n) => !n.deleted)
        .forEach((note) => {
          events.push({
            id: `note-${note.id}`,
            type: 'note_added',
            date: note.date,
            summary: truncate(note.text),
            user: note.user,
          });
          (note.replies || [])
            .filter((r) => !r.deleted)
            .forEach((reply) => {
              events.push({
                id: `note-reply-${reply.id}`,
                type: 'note_reply',
                date: reply.date,
                summary: truncate(reply.text),
                user: reply.user,
              });
            });
        });
    }

    // Add reservation events
    if (item.reservations) {
      (item.reservations || []).forEach((res) => {
        events.push({
          id: `res-${res.id}`,
          type: 'reservation_created',
          date: res.start, // Use start date as the event date
          summary: `Reserved for ${res.project} (${formatDate(res.start)} - ${formatDate(res.end)})`,
          user: res.user,
          details: pruneDetails({
            project: res.project,
            projectType: res.projectType,
            startDate: res.start,
            endDate: res.end,
            location: res.location,
          }),
        });
      });
    }

    // Add reminder events. The field is completedDate (see REMINDER_FIELD_MAP
    // and useReminderHandlers) — reading completedAt dated every completed
    // reminder on its DUE date and sorted it into the wrong position.
    if (item.reminders) {
      (item.reminders || []).forEach((rem) => {
        events.push({
          id: `rem-${rem.id}`,
          type: rem.completed ? 'reminder_completed' : 'reminder_created',
          date: rem.completed ? rem.completedDate || rem.dueDate : rem.createdAt || rem.dueDate,
          summary: rem.title + (rem.description ? `: ${rem.description}` : ''),
          details: pruneDetails({
            dueDate: rem.dueDate,
            recurrence: rem.recurrence,
            completed: rem.completed ? 'Yes' : 'No',
          }),
        });
      });
    }

    // Sort by date descending (newest first) — via eventTime so date-only
    // strings compare in local time like the real timestamps around them
    events.sort((a, b) => eventTime(b.date) - eventTime(a.date));

    return events;
  }, [item]);

  // Limit display unless "show all" is clicked
  const displayedEvents = showAll ? allEvents : allEvents.slice(0, 5);

  return (
    <>
      <div style={{ padding: spacing[4] }}>
        {displayedEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: spacing[6], color: colors.textMuted }}>
            <Clock size={32} style={{ marginBottom: spacing[2], opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>No events recorded yet</p>
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

            {allEvents.length > 5 && !showAll && (
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
                Show Full Timeline ({allEvents.length} events)
              </button>
            )}

            {showAll && allEvents.length > 5 && (
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
    </>
  );
}

export default memo(ItemTimeline);
