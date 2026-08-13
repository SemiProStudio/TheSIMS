-- =============================================================================
-- Multi-item reservations: real group identity
-- A "reserve N items for a job" action creates N reservation rows. Until now
-- the app regrouped them by project+start+end NAME MATCHING, which meant:
--   - editing the group updated only the first row (the group silently split)
--   - cancelling matched by name, so a renamed row survived cancellation and
--     unrelated same-named reservations could be cancelled together
-- group_id gives rows created together a shared identity. NULLABLE on
-- purpose: legacy rows keep NULL and the app falls back to name matching for
-- them, so this migration can be applied before or after the code deploys.
-- =============================================================================

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS group_id UUID;

CREATE INDEX IF NOT EXISTS idx_reservations_group ON reservations(group_id);
