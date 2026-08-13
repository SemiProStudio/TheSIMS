-- =============================================================================
-- Pack list names: case-insensitive uniqueness
-- The UI has always rejected duplicate names case-insensitively, but only
-- client-side — two devices racing (or the old silent-failure create flow)
-- could still land duplicates. Enforce it at the DB so a race surfaces as a
-- 23505 that the app reports honestly.
--
-- Applied manually via the SQL editor on 2026-08-12 (test + production);
-- this file records it for schema history. Before applying anywhere else,
-- verify there are no existing duplicates:
--
--   SELECT lower(name), count(*) FROM pack_lists
--   GROUP BY lower(name) HAVING count(*) > 1;
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_pack_lists_name_unique ON pack_lists (lower(name));
