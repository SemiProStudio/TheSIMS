-- =============================================================================
-- SIMS Baseline Migration 5/8: Triggers and Views
-- =============================================================================

-- =============================================================================
-- TRIGGERS: auto-update updated_at
-- =============================================================================

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_item_reminders_updated_at BEFORE UPDATE ON item_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pack_lists_updated_at BEFORE UPDATE ON pack_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- TRIGGER: create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TRIGGER: maintain location materialized path
DROP TRIGGER IF EXISTS update_location_path_trigger ON locations;
CREATE TRIGGER update_location_path_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON locations
  FOR EACH ROW EXECUTE FUNCTION update_location_path();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Inventory with computed status and related counts
CREATE OR REPLACE VIEW inventory_with_status AS
SELECT
  i.*,
  CASE
    WHEN i.status = 'checked-out' AND i.due_back < CURRENT_DATE THEN 'overdue'
    ELSE i.status
  END AS computed_status,
  COALESCE(r.due_reminder_count, 0) AS due_reminders_count,
  COALESCE(res.reservation_count, 0) AS reservation_count,
  COALESCE(m.pending_maintenance_count, 0) AS pending_maintenance_count
FROM inventory i
LEFT JOIN (
  SELECT item_id, COUNT(*) AS due_reminder_count
  FROM item_reminders
  WHERE due_date <= CURRENT_DATE AND NOT completed
  GROUP BY item_id
) r ON i.id = r.item_id
LEFT JOIN (
  SELECT item_id, COUNT(*) AS reservation_count
  FROM reservations
  WHERE status = 'confirmed' AND end_date >= CURRENT_DATE
  GROUP BY item_id
) res ON i.id = res.item_id
LEFT JOIN (
  SELECT item_id, COUNT(*) AS pending_maintenance_count
  FROM maintenance_records
  WHERE status IN ('scheduled', 'in-progress')
  GROUP BY item_id
) m ON i.id = m.item_id;

-- Dashboard aggregate stats
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE status = 'available') AS available,
  COUNT(*) FILTER (WHERE status = 'checked-out') AS checked_out,
  COUNT(*) FILTER (WHERE status = 'reserved') AS reserved,
  COUNT(*) FILTER (WHERE status = 'needs-attention') AS needs_attention,
  COUNT(*) FILTER (WHERE status = 'checked-out' AND due_back < CURRENT_DATE) AS overdue,
  COALESCE(SUM(current_value), 0) AS total_value,
  (SELECT COUNT(*) FROM reservations WHERE start_date <= CURRENT_DATE + 7 AND end_date >= CURRENT_DATE AND status = 'confirmed') AS upcoming_reservations,
  (SELECT COUNT(*) FROM item_reminders WHERE due_date <= CURRENT_DATE AND NOT completed) AS due_reminders,
  (SELECT COUNT(*) FROM maintenance_records WHERE status IN ('scheduled', 'in-progress')) AS pending_maintenance
FROM inventory;

-- Reservation calendar with item and client details
CREATE OR REPLACE VIEW reservation_calendar AS
SELECT
  r.*,
  i.name AS item_name,
  i.category_name,
  i.brand,
  c.name AS client_name,
  c.type AS client_type
FROM reservations r
JOIN inventory i ON r.item_id = i.id
LEFT JOIN clients c ON r.client_id = c.id
WHERE r.status != 'cancelled';

-- Client rental history summary
CREATE OR REPLACE VIEW client_rental_history AS
SELECT
  c.id AS client_id,
  c.name AS client_name,
  COUNT(DISTINCT r.id) AS total_reservations,
  COUNT(DISTINCT r.id) FILTER (WHERE r.end_date >= CURRENT_DATE) AS active_reservations,
  MAX(r.end_date) AS last_rental_date,
  COUNT(DISTINCT ch.id) AS total_checkouts
FROM clients c
LEFT JOIN reservations r ON c.id = r.client_id
LEFT JOIN checkout_history ch ON c.id = ch.client_id
GROUP BY c.id, c.name;

-- =============================================================================
-- SEQUENCE GRANTS
-- =============================================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
