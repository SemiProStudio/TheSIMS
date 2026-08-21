# SIMS Email Notifications — How It Works and How to Verify It

Last reviewed 2026-08-21 (see `sims-notifications-evaluation-2026-08-21.md` for the audit that produced this version).

## What gets sent

Every control in **Settings → Notifications** has a producer. Nothing appears in that screen that the backend does not honour.

| Setting | Email (template_key) | When | Recipient |
|---|---|---|---|
| Checkout confirmations | `checkout_confirmation` | item checked out | the borrower's email from the check-out form |
| Return confirmations | `checkin_confirmation` | item checked in | the borrower (linked client, else matching user) |
| Reservation confirmations | `reservation_confirmation` | reservation created | the reservation's contact email |
| Reservation reminders (+ days) | `reservation_reminder` | daily job, N days before start | the reservation's contact email |
| Remind me before due dates (+ days) | `due_date_reminder` | daily job, on the chosen days | the borrower — linked client, else the user |
| Overdue notifications | `overdue_notice` | daily job, each day overdue | same as above |
| Maintenance reminders | `maintenance_reminder` | daily job, reminders/scheduled work due today | staff who can edit gear |
| Admin · Damage reports | `damage_report` | damage reported at check-in | every admin |
| Admin · Overdue summary (daily/weekly) | `overdue_summary` | daily job (weekly = Mondays) | admins who opted in |
| Admin · Low stock alerts | `low_stock_alert` | daily job | admins who opted in — lists items whose own **Low stock reminder** is on (Item Details / Edit) and whose quantity is at or below their threshold; there is no category-level threshold |
| "Send me a test email" button | `test_email` | on click | yourself |

Preferences are applied **server-side** in `send-email` for every template: the master switch first, then the per-type toggle. A user who has never saved the screen gets the defaults (everything on except the two admin digests). Admin templates never go to non-admin addresses.

## Architecture

```
App (checkout / check-in / reservation / settings)
  └─ lib/services.js emailService ──► Edge Function send-email ──► Resend
                                          │  • allow-list (users/clients) for user callers
                                          │  • preference gating (notificationRules.ts)
                                          │  • template render (email_templates table)
                                          │  • 24h dedup, notification_log row (sent/failed)
pg_cron (09:00 UTC daily) ──► Edge Function due-date-reminder  (the DAILY JOB)
                                  • due/overdue reminders   (get_items_due_soon)
                                  • reservation reminders   (get_reservations_starting_soon)
                                  • maintenance reminders   (get_maintenance_due_today)
                                  • low-stock digest        (get_low_stock_items)
                                  • overdue summary         (get_overdue_items)
                                  → each through send-email, so gating/logging stay in one place
```

Shared logic lives in `supabase/functions/_shared/notificationRules.ts` (defaults, which toggle gates which template, schedule rules) and `_shared/templateData.ts` (template data builders). Both are pure and are unit-tested by vitest directly. `test/emailTemplateContract.test.js` parses the templates migration and fails if any template references a variable no builder supplies.

## Templates

The repo is the source of truth: `supabase/migrations/20260821100000_notifications_fix.sql` upserts all templates (idempotent). Edit there, re-run the migration in each project. Editing rows in the Table Editor works but will be overwritten by the next migration run.

Template syntax: `{{variable}}`; `{{#if variable}}…{{/if}}` renders when the variable is non-empty. Values are HTML-escaped; multi-line list values are rendered inside `<pre>`.

## Configuration (per project: TEST and PROD)

### Edge Function secrets

| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key. Without it, `send-email` logs a `failed` row ("RESEND_API_KEY not configured") and returns 500. |
| `FROM_EMAIL` | e.g. `SIMS <notifications@yourdomain.com>` — the domain must be **verified** in Resend or every send fails with a Resend 403. |
| `CRON_SECRET` | Shared secret the scheduler sends as `x-cron-secret` to the daily job. |
| `COMPANY_NAME` | Optional. Signature name used by the daily job's emails (app-sent emails use the signed-in user's Business Name from their profile, else "SIMS"). |

Set with `supabase secrets set NAME=value --project-ref <ref>` or in the dashboard under Edge Functions → Secrets. `supabase secrets list --project-ref <ref>` shows names (never values).

### Deploy

```bash
supabase functions deploy send-email --project-ref <ref>
supabase functions deploy due-date-reminder --no-verify-jwt --project-ref <ref>
```

`due-date-reminder` runs with `verify_jwt = false` so the scheduler can reach it; it authenticates every call itself (`x-cron-secret` or the service-role key) and rejects everything else with 401.

### Daily schedule (pg_cron + pg_net — already live in PROD as job `due-date-reminder-daily`)

```sql
-- once: store the secret (same value as the CRON_SECRET function secret)
select vault.create_secret('<long random string>', 'cron_secret');

select cron.schedule(
  'due-date-reminder-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/due-date-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

Check it: `select * from cron.job;` · `select * from cron.job_run_details order by start_time desc limit 5;` · `select status_code, content from net._http_response order by created desc limit 5;`

## How to verify, in order

1. **Settings → Notifications → "Send me a test email."** The button reports the real outcome ("Test email sent — check your inbox" / "Not sent: <reason>").
2. **Admin Panel → Email Log.** Every attempt, newest first, with status, recipient, type and the error message for failures. This is the first place to look for "did it go out?".
3. **Resend dashboard → Emails** for delivery/bounce status of sent rows (the log stores Resend's message id).
4. Daily job: `cron.job_run_details` + `net._http_response` (above). The response body lists every decision the run made (`details[]` with sent / skipped reason / failed reason).

## Recipient rules worth knowing

- Check-out stores the borrower as a SIMS user only when the typed name or email matches a user (`checked_out_to_user_id`); a selected client is stored in `checkout_client_id`. Reminders go to the client's email first, else the user's. The operator who clicked "Check Out" is **never** the reminder recipient.
- Signed-in users can only send to addresses already on record (a registered user or a client); anything else is refused with a clear message in the app. The daily job (service role) can send to any address the database holds.
- Dedup: identical template + recipient + data within 24h is sent once (the test email is exempt).

## Cost

Resend free tier: 100 emails/day, 3,000/month. At 1k items with active reminders, watch the daily count in the Email Log; upgrade Resend before it becomes the ceiling.
