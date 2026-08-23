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
//   0. housekeeping: stale `pending` log rows → failed; reserved/available
//      statuses reconciled against today's reservations
//
// Recipient preferences are applied in send-email (master switch + per-type
// toggle, defaults when no row); this job applies the SCHEDULE rules (which
// day to remind, weekly vs daily) from the same shared module.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, jsonResponse, errorResponse } from '../_shared/utils.ts';
import { utcDateKey } from '../_shared/notificationRules.ts';
import { buildLowStockData, buildOverdueSummaryData } from '../_shared/templateData.ts';
import {
  classifySendResult,
  countOutcomes,
  digestRecipients,
  isAuthorizedCronRequest,
  maintenanceRecipients,
  mapStaff,
  planDueReminders,
  planMaintenanceReminders,
  planReservationReminders,
  type Outcome,
  type Plan,
  type SendBody,
} from '../_shared/dailyJob.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // -------------------------------------------------------------------------
    // Authorization: verify_jwt = false so the scheduler can call this; the
    // function itself requires the CRON_SECRET header or the service role key.
    // -------------------------------------------------------------------------
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authorized = isAuthorizedCronRequest({
      cronSecret: Deno.env.get('CRON_SECRET'),
      serviceRoleKey,
      providedSecret: req.headers.get('x-cron-secret'),
      providedAuthorization: req.headers.get('authorization'),
    });
    if (!authorized) {
      console.warn('Rejected unauthorized daily-notifications invocation');
      return errorResponse('Unauthorized', 401);
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey);
    const companyName = Deno.env.get('COMPANY_NAME') || 'SIMS';
    const today = new Date();
    const todayKey = utcDateKey(today);
    const outcomes: Outcome[] = [];
    const record = (o: Outcome) => outcomes.push(o);

    // Send through send-email so preferences, dedup and logging stay in one place
    const send = async (task: string, target: string, body: SendBody) => {
      try {
        const { data, error } = await supabase.functions.invoke('send-email', { body });
        let errorDetail: string | null = null;
        if (error) {
          try {
            const parsed = await error.context?.json?.();
            if (parsed?.error) errorDetail = parsed.error;
          } catch { /* keep message */ }
        }
        record(
          classifySendResult(task, target, {
            data,
            errorMessage: error ? error.message : null,
            errorDetail,
          }),
        );
      } catch (err) {
        record({ task, target, status: 'failed', reason: (err as Error).message });
      }
    };

    // Execute a plan: skips are recorded, sends go through send-email
    const run = async (plans: Plan[]) => {
      for (const plan of plans) {
        if ('skip' in plan) record({ task: plan.task, target: plan.target, status: 'skipped', reason: plan.skip });
        else await send(plan.task, plan.target, plan.body);
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

    // 0b. Reconcile 'reserved' ↔ 'available' against today's reservations.
    //     The app does this whenever it merges reservations; this is the
    //     safety net for days nobody opens it (a stored 'reserved' used to
    //     outlive its reservation indefinitely).
    const { data: reconciled, error: reconcileError } = await supabase.rpc(
      'reconcile_reservation_statuses',
    );
    if (reconcileError) console.warn('Reservation status reconcile failed:', reconcileError.message);
    const reconciledCount = (reconciled || []).length;

    // Staff recipients with their preference rows, once
    const { data: recipientRows, error: recipientsError } = await supabase.rpc(
      'get_notification_recipients',
    );
    if (recipientsError) throw recipientsError;
    const staff = mapStaff(recipientRows);
    const prefsByUserId = new Map(staff.map((s) => [s.userId, s.prefs]));

    // -------------------------------------------------------------------------
    // 1. Due-date reminders + overdue notices
    // -------------------------------------------------------------------------
    const { data: dueItems, error: dueError } = await supabase.rpc('get_items_due_soon', {
      days_ahead: 7,
    });
    if (dueError) throw dueError;

    await run(planDueReminders(dueItems, prefsByUserId, companyName));

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
    await run(planReservationReminders(reservations, staffByEmail, companyName));

    // -------------------------------------------------------------------------
    // 3. Maintenance reminders — every open reminder / scheduled record due
    //    today, to each staff member who can edit gear and has the toggle on
    // -------------------------------------------------------------------------
    const { data: maintenance, error: maintError } = await supabase.rpc('get_maintenance_due_today');
    if (maintError) throw maintError;

    await run(planMaintenanceReminders(maintenance, maintenanceRecipients(staff), companyName));

    // -------------------------------------------------------------------------
    // 4. Low-stock digest — admins who opted in, once per day
    // -------------------------------------------------------------------------
    const { lowStock: lowStockAdmins, overdueSummary: summaryAdmins } = digestRecipients(staff, today);
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

    const counts = countOutcomes(outcomes);
    console.log('Daily notifications complete:', counts);
    return jsonResponse({
      success: true,
      date: todayKey,
      ...counts,
      reconciledStatuses: reconciledCount,
      processed: outcomes.length,
      details: outcomes,
    });
  } catch (error) {
    console.error('Daily notifications error:', error);
    return errorResponse('Internal error', 500);
  }
});
