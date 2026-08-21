// =============================================================================
// Notification rules — pure, Deno-free, shared by the edge functions and the
// vitest suite (test/notificationRules.test.js imports this file directly).
//
// Everything a user can toggle in Settings → Notifications is decided HERE:
// which template each preference gates, what the defaults are when a user has
// never saved the screen, and the schedule rules for the daily job.
// =============================================================================

export type PreferenceRow = {
  user_id?: string;
  email_enabled?: boolean | null;
  due_date_reminders?: boolean | null;
  due_date_reminder_days?: number[] | null;
  overdue_notifications?: boolean | null;
  reservation_confirmations?: boolean | null;
  reservation_reminders?: boolean | null;
  reservation_reminder_days?: number | null;
  maintenance_reminders?: boolean | null;
  checkout_confirmations?: boolean | null;
  checkin_confirmations?: boolean | null;
  admin_low_stock_alerts?: boolean | null;
  admin_damage_reports?: boolean | null;
  admin_overdue_summary?: boolean | null;
  admin_overdue_summary_frequency?: string | null;
};

export type Preferences = Required<{
  [K in keyof Omit<PreferenceRow, 'user_id'>]: NonNullable<PreferenceRow[K]>;
}>;

/** Mirrors the column defaults in notification_preferences and the Settings UI */
export const DEFAULT_PREFERENCES: Preferences = {
  email_enabled: true,
  due_date_reminders: true,
  due_date_reminder_days: [1, 3],
  overdue_notifications: true,
  reservation_confirmations: true,
  reservation_reminders: true,
  reservation_reminder_days: 1,
  maintenance_reminders: true,
  checkout_confirmations: true,
  checkin_confirmations: true,
  admin_low_stock_alerts: false,
  admin_damage_reports: true,
  admin_overdue_summary: false,
  admin_overdue_summary_frequency: 'daily',
};

/** A missing row, or a null column, falls back to the default — never "off" */
export function resolvePreferences(row: PreferenceRow | null | undefined): Preferences {
  const out: Record<string, unknown> = { ...DEFAULT_PREFERENCES };
  if (row) {
    for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
      const value = row[key];
      if (value !== null && value !== undefined) out[key] = value;
    }
  }
  return out as Preferences;
}

/**
 * Which preference gates each template. `null` = only the master switch
 * applies. Every template_key in the email_templates migration appears here;
 * the contract test asserts that.
 */
export const TEMPLATE_PREFERENCE: Record<string, keyof Preferences | null> = {
  checkout_confirmation: 'checkout_confirmations',
  checkin_confirmation: 'checkin_confirmations',
  reservation_confirmation: 'reservation_confirmations',
  reservation_reminder: 'reservation_reminders',
  due_date_reminder: 'due_date_reminders',
  overdue_notice: 'overdue_notifications',
  maintenance_reminder: 'maintenance_reminders',
  damage_report: 'admin_damage_reports',
  low_stock_alert: 'admin_low_stock_alerts',
  overdue_summary: 'admin_overdue_summary',
  test_email: null,
};

/** Templates only admins should ever receive */
export const ADMIN_TEMPLATES = new Set(['damage_report', 'low_stock_alert', 'overdue_summary']);

/**
 * Should this recipient get this template? Returns a skip reason or null.
 * Unknown template keys are gated by the master switch only.
 */
export function templateSkipReason(prefs: Preferences, templateKey: string): string | null {
  if (!prefs.email_enabled) return 'notifications_disabled';
  const gate = TEMPLATE_PREFERENCE[templateKey];
  if (gate && prefs[gate] === false) return `preference_disabled:${gate}`;
  return null;
}

/** "today" / "tomorrow" / "in 3 days" / "2 days ago" */
export function dueDateRelative(daysUntilDue: number): string {
  if (daysUntilDue === 0) return 'today';
  if (daysUntilDue === 1) return 'tomorrow';
  if (daysUntilDue > 1) return `in ${daysUntilDue} days`;
  const ago = Math.abs(daysUntilDue);
  return ago === 1 ? 'yesterday' : `${ago} days ago`;
}

/** "Monday, August 25, 2026" from a date-only or ISO string; passes junk through */
export function formatEmailDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T12:00:00`) // date-only: noon avoids TZ day slips
        : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Daily-job rule for an item due in `daysUntilDue` days (negative = overdue).
 * Reminders fire only on the user's chosen days; overdue notices fire daily
 * while overdue (the 24h dedup window in send-email keeps it to one a day).
 */
export function dueReminderDecision(
  prefs: Preferences,
  daysUntilDue: number,
): { templateKey: 'due_date_reminder' | 'overdue_notice' | null; reason?: string } {
  if (!prefs.email_enabled) return { templateKey: null, reason: 'notifications_disabled' };
  if (daysUntilDue < 0) {
    return prefs.overdue_notifications
      ? { templateKey: 'overdue_notice' }
      : { templateKey: null, reason: 'overdue_disabled' };
  }
  if (!prefs.due_date_reminders) return { templateKey: null, reason: 'reminders_disabled' };
  if (!prefs.due_date_reminder_days.includes(daysUntilDue)) {
    return {
      templateKey: null,
      reason: `not_reminder_day (${daysUntilDue} not in [${prefs.due_date_reminder_days.join(',')}])`,
    };
  }
  return { templateKey: 'due_date_reminder' };
}

/** Reservation reminder fires on exactly the configured day before start */
export function reservationReminderDue(prefs: Preferences, daysUntilStart: number): boolean {
  return (
    prefs.email_enabled &&
    prefs.reservation_reminders &&
    daysUntilStart === Number(prefs.reservation_reminder_days)
  );
}

/** Overdue summary: daily, or weekly on Mondays (UTC date passed in) */
export function overdueSummaryDue(prefs: Preferences, today: Date): boolean {
  if (!prefs.email_enabled || !prefs.admin_overdue_summary) return false;
  if (prefs.admin_overdue_summary_frequency === 'weekly') return today.getUTCDay() === 1;
  return true;
}

/** YYYY-MM-DD in UTC — the daily job's notion of "today" (runs 09:00 UTC) */
export function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Escape LIKE/ILIKE wildcards so a recipient string can't widen a lookup */
export function escapeLike(value: string): string {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}
