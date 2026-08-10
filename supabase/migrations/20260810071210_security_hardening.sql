-- =============================================================================
-- Security Hardening Migration
-- 2026-08-10
--
-- 1. Privilege-escalation guard on users.role_id
--    The "update_users" RLS policy allows any user to update their own row
--    (USING id = auth.uid() OR is_admin()) with no column restriction, so a
--    non-admin could set role_id = 'role_admin' on themselves from the browser
--    console. RLS cannot restrict columns, so a BEFORE UPDATE trigger enforces
--    that only admins may change role assignments.
--
-- 2. Storage policies scoped by permission
--    UPDATE/DELETE (and INSERT) on the equipment-images bucket previously
--    required only "authenticated", letting a read-only Viewer overwrite or
--    delete every image in the studio. Equipment images now require the same
--    gear_list edit permission the inventory tables already use; profile
--    logos (profiles/<uid>/...) remain manageable by their owner only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Guard role changes on users
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
    -- auth.uid() IS NULL means a trusted server-side context (service role /
    -- SQL editor), which bypasses RLS anyway. For authenticated users, only
    -- admins may change role assignments — including their own row.
    IF (SELECT auth.uid()) IS NOT NULL AND NOT is_admin() THEN
      RAISE EXCEPTION 'Only administrators can change user roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_role_escalation ON users;
CREATE TRIGGER guard_role_escalation
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- -----------------------------------------------------------------------------
-- 2. Scope storage write policies by permission
-- -----------------------------------------------------------------------------
-- Path convention in the equipment-images bucket:
--   <item-id>/<timestamp>.jpg          equipment photos  -> gear_list edit
--   profiles/<user-id>/<timestamp>.jpg profile logos     -> owner only

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;

CREATE POLICY "Editors can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'equipment-images'
  AND (
    CASE WHEN (storage.foldername(name))[1] = 'profiles'
         THEN (storage.foldername(name))[2] = (SELECT auth.uid())::text
         ELSE has_permission('gear_list', 'edit')
    END
  )
);

CREATE POLICY "Editors can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'equipment-images'
  AND (
    CASE WHEN (storage.foldername(name))[1] = 'profiles'
         THEN (storage.foldername(name))[2] = (SELECT auth.uid())::text
         ELSE has_permission('gear_list', 'edit')
    END
  )
);

CREATE POLICY "Editors can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'equipment-images'
  AND (
    CASE WHEN (storage.foldername(name))[1] = 'profiles'
         THEN (storage.foldername(name))[2] = (SELECT auth.uid())::text
         ELSE has_permission('gear_list', 'edit')
    END
  )
);
