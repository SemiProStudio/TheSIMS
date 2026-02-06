-- =============================================================================
-- SIMS RLS Policy Fixes
-- Adds missing DELETE policies and admin INSERT policy for users
-- Run in Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- QW5: Missing DELETE policies for tables that need them
-- =============================================================================

-- Notes should be deletable by any authenticated user (soft delete pattern preferred,
-- but hard delete needs to work too for cleanup)
CREATE POLICY "delete_client_notes" ON client_notes 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "delete_item_notes" ON item_notes 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "delete_package_notes" ON package_notes 
  FOR DELETE TO authenticated USING (true);

-- Pack list management (already has FOR ALL but adding explicit DELETE for clarity)
CREATE POLICY "delete_pack_lists" ON pack_lists 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "delete_pack_list_items" ON pack_list_items 
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "delete_pack_list_packages" ON pack_list_packages 
  FOR DELETE TO authenticated USING (true);

-- Package items should be deletable when editing packages
CREATE POLICY "delete_package_items" ON package_items 
  FOR DELETE TO authenticated USING (true);

-- =============================================================================
-- QW6: Admin INSERT policy for users table
-- Without this, AddUserModal can't create user records in the database
-- =============================================================================

CREATE POLICY "admin_insert_users" ON users 
  FOR INSERT TO authenticated 
  WITH CHECK (is_admin());

-- Also allow admins to update any user (for role changes, etc.)
CREATE POLICY "admin_update_users" ON users 
  FOR UPDATE TO authenticated 
  USING (is_admin());

-- Allow admins to delete users
CREATE POLICY "admin_delete_users" ON users 
  FOR DELETE TO authenticated 
  USING (is_admin());

-- =============================================================================
-- Intentionally NO delete policies for these tables (append-only):
--   audit_log      — audit trail must be immutable
--   checkout_history — historical record must be preserved  
--   roles          — admin-only via existing admin_roles FOR ALL policy
--   categories     — admin-only via existing admin_categories FOR ALL policy
--   specs          — admin-only via existing admin_specs FOR ALL policy
-- =============================================================================
