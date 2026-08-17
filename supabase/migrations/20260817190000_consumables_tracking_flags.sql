-- ============================================================================
-- Consumables tracking flags (user decision 2026-08-17): consumables are
-- quantity-tracked, not serialized — the flags were inverted.
-- ============================================================================
UPDATE categories
SET track_quantity = true,
    track_serial_numbers = false
WHERE name = 'Consumables';
