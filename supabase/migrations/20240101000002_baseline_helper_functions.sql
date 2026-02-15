-- =============================================================================
-- SIMS Baseline Migration 3/8: Helper Functions
-- Functions needed by RLS policies and triggers
-- =============================================================================

-- Permission check: does the current user have the given level for a feature?
CREATE OR REPLACE FUNCTION has_permission(p_function_id TEXT, p_level TEXT DEFAULT 'edit')
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  permission_value TEXT;
BEGIN
  SELECT r.permissions INTO user_permissions
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = auth.uid();

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

-- Admin check: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role_id = 'role_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function: create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, name, email, role_id, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'role_user',
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function: maintain location materialized path
CREATE OR REPLACE FUNCTION update_location_path()
RETURNS TRIGGER AS $$
DECLARE
  parent_path TEXT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path = '/' || NEW.id || '/';
    NEW.depth = 0;
  ELSE
    SELECT path, depth + 1 INTO parent_path, NEW.depth
    FROM locations WHERE id = NEW.parent_id;
    NEW.path = parent_path || NEW.id || '/';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Utility: generate next item ID for a category prefix
CREATE OR REPLACE FUNCTION generate_item_id(category_prefix VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  max_num INTEGER;
  new_id VARCHAR;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 1000)
  INTO max_num
  FROM inventory
  WHERE id LIKE category_prefix || '%';

  new_id := category_prefix || (max_num + 1)::VARCHAR;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Utility: generate next client ID
CREATE OR REPLACE FUNCTION generate_client_id()
RETURNS VARCHAR AS $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(id FROM 3) AS INTEGER)), 0)
  INTO max_num
  FROM clients
  WHERE id LIKE 'CL%';

  RETURN 'CL' || LPAD((max_num + 1)::VARCHAR, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions for client-callable functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION has_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_item_id(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_client_id() TO authenticated;
