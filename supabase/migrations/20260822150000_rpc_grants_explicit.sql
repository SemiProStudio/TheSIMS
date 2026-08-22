-- ============================================================================
-- RPC grants made explicit (2026-08-22 security regression suite)
--
-- Supabase's default privileges grant EXECUTE on every new public function
-- to anon, authenticated AND service_role (on top of Postgres's grant to
-- PUBLIC). The notification / reconcile RPCs were written as service-role
-- only with "REVOKE ALL … FROM PUBLIC, anon; GRANT … TO service_role" — which
-- leaves the DIRECT authenticated grant untouched. Result: any logged-in
-- user could call get_notification_recipients() (every user's name + email,
-- which the users RLS deliberately hides from non-admins), dump the
-- low-stock / overdue / due-soon digests, and run
-- reconcile_reservation_statuses() — a write — at will.
--
-- 1. Drop the authenticated grant on every service-role-only definer.
-- 2. anon never calls an RPC: revoke it (and PUBLIC) on the SECURITY INVOKER
--    helpers the 2026-08-15 lockdown skipped. Those respect RLS, so anon got
--    empty results rather than data — but "anon reaches nothing" should be
--    literally true, and test/migrationSecurityLint.test.js now enforces it.
--
-- From here on every SECURITY DEFINER function must say explicitly what
-- `authenticated` may do (GRANT or REVOKE) — the lint fails otherwise.
-- ============================================================================

-- 1. Service-role only ------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_items_due_soon(integer)              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_overdue_items()                      FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_items()                    FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_reservations_starting_soon(integer)  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_maintenance_due_today()              FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_notification_recipients()            FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_reservation_statuses()         FROM authenticated;

-- 2. Invoker helpers: authenticated only ------------------------------------
REVOKE EXECUTE ON FUNCTION public.generate_item_id(character varying)                      FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_client_id()                                     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.generate_package_id()                                    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_package_items(character varying, text[])            FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.sync_pack_list_children(uuid, jsonb, text[])             FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.replace_specs(character varying, jsonb)                  FROM anon, public;

GRANT EXECUTE ON FUNCTION public.generate_item_id(character varying)                       TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_client_id()                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_package_id()                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_package_items(character varying, text[])             TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pack_list_children(uuid, jsonb, text[])              TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_specs(character varying, jsonb)                   TO authenticated;
