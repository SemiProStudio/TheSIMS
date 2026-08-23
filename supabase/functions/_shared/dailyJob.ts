// =============================================================================
// Daily notifications job — the pure planning half
//
// ../due-date-reminder/index.ts reads the RPCs and sends; everything in
// between — who is authorised to trigger the run, how staff rows map to
// recipients, which reminders go to whom with what template data, and how a
// send-email result is classified — is decided here, with no I/O, so
// test/dailyJob.test.js can run it. The handler iterates the plans and calls
// send-email for each `send` entry.
// =============================================================================

import {
  dueReminderDecision,
  overdueSummaryDue,
  resolvePreferences,
  reservationReminderDue,
  type Preferences,
} from './notificationRules.ts';
import {
  buildDueReminderData,
  buildMaintenanceReminderData,
  buildReservationReminderData,
  type DueItemRow,
  type MaintenanceRow,
  type ReservationGroupRow,
} from './templateData.ts';

// -----------------------------------------------------------------------------
// Authorization: the scheduler's shared secret, or the service role key
// -----------------------------------------------------------------------------
export function isAuthorizedCronRequest({
  cronSecret,
  serviceRoleKey,
  providedSecret,
  providedAuthorization,
}: {
  cronSecret: string | undefined | null;
  serviceRoleKey: string | undefined | null;
  providedSecret: string | null;
  providedAuthorization: string | null;
}): boolean {
  const providedAuth = (providedAuthorization || '').replace(/^Bearer\s+/i, '');
  const secretOk = Boolean(cronSecret) && providedSecret === cronSecret;
  const serviceKeyOk = Boolean(serviceRoleKey) && providedAuth === serviceRoleKey;
  return secretOk || serviceKeyOk;
}

// -----------------------------------------------------------------------------
// Staff recipients (get_notification_recipients rows)
// -----------------------------------------------------------------------------
export interface Staff {
  userId: string;
  email: string;
  name: string;
  isAdmin: boolean;
  canEditGear: boolean;
  prefs: Preferences;
}

export function mapStaff(rows: Array<Record<string, unknown>> | null | undefined): Staff[] {
  return (rows || []).map((r) => ({
    userId: r.user_id as string,
    email: r.email as string,
    name: r.name as string,
    isAdmin: Boolean(r.is_admin),
    canEditGear: Boolean(r.can_edit_gear),
    prefs: resolvePreferences(r.preferences as Record<string, unknown> | null),
  }));
}

// -----------------------------------------------------------------------------
// Plans: one entry per recipient/target — either a skip with its reason, or
// the exact send-email body
// -----------------------------------------------------------------------------
export interface SendBody {
  to: string;
  templateKey: string;
  templateData: Record<string, string>;
  userId?: string | null;
  meta?: Record<string, unknown>;
}

export type Plan =
  | { task: string; target: string; skip: string }
  | { task: string; target: string; body: SendBody };

type DueRpcRow = DueItemRow & {
  recipient_email?: string | null;
  recipient_user_id?: string | null;
};

/** 1. Due-date reminders + overdue notices → borrower (client or user). */
export function planDueReminders(
  dueItems: DueRpcRow[] | null | undefined,
  prefsByUserId: Map<string, Preferences>,
  companyName: string,
): Plan[] {
  const plans: Plan[] = [];
  for (const item of dueItems || []) {
    const target = `${item.item_id}`;
    if (!item.recipient_email) {
      plans.push({ task: 'due', target, skip: 'no_recipient_email' });
      continue;
    }
    // Schedule rule uses the recipient's preferences when they are a user;
    // clients get the defaults (1 and 3 days before, then daily overdue)
    const prefs = item.recipient_user_id
      ? prefsByUserId.get(item.recipient_user_id) || resolvePreferences(null)
      : resolvePreferences(null);
    const decision = dueReminderDecision(prefs, Number(item.days_until_due));
    if (!decision.templateKey) {
      plans.push({ task: 'due', target, skip: decision.reason as string });
      continue;
    }
    plans.push({
      task: 'due',
      target,
      body: {
        to: item.recipient_email,
        templateKey: decision.templateKey,
        templateData: buildDueReminderData(item, companyName),
        userId: item.recipient_user_id || null,
        meta: { itemId: item.item_id },
      },
    });
  }
  return plans;
}

type ReservationRpcRow = ReservationGroupRow & {
  project?: string | null;
  group_key?: string;
  contact_email: string;
  days_until_start: number | string;
  reservation_id?: string;
  first_item_id?: string;
};

/** 2. Reservation reminders → the contact, on their configured day. */
export function planReservationReminders(
  groups: ReservationRpcRow[] | null | undefined,
  staffByEmail: Map<string, Staff>,
  companyName: string,
): Plan[] {
  const plans: Plan[] = [];
  for (const group of groups || []) {
    const target = `${group.project || group.group_key}`;
    const contact = staffByEmail.get(String(group.contact_email).toLowerCase());
    const prefs = contact?.prefs || resolvePreferences(null);
    if (!reservationReminderDue(prefs, Number(group.days_until_start))) {
      plans.push({
        task: 'reservation',
        target,
        skip: `not_reminder_day (${group.days_until_start})`,
      });
      continue;
    }
    plans.push({
      task: 'reservation',
      target,
      body: {
        to: group.contact_email,
        templateKey: 'reservation_reminder',
        templateData: buildReservationReminderData(group, companyName),
        userId: contact?.userId || null,
        meta: { reservationId: group.reservation_id, itemId: group.first_item_id },
      },
    });
  }
  return plans;
}

type MaintenanceRpcRow = MaintenanceRow;

/** Staff who can edit gear and have the maintenance toggle on. */
export function maintenanceRecipients(staff: Staff[]): Staff[] {
  return staff.filter((s) => s.canEditGear && s.prefs.email_enabled && s.prefs.maintenance_reminders);
}

/** 3. Maintenance reminders → every opted-in maintainer, per task. */
export function planMaintenanceReminders(
  tasks: MaintenanceRpcRow[] | null | undefined,
  maintainers: Staff[],
  companyName: string,
): Plan[] {
  const plans: Plan[] = [];
  for (const task of tasks || []) {
    const target = `${task.item_id}:${task.title || task.source}`;
    if (!maintainers.length) {
      plans.push({ task: 'maintenance', target, skip: 'no_opted_in_staff' });
      continue;
    }
    for (const person of maintainers) {
      plans.push({
        task: 'maintenance',
        target: `${target} → ${person.email}`,
        body: {
          to: person.email,
          templateKey: 'maintenance_reminder',
          templateData: buildMaintenanceReminderData(task, companyName),
          userId: person.userId,
          meta: {
            itemId: task.item_id,
            reminderId: task.source === 'reminder' ? task.record_id : null,
          },
        },
      });
    }
  }
  return plans;
}

/** 4/5. Admins who opted into each digest (overdue summary honours weekly). */
export function digestRecipients(staff: Staff[], today: Date) {
  return {
    lowStock: staff.filter((s) => s.isAdmin && s.prefs.email_enabled && s.prefs.admin_low_stock_alerts),
    overdueSummary: staff.filter((s) => s.isAdmin && overdueSummaryDue(s.prefs, today)),
  };
}

// -----------------------------------------------------------------------------
// Outcome classification of one send-email invocation
// -----------------------------------------------------------------------------
export type Outcome = {
  task: string;
  target: string;
  status: 'sent' | 'skipped' | 'failed';
  reason?: string;
};

export function classifySendResult(
  task: string,
  target: string,
  {
    data,
    errorMessage,
    errorDetail,
  }: { data?: { skipped?: boolean; reason?: string } | null; errorMessage?: string | null; errorDetail?: string | null },
): Outcome {
  if (errorMessage != null) {
    return { task, target, status: 'failed', reason: errorDetail || errorMessage };
  }
  if (data?.skipped) return { task, target, status: 'skipped', reason: data.reason };
  return { task, target, status: 'sent' };
}

export function countOutcomes(outcomes: Outcome[]) {
  const counts = { sent: 0, skipped: 0, failed: 0 };
  for (const o of outcomes) counts[o.status] += 1;
  return counts;
}
