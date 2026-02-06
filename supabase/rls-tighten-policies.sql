-- =============================================================================
-- SIMS RLS Policy Tightening
-- Replaces overly permissive USING(true) write policies with permission checks
-- Run AFTER rls-policy-fixes.sql in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- Helper function: Check if current user has 'edit' permission for a function
-- Uses the JSONB permissions column on the roles table
-- =============================================================================
CREATE OR REPLACE FUNCTION has_permission(p_function_id TEXT, p_level TEXT DEFAULT 'edit')
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  permission_value TEXT;
BEGIN
  -- Get the user's role permissions
  SELECT r.permissions INTO user_permissions
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();

  -- If no permissions found, deny
  IF user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get the permission value for the requested function
  permission_value := user_permissions ->> p_function_id;

  -- Check against requested level
  IF p_level = 'view' THEN
    RETURN permission_value IN ('view', 'edit');
  ELSIF p_level = 'edit' THEN
    RETURN permission_value = 'edit';
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- Drop existing overly permissive write policies
-- =============================================================================

-- Inventory
DROP POLICY IF EXISTS "insert_inventory" ON inventory;
DROP POLICY IF EXISTS "update_inventory" ON inventory;

-- Clients  
DROP POLICY IF EXISTS "insert_clients" ON clients;
DROP POLICY IF EXISTS "update_clients" ON clients;
DROP POLICY IF EXISTS "delete_clients" ON clients;

-- Client notes
DROP POLICY IF EXISTS "insert_client_notes" ON client_notes;
DROP POLICY IF EXISTS "update_client_notes" ON client_notes;

-- Item notes
DROP POLICY IF EXISTS "insert_item_notes" ON item_notes;
DROP POLICY IF EXISTS "update_item_notes" ON item_notes;

-- Item reminders
DROP POLICY IF EXISTS "insert_item_reminders" ON item_reminders;
DROP POLICY IF EXISTS "update_item_reminders" ON item_reminders;
DROP POLICY IF EXISTS "delete_item_reminders" ON item_reminders;

-- Reservations
DROP POLICY IF EXISTS "insert_reservations" ON reservations;
DROP POLICY IF EXISTS "update_reservations" ON reservations;
DROP POLICY IF EXISTS "delete_reservations" ON reservations;

-- Maintenance
DROP POLICY IF EXISTS "insert_maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "update_maintenance" ON maintenance_records;
DROP POLICY IF EXISTS "delete_maintenance" ON maintenance_records;

-- Checkout history
DROP POLICY IF EXISTS "insert_checkout_history" ON checkout_history;

-- Packages
DROP POLICY IF EXISTS "insert_packages" ON packages;
DROP POLICY IF EXISTS "update_packages" ON packages;
DROP POLICY IF EXISTS "delete_packages" ON packages;
DROP POLICY IF EXISTS "all_package_items" ON package_items;
DROP POLICY IF EXISTS "insert_package_notes" ON package_notes;
DROP POLICY IF EXISTS "update_package_notes" ON package_notes;

-- Pack lists
DROP POLICY IF EXISTS "all_pack_lists" ON pack_lists;
DROP POLICY IF EXISTS "all_pack_list_items" ON pack_list_items;
DROP POLICY IF EXISTS "all_pack_list_packages" ON pack_list_packages;

-- Locations
DROP POLICY IF EXISTS "insert_locations" ON locations;
DROP POLICY IF EXISTS "update_locations" ON locations;

-- Audit log
DROP POLICY IF EXISTS "insert_audit_log" ON audit_log;

-- =============================================================================
-- Recreate write policies with permission checks
-- =============================================================================

-- INVENTORY: requires gear_list edit permission
CREATE POLICY "write_inventory" ON inventory 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('gear_list', 'edit'));

CREATE POLICY "edit_inventory" ON inventory 
  FOR UPDATE TO authenticated 
  USING (has_permission('gear_list', 'edit'));

-- CLIENTS: requires clients edit permission
CREATE POLICY "write_clients" ON clients 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('clients', 'edit'));

CREATE POLICY "edit_clients" ON clients 
  FOR UPDATE TO authenticated 
  USING (has_permission('clients', 'edit'));

CREATE POLICY "remove_clients" ON clients 
  FOR DELETE TO authenticated 
  USING (has_permission('clients', 'edit'));

-- CLIENT NOTES: requires clients edit permission
CREATE POLICY "write_client_notes" ON client_notes 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('clients', 'edit'));

CREATE POLICY "edit_client_notes" ON client_notes 
  FOR UPDATE TO authenticated 
  USING (has_permission('clients', 'edit'));

-- ITEM NOTES: requires item_details edit permission
CREATE POLICY "write_item_notes" ON item_notes 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('item_details', 'edit'));

CREATE POLICY "edit_item_notes" ON item_notes 
  FOR UPDATE TO authenticated 
  USING (has_permission('item_details', 'edit'));

-- ITEM REMINDERS: requires item_details edit permission
CREATE POLICY "write_item_reminders" ON item_reminders 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('item_details', 'edit'));

CREATE POLICY "edit_item_reminders" ON item_reminders 
  FOR UPDATE TO authenticated 
  USING (has_permission('item_details', 'edit'));

CREATE POLICY "remove_item_reminders" ON item_reminders 
  FOR DELETE TO authenticated 
  USING (has_permission('item_details', 'edit'));

-- RESERVATIONS: requires schedule edit permission
CREATE POLICY "write_reservations" ON reservations 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('schedule', 'edit'));

CREATE POLICY "edit_reservations" ON reservations 
  FOR UPDATE TO authenticated 
  USING (has_permission('schedule', 'edit'));

CREATE POLICY "remove_reservations" ON reservations 
  FOR DELETE TO authenticated 
  USING (has_permission('schedule', 'edit'));

-- MAINTENANCE: requires item_details edit permission
CREATE POLICY "write_maintenance" ON maintenance_records 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('item_details', 'edit'));

CREATE POLICY "edit_maintenance" ON maintenance_records 
  FOR UPDATE TO authenticated 
  USING (has_permission('item_details', 'edit'));

CREATE POLICY "remove_maintenance" ON maintenance_records 
  FOR DELETE TO authenticated 
  USING (has_permission('item_details', 'edit'));

-- CHECKOUT HISTORY: any authenticated user can insert (triggered by checkout/checkin)
-- but only admins can modify/delete (append-only for most users)
CREATE POLICY "write_checkout_history" ON checkout_history 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('gear_list', 'view'));

-- PACKAGES: requires gear_list edit permission
CREATE POLICY "write_packages" ON packages 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('gear_list', 'edit'));

CREATE POLICY "edit_packages" ON packages 
  FOR UPDATE TO authenticated 
  USING (has_permission('gear_list', 'edit'));

CREATE POLICY "remove_packages" ON packages 
  FOR DELETE TO authenticated 
  USING (has_permission('gear_list', 'edit'));

CREATE POLICY "write_package_items" ON package_items 
  FOR ALL TO authenticated 
  USING (has_permission('gear_list', 'edit'));

CREATE POLICY "write_package_notes" ON package_notes 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('gear_list', 'edit'));

CREATE POLICY "edit_package_notes" ON package_notes 
  FOR UPDATE TO authenticated 
  USING (has_permission('gear_list', 'edit'));

-- PACK LISTS: requires pack_lists edit permission
CREATE POLICY "write_pack_lists" ON pack_lists 
  FOR ALL TO authenticated 
  USING (has_permission('pack_lists', 'edit'));

CREATE POLICY "write_pack_list_items" ON pack_list_items 
  FOR ALL TO authenticated 
  USING (has_permission('pack_lists', 'edit'));

CREATE POLICY "write_pack_list_packages" ON pack_list_packages 
  FOR ALL TO authenticated 
  USING (has_permission('pack_lists', 'edit'));

-- LOCATIONS: requires admin_locations edit permission
CREATE POLICY "write_locations" ON locations 
  FOR INSERT TO authenticated 
  WITH CHECK (has_permission('admin_locations', 'edit'));

CREATE POLICY "edit_locations" ON locations 
  FOR UPDATE TO authenticated 
  USING (has_permission('admin_locations', 'edit'));

-- AUDIT LOG: any authenticated user can insert (the app logs actions on their behalf)
CREATE POLICY "write_audit_log" ON audit_log 
  FOR INSERT TO authenticated 
  WITH CHECK (true);
