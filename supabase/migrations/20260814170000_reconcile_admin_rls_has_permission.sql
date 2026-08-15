-- =============================================================================
-- Reconcile remaining is_admin() RLS with the has_permission model
-- 2026-08-14
--
-- The client gates every admin surface on has_permission('admin_*', 'edit'),
-- but these policies (and the role-change trigger) still checked the literal
-- role_admin. A custom role granted admin_* edit saw fully rendered editors
-- whose saves always failed at RLS. For the built-in roles nothing changes:
-- only Administrator holds any admin_* key at edit level.
--
-- Deliberately NOT switched:
--   - inventory DELETE stays is_admin(): the permission model has no
--     "delete" level and item deletion is destructive; the client surfaces
--     blocked deletes honestly (inventoryService.delete detects 0-row deletes).
--   - email_templates writes stay is_admin(): no UI writes them.
--
-- Safe to run at any time relative to a client deploy — the client already
-- gates on the same keys, so built-in-role behavior is identical before and
-- after.
-- =============================================================================

-- users -----------------------------------------------------------------------
DROP POLICY IF EXISTS "update_users" ON users;
CREATE POLICY "update_users" ON users FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR has_permission('admin_users', 'edit'));

DROP POLICY IF EXISTS "admin_insert_users" ON users;
CREATE POLICY "admin_insert_users" ON users FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin_users', 'edit'));

DROP POLICY IF EXISTS "admin_delete_users" ON users;
CREATE POLICY "admin_delete_users" ON users FOR DELETE TO authenticated
  USING (has_permission('admin_users', 'edit'));

-- Role changes are additionally guarded by a trigger (RLS cannot restrict
-- columns); it must agree with the policies above or the drift just moves
-- from the policy layer into the trigger.
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    -- auth.uid() IS NULL means a trusted server-side context (service role /
    -- SQL editor), which bypasses RLS anyway. For authenticated users, only
    -- user administrators may change role assignments — including their own.
    IF (SELECT auth.uid()) IS NOT NULL AND NOT has_permission('admin_users', 'edit') THEN
      RAISE EXCEPTION 'Only user administrators can change user roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- roles -----------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_insert_roles" ON roles;
CREATE POLICY "admin_insert_roles" ON roles FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin_roles', 'edit'));

DROP POLICY IF EXISTS "admin_update_roles" ON roles;
CREATE POLICY "admin_update_roles" ON roles FOR UPDATE TO authenticated
  USING (has_permission('admin_roles', 'edit'));

DROP POLICY IF EXISTS "admin_delete_roles" ON roles;
CREATE POLICY "admin_delete_roles" ON roles FOR DELETE TO authenticated
  USING (has_permission('admin_roles', 'edit'));

-- categories ------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_insert_categories" ON categories;
CREATE POLICY "admin_insert_categories" ON categories FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin_categories', 'edit'));

DROP POLICY IF EXISTS "admin_update_categories" ON categories;
CREATE POLICY "admin_update_categories" ON categories FOR UPDATE TO authenticated
  USING (has_permission('admin_categories', 'edit'));

DROP POLICY IF EXISTS "admin_delete_categories" ON categories;
CREATE POLICY "admin_delete_categories" ON categories FOR DELETE TO authenticated
  USING (has_permission('admin_categories', 'edit'));

-- specs -----------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_insert_specs" ON specs;
CREATE POLICY "admin_insert_specs" ON specs FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin_specs', 'edit'));

DROP POLICY IF EXISTS "admin_update_specs" ON specs;
CREATE POLICY "admin_update_specs" ON specs FOR UPDATE TO authenticated
  USING (has_permission('admin_specs', 'edit'));

DROP POLICY IF EXISTS "admin_delete_specs" ON specs;
CREATE POLICY "admin_delete_specs" ON specs FOR DELETE TO authenticated
  USING (has_permission('admin_specs', 'edit'));

-- locations (INSERT/UPDATE already use has_permission) ------------------------
DROP POLICY IF EXISTS "admin_delete_locations" ON locations;
CREATE POLICY "admin_delete_locations" ON locations FOR DELETE TO authenticated
  USING (has_permission('admin_locations', 'edit'));

-- Legacy policy cleanup -------------------------------------------------------
-- The live databases predate schema.sql's per-command policy names and still
-- carry blanket ALL/duplicate policies. Permissive policies OR together, so
-- these kept granting literal-admin access alongside the reconciled policies
-- above; update_own_profile is fully covered by update_users' self arm.
DROP POLICY IF EXISTS "admin_categories" ON categories;
DROP POLICY IF EXISTS "admin_roles" ON roles;
DROP POLICY IF EXISTS "admin_specs" ON specs;
DROP POLICY IF EXISTS "admin_update_users" ON users;
DROP POLICY IF EXISTS "update_own_profile" ON users;
