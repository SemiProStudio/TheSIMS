-- =============================================================================
-- Notifications: correct recipients, repo-owned templates, producers for every
-- Settings toggle, admin visibility of the email log
-- =============================================================================
-- Context (sims-notifications-evaluation-2026-08-21.md):
--  * get_items_due_soon resolved the borrower through checked_out_to_user_id,
--    which the app filled with the OPERATOR's id, and never looked at the
--    client — reminders would have gone to whoever clicked "Check Out".
--  * email_templates lived only in the databases (no seed in the repo) and
--    the due_date_reminder subject referenced {{due_date_relative}}, which no
--    caller supplied. Templates are now upserted from here; the vitest
--    contract test parses THIS file.
--  * Five Settings toggles had no producer. The daily job now covers
--    reservation reminders, maintenance reminders, low-stock alerts and the
--    admin overdue summary; damage reports are sent at check-in.
--  * notification_log was readable only by its user_id owner, which callers
--    never set — nobody could see it. Admins can now read it (Email Log page).
-- Idempotent: safe to re-run.

-- -----------------------------------------------------------------------------
-- 1. Borrower resolution for due/overdue reminders
-- -----------------------------------------------------------------------------
-- Recipient precedence: the checked-out-to client (checkout_client_id) →
-- the user the app resolved at checkout (checked_out_to_user_id) → a user
-- whose name/email matches the typed borrower. recipient_user_id is only set
-- for user recipients, so preference lookups never use a client's row.
DROP FUNCTION IF EXISTS public.get_items_due_soon(integer);
CREATE OR REPLACE FUNCTION public.get_items_due_soon(days_ahead integer DEFAULT 3)
RETURNS TABLE(
  item_id varchar,
  item_name varchar,
  item_brand varchar,
  due_back date,
  days_until_due integer,
  checked_out_to varchar,
  recipient_email varchar,
  recipient_name varchar,
  recipient_kind text,
  recipient_user_id uuid,
  client_id varchar
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    i.id,
    i.name,
    i.brand,
    i.due_back,
    (i.due_back - CURRENT_DATE)::integer,
    i.checked_out_to_name,
    COALESCE(c.email, u.email)::varchar,
    COALESCE(c.name, u.name, i.checked_out_to_name)::varchar,
    CASE WHEN c.email IS NOT NULL THEN 'client'
         WHEN u.email IS NOT NULL THEN 'user'
         ELSE NULL END,
    CASE WHEN c.email IS NOT NULL THEN NULL ELSE u.id END,
    c.id
  FROM public.inventory i
  LEFT JOIN public.clients c
    ON c.id = i.checkout_client_id AND c.email IS NOT NULL AND c.email <> ''
  LEFT JOIN LATERAL (
    SELECT u2.id, u2.email, u2.name
    FROM public.users u2
    WHERE (i.checked_out_to_user_id IS NOT NULL AND u2.id = i.checked_out_to_user_id)
       OR (i.checked_out_to_user_id IS NULL AND i.checked_out_to_name IS NOT NULL AND (
            LOWER(u2.email) = LOWER(i.checked_out_to_name)
            OR LOWER(u2.name) = LOWER(i.checked_out_to_name)))
    ORDER BY (u2.id = i.checked_out_to_user_id) DESC NULLS LAST,
             (LOWER(u2.email) = LOWER(i.checked_out_to_name)) DESC
    LIMIT 1
  ) u ON TRUE
  WHERE i.status = 'checked-out'
    AND i.due_back IS NOT NULL
    AND i.due_back <= CURRENT_DATE + days_ahead
    AND i.due_back >= CURRENT_DATE - 7;
$$;
REVOKE ALL ON FUNCTION public.get_items_due_soon(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_items_due_soon(integer) TO service_role;

-- Precautionary backfill: rows where the operator's id was written as the
-- borrower although the typed name is not that user. Leaves rows where the
-- operator really did check gear out to themselves.
UPDATE public.inventory i
SET checked_out_to_user_id = NULL
FROM public.users u
WHERE u.id = i.checked_out_to_user_id
  AND i.status = 'checked-out'
  AND i.checked_out_to_name IS NOT NULL
  AND LOWER(i.checked_out_to_name) <> LOWER(u.name)
  AND LOWER(i.checked_out_to_name) <> LOWER(u.email);

-- -----------------------------------------------------------------------------
-- 2. Queries for the daily job's other producers (service role only)
-- -----------------------------------------------------------------------------
-- All overdue items (no 7-day floor) for the admin summary
CREATE OR REPLACE FUNCTION public.get_overdue_items()
RETURNS TABLE(item_id varchar, item_name varchar, item_brand varchar, due_back date,
              days_overdue integer, checked_out_to varchar, project varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.name, i.brand, i.due_back, (CURRENT_DATE - i.due_back)::integer,
         i.checked_out_to_name, i.checkout_project
  FROM public.inventory i
  WHERE i.status = 'checked-out' AND i.due_back IS NOT NULL AND i.due_back < CURRENT_DATE
  ORDER BY i.due_back ASC;
$$;
REVOKE ALL ON FUNCTION public.get_overdue_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_overdue_items() TO service_role;

-- Low stock: same rule as the dashboard — category tracks quantity, threshold
-- = item reorder point, else the category's low_stock_threshold, and > 0
CREATE OR REPLACE FUNCTION public.get_low_stock_items()
RETURNS TABLE(item_id varchar, item_name varchar, category_name varchar,
              quantity integer, threshold integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT i.id, i.name, i.category_name, i.quantity,
         COALESCE(NULLIF(i.reorder_point, 0), c.low_stock_threshold, 0)::integer
  FROM public.inventory i
  JOIN public.categories c ON c.name = i.category_name AND c.track_quantity = TRUE
  WHERE i.quantity IS NOT NULL
    AND COALESCE(NULLIF(i.reorder_point, 0), c.low_stock_threshold, 0) > 0
    AND i.quantity <= COALESCE(NULLIF(i.reorder_point, 0), c.low_stock_threshold, 0)
  ORDER BY i.category_name, i.name;
$$;
REVOKE ALL ON FUNCTION public.get_low_stock_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_low_stock_items() TO service_role;

-- Reservation groups starting within `days_ahead` days, one row per group
-- (legacy rows without group_id group by project + dates + contact)
CREATE OR REPLACE FUNCTION public.get_reservations_starting_soon(days_ahead integer DEFAULT 7)
RETURNS TABLE(group_key text, reservation_id uuid, project varchar, start_date date, end_date date,
              days_until_start integer, location varchar, contact_name varchar,
              contact_email varchar, client_id varchar, item_count integer,
              first_item_id varchar, first_item_name varchar, first_item_brand varchar)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH rows AS (
    SELECT r.*, i.name AS item_name, i.brand AS item_brand,
           COALESCE(r.group_id::text, r.project || '|' || r.start_date || '|' || r.end_date || '|' || COALESCE(r.contact_email, '')) AS gk
    FROM public.reservations r
    JOIN public.inventory i ON i.id = r.item_id
    WHERE r.status NOT IN ('cancelled', 'completed')
      AND r.start_date >= CURRENT_DATE
      AND r.start_date <= CURRENT_DATE + days_ahead
      AND r.contact_email IS NOT NULL AND r.contact_email <> ''
  )
  SELECT DISTINCT ON (gk)
    gk, id, project, start_date, end_date, (start_date - CURRENT_DATE)::integer, location,
    contact_name, contact_email, client_id,
    (SELECT count(*)::integer FROM rows r2 WHERE r2.gk = rows.gk),
    item_id, item_name, item_brand
  FROM rows
  ORDER BY gk, item_id;
$$;
REVOKE ALL ON FUNCTION public.get_reservations_starting_soon(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reservations_starting_soon(integer) TO service_role;

-- Maintenance work due today: open item reminders + scheduled maintenance
CREATE OR REPLACE FUNCTION public.get_maintenance_due_today()
RETURNS TABLE(source text, record_id uuid, item_id varchar, item_name varchar,
              title varchar, description text, due_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 'reminder', r.id, r.item_id, i.name, r.title, r.description, r.due_date
  FROM public.item_reminders r JOIN public.inventory i ON i.id = r.item_id
  WHERE r.completed = FALSE AND r.due_date = CURRENT_DATE
  UNION ALL
  SELECT 'maintenance', m.id, m.item_id, i.name, m.type::varchar, m.description, m.scheduled_date
  FROM public.maintenance_records m JOIN public.inventory i ON i.id = m.item_id
  WHERE m.status = 'scheduled' AND m.scheduled_date = CURRENT_DATE
  ORDER BY 4, 5;
$$;
REVOKE ALL ON FUNCTION public.get_maintenance_due_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_maintenance_due_today() TO service_role;

-- Staff recipients for internal notices: users with their preference row and
-- role permissions, so the job can gate per user without N queries
CREATE OR REPLACE FUNCTION public.get_notification_recipients()
RETURNS TABLE(user_id uuid, email varchar, name varchar, role_id varchar,
              is_admin boolean, can_edit_gear boolean, preferences jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT u.id, u.email, u.name, u.role_id,
         (u.role_id = 'role_admin'),
         (r.permissions ->> 'gear_list') = 'edit',
         to_jsonb(p) - 'id' - 'user_id' - 'created_at' - 'updated_at'
  FROM public.users u
  LEFT JOIN public.roles r ON r.id = u.role_id
  LEFT JOIN public.notification_preferences p ON p.user_id = u.id
  WHERE u.email IS NOT NULL AND u.email <> '';
$$;
REVOKE ALL ON FUNCTION public.get_notification_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_notification_recipients() TO service_role;

-- -----------------------------------------------------------------------------
-- 3. Email log visibility for admins
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view notification log" ON public.notification_log;
CREATE POLICY "Admins can view notification log"
ON public.notification_log FOR SELECT
TO authenticated
USING (has_permission('admin_notifications', 'view'));

CREATE INDEX IF NOT EXISTS idx_notification_log_created ON public.notification_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. Templates — the repo is the source of truth from here on
-- -----------------------------------------------------------------------------
-- Variables use {{name}}; {{#if name}}…{{/if}} blocks render when non-empty.
-- Substituted VALUES are HTML-escaped by send-email; multi-line list values
-- are rendered inside <pre>.
INSERT INTO public.email_templates (template_key, name, subject, body_html, body_text, variables, is_active) VALUES
(
  'checkout_confirmation', 'Checkout confirmation',
  'Checkout Confirmed: {{item_name}}',
  '<h2>Checkout Confirmed</h2>
<p>Hi {{borrower_name}},</p>
<p>You have checked out the following item:</p>
<div style="background: #ebf8ff; border: 1px solid #90cdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}{{#if item_brand}} • {{item_brand}}{{/if}}</span><br><br>
  <strong>Checked out:</strong> {{checkout_date}}<br>
  <strong>Due back:</strong> {{due_date}}<br>
  {{#if project}}<strong>Project:</strong> {{project}}{{/if}}
</div>
<p>Please return the equipment by the due date.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Checkout Confirmed

Hi {{borrower_name}},

You have checked out: {{item_name}} ({{item_id}})

Checked out: {{checkout_date}}
Due back: {{due_date}}
{{#if project}}Project: {{project}}{{/if}}

Please return the equipment by the due date.

Thank you,
{{company_name}}',
  '["borrower_name","item_name","item_id","item_brand","checkout_date","due_date","project","company_name"]', true
),
(
  'checkin_confirmation', 'Return confirmation',
  'Return Confirmed: {{item_name}}',
  '<h2>Return Confirmed</h2>
<p>Hi {{borrower_name}},</p>
<p>The following item has been checked in:</p>
<div style="background: #f0fff4; border: 1px solid #9ae6b4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}</span><br><br>
  <strong>Returned:</strong> {{return_date}}<br>
  <span style="color: #38a169;">✓ Successfully returned</span>
</div>
<p>Thank you for returning the equipment!</p>
<p>Best regards,<br>{{company_name}}</p>',
  'Return Confirmed

Hi {{borrower_name}},

{{item_name}} ({{item_id}}) has been checked in.

Returned: {{return_date}}

Thank you for returning the equipment!

Best regards,
{{company_name}}',
  '["borrower_name","item_name","item_id","return_date","company_name"]', true
),
(
  'reservation_confirmation', 'Reservation confirmation',
  'Reservation Confirmed: {{project_name}}',
  '<h2>Reservation Confirmed</h2>
<p>Hi {{user_name}},</p>
<p>Your reservation has been confirmed:</p>
<div style="background: #f0fff4; border: 1px solid #9ae6b4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong>{{#if item_count_note}} <span style="color: #666;">{{item_count_note}}</span>{{/if}}<br>
  <span style="color: #666;">{{item_id}}{{#if item_brand}} • {{item_brand}}{{/if}}</span><br><br>
  <strong>Project:</strong> {{project_name}}<br>
  <strong>Dates:</strong> {{start_date}} to {{end_date}}<br>
  {{#if location}}<strong>Location:</strong> {{location}}{{/if}}
</div>
<p>Please pick up the equipment on the start date.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Reservation Confirmed

Hi {{user_name}},

Your reservation has been confirmed:

Item: {{item_name}} ({{item_id}}){{#if item_count_note}} {{item_count_note}}{{/if}}
Project: {{project_name}}
Dates: {{start_date}} to {{end_date}}
{{#if location}}Location: {{location}}{{/if}}

Please pick up the equipment on the start date.

Thank you,
{{company_name}}',
  '["user_name","item_name","item_id","item_brand","item_count_note","project_name","start_date","end_date","location","company_name"]', true
),
(
  'reservation_reminder', 'Reservation reminder',
  'Reminder: {{project_name}} starts {{start_date_relative}}',
  '<h2>Upcoming Reservation</h2>
<p>Hi {{user_name}},</p>
<p>Your reservation starts <strong>{{start_date_relative}}</strong>:</p>
<div style="background: #ebf8ff; border: 1px solid #90cdf4; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong>{{#if item_count_note}} <span style="color: #666;">{{item_count_note}}</span>{{/if}}<br>
  <span style="color: #666;">{{item_id}}{{#if item_brand}} • {{item_brand}}{{/if}}</span><br><br>
  <strong>Project:</strong> {{project_name}}<br>
  <strong>Dates:</strong> {{start_date}} to {{end_date}}<br>
  {{#if location}}<strong>Location:</strong> {{location}}{{/if}}
</div>
<p>Please plan to pick up the equipment on the start date.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Upcoming Reservation

Hi {{user_name}},

Your reservation starts {{start_date_relative}}:

Item: {{item_name}} ({{item_id}}){{#if item_count_note}} {{item_count_note}}{{/if}}
Project: {{project_name}}
Dates: {{start_date}} to {{end_date}}
{{#if location}}Location: {{location}}{{/if}}

Thank you,
{{company_name}}',
  '["user_name","item_name","item_id","item_brand","item_count_note","project_name","start_date","start_date_relative","end_date","location","company_name"]', true
),
(
  'due_date_reminder', 'Due date reminder',
  'Reminder: {{item_name}} is due back {{due_date_relative}}',
  '<h2>Equipment Return Reminder</h2>
<p>Hi {{borrower_name}},</p>
<p>This is a friendly reminder that the following item is due back <strong>{{due_date_relative}}</strong>:</p>
<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}{{#if item_brand}} • {{item_brand}}{{/if}}</span><br>
  <span style="color: #666;">Due: {{due_date}}</span>
</div>
<p>Please return the equipment on time so it is available for others.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Equipment Return Reminder

Hi {{borrower_name}},

This is a friendly reminder that {{item_name}} ({{item_id}}) is due back {{due_date_relative}}.

Due date: {{due_date}}

Please return the equipment on time.

Thank you,
{{company_name}}',
  '["borrower_name","item_name","item_id","item_brand","due_date","due_date_relative","company_name"]', true
),
(
  'overdue_notice', 'Overdue notice',
  'OVERDUE: {{item_name}} was due back {{due_date}}',
  '<h2 style="color: #c53030;">Overdue Equipment Notice</h2>
<p>Hi {{borrower_name}},</p>
<p>The following item is now <strong style="color: #c53030;">overdue</strong>:</p>
<div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}{{#if item_brand}} • {{item_brand}}{{/if}}</span><br>
  <span style="color: #c53030;">Was due: {{due_date}} ({{days_overdue}} days ago)</span>
</div>
<p>Please return this equipment as soon as possible.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'OVERDUE Equipment Notice

Hi {{borrower_name}},

{{item_name}} ({{item_id}}) is now OVERDUE.

Was due: {{due_date}} ({{days_overdue}} days ago)

Please return this equipment as soon as possible.

Thank you,
{{company_name}}',
  '["borrower_name","item_name","item_id","item_brand","due_date","days_overdue","company_name"]', true
),
(
  'maintenance_reminder', 'Maintenance reminder',
  'Maintenance Due: {{reminder_title}} for {{item_name}}',
  '<h2>Maintenance Reminder</h2>
<p>The following maintenance task is due today:</p>
<div style="background: #fffaf0; border: 1px solid #fbd38d; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{reminder_title}}</strong><br>
  {{#if reminder_description}}<span style="color: #666;">{{reminder_description}}</span><br>{{/if}}<br>
  <strong>Item:</strong> {{item_name}} ({{item_id}})<br>
  <strong>Due:</strong> {{due_date}}
</div>
<p>Please complete this maintenance task to keep equipment in good condition.</p>
<p>Thank you,<br>{{company_name}}</p>',
  'Maintenance Reminder

Task: {{reminder_title}}
{{#if reminder_description}}{{reminder_description}}{{/if}}
Item: {{item_name}} ({{item_id}})
Due: {{due_date}}

Please complete this maintenance task.

Thank you,
{{company_name}}',
  '["reminder_title","reminder_description","item_name","item_id","due_date","company_name"]', true
),
(
  'damage_report', 'Damage report (admin)',
  'Damage reported: {{item_name}}',
  '<h2 style="color: #c53030;">Damage Reported</h2>
<p>{{reported_by}} reported damage while checking in equipment:</p>
<div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <strong>{{item_name}}</strong><br>
  <span style="color: #666;">{{item_id}}</span><br><br>
  <strong>Returned by:</strong> {{borrower_name}}<br>
  <strong>Reported:</strong> {{report_date}}<br><br>
  <strong>Description:</strong><br>
  <span>{{description}}</span>
</div>
<p>The item has been marked as needing attention and a repair record was started.</p>
<p>{{company_name}}</p>',
  'Damage Reported

{{reported_by}} reported damage while checking in equipment:

Item: {{item_name}} ({{item_id}})
Returned by: {{borrower_name}}
Reported: {{report_date}}

Description:
{{description}}

The item has been marked as needing attention and a repair record was started.

{{company_name}}',
  '["reported_by","item_name","item_id","borrower_name","report_date","description","company_name"]', true
),
(
  'low_stock_alert', 'Low stock alert (admin)',
  'Low stock: {{item_count}} item(s) at or below reorder point',
  '<h2>Low Stock Alert</h2>
<p>{{item_count}} item(s) are at or below their reorder point as of {{report_date}}:</p>
<pre style="background: #fffaf0; border: 1px solid #fbd38d; padding: 16px; border-radius: 8px; font-family: inherit; white-space: pre-wrap;">{{items_list}}</pre>
<p>{{company_name}}</p>',
  'Low Stock Alert

{{item_count}} item(s) are at or below their reorder point as of {{report_date}}:

{{items_list}}

{{company_name}}',
  '["item_count","items_list","report_date","company_name"]', true
),
(
  'overdue_summary', 'Overdue summary (admin)',
  'Overdue equipment summary: {{item_count}} item(s)',
  '<h2 style="color: #c53030;">Overdue Equipment Summary</h2>
<p>{{item_count}} item(s) are overdue as of {{report_date}}:</p>
<pre style="background: #fff5f5; border: 1px solid #feb2b2; padding: 16px; border-radius: 8px; font-family: inherit; white-space: pre-wrap;">{{items_list}}</pre>
<p>{{company_name}}</p>',
  'Overdue Equipment Summary

{{item_count}} item(s) are overdue as of {{report_date}}:

{{items_list}}

{{company_name}}',
  '["item_count","items_list","report_date","company_name"]', true
),
(
  'test_email', 'Test email',
  'SIMS test email',
  '<h2>It works</h2>
<p>Hi {{user_name}},</p>
<p>This test email was sent from SIMS at {{sent_at}}. If you are reading it, email notifications are configured correctly.</p>
<p>{{company_name}}</p>',
  'It works

Hi {{user_name}},

This test email was sent from SIMS at {{sent_at}}. If you are reading it, email notifications are configured correctly.

{{company_name}}',
  '["user_name","sent_at","company_name"]', true
)
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  subject = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
