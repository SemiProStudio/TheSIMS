-- =============================================================================
-- SIMS: Data Freshness Check Function
-- Lightweight RPC to detect stale data for incremental refresh.
-- Returns MAX(updated_at) for each major table so the client can compare
-- against its last-loaded timestamp and only re-fetch changed rows.
-- Run in Supabase SQL Editor
-- =============================================================================

CREATE OR REPLACE FUNCTION get_data_freshness()
RETURNS JSON AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN json_build_object(
    'inventory',    (SELECT MAX(updated_at) FROM inventory),
    'reservations', (SELECT MAX(updated_at) FROM reservations),
    'clients',      (SELECT MAX(updated_at) FROM clients),
    'packages',     (SELECT MAX(updated_at) FROM packages),
    'pack_lists',   (SELECT MAX(updated_at) FROM pack_lists)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_data_freshness() TO authenticated;
