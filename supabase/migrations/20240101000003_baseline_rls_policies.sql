-- =============================================================================
-- SIMS Baseline Migration 4/8: Row Level Security Policies
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_list_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Read access for authenticated users
-- =============================================================================

CREATE POLICY "read_roles" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_locations" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_specs" ON specs FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_client_notes" ON client_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_inventory" ON inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_item_notes" ON item_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_item_reminders" ON item_reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_reservations" ON reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_maintenance" ON maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_checkout_history" ON checkout_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_packages" ON packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_package_items" ON package_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_package_notes" ON package_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_pack_lists" ON pack_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_pack_list_items" ON pack_list_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_pack_list_packages" ON pack_list_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_audit_log" ON audit_log FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- Write access (permission-checked via has_permission())
-- =============================================================================

-- Users can update their own profile
CREATE POLICY "update_own_profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Inventory: requires gear_list edit permission
CREATE POLICY "write_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (has_permission('gear_list', 'edit'));
CREATE POLICY "edit_inventory" ON inventory FOR UPDATE TO authenticated USING (has_permission('gear_list', 'edit'));

-- Clients: requires clients edit permission
CREATE POLICY "write_clients" ON clients FOR INSERT TO authenticated WITH CHECK (has_permission('clients', 'edit'));
CREATE POLICY "edit_clients" ON clients FOR UPDATE TO authenticated USING (has_permission('clients', 'edit'));
CREATE POLICY "remove_clients" ON clients FOR DELETE TO authenticated USING (has_permission('clients', 'edit'));

-- Client notes: requires clients edit permission
CREATE POLICY "write_client_notes" ON client_notes FOR INSERT TO authenticated WITH CHECK (has_permission('clients', 'edit'));
CREATE POLICY "edit_client_notes" ON client_notes FOR UPDATE TO authenticated USING (has_permission('clients', 'edit'));
CREATE POLICY "delete_client_notes" ON client_notes FOR DELETE TO authenticated USING (has_permission('clients', 'edit'));

-- Item notes: requires item_details edit permission
CREATE POLICY "write_item_notes" ON item_notes FOR INSERT TO authenticated WITH CHECK (has_permission('item_details', 'edit'));
CREATE POLICY "edit_item_notes" ON item_notes FOR UPDATE TO authenticated USING (has_permission('item_details', 'edit'));
CREATE POLICY "delete_item_notes" ON item_notes FOR DELETE TO authenticated USING (has_permission('item_details', 'edit'));

-- Item reminders: requires item_details edit permission
CREATE POLICY "write_item_reminders" ON item_reminders FOR INSERT TO authenticated WITH CHECK (has_permission('item_details', 'edit'));
CREATE POLICY "edit_item_reminders" ON item_reminders FOR UPDATE TO authenticated USING (has_permission('item_details', 'edit'));
CREATE POLICY "remove_item_reminders" ON item_reminders FOR DELETE TO authenticated USING (has_permission('item_details', 'edit'));

-- Reservations: requires schedule edit permission
CREATE POLICY "write_reservations" ON reservations FOR INSERT TO authenticated WITH CHECK (has_permission('schedule', 'edit'));
CREATE POLICY "edit_reservations" ON reservations FOR UPDATE TO authenticated USING (has_permission('schedule', 'edit'));
CREATE POLICY "remove_reservations" ON reservations FOR DELETE TO authenticated USING (has_permission('schedule', 'edit'));

-- Maintenance: requires item_details edit permission
CREATE POLICY "write_maintenance" ON maintenance_records FOR INSERT TO authenticated WITH CHECK (has_permission('item_details', 'edit'));
CREATE POLICY "edit_maintenance" ON maintenance_records FOR UPDATE TO authenticated USING (has_permission('item_details', 'edit'));
CREATE POLICY "remove_maintenance" ON maintenance_records FOR DELETE TO authenticated USING (has_permission('item_details', 'edit'));

-- Checkout history: any authenticated user with view access can insert
CREATE POLICY "write_checkout_history" ON checkout_history FOR INSERT TO authenticated WITH CHECK (has_permission('gear_list', 'view'));

-- Packages: requires gear_list edit permission
CREATE POLICY "write_packages" ON packages FOR INSERT TO authenticated WITH CHECK (has_permission('gear_list', 'edit'));
CREATE POLICY "edit_packages" ON packages FOR UPDATE TO authenticated USING (has_permission('gear_list', 'edit'));
CREATE POLICY "remove_packages" ON packages FOR DELETE TO authenticated USING (has_permission('gear_list', 'edit'));

CREATE POLICY "write_package_items" ON package_items FOR ALL TO authenticated USING (has_permission('gear_list', 'edit'));
CREATE POLICY "write_package_notes" ON package_notes FOR INSERT TO authenticated WITH CHECK (has_permission('gear_list', 'edit'));
CREATE POLICY "edit_package_notes" ON package_notes FOR UPDATE TO authenticated USING (has_permission('gear_list', 'edit'));
CREATE POLICY "delete_package_notes" ON package_notes FOR DELETE TO authenticated USING (has_permission('gear_list', 'edit'));

-- Pack lists: requires pack_lists edit permission
CREATE POLICY "write_pack_lists" ON pack_lists FOR ALL TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "write_pack_list_items" ON pack_list_items FOR ALL TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "write_pack_list_packages" ON pack_list_packages FOR ALL TO authenticated USING (has_permission('pack_lists', 'edit'));

-- Pack list delete policies
CREATE POLICY "delete_pack_lists" ON pack_lists FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "delete_pack_list_items" ON pack_list_items FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "delete_pack_list_packages" ON pack_list_packages FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));

-- Locations: requires admin_locations edit permission
CREATE POLICY "write_locations" ON locations FOR INSERT TO authenticated WITH CHECK (has_permission('admin_locations', 'edit'));
CREATE POLICY "edit_locations" ON locations FOR UPDATE TO authenticated USING (has_permission('admin_locations', 'edit'));

-- Audit log: any authenticated user can insert (append-only trail)
CREATE POLICY "write_audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- Admin-only operations
-- =============================================================================

CREATE POLICY "admin_roles" ON roles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_inventory" ON inventory FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "admin_categories" ON categories FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_specs" ON specs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_locations" ON locations FOR DELETE TO authenticated USING (is_admin());

-- Admin user management
CREATE POLICY "admin_insert_users" ON users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_users" ON users FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_users" ON users FOR DELETE TO authenticated USING (is_admin());

-- Notification preferences: users manage their own
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Notification log: users see their own
CREATE POLICY "Users can view own notification log" ON notification_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Email templates: read-only for users, admin can modify
CREATE POLICY "Users can view email templates" ON email_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can modify email templates" ON email_templates
  FOR ALL TO authenticated USING (is_admin());
