-- =============================================================================
-- SIMS Baseline Migration 2/8: Tables, Indexes, and Default Configuration Data
-- =============================================================================

-- =============================================================================
-- ROLES
-- =============================================================================
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (id, name, description, is_system, permissions) VALUES
  ('role_admin', 'Administrator', 'Full access to all features', true,
   '{"dashboard":"edit","gear_list":"edit","item_details":"edit","schedule":"edit","pack_lists":"edit","clients":"edit","search":"edit","labels":"edit","reports":"edit","admin_users":"edit","admin_categories":"edit","admin_specs":"edit","admin_locations":"edit","admin_themes":"edit","admin_layout":"edit","admin_notifications":"edit","admin_roles":"edit","admin_audit":"edit"}'),
  ('role_manager', 'Manager', 'Can manage inventory and users, limited admin access', false,
   '{"dashboard":"edit","gear_list":"edit","item_details":"edit","schedule":"edit","pack_lists":"edit","clients":"edit","search":"edit","labels":"edit","reports":"view","admin_users":"view","admin_categories":"view","admin_specs":"view","admin_locations":"edit","admin_themes":"hide","admin_layout":"hide","admin_notifications":"hide","admin_roles":"hide","admin_audit":"view"}'),
  ('role_user', 'Standard User', 'Basic access for day-to-day operations', true,
   '{"dashboard":"view","gear_list":"view","item_details":"view","schedule":"edit","pack_lists":"edit","clients":"view","search":"view","labels":"view","reports":"hide","admin_users":"hide","admin_categories":"hide","admin_specs":"hide","admin_locations":"hide","admin_themes":"hide","admin_layout":"hide","admin_notifications":"hide","admin_roles":"hide","admin_audit":"hide"}'),
  ('role_viewer', 'Viewer', 'Read-only access to inventory', false,
   '{"dashboard":"view","gear_list":"view","item_details":"view","schedule":"view","pack_lists":"view","clients":"hide","search":"view","labels":"hide","reports":"hide","admin_users":"hide","admin_categories":"hide","admin_specs":"hide","admin_locations":"hide","admin_themes":"hide","admin_layout":"hide","admin_notifications":"hide","admin_roles":"hide","admin_audit":"hide"}')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- USERS (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role_id VARCHAR(50) REFERENCES roles(id) DEFAULT 'role_user',
  avatar VARCHAR(10),
  profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

-- =============================================================================
-- LOCATIONS (Adjacency List with Materialized Path)
-- =============================================================================
CREATE TABLE locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'room',
  parent_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
  path TEXT,
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);

INSERT INTO locations (id, name, type, parent_id, path, depth, sort_order) VALUES
  ('loc-studio-a', 'Studio A', 'building', NULL, '/loc-studio-a/', 0, 0),
  ('loc-studio-a-main', 'Main Floor', 'room', 'loc-studio-a', '/loc-studio-a/loc-studio-a-main/', 1, 0),
  ('loc-studio-a-shelf-1', 'Shelf 1', 'shelf', 'loc-studio-a-main', '/loc-studio-a/loc-studio-a-main/loc-studio-a-shelf-1/', 2, 0),
  ('loc-studio-a-shelf-2', 'Shelf 2', 'shelf', 'loc-studio-a-main', '/loc-studio-a/loc-studio-a-main/loc-studio-a-shelf-2/', 2, 1),
  ('loc-studio-a-shelf-3', 'Shelf 3', 'shelf', 'loc-studio-a-main', '/loc-studio-a/loc-studio-a-main/loc-studio-a-shelf-3/', 2, 2),
  ('loc-studio-a-lens', 'Lens Cabinet', 'cabinet', 'loc-studio-a', '/loc-studio-a/loc-studio-a-lens/', 1, 1),
  ('loc-studio-b', 'Studio B', 'building', NULL, '/loc-studio-b/', 0, 1),
  ('loc-studio-b-camera', 'Camera Cage', 'room', 'loc-studio-b', '/loc-studio-b/loc-studio-b-camera/', 1, 0),
  ('loc-studio-b-gimbal', 'Gimbal Area', 'room', 'loc-studio-b', '/loc-studio-b/loc-studio-b-gimbal/', 1, 1),
  ('loc-warehouse', 'Warehouse', 'building', NULL, '/loc-warehouse/', 0, 2),
  ('loc-warehouse-storage', 'Long-term Storage', 'room', 'loc-warehouse', '/loc-warehouse/loc-warehouse-storage/', 1, 0),
  ('loc-warehouse-staging', 'Staging Area', 'room', 'loc-warehouse', '/loc-warehouse/loc-warehouse-staging/', 1, 1),
  ('loc-accessories', 'Accessories Cabinet', 'cabinet', NULL, '/loc-accessories/', 0, 3),
  ('loc-repair', 'Repair Shop', 'external', NULL, '/loc-repair/', 0, 4)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CATEGORIES
-- =============================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  prefix VARCHAR(10) NOT NULL UNIQUE,
  track_quantity BOOLEAN DEFAULT false,
  track_serial_numbers BOOLEAN DEFAULT true,
  low_stock_threshold INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, prefix, track_quantity, track_serial_numbers, low_stock_threshold, sort_order) VALUES
  ('Cameras', 'CA', false, true, 0, 0),
  ('Lenses', 'LE', false, true, 0, 1),
  ('Lighting', 'LI', true, false, 2, 2),
  ('Audio', 'AU', true, false, 2, 3),
  ('Support', 'SU', true, false, 1, 4),
  ('Accessories', 'AC', true, false, 3, 5),
  ('Storage', 'ST', true, false, 5, 6),
  ('Grip', 'GR', true, false, 2, 7),
  ('Monitors', 'MO', false, true, 0, 8),
  ('Power', 'PW', true, false, 3, 9)
ON CONFLICT (name) DO UPDATE SET
  prefix = EXCLUDED.prefix,
  track_quantity = EXCLUDED.track_quantity,
  track_serial_numbers = EXCLUDED.track_serial_numbers,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- SPECS (Specification fields per category)
-- =============================================================================
CREATE TABLE specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_name VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_name, name)
);

CREATE INDEX IF NOT EXISTS idx_specs_category ON specs(category_name);

-- =============================================================================
-- CLIENTS
-- =============================================================================
CREATE TABLE clients (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Individual',
  company VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  notes TEXT,
  favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);
CREATE INDEX IF NOT EXISTS idx_clients_favorite ON clients(favorite) WHERE favorite = true;

-- =============================================================================
-- CLIENT NOTES (Threaded)
-- =============================================================================
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(20) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES client_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_client ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_parent ON client_notes(parent_id);

-- =============================================================================
-- INVENTORY (Core item data)
-- =============================================================================
CREATE TABLE inventory (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'available',
  condition VARCHAR(50) DEFAULT 'excellent',
  location_id VARCHAR(50) REFERENCES locations(id) ON DELETE SET NULL,
  location_display VARCHAR(255),
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  serial_number VARCHAR(100),
  image TEXT,
  specs JSONB DEFAULT '{}',

  -- Quantity tracking (for consumables)
  quantity INTEGER DEFAULT 1,
  reorder_point INTEGER DEFAULT 0,

  -- Checkout state
  checked_out_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  checked_out_to_name VARCHAR(255),
  checked_out_date DATE,
  due_back DATE,
  checkout_project VARCHAR(255),
  checkout_client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,

  -- Kit/Container fields
  is_kit BOOLEAN DEFAULT false,
  kit_type VARCHAR(50),
  kit_contents JSONB DEFAULT '[]',

  -- Statistics
  view_count INTEGER DEFAULT 0,
  checkout_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category_name);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory(name);
CREATE INDEX IF NOT EXISTS idx_inventory_brand ON inventory(brand);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_checked_out ON inventory(checked_out_to_user_id) WHERE checked_out_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_due_back ON inventory(due_back) WHERE due_back IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_is_kit ON inventory(is_kit) WHERE is_kit = true;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_inventory_search ON inventory
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(brand, '') || ' ' || id || ' ' || COALESCE(serial_number, '')));

-- =============================================================================
-- ITEM NOTES (Threaded)
-- =============================================================================
CREATE TABLE item_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES item_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_notes_item ON item_notes(item_id);
CREATE INDEX IF NOT EXISTS idx_item_notes_parent ON item_notes(parent_id);

-- =============================================================================
-- ITEM REMINDERS
-- =============================================================================
CREATE TABLE item_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  recurrence VARCHAR(50) DEFAULT 'none',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_reminders_item ON item_reminders(item_id);
CREATE INDEX IF NOT EXISTS idx_item_reminders_due ON item_reminders(due_date) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_item_reminders_completed ON item_reminders(completed);

-- =============================================================================
-- RESERVATIONS
-- =============================================================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),

  project VARCHAR(255),
  project_type VARCHAR(50) DEFAULT 'Other',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255),

  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),

  status VARCHAR(50) DEFAULT 'confirmed',
  notes JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_reservations_item ON reservations(item_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client ON reservations(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_project_type ON reservations(project_type);

-- =============================================================================
-- MAINTENANCE RECORDS
-- =============================================================================
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,

  type VARCHAR(100) NOT NULL,
  description TEXT,
  vendor VARCHAR(255),
  vendor_contact VARCHAR(255),
  cost DECIMAL(10, 2) DEFAULT 0,

  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(50) DEFAULT 'scheduled',

  notes TEXT,
  warranty_work BOOLEAN DEFAULT false,

  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_item ON maintenance_records(item_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON maintenance_records(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON maintenance_records(type);

-- =============================================================================
-- CHECKOUT HISTORY
-- =============================================================================
CREATE TABLE checkout_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),

  action VARCHAR(50) NOT NULL,
  project VARCHAR(255),
  notes TEXT,
  condition_at_action VARCHAR(50),

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_history_item ON checkout_history(item_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_user ON checkout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_client ON checkout_history(client_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_timestamp ON checkout_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_history_action ON checkout_history(action);

-- =============================================================================
-- PACKAGES
-- =============================================================================
CREATE TABLE packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_name VARCHAR(100),
  item_quantities JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_name);

-- =============================================================================
-- PACKAGE ITEMS (Junction table)
-- =============================================================================
CREATE TABLE package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id VARCHAR(50) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(package_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_package_items_package ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_package_items_item ON package_items(item_id);

-- =============================================================================
-- PACKAGE NOTES
-- =============================================================================
CREATE TABLE package_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id VARCHAR(50) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES package_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_package_notes_package ON package_notes(package_id);

-- =============================================================================
-- PACK LISTS
-- =============================================================================
CREATE TABLE pack_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  project VARCHAR(255),
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pack_lists_name ON pack_lists(name);
CREATE INDEX IF NOT EXISTS idx_pack_lists_created_by ON pack_lists(created_by_id);

-- =============================================================================
-- PACK LIST ITEMS (Junction table)
-- =============================================================================
CREATE TABLE pack_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_list_id UUID NOT NULL REFERENCES pack_lists(id) ON DELETE CASCADE,
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pack_list_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_list_items_list ON pack_list_items(pack_list_id);
CREATE INDEX IF NOT EXISTS idx_pack_list_items_item ON pack_list_items(item_id);

-- =============================================================================
-- PACK LIST PACKAGES (Junction table)
-- =============================================================================
CREATE TABLE pack_list_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_list_id UUID NOT NULL REFERENCES pack_lists(id) ON DELETE CASCADE,
  package_id VARCHAR(50) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pack_list_id, package_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_list_packages_list ON pack_list_packages(pack_list_id);
CREATE INDEX IF NOT EXISTS idx_pack_list_packages_package ON pack_list_packages(package_id);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL,
  description TEXT,

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),

  item_id VARCHAR(20),
  client_id VARCHAR(20),
  package_id VARCHAR(50),
  pack_list_id UUID,
  reservation_id UUID,

  metadata JSONB DEFAULT '{}',

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_item ON audit_log(item_id);

-- =============================================================================
-- NOTIFICATION PREFERENCES
-- =============================================================================
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  email_enabled BOOLEAN DEFAULT true,

  due_date_reminders BOOLEAN DEFAULT true,
  due_date_reminder_days INTEGER[] DEFAULT '{1, 3}',
  overdue_notifications BOOLEAN DEFAULT true,

  reservation_confirmations BOOLEAN DEFAULT true,
  reservation_reminders BOOLEAN DEFAULT true,
  reservation_reminder_days INTEGER DEFAULT 1,

  maintenance_reminders BOOLEAN DEFAULT true,

  checkout_confirmations BOOLEAN DEFAULT true,
  checkin_confirmations BOOLEAN DEFAULT true,

  admin_low_stock_alerts BOOLEAN DEFAULT false,
  admin_damage_reports BOOLEAN DEFAULT true,
  admin_overdue_summary BOOLEAN DEFAULT false,
  admin_overdue_summary_frequency VARCHAR(20) DEFAULT 'daily',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- =============================================================================
-- NOTIFICATION LOG
-- =============================================================================
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,

  notification_type VARCHAR(100) NOT NULL,
  subject VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,

  item_id VARCHAR(20),
  reservation_id UUID,
  reminder_id UUID,

  dedup_key VARCHAR(255),
  external_id VARCHAR(255),

  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_dedup ON notification_log(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at DESC);

-- =============================================================================
-- EMAIL TEMPLATES
-- =============================================================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,

  variables JSONB DEFAULT '[]',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
