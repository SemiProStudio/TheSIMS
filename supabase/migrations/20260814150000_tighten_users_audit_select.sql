-- =============================================================================
-- Tighten SELECT on users and audit_log
-- Every table allowed SELECT USING (true) to any authenticated user, which
-- let a Viewer-role account dump user emails/profiles and the full audit
-- trail from the browser console — exactly the data the admin-gated Export
-- Data button protects in the UI.
--
-- users: a user always sees their own row (login/session restore, profile
-- and settings persistence); the full directory requires admin_users view —
-- the same permission that renders the Manage Users panel.
-- audit_log: reads require admin_audit view, matching the Audit Log page
-- gate. Writes are unaffected (write_audit_log stays open) — the client no
-- longer chains .select() onto audit inserts, which would otherwise have
-- needed SELECT visibility for the RETURNING row.
--
-- has_permission() is SECURITY DEFINER, so no RLS recursion.
-- =============================================================================

DROP POLICY IF EXISTS "read_users" ON users;
CREATE POLICY "read_users" ON users FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR has_permission('admin_users', 'view'));

DROP POLICY IF EXISTS "read_audit_log" ON audit_log;
CREATE POLICY "read_audit_log" ON audit_log FOR SELECT TO authenticated
  USING (has_permission('admin_audit', 'view'));
