-- ============================================================================
-- Security hardening Phase 4 (2026-08-15 evaluation): DB hygiene
--   P2-4  pin search_path on the remaining SECURITY DEFINER / trigger funcs
--   P2-8  audit_log actor integrity — stamp the real caller server-side
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P2-4: pin search_path = public on the utility/trigger functions the earlier
-- rounds missed. Mutable search_path on a SECURITY DEFINER function is the
-- standard privilege-escalation CVE class. Uses regprocedure so the exact
-- overload signature is resolved automatically.
-- ----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at', 'update_location_path', 'generate_client_id',
        'generate_item_id', 'generate_package_id', 'sync_package_items',
        'sync_pack_list_children', 'replace_specs', 'get_smart_paste_aliases'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- P2-8: audit_log rows are attributed by client-supplied user_id/user_name
-- (write policy is WITH CHECK (true)), so any authenticated user could forge
-- entries. Stamp the real actor from auth.uid() on insert. Service-role /
-- SQL-editor inserts (auth.uid() IS NULL) keep whatever they supply, so
-- internal/system entries are unaffected.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION stamp_audit_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    NEW.user_name := COALESCE(
      (SELECT name FROM users WHERE id = auth.uid()),
      NEW.user_name
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger fires as table owner regardless of grants; no client needs EXECUTE.
REVOKE EXECUTE ON FUNCTION stamp_audit_actor() FROM anon, public, authenticated;

DROP TRIGGER IF EXISTS trg_stamp_audit_actor ON audit_log;
CREATE TRIGGER trg_stamp_audit_actor
  BEFORE INSERT ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION stamp_audit_actor();
