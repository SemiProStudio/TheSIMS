-- =============================================================================
-- Pack list packages: packed tracking
-- Packages on a pack list are physical units (pre-built cases). Scan-to-Pack
-- resolves their QR labels now, so they need the same packed state items
-- have. Two changes:
--
-- 1. pack_list_packages.is_packed — the packed flag.
-- 2. sync_pack_list_children previously replaced the packages side with
--    delete+insert, which would wipe is_packed on every list edit. The
--    packages side now deletes only removed packages and upserts the rest
--    (the UNIQUE(pack_list_id, package_id) constraint exists from the base
--    schema), so packed state survives edits that keep a package on the
--    list. The items side is unchanged — its packed state travels in
--    p_items.
--
-- Run in BOTH the production and thesims-test SQL editors. App code is
-- tolerant of the column being absent (selects pack_list_packages(*)), so
-- deploy order doesn't matter; package packed toggles fail with an honest
-- toast until this has run.
-- =============================================================================

ALTER TABLE pack_list_packages ADD COLUMN IF NOT EXISTS is_packed BOOLEAN DEFAULT false;

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
    DELETE FROM pack_list_packages
     WHERE pack_list_id = p_pack_list_id
       AND NOT (package_id = ANY(p_package_ids));

    IF array_length(p_package_ids, 1) > 0 THEN
      INSERT INTO pack_list_packages (pack_list_id, package_id, sort_order)
      SELECT p_pack_list_id, t.package_id, (t.ord - 1)::INTEGER
      FROM unnest(p_package_ids) WITH ORDINALITY AS t(package_id, ord)
      ON CONFLICT (pack_list_id, package_id)
      DO UPDATE SET sort_order = EXCLUDED.sort_order;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
