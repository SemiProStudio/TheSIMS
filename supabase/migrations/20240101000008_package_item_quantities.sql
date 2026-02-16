-- =============================================================================
-- Add item_quantities JSONB column to packages table
-- Stores quantity overrides for multi-quantity items in a package
-- Format: { "ITEM-ID": 3, "ITEM-ID-2": 5 }
-- =============================================================================

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS item_quantities JSONB DEFAULT NULL;

COMMENT ON COLUMN packages.item_quantities IS 'JSON map of item_id → quantity for multi-quantity items in this package';
