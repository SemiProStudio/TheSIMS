-- =============================================================================
-- Dead database surface cleanup (2026-08-24 audit §4.2)
--
-- Everything dropped here was verified to have ZERO application references
-- (app code, edge functions, and the daily job were grepped per object; the
-- only mentions left were the security-hardening migration and the lint
-- fixtures, which derive from migrations automatically).
--
-- Deliberately NOT dropped:
--   - "Users can view email templates" RLS policy — the database backup
--     export now reads email_templates with the authenticated client.
--   - The unused OUTPUT columns on the live daily-job RPCs
--     (get_items_due_soon.recipient_kind/client_id, etc.) — slimming them
--     means CREATE OR REPLACE on functions the cron depends on; churn
--     outweighs the value.
--   - categories/locations service CRUD stays app-side (phase-6 rewires
--     syncAll onto it).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Orphan RPCs (baseline-era; all still granted to authenticated).
--    Dropping them also shrinks the RPC surface the security suite guards.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.increment_view_count(character varying);
DROP FUNCTION IF EXISTS public.get_item_with_details(character varying);
DROP FUNCTION IF EXISTS public.search_inventory(text, integer);
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_client_rental_summary(character varying);
DROP FUNCTION IF EXISTS public.check_item_availability(character varying, date, date, uuid);
DROP FUNCTION IF EXISTS public.get_available_items(date, date, character varying);
DROP FUNCTION IF EXISTS public.get_smart_paste_aliases(integer, text);
DROP FUNCTION IF EXISTS public.cleanup_smart_paste_aliases(integer, integer);

-- -----------------------------------------------------------------------------
-- 2. Views nothing reads
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.inventory_with_status;
DROP VIEW IF EXISTS public.dashboard_stats;
DROP VIEW IF EXISTS public.reservation_calendar;
DROP VIEW IF EXISTS public.client_rental_history;

-- -----------------------------------------------------------------------------
-- 3. Dead columns
--    view_count: written only as 0, incrementer dropped above; the client
--    stopped selecting it in the audit round.
-- -----------------------------------------------------------------------------
ALTER TABLE public.inventory DROP COLUMN IF EXISTS view_count;
ALTER TABLE public.notification_log DROP COLUMN IF EXISTS scheduled_for;
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS name;
ALTER TABLE public.email_templates DROP COLUMN IF EXISTS variables;

-- -----------------------------------------------------------------------------
-- 4. Indexes with no server-side predicate anywhere (client filters in JS;
--    the GIN search index served the dropped search_inventory RPC)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_inventory_search;
DROP INDEX IF EXISTS public.idx_inventory_brand;
DROP INDEX IF EXISTS public.idx_smart_paste_aliases_category;
DROP INDEX IF EXISTS public.idx_reservations_project_type;
DROP INDEX IF EXISTS public.idx_reservations_group;
DROP INDEX IF EXISTS public.idx_locations_type;
DROP INDEX IF EXISTS public.idx_maintenance_type;
DROP INDEX IF EXISTS public.idx_checkout_history_action;
DROP INDEX IF EXISTS public.idx_clients_favorite;
DROP INDEX IF EXISTS public.idx_notification_log_status;
DROP INDEX IF EXISTS public.idx_notification_log_type;
DROP INDEX IF EXISTS public.idx_audit_log_type;
DROP INDEX IF EXISTS public.idx_audit_log_item;
DROP INDEX IF EXISTS public.idx_pack_lists_name;

-- -----------------------------------------------------------------------------
-- 5. Orphan RLS: only the service role (which bypasses RLS) writes templates —
--    the repo's migrations are the source of truth for template content.
--    The SELECT policy STAYS: the backup export reads this table as the
--    signed-in admin.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can modify email templates" ON public.email_templates;

-- -----------------------------------------------------------------------------
-- 6. admin_themes permission key: removed from the app 2026-08 (constants.js)
--    but still seeded in every role's JSONB
-- -----------------------------------------------------------------------------
UPDATE public.roles
SET permissions = permissions - 'admin_themes'
WHERE permissions ? 'admin_themes';
