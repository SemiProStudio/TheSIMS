-- ============================================================================
-- Security hardening: close unauthenticated (anon) access paths
-- 2026-08-15 security evaluation, Phase 1 (P1-1, P1-2, P1-3, and the anon
-- sequence grant from P3).
--
-- Root cause: the anon key ships in the public JS bundle. Several SECURITY
-- DEFINER views/functions bypass RLS and were reachable by the anon role,
-- letting an unauthenticated caller read business data + client PII and make
-- destructive writes. Every path below remains available to AUTHENTICATED
-- users (the app only ever calls them while logged in); we remove anon/public
-- reach and make the views respect the caller's RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P1-1: SECURITY DEFINER views. security_invoker = on makes them enforce the
-- querying user's RLS (so anon, which has no table policies, gets nothing);
-- the explicit REVOKE is defense-in-depth.
-- ----------------------------------------------------------------------------
ALTER VIEW public.inventory_with_status  SET (security_invoker = on);
ALTER VIEW public.dashboard_stats        SET (security_invoker = on);
ALTER VIEW public.reservation_calendar   SET (security_invoker = on);
ALTER VIEW public.client_rental_history  SET (security_invoker = on);

REVOKE SELECT ON public.inventory_with_status  FROM anon;
REVOKE SELECT ON public.dashboard_stats        FROM anon;
REVOKE SELECT ON public.reservation_calendar   FROM anon;
REVOKE SELECT ON public.client_rental_history  FROM anon;

-- ----------------------------------------------------------------------------
-- P1-2: SECURITY DEFINER data-reader functions. Remove anon + PUBLIC EXECUTE
-- (which bypassed RLS), keep authenticated. Several are orphaned (the client
-- reads via direct table selects) but revoking anon closes the bypass either
-- way and preserving authenticated avoids any behavior change for the app.
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_item_with_details(character varying)                 FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_inventory(text, integer)                          FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_available_items(date, date, character varying)       FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_client_rental_summary(character varying)             FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats()                                    FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_items_due_soon(integer)                              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_data_freshness()                                     FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.check_item_availability(character varying, date, date, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_view_count(character varying)                  FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_checkout_count(character varying)              FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_smart_paste_aliases(integer, text)                   FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_item_with_details(character varying)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_inventory(text, integer)                          TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_items(date, date, character varying)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_rental_summary(character varying)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats()                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_items_due_soon(integer)                              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_data_freshness()                                     TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_item_availability(character varying, date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_view_count(character varying)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_checkout_count(character varying)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_smart_paste_aliases(integer, text)                   TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS helper functions: authenticated needs EXECUTE (policies call them);
-- anon never does (anon has no table policies at all).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.has_permission(text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin()                 FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.has_permission(text, text) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin()                 TO authenticated;

-- ----------------------------------------------------------------------------
-- Trigger functions must never be callable as RPC (triggers fire as the table
-- owner regardless of EXECUTE grants).
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation()  FROM anon, public, authenticated;

-- ----------------------------------------------------------------------------
-- P1-3: smart-paste write RPCs. REVOKE closes the anon hole; ALSO pin
-- search_path (P2-4 for these two). upsert stays callable by the app
-- (authenticated); cleanup is destructive and unused by the client, so it is
-- restricted to trusted server contexts (service role / SQL editor / cron),
-- which bypass these grants.
-- ----------------------------------------------------------------------------
ALTER FUNCTION public.upsert_smart_paste_alias(text, text, text)     SET search_path = public;
ALTER FUNCTION public.cleanup_smart_paste_aliases(integer, integer)  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.upsert_smart_paste_alias(text, text, text)    FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.upsert_smart_paste_alias(text, text, text)    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_smart_paste_aliases(integer, integer) FROM anon, public, authenticated;

-- ----------------------------------------------------------------------------
-- P3: anon has no need for sequence access.
-- ----------------------------------------------------------------------------
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM anon;
