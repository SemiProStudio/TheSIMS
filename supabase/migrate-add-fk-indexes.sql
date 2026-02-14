-- =============================================================================
-- SIMS: Add Missing Foreign Key Indexes
-- Resolves Supabase Performance Advisor unindexed_foreign_keys suggestions.
-- Missing FK indexes hurt performance on JOINs and CASCADE deletes.
-- Run in Supabase SQL Editor
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_client_notes_user ON client_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checkout_client ON inventory(checkout_client_id);
CREATE INDEX IF NOT EXISTS idx_item_notes_user ON item_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_item_reminders_created_by ON item_reminders(created_by_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_by ON maintenance_records(created_by_id);
CREATE INDEX IF NOT EXISTS idx_package_notes_parent ON package_notes(parent_id);
CREATE INDEX IF NOT EXISTS idx_package_notes_user ON package_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_by ON reservations(created_by_id);
