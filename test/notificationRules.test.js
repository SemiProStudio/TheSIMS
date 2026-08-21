// =============================================================================
// Notification rules — the shared module both edge functions use
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  resolvePreferences,
  templateSkipReason,
  dueReminderDecision,
  reservationReminderDue,
  overdueSummaryDue,
  dueDateRelative,
  formatEmailDate,
  escapeLike,
  ADMIN_TEMPLATES,
} from '../supabase/functions/_shared/notificationRules.ts';
import { resolveBorrowerUserId } from '../lib/emailTemplates.js';

describe('resolvePreferences', () => {
  it('returns the defaults for a missing row — never "everything off"', () => {
    expect(resolvePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(resolvePreferences(undefined).due_date_reminder_days).toEqual([1, 3]);
  });

  it('keeps saved values and fills nulls with defaults', () => {
    const p = resolvePreferences({ email_enabled: false, due_date_reminder_days: null, reservation_reminder_days: 3 });
    expect(p.email_enabled).toBe(false);
    expect(p.due_date_reminder_days).toEqual([1, 3]);
    expect(p.reservation_reminder_days).toBe(3);
    expect(p.admin_low_stock_alerts).toBe(false);
  });
});

describe('templateSkipReason', () => {
  const on = resolvePreferences(null);

  it('sends everything by default', () => {
    for (const key of ['checkout_confirmation', 'due_date_reminder', 'damage_report', 'test_email']) {
      expect(templateSkipReason(on, key)).toBeNull();
    }
  });

  it('the master switch stops every template, including the test email', () => {
    const off = resolvePreferences({ email_enabled: false });
    expect(templateSkipReason(off, 'checkout_confirmation')).toBe('notifications_disabled');
    expect(templateSkipReason(off, 'test_email')).toBe('notifications_disabled');
  });

  it('each per-type toggle gates exactly its template', () => {
    expect(templateSkipReason(resolvePreferences({ checkout_confirmations: false }), 'checkout_confirmation')).toBe(
      'preference_disabled:checkout_confirmations',
    );
    expect(templateSkipReason(resolvePreferences({ checkout_confirmations: false }), 'checkin_confirmation')).toBeNull();
    expect(templateSkipReason(resolvePreferences({ admin_damage_reports: false }), 'damage_report')).toBe(
      'preference_disabled:admin_damage_reports',
    );
    expect(templateSkipReason(resolvePreferences({ maintenance_reminders: false }), 'maintenance_reminder')).toBe(
      'preference_disabled:maintenance_reminders',
    );
  });

  it('admin digests are opt-in by default — low stock and overdue summary are OFF until enabled', () => {
    expect(templateSkipReason(on, 'low_stock_alert')).toBe('preference_disabled:admin_low_stock_alerts');
    expect(templateSkipReason(on, 'overdue_summary')).toBe('preference_disabled:admin_overdue_summary');
    expect(ADMIN_TEMPLATES.has('low_stock_alert')).toBe(true);
  });
});

describe('dueReminderDecision', () => {
  const defaults = resolvePreferences(null);

  it('reminds on the configured days only (defaults 1 and 3)', () => {
    expect(dueReminderDecision(defaults, 3).templateKey).toBe('due_date_reminder');
    expect(dueReminderDecision(defaults, 1).templateKey).toBe('due_date_reminder');
    expect(dueReminderDecision(defaults, 2)).toMatchObject({ templateKey: null, reason: expect.stringContaining('not_reminder_day') });
    expect(dueReminderDecision(defaults, 0).templateKey).toBeNull();
  });

  it('sends overdue notices while overdue, gated by the overdue toggle', () => {
    expect(dueReminderDecision(defaults, -1).templateKey).toBe('overdue_notice');
    expect(dueReminderDecision(resolvePreferences({ overdue_notifications: false }), -1)).toMatchObject({
      templateKey: null,
      reason: 'overdue_disabled',
    });
  });

  it('respects the reminders toggle and the master switch', () => {
    expect(dueReminderDecision(resolvePreferences({ due_date_reminders: false }), 1).reason).toBe('reminders_disabled');
    expect(dueReminderDecision(resolvePreferences({ email_enabled: false }), 1).reason).toBe('notifications_disabled');
  });

  it('honours a custom day list', () => {
    const p = resolvePreferences({ due_date_reminder_days: [7] });
    expect(dueReminderDecision(p, 7).templateKey).toBe('due_date_reminder');
    expect(dueReminderDecision(p, 1).templateKey).toBeNull();
  });
});

describe('reservationReminderDue / overdueSummaryDue', () => {
  it('reservation reminder fires on exactly the chosen day before start', () => {
    expect(reservationReminderDue(resolvePreferences(null), 1)).toBe(true);
    expect(reservationReminderDue(resolvePreferences(null), 2)).toBe(false);
    expect(reservationReminderDue(resolvePreferences({ reservation_reminder_days: 7 }), 7)).toBe(true);
    expect(reservationReminderDue(resolvePreferences({ reservation_reminders: false }), 1)).toBe(false);
  });

  it('overdue summary: daily, or weekly on Mondays (UTC)', () => {
    const monday = new Date('2026-08-24T09:00:00Z');
    const tuesday = new Date('2026-08-25T09:00:00Z');
    const daily = resolvePreferences({ admin_overdue_summary: true });
    const weekly = resolvePreferences({ admin_overdue_summary: true, admin_overdue_summary_frequency: 'weekly' });
    expect(overdueSummaryDue(daily, tuesday)).toBe(true);
    expect(overdueSummaryDue(weekly, monday)).toBe(true);
    expect(overdueSummaryDue(weekly, tuesday)).toBe(false);
    expect(overdueSummaryDue(resolvePreferences(null), monday)).toBe(false);
  });
});

describe('formatting helpers', () => {
  it('dueDateRelative', () => {
    expect(dueDateRelative(0)).toBe('today');
    expect(dueDateRelative(1)).toBe('tomorrow');
    expect(dueDateRelative(3)).toBe('in 3 days');
    expect(dueDateRelative(-1)).toBe('yesterday');
    expect(dueDateRelative(-4)).toBe('4 days ago');
  });

  it('formatEmailDate handles date-only strings without a timezone day slip', () => {
    expect(formatEmailDate('2026-08-25')).toBe('Tuesday, August 25, 2026');
    expect(formatEmailDate('')).toBe('');
    expect(formatEmailDate('not a date')).toBe('not a date');
  });

  it('escapeLike neutralises wildcards', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
});

describe('resolveBorrowerUserId (app side)', () => {
  const users = [
    { id: 'u1', name: 'Pat Hagenow', email: 'pat@studio.com' },
    { id: 'u2', name: 'Sam Lee', email: 'sam@studio.com' },
    { id: 'u3', name: 'Sam Lee', email: 'sam2@studio.com' },
  ];

  it('matches by email first, case-insensitively', () => {
    expect(resolveBorrowerUserId({ borrowerName: 'Someone', borrowerEmail: 'PAT@studio.com', users })).toBe('u1');
  });

  it('matches by a unique name; an ambiguous name resolves to nobody', () => {
    expect(resolveBorrowerUserId({ borrowerName: 'pat hagenow', users })).toBe('u1');
    expect(resolveBorrowerUserId({ borrowerName: 'Sam Lee', users })).toBeNull();
  });

  it('a selected client always wins over any user match', () => {
    expect(resolveBorrowerUserId({ borrowerName: 'Pat Hagenow', borrowerEmail: 'pat@studio.com', clientId: 'CL001', users })).toBeNull();
  });

  it('never falls back to the operator: unknown borrowers resolve to null', () => {
    expect(resolveBorrowerUserId({ borrowerName: 'Walk-in Renter', borrowerEmail: 'x@y.z', users })).toBeNull();
    expect(resolveBorrowerUserId({ borrowerName: '', users: undefined })).toBeNull();
  });
});
