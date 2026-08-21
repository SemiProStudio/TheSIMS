// =============================================================================
// Daily Notifications Job (slug kept as `due-date-reminder` — the prod cron
// job posts to this URL every day at 09:00 UTC with the x-cron-secret header)
//
// One run covers every scheduled email the Settings screen offers:
//   1. due-date reminders + overdue notices   → borrower (client or user)
//   2. reservation reminders                   → reservation contact
//   3. maintenance reminders                   → staff who can edit gear
//   4. low-stock alert (admin digest)          → admins who opted in
//   5. overdue summary (admin digest)          → admins who opted in
//   0. housekeeping: stale `pending` log rows → failed
//
// Recipient preferences are applied in send-email (master switch + per-type
// toggle, defaults when no row); this job applies the SCHEDULE rules (which
// day to remind, weekly vs daily) from the same shared module.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/utils.ts';
import {
  dueReminderDecision,
  overdueSummaryDue,
  resolvePreferences,
  reservationReminderDue,
  utcDateKey,
} from '../_shared/notificationRules.ts';
import {
  buildDueReminderData,
  buildLowStockData,
  buildMaintenanceReminderData,
  buildOverdueSummaryData,
  buildReservationReminderData,
} from '../_shared/templateData.ts';

type Outcome = { task: string; target: string; status: 'sent' | 'skipped' | 'failed'; reason?: string };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------------------------
    // Authorization: verify_jwt = false so the scheduler can call this; the
    // function itself requires the CRON_SECRET header or the service role key.
    // -------------------------------------------------------------------------
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const providedSecret = req.headers.get('x-cron-secret');
    const providedAuth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const secretOk = Boolean(cronSecret) && providedSecret === cronSecret;
    const serviceKeyOk = Boolean(serviceRoleKey) && providedAuth === serviceRoleKey;
    if (!secretOk && !serviceKeyOk) {
      console.warn('Rejected unauthorized daily-notifications invocation');
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);
    const companyName = Deno.env.get('COMPANY_NAME') || 'SIMS';
    const today = new Date();
    const todayKey = utcDateKey(today);
    const outcomes: Outcome[] = [];
    const counts = { sent: 0, skipped: 0, failed: 0 };

    const record = (o: Outcome) => {
      outcomes.push(o);
      counts[o.status]++;
    };

    // Send through send-email so preferences, dedup and logging stay in one place
    const send = async (
      task: string,
      target: string,
      body: { to: string; templateKey: string; templateData: Record<string, string>; userId?: string | null; meta?: Record<string, unknown> },
    ) => {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', { body });
        if (error) {
          let detail = error.message;
          try {
            const parsed = await error.context?.json?.();
            if (parsed?.error) detail = parsed.error;
          } catch { /* keep message */ }
          record({ task, target, status: 'failed', reason: detail });
        } else if (data?.skipped) {
          record({ task, target, status: 'skipped', reason: data.reason });
        } else {
          record({ task, target, status: 'sent' });
        }
      } catch (err) {
        record({ task, target, status: 'failed', reason: (err as Error).message });
      }
    };

    // -------------------------------------------------------------------------
    // 0. Housekeeping — a crash between the pending insert and the Resend
    //    response leaves rows pending forever; mark anything older than 10 min
    // -------------------------------------------------------------------------
    await supabase
      .from('notification_log')
      .update({ status: 'failed', error_message: 'No response recorded within 10 minutes' })
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    // Staff recipients with their preference rows, once
    const { data: recipientRows, error: recipientsError } = await supabase.rpc(
      'get_notification_recipients',
    );
    if (recipientsError) throw recipientsError;
    const staff = (recipientRows || []).map((r: Record<string, unknown>) => ({
      userId: r.user_id as string,
      email: r.email as string,
      name: r.name as string,
      isAdmin: Boolean(r.is_admin),
      canEditGear: Boolean(r.can_edit_gear),
      prefs: resolvePreferences(r.preferences as Record<string, unknown> | null),
    }));
    const prefsByUserId = new Map(staff.map((s) => [s.userId, s.prefs]));

    // -------------------------------------------------------------------------
    // 1. Due-date reminders + overdue notices
    // -------------------------------------------------------------------------
    const { data: dueItems, error: dueError } = await supabase.rpc('get_items_due_soon', {
      days_ahead: 7,
    });
    if (dueError) throw dueError;

    for (const item of dueItems || []) {
      const target = `${item.item_id}`;
      if (!item.recipient_email) {
        record({ task: 'due', target, status: 'skipped', reason: 'no_recipient_email' });
        continue;
      }
      // Schedule rule uses the recipient's preferences when they are a user;
      // clients get the defaults (1 and 3 days before, then daily overdue)
      const prefs = item.recipient_user_id
        ? prefsByUserId.get(item.recipient_user_id) || resolvePreferences(null)
        : resolvePreferences(null);
      const decision = dueReminderDecision(prefs, Number(item.days_until_due));
      if (!decision.templateKey) {
        record({ task: 'due', target, status: 'skipped', reason: decision.reason });
        continue;
      }
      await send('due', target, {
        to: item.recipient_email,
        templateKey: decision.templateKey,
        templateData: buildDueReminderData(item, companyName),
        userId: item.recipient_user_id || null,
        meta: { itemId: item.item_id },
      });
    }

    // -------------------------------------------------------------------------
    // 2. Reservation reminders — one per reservation group, on the contact's
    //    configured day (or the default 1 day) before the start date
    // -------------------------------------------------------------------------
    const { data: reservations, error: resError } = await supabase.rpc(
      'get_reservations_starting_soon',
      { days_ahead: 7 },
    );
    if (resError) throw resError;

    const staffByEmail = new Map(staff.map((s) => [s.email.toLowerCase(), s]));
    for (const group of reservations || []) {
      const target = `${group.project || group.group_key}`;
      const contact = staffByEmail.get(String(group.contact_email).toLowerCase());
      const prefs = contact?.prefs || resolvePreferences(null);
      if (!reservationReminderDue(prefs, Number(group.days_until_start))) {
        record({ task: 'reservation', target, status: 'skipped', reason: `not_reminder_day (${group.days_until_start})` });
        continue;
      }
      await send('reservation', target, {
        to: group.contact_email,
        templateKey: 'reservation_reminder',
        templateData: buildReservationReminderData(group, companyName),
        userId: contact?.userId || null,
        meta: { reservationId: group.reservation_id, itemId: group.first_item_id },
      });
    }

    // -------------------------------------------------------------------------
    // 3. Maintenance reminders — every open reminder / scheduled record due
    //    today, to each staff member who can edit gear and has the toggle on
    // -------------------------------------------------------------------------
    const { data: maintenance, error: maintError } = await supabase.rpc('get_maintenance_due_today');
    if (maintError) throw maintError;

    const maintainers = staff.filter((s) => s.canEditGear && s.prefs.email_enabled && s.prefs.maintenance_reminders);
    for (const task of maintenance || []) {
      const target = `${task.item_id}:${task.title || task.source}`;
      if (!maintainers.length) {
        record({ task: 'maintenance', target, status: 'skipped', reason: 'no_opted_in_staff' });
        continue;
      }
      for (const person of maintainers) {
        await send('maintenance', `${target} → ${person.email}`, {
          to: person.email,
          templateKey: 'maintenance_reminder',
          templateData: buildMaintenanceReminderData(task, companyName),
          userId: person.userId,
          meta: { itemId: task.item_id, reminderId: task.source === 'reminder' ? task.record_id : null },
        });
      }
    }

    // -------------------------------------------------------------------------
    // 4. Low-stock digest — admins who opted in, once per day
    // -------------------------------------------------------------------------
    const lowStockAdmins = staff.filter((s) => s.isAdmin && s.prefs.email_enabled && s.prefs.admin_low_stock_alerts);
    if (lowStockAdmins.length) {
      const { data: lowStock, error: lowError } = await supabase.rpc('get_low_stock_items');
      if (lowError) throw lowError;
      if ((lowStock || []).length) {
        const templateData = { ...buildLowStockData(lowStock, today, companyName), report_key: todayKey };
        for (const admin of lowStockAdmins) {
          await send('low_stock', admin.email, { to: admin.email, templateKey: 'low_stock_alert', templateData, userId: admin.userId });
        }
      } else {
        record({ task: 'low_stock', target: 'all', status: 'skipped', reason: 'nothing_low' });
      }
    }

    // -------------------------------------------------------------------------
    // 5. Overdue summary — admins who opted in, daily or weekly (Mondays)
    // -------------------------------------------------------------------------
    const summaryAdmins = staff.filter((s) => s.isAdmin && overdueSummaryDue(s.prefs, today));
    if (summaryAdmins.length) {
      const { data: overdue, error: overdueError } = await supabase.rpc('get_overdue_items');
      if (overdueError) throw overdueError;
      if ((overdue || []).length) {
        const templateData = { ...buildOverdueSummaryData(overdue, today, companyName), report_key: todayKey };
        for (const admin of summaryAdmins) {
          await send('overdue_summary', admin.email, { to: admin.email, templateKey: 'overdue_summary', templateData, userId: admin.userId });
        }
      } else {
        record({ task: 'overdue_summary', target: 'all', status: 'skipped', reason: 'nothing_overdue' });
      }
    }

    console.log('Daily notifications complete:', counts);
    return jsonResponse({ success: true, date: todayKey, ...counts, processed: outcomes.length, details: outcomes });
  } catch (error) {
    console.error('Daily notifications error:', error);
    return errorResponse('Internal error', 500);
  }
});
