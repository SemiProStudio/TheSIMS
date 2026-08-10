-- =============================================================================
-- Data Integrity RPCs (Phase 2 — H9, H10, H12)
--
-- 1. Server-side ID generation, race-safe
--    Package IDs were computed client-side from a string-ordered MAX query:
--    concurrent creates collided, and once PKG-999 existed every create
--    computed PKG-1000 forever (string ordering puts PKG-999 above PKG-1000).
--    generate_item_id/generate_client_id had the same numeric-vs-string flaw
--    plus no concurrency guard. All three now extract the numeric suffix and
--    serialize via an advisory lock held to end of transaction.
--
-- 2. Transactional child-row syncs
--    Package items, pack list items/packages, and specs were synced with a
--    client-side DELETE followed by an INSERT; if the insert failed the
--    children were silently lost while the operation reported success.
--    Each sync now runs inside a single function (one transaction): failure
--    rolls back the delete. SECURITY INVOKER so RLS still applies.
--
-- 3. get_data_freshness now returns server_time so the client can use a
--    server-side watermark for incremental refresh instead of trusting the
--    local clock (a fast client clock silently skipped colleagues' changes).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1a. Package ID generation (new — was client-side)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_package_id()
RETURNS VARCHAR AS $$
DECLARE
  max_num INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_package_id'));

  SELECT COALESCE(MAX((substring(id FROM '^PKG-(\d+)$'))::INTEGER), 0)
  INTO max_num
  FROM packages
  WHERE id ~ '^PKG-\d+$';

  RETURN 'PKG-' || LPAD((max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1b. Item ID generation (hardened — numeric suffix, advisory lock)
-- The deployed version has a parameter default, which CREATE OR REPLACE
-- cannot remove — drop first (same transaction, so no window without it).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS generate_item_id(VARCHAR);
CREATE OR REPLACE FUNCTION generate_item_id(category_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  max_num INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_item_id:' || category_prefix));

  SELECT COALESCE(MAX((substring(id FROM '(\d+)$'))::INTEGER), 1000)
  INTO max_num
  FROM inventory
  WHERE id ~ ('^' || category_prefix || '\d+$');

  RETURN category_prefix || (max_num + 1)::TEXT;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1c. Client ID generation (hardened — numeric suffix, advisory lock)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS VARCHAR AS $$
DECLARE
  max_num INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('generate_client_id'));

  SELECT COALESCE(MAX((substring(id FROM '^CL(\d+)$'))::INTEGER), 0)
  INTO max_num
  FROM clients
  WHERE id ~ '^CL\d+$';

  RETURN 'CL' || LPAD((max_num + 1)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2a. Package items sync (transactional replace)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_package_items(p_package_id VARCHAR, p_item_ids TEXT[])
RETURNS void AS $$
BEGIN
  DELETE FROM package_items WHERE package_id = p_package_id;

  IF p_item_ids IS NOT NULL AND array_length(p_item_ids, 1) > 0 THEN
    INSERT INTO package_items (package_id, item_id, sort_order)
    SELECT p_package_id, t.item_id, (t.ord - 1)::INTEGER
    FROM unnest(p_item_ids) WITH ORDINALITY AS t(item_id, ord);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2b. Pack list children sync (transactional replace)
--     p_items: [{"id": "CAM1001", "quantity": 1, "is_packed": false}, ...]
--     Pass NULL to leave items or packages untouched.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_pack_list_children(
  p_pack_list_id UUID,
  p_items JSONB DEFAULT NULL,
  p_package_ids TEXT[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_items IS NOT NULL THEN
    DELETE FROM pack_list_items WHERE pack_list_id = p_pack_list_id;

    INSERT INTO pack_list_items (pack_list_id, item_id, quantity, is_packed, sort_order)
    SELECT p_pack_list_id,
           x.value->>'id',
           COALESCE((x.value->>'quantity')::INTEGER, 1),
           COALESCE((x.value->>'is_packed')::BOOLEAN, false),
           (x.ordinality - 1)::INTEGER
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(value, ordinality);
  END IF;

  IF p_package_ids IS NOT NULL THEN
    DELETE FROM pack_list_packages WHERE pack_list_id = p_pack_list_id;

    IF array_length(p_package_ids, 1) > 0 THEN
      INSERT INTO pack_list_packages (pack_list_id, package_id, sort_order)
      SELECT p_pack_list_id, t.package_id, (t.ord - 1)::INTEGER
      FROM unnest(p_package_ids) WITH ORDINALITY AS t(package_id, ord);
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2c. Specs replace (transactional)
--     p_specs: [{"name": "Sensor", "required": true}, ...]
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_specs(p_category VARCHAR, p_specs JSONB)
RETURNS void AS $$
BEGIN
  DELETE FROM specs WHERE category_name = p_category;

  IF p_specs IS NOT NULL THEN
    INSERT INTO specs (category_name, name, required, sort_order)
    SELECT p_category,
           x.value->>'name',
           COALESCE((x.value->>'required')::BOOLEAN, false),
           (x.ordinality - 1)::INTEGER
    FROM jsonb_array_elements(p_specs) WITH ORDINALITY AS x(value, ordinality);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. Freshness check with server time (watermark for incremental refresh)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_data_freshness()
RETURNS JSON AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN json_build_object(
    'server_time',  now(),
    'inventory',    (SELECT MAX(updated_at) FROM inventory),
    'reservations', (SELECT MAX(updated_at) FROM reservations),
    'clients',      (SELECT MAX(updated_at) FROM clients),
    'packages',     (SELECT MAX(updated_at) FROM packages),
    'pack_lists',   (SELECT MAX(updated_at) FROM pack_lists)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION generate_package_id() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_item_id(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_package_items(VARCHAR, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_pack_list_children(UUID, JSONB, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION replace_specs(VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_data_freshness() TO authenticated;
