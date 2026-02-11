-- =============================================================================
-- SIMS: Harden SECURITY DEFINER Functions
-- Adds authentication checks and input validation to functions that bypass RLS
-- Run in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- INCREMENT VIEW COUNT — add auth + existence check
-- =============================================================================
DROP FUNCTION IF EXISTS increment_view_count(VARCHAR);

CREATE OR REPLACE FUNCTION increment_view_count(item_id VARCHAR)
RETURNS void AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update only if item exists (no-op otherwise, no error to avoid info leak)
  UPDATE inventory
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- INCREMENT CHECKOUT COUNT — add auth + existence check
-- =============================================================================
DROP FUNCTION IF EXISTS increment_checkout_count(VARCHAR);

CREATE OR REPLACE FUNCTION increment_checkout_count(item_id VARCHAR)
RETURNS void AS $$
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Update only if item exists
  UPDATE inventory
  SET checkout_count = COALESCE(checkout_count, 0) + 1
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- Notes on other SECURITY DEFINER functions (no changes needed):
--
-- is_admin(): Must be DEFINER to read roles table for RLS policy checks.
--   Already safe — queries only by auth.uid(), no user input.
--
-- has_permission(): Must be DEFINER to read roles table for RLS policy checks.
--   Already safe — queries only by auth.uid(), text params used in JSONB lookup.
--
-- handle_new_user(): Auth trigger, not callable via API. Safe by design.
--
-- get_item_with_details(): DEFINER to bypass RLS for joining multiple tables.
--   Takes item_id VARCHAR used in parameterized query. Low risk.
-- =============================================================================

-- Re-grant execute after DROP/CREATE
GRANT EXECUTE ON FUNCTION increment_view_count(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_checkout_count(VARCHAR) TO authenticated;
