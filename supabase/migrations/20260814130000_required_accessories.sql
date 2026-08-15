-- =============================================================================
-- Required accessories persistence
-- The ItemDetail "Required Accessories" section only ever patched React
-- state — no column existed, so accessory lists vanished on reload while the
-- change log claimed they were saved. This adds the real column the UI now
-- persists through inventoryService.update.
-- =============================================================================

ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS required_accessories JSONB DEFAULT '[]';

COMMENT ON COLUMN inventory.required_accessories IS
  'Array of inventory item ids that should accompany this item at checkout';
