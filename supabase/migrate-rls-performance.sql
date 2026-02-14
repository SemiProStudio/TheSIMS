-- =============================================================================
-- SIMS: RLS Performance Optimization Migration
-- Resolves Supabase database linter warnings:
--   - auth_rls_initplan: wrap auth.uid() in (select ...) for single evaluation
--   - multiple_permissive_policies: eliminate duplicate SELECT paths
-- Run in Supabase SQL Editor
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: Update helper functions to use (select auth.uid())
-- This fixes auth_rls_initplan for ALL policies that call these functions
-- =============================================================================

CREATE OR REPLACE FUNCTION has_permission(p_function_id TEXT, p_level TEXT DEFAULT 'edit')
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  permission_value TEXT;
BEGIN
  SELECT r.permissions INTO user_permissions
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = (select auth.uid());

  IF user_permissions IS NULL THEN
    RETURN FALSE;
  END IF;

  permission_value := user_permissions ->> p_function_id;

  IF p_level = 'view' THEN
    RETURN permission_value IN ('view', 'edit');
  ELSIF p_level = 'edit' THEN
    RETURN permission_value = 'edit';
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = (select auth.uid())
    AND users.role_id = 'role_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- SECTION 2: Fix auth.uid() in direct-use policies (auth_rls_initplan)
-- Drop and recreate with (select auth.uid()) wrapper
-- =============================================================================

-- users.update_own_profile
DROP POLICY IF EXISTS "update_own_profile" ON users;
CREATE POLICY "update_own_profile" ON users
  FOR UPDATE TO authenticated USING (id = (select auth.uid()));

-- notification_preferences: 3 policies
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences" ON notification_preferences
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

-- notification_log: 1 policy
DROP POLICY IF EXISTS "Users can view own notification log" ON notification_log;
CREATE POLICY "Users can view own notification log" ON notification_log
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

-- =============================================================================
-- SECTION 3: Drop phantom "Allow authenticated read" policies
-- These were created outside the tracked schema and duplicate the read_* policies
-- =============================================================================

DROP POLICY IF EXISTS "Allow authenticated read" ON roles;
DROP POLICY IF EXISTS "Allow authenticated read" ON users;
DROP POLICY IF EXISTS "Allow authenticated read" ON locations;
DROP POLICY IF EXISTS "Allow authenticated read" ON categories;
DROP POLICY IF EXISTS "Allow authenticated read" ON specs;
DROP POLICY IF EXISTS "Allow authenticated read" ON clients;
DROP POLICY IF EXISTS "Allow authenticated read" ON client_notes;
DROP POLICY IF EXISTS "Allow authenticated read" ON inventory;
DROP POLICY IF EXISTS "Allow authenticated read" ON item_notes;
DROP POLICY IF EXISTS "Allow authenticated read" ON item_reminders;
DROP POLICY IF EXISTS "Allow authenticated read" ON reservations;
DROP POLICY IF EXISTS "Allow authenticated read" ON maintenance_records;
DROP POLICY IF EXISTS "Allow authenticated read" ON checkout_history;
DROP POLICY IF EXISTS "Allow authenticated read" ON packages;
DROP POLICY IF EXISTS "Allow authenticated read" ON package_items;
DROP POLICY IF EXISTS "Allow authenticated read" ON package_notes;
DROP POLICY IF EXISTS "Allow authenticated read" ON pack_lists;
DROP POLICY IF EXISTS "Allow authenticated read" ON pack_list_items;
DROP POLICY IF EXISTS "Allow authenticated read" ON pack_list_packages;
DROP POLICY IF EXISTS "Allow authenticated read" ON audit_log;
DROP POLICY IF EXISTS "Allow authenticated read" ON notification_preferences;
DROP POLICY IF EXISTS "Allow authenticated read" ON notification_log;
DROP POLICY IF EXISTS "Allow authenticated read" ON email_templates;

-- =============================================================================
-- SECTION 4: Replace FOR ALL policies with specific per-action policies
-- FOR ALL implicitly creates a SELECT path, duplicating the read_* policies
-- =============================================================================

-- roles: admin_roles (FOR ALL) → separate INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "admin_roles" ON roles;
DROP POLICY IF EXISTS "admin_insert_roles" ON roles;
DROP POLICY IF EXISTS "admin_update_roles" ON roles;
DROP POLICY IF EXISTS "admin_delete_roles" ON roles;
CREATE POLICY "admin_insert_roles" ON roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_roles" ON roles FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_roles" ON roles FOR DELETE TO authenticated USING (is_admin());

-- categories: admin_categories (FOR ALL) → separate INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "admin_categories" ON categories;
DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
DROP POLICY IF EXISTS "admin_update_categories" ON categories;
DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated USING (is_admin());

-- specs: admin_specs (FOR ALL) → separate INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "admin_specs" ON specs;
DROP POLICY IF EXISTS "admin_insert_specs" ON specs;
DROP POLICY IF EXISTS "admin_update_specs" ON specs;
DROP POLICY IF EXISTS "admin_delete_specs" ON specs;
CREATE POLICY "admin_insert_specs" ON specs FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_specs" ON specs FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_specs" ON specs FOR DELETE TO authenticated USING (is_admin());

-- email_templates: "Admin can modify email templates" (FOR ALL) → INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Admin can modify email templates" ON email_templates;
DROP POLICY IF EXISTS "Admin can insert email templates" ON email_templates;
DROP POLICY IF EXISTS "Admin can update email templates" ON email_templates;
DROP POLICY IF EXISTS "Admin can delete email templates" ON email_templates;
CREATE POLICY "Admin can insert email templates" ON email_templates
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin can update email templates" ON email_templates
  FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin can delete email templates" ON email_templates
  FOR DELETE TO authenticated USING (is_admin());

-- package_items: write_package_items (FOR ALL) → INSERT/UPDATE/DELETE
-- Drop the FOR ALL policy plus any pre-existing per-action policies
DROP POLICY IF EXISTS "write_package_items" ON package_items;
DROP POLICY IF EXISTS "insert_package_items" ON package_items;
DROP POLICY IF EXISTS "edit_package_items" ON package_items;
DROP POLICY IF EXISTS "remove_package_items" ON package_items;
CREATE POLICY "insert_package_items" ON package_items FOR INSERT TO authenticated WITH CHECK (has_permission('gear_list', 'edit'));
CREATE POLICY "edit_package_items" ON package_items FOR UPDATE TO authenticated USING (has_permission('gear_list', 'edit'));
CREATE POLICY "remove_package_items" ON package_items FOR DELETE TO authenticated USING (has_permission('gear_list', 'edit'));

-- pack_lists: write_pack_lists (FOR ALL) → INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "write_pack_lists" ON pack_lists;
DROP POLICY IF EXISTS "delete_pack_lists" ON pack_lists;
DROP POLICY IF EXISTS "insert_pack_lists" ON pack_lists;
DROP POLICY IF EXISTS "edit_pack_lists" ON pack_lists;
DROP POLICY IF EXISTS "remove_pack_lists" ON pack_lists;
CREATE POLICY "insert_pack_lists" ON pack_lists FOR INSERT TO authenticated WITH CHECK (has_permission('pack_lists', 'edit'));
CREATE POLICY "edit_pack_lists" ON pack_lists FOR UPDATE TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "remove_pack_lists" ON pack_lists FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));

-- pack_list_items: write_pack_list_items (FOR ALL) → INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "write_pack_list_items" ON pack_list_items;
DROP POLICY IF EXISTS "delete_pack_list_items" ON pack_list_items;
DROP POLICY IF EXISTS "insert_pack_list_items" ON pack_list_items;
DROP POLICY IF EXISTS "edit_pack_list_items" ON pack_list_items;
DROP POLICY IF EXISTS "remove_pack_list_items" ON pack_list_items;
CREATE POLICY "insert_pack_list_items" ON pack_list_items FOR INSERT TO authenticated WITH CHECK (has_permission('pack_lists', 'edit'));
CREATE POLICY "edit_pack_list_items" ON pack_list_items FOR UPDATE TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "remove_pack_list_items" ON pack_list_items FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));

-- pack_list_packages: write_pack_list_packages (FOR ALL) → INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "write_pack_list_packages" ON pack_list_packages;
DROP POLICY IF EXISTS "delete_pack_list_packages" ON pack_list_packages;
DROP POLICY IF EXISTS "insert_pack_list_packages" ON pack_list_packages;
DROP POLICY IF EXISTS "edit_pack_list_packages" ON pack_list_packages;
DROP POLICY IF EXISTS "remove_pack_list_packages" ON pack_list_packages;
CREATE POLICY "insert_pack_list_packages" ON pack_list_packages FOR INSERT TO authenticated WITH CHECK (has_permission('pack_lists', 'edit'));
CREATE POLICY "edit_pack_list_packages" ON pack_list_packages FOR UPDATE TO authenticated USING (has_permission('pack_lists', 'edit'));
CREATE POLICY "remove_pack_list_packages" ON pack_list_packages FOR DELETE TO authenticated USING (has_permission('pack_lists', 'edit'));

-- =============================================================================
-- SECTION 5: Consolidate users UPDATE policies
-- admin_update_users and update_own_profile are both permissive UPDATE policies
-- for the same role (authenticated), causing a multiple_permissive_policies warning.
-- Merge into a single policy: allow if user owns the row OR is admin.
-- =============================================================================

DROP POLICY IF EXISTS "update_own_profile" ON users;
DROP POLICY IF EXISTS "admin_update_users" ON users;
CREATE POLICY "update_users" ON users
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR is_admin());

COMMIT;
