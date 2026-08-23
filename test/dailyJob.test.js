// =============================================================================
// Daily notifications job — the planning half, tested without Deno
// (supabase/functions/_shared/dailyJob.ts). The handler only iterates these
// plans, so this is where "who gets which email on which day" is pinned.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  isAuthorizedCronRequest,
  mapStaff,
  planDueReminders,
  planReservationReminders,
  planMaintenanceReminders,
  maintenanceRecipients,
  digestRecipients,
  classifySendResult,
  countOutcomes,
} from '../supabase/functions/_shared/dailyJob.ts';
import { DEFAULT_PREFERENCES } from '../supabase/functions/_shared/notificationRules.ts';

const COMPANY = 'Semi Pro';

const staffRow = (overrides = {}) => ({
  user_id: 'u1',
  email: 'Staff@Example.com',
  name: 'Staff',
  is_admin: false,
  can_edit_gear: true,
  preferences: null,
  ...overrides,
});

describe('isAuthorizedCronRequest', () => {
  const env = { cronSecret: 's3cret', serviceRoleKey: 'service-key' };

  it('accepts the cron secret header or the service role bearer token', () => {
    expect(
      isAuthorizedCronRequest({ ...env, providedSecret: 's3cret', providedAuthorization: null }),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest({
        ...env,
        providedSecret: null,
        providedAuthorization: 'Bearer service-key',
      }),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest({
        ...env,
        providedSecret: null,
        providedAuthorization: 'service-key',
      }),
    ).toBe(true);
  });

  it('rejects wrong, missing, or anon credentials', () => {
    expect(
      isAuthorizedCronRequest({ ...env, providedSecret: 'nope', providedAuthorization: null }),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest({
        ...env,
        providedSecret: null,
        providedAuthorization: 'Bearer anon-key',
      }),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest({ ...env, providedSecret: null, providedAuthorization: null }),
    ).toBe(false);
  });

  it('never accepts an empty configured secret or key', () => {
    expect(
      isAuthorizedCronRequest({
        cronSecret: '',
        serviceRoleKey: '',
        providedSecret: '',
        providedAuthorization: 'Bearer ',
      }),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest({
        cronSecret: undefined,
        serviceRoleKey: 'k',
        providedSecret: 'undefined',
        providedAuthorization: null,
      }),
    ).toBe(false);
  });
});

describe('mapStaff', () => {
  it('maps the RPC rows and resolves preferences with defaults', () => {
    const [s] = mapStaff([staffRow({ is_admin: 1, preferences: { email_enabled: false } })]);
    expect(s).toMatchObject({
      userId: 'u1',
      email: 'Staff@Example.com',
      name: 'Staff',
      isAdmin: true,
      canEditGear: true,
    });
    expect(s.prefs.email_enabled).toBe(false);
    expect(s.prefs.due_date_reminder_days).toEqual([1, 3]);
    expect(mapStaff(null)).toEqual([]);
  });
});

describe('planDueReminders', () => {
  const item = (overrides = {}) => ({
    item_id: 'CA1001',
    item_name: 'Camera',
    item_brand: 'Sony',
    due_back: '2026-08-25',
    days_until_due: 3,
    recipient_name: 'Jo',
    checked_out_to: 'Jo',
    recipient_email: 'jo@example.com',
    recipient_user_id: null,
    ...overrides,
  });

  it('skips items with no recipient email', () => {
    expect(planDueReminders([item({ recipient_email: null })], new Map(), COMPANY)).toEqual([
      { task: 'due', target: 'CA1001', skip: 'no_recipient_email' },
    ]);
  });

  it('reminds a client on the default days and sends overdue notices daily', () => {
    const plans = planDueReminders(
      [
        item({ days_until_due: 3 }),
        item({ item_id: 'CA2', days_until_due: 2 }),
        item({ item_id: 'CA3', days_until_due: -4 }),
      ],
      new Map(),
      COMPANY,
    );
    expect(plans[0]).toMatchObject({
      task: 'due',
      target: 'CA1001',
      body: {
        to: 'jo@example.com',
        templateKey: 'due_date_reminder',
        userId: null,
        meta: { itemId: 'CA1001' },
      },
    });
    expect(plans[0].body.templateData).toMatchObject({
      borrower_name: 'Jo',
      item_name: 'Camera',
      company_name: COMPANY,
    });
    expect(plans[1]).toEqual({
      task: 'due',
      target: 'CA2',
      skip: 'not_reminder_day (2 not in [1,3])',
    });
    expect(plans[2].body).toMatchObject({ templateKey: 'overdue_notice' });
    expect(plans[2].body.templateData.days_overdue).toBe('4');
  });

  it('uses the borrowing user’s own schedule when they are a SIMS user', () => {
    const prefs = new Map([['u9', { ...DEFAULT_PREFERENCES, due_date_reminder_days: [2] }]]);
    const plans = planDueReminders(
      [
        item({ days_until_due: 2, recipient_user_id: 'u9' }),
        item({ item_id: 'X', days_until_due: 3, recipient_user_id: 'u9' }),
      ],
      prefs,
      COMPANY,
    );
    expect(plans[0].body).toMatchObject({ templateKey: 'due_date_reminder', userId: 'u9' });
    expect(plans[1].skip).toMatch(/not_reminder_day/);
  });

  it('falls back to defaults for a user without a preference row', () => {
    const plans = planDueReminders(
      [item({ days_until_due: 1, recipient_user_id: 'unknown' })],
      new Map(),
      COMPANY,
    );
    expect(plans[0].body.templateKey).toBe('due_date_reminder');
  });

  it('respects a user who turned notifications or overdue notices off', () => {
    const prefs = new Map([
      ['off', { ...DEFAULT_PREFERENCES, email_enabled: false }],
      ['noOverdue', { ...DEFAULT_PREFERENCES, overdue_notifications: false }],
    ]);
    const plans = planDueReminders(
      [
        item({ days_until_due: 1, recipient_user_id: 'off' }),
        item({ item_id: 'B', days_until_due: -1, recipient_user_id: 'noOverdue' }),
      ],
      prefs,
      COMPANY,
    );
    expect(plans.map((p) => p.skip)).toEqual(['notifications_disabled', 'overdue_disabled']);
  });
});

describe('planReservationReminders', () => {
  const group = (overrides = {}) => ({
    reservation_id: 'R1',
    group_key: 'g1',
    project: 'Wedding',
    start_date: '2026-08-30',
    end_date: '2026-08-31',
    days_until_start: 1,
    location: 'Venue',
    contact_name: 'Sam',
    contact_email: 'SAM@example.com',
    item_count: 2,
    first_item_id: 'CA1001',
    first_item_name: 'Camera',
    first_item_brand: 'Sony',
    ...overrides,
  });

  it('reminds the contact on the default day before, matching staff by email case-insensitively', () => {
    const staff = mapStaff([staffRow({ user_id: 'u5', email: 'sam@example.com' })]);
    const byEmail = new Map(staff.map((s) => [s.email.toLowerCase(), s]));
    const [plan] = planReservationReminders([group()], byEmail, COMPANY);
    expect(plan).toMatchObject({
      task: 'reservation',
      target: 'Wedding',
      body: {
        to: 'SAM@example.com',
        templateKey: 'reservation_reminder',
        userId: 'u5',
        meta: { reservationId: 'R1', itemId: 'CA1001' },
      },
    });
    expect(plan.body.templateData.company_name).toBe(COMPANY);
  });

  it('honours the contact’s configured reminder day and skips other days', () => {
    const staff = mapStaff([
      staffRow({
        user_id: 'u5',
        email: 'sam@example.com',
        preferences: { reservation_reminder_days: 3 },
      }),
    ]);
    const byEmail = new Map(staff.map((s) => [s.email.toLowerCase(), s]));
    const plans = planReservationReminders(
      [
        group({ days_until_start: 3 }),
        group({ project: null, group_key: 'g2', days_until_start: 1 }),
      ],
      byEmail,
      COMPANY,
    );
    expect(plans[0].body.templateKey).toBe('reservation_reminder');
    expect(plans[1]).toEqual({ task: 'reservation', target: 'g2', skip: 'not_reminder_day (1)' });
  });

  it('a non-staff contact gets the default schedule with no user id', () => {
    const [plan] = planReservationReminders([group()], new Map(), COMPANY);
    expect(plan.body.userId).toBeNull();
  });
});

describe('planMaintenanceReminders', () => {
  const task = (overrides = {}) => ({
    source: 'reminder',
    record_id: 'rem-1',
    item_id: 'LI1001',
    item_name: 'Light',
    title: 'Replace bulb',
    description: null,
    due_date: '2026-08-22',
    ...overrides,
  });

  it('selects maintainers by permission and preference', () => {
    const staff = mapStaff([
      staffRow({ user_id: 'a' }),
      staffRow({ user_id: 'b', can_edit_gear: false }),
      staffRow({ user_id: 'c', preferences: { maintenance_reminders: false } }),
      staffRow({ user_id: 'd', preferences: { email_enabled: false } }),
    ]);
    expect(maintenanceRecipients(staff).map((s) => s.userId)).toEqual(['a']);
  });

  it('fans each task out to every maintainer, carrying the reminder id only for reminders', () => {
    const maintainers = mapStaff([
      staffRow({ user_id: 'a', email: 'a@x' }),
      staffRow({ user_id: 'b', email: 'b@x' }),
    ]);
    const plans = planMaintenanceReminders(
      [task(), task({ source: 'maintenance', record_id: 'm-1', title: null })],
      maintainers,
      COMPANY,
    );
    expect(plans).toHaveLength(4);
    expect(plans[0]).toMatchObject({
      task: 'maintenance',
      target: 'LI1001:Replace bulb → a@x',
      body: {
        to: 'a@x',
        templateKey: 'maintenance_reminder',
        userId: 'a',
        meta: { itemId: 'LI1001', reminderId: 'rem-1' },
      },
    });
    expect(plans[2].target).toBe('LI1001:maintenance → a@x');
    expect(plans[2].body.meta.reminderId).toBeNull();
  });

  it('records a skip per task when nobody opted in', () => {
    expect(planMaintenanceReminders([task()], [], COMPANY)).toEqual([
      { task: 'maintenance', target: 'LI1001:Replace bulb', skip: 'no_opted_in_staff' },
    ]);
  });
});

describe('digestRecipients', () => {
  const monday = new Date('2026-08-24T09:00:00Z');
  const tuesday = new Date('2026-08-25T09:00:00Z');

  it('low-stock goes to admins who opted in; overdue summary honours daily/weekly', () => {
    const staff = mapStaff([
      staffRow({
        user_id: 'admin-daily',
        is_admin: true,
        preferences: { admin_low_stock_alerts: true, admin_overdue_summary: true },
      }),
      staffRow({
        user_id: 'admin-weekly',
        is_admin: true,
        preferences: { admin_overdue_summary: true, admin_overdue_summary_frequency: 'weekly' },
      }),
      staffRow({
        user_id: 'admin-off',
        is_admin: true,
        preferences: { admin_low_stock_alerts: true, email_enabled: false },
      }),
      staffRow({
        user_id: 'user',
        is_admin: false,
        preferences: { admin_low_stock_alerts: true, admin_overdue_summary: true },
      }),
    ]);
    const onTuesday = digestRecipients(staff, tuesday);
    expect(onTuesday.lowStock.map((s) => s.userId)).toEqual(['admin-daily']);
    expect(onTuesday.overdueSummary.map((s) => s.userId)).toEqual(['admin-daily']);
    const onMonday = digestRecipients(staff, monday);
    expect(onMonday.overdueSummary.map((s) => s.userId)).toEqual(['admin-daily', 'admin-weekly']);
  });
});

describe('classifySendResult / countOutcomes', () => {
  it('maps send-email responses to outcomes', () => {
    expect(classifySendResult('due', 'CA1', { data: { success: true } })).toEqual({
      task: 'due',
      target: 'CA1',
      status: 'sent',
    });
    expect(
      classifySendResult('due', 'CA1', { data: { skipped: true, reason: 'duplicate' } }),
    ).toEqual({
      task: 'due',
      target: 'CA1',
      status: 'skipped',
      reason: 'duplicate',
    });
    expect(
      classifySendResult('due', 'CA1', {
        errorMessage: 'non-2xx',
        errorDetail: 'Recipient must be a registered user or client',
      }),
    ).toMatchObject({ status: 'failed', reason: 'Recipient must be a registered user or client' });
    expect(
      classifySendResult('due', 'CA1', { errorMessage: 'non-2xx', errorDetail: null }),
    ).toMatchObject({
      status: 'failed',
      reason: 'non-2xx',
    });
  });

  it('counts by status', () => {
    expect(
      countOutcomes([
        { task: 'a', target: 'x', status: 'sent' },
        { task: 'a', target: 'y', status: 'sent' },
        { task: 'b', target: 'z', status: 'skipped' },
        { task: 'c', target: 'w', status: 'failed' },
      ]),
    ).toEqual({ sent: 2, skipped: 1, failed: 1 });
  });
});
