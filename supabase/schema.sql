-- =============================================================================
-- SIMS Database Schema for Supabase (Normalized)
-- Version 2.0 - Full normalization for scalability
-- Run this in your Supabase SQL Editor to set up the database
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- DROP EXISTING OBJECTS (for clean install)
-- =============================================================================
-- Uncomment these lines if you need to reset the database
-- DROP VIEW IF EXISTS inventory_with_status CASCADE;
-- DROP VIEW IF EXISTS dashboard_stats CASCADE;
-- DROP VIEW IF EXISTS reservation_calendar CASCADE;
-- DROP VIEW IF EXISTS client_rental_history CASCADE;
-- DROP TABLE IF EXISTS checkout_history CASCADE;
-- DROP TABLE IF EXISTS item_reminders CASCADE;
-- DROP TABLE IF EXISTS item_notes CASCADE;
-- DROP TABLE IF EXISTS client_notes CASCADE;
-- DROP TABLE IF EXISTS maintenance_records CASCADE;
-- DROP TABLE IF EXISTS reservations CASCADE;
-- DROP TABLE IF EXISTS pack_list_packages CASCADE;
-- DROP TABLE IF EXISTS pack_list_items CASCADE;
-- DROP TABLE IF EXISTS pack_lists CASCADE;
-- DROP TABLE IF EXISTS package_notes CASCADE;
-- DROP TABLE IF EXISTS package_items CASCADE;
-- DROP TABLE IF EXISTS packages CASCADE;
-- DROP TABLE IF EXISTS inventory CASCADE;
-- DROP TABLE IF EXISTS specs CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS clients CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- =============================================================================
-- ROLES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
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
-- USERS TABLE (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
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
-- LOCATIONS TABLE (Adjacency List with Materialized Path)
-- =============================================================================
CREATE TABLE IF NOT EXISTS locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'room',
  parent_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
  path TEXT, -- Materialized path for efficient tree queries
  depth INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(type);

-- Insert default locations
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
-- CATEGORIES TABLE (Enhanced)
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
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

-- Insert default categories with settings
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
-- SPECS TABLE (Specification fields per category)
-- =============================================================================
CREATE TABLE IF NOT EXISTS specs (
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
-- CLIENTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'Individual', -- Individual, Company, Agency
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
-- CLIENT NOTES TABLE (Threaded notes for clients)
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_notes (
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
-- INVENTORY TABLE (Core item data only)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  category_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'available',
  condition VARCHAR(50) DEFAULT 'excellent',
  location_id VARCHAR(50) REFERENCES locations(id) ON DELETE SET NULL,
  location_display VARCHAR(255), -- Denormalized for display
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

-- Create indexes for common queries
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
-- ITEM NOTES TABLE (Threaded notes for inventory items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS item_notes (
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
-- ITEM REMINDERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS item_reminders (
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
-- RESERVATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(255),
  
  -- Reservation details
  project VARCHAR(255),
  project_type VARCHAR(50) DEFAULT 'Other',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255),
  
  -- Contact info
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  
  -- Status and notes
  status VARCHAR(50) DEFAULT 'confirmed',
  notes JSONB DEFAULT '[]',
  
  -- Timestamps
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
-- MAINTENANCE RECORDS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  
  -- Maintenance details
  type VARCHAR(100) NOT NULL,
  description TEXT,
  vendor VARCHAR(255),
  vendor_contact VARCHAR(255),
  cost DECIMAL(10, 2) DEFAULT 0,
  
  -- Scheduling
  scheduled_date DATE,
  completed_date DATE,
  status VARCHAR(50) DEFAULT 'scheduled',
  
  -- Additional info
  notes TEXT,
  warranty_work BOOLEAN DEFAULT false,
  
  -- Tracking
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
-- CHECKOUT HISTORY TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS checkout_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255),
  
  -- Action details
  action VARCHAR(50) NOT NULL,
  project VARCHAR(255),
  notes TEXT,
  condition_at_action VARCHAR(50),
  
  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_history_item ON checkout_history(item_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_user ON checkout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_client ON checkout_history(client_id);
CREATE INDEX IF NOT EXISTS idx_checkout_history_timestamp ON checkout_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_history_action ON checkout_history(action);

-- =============================================================================
-- PACKAGES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_category ON packages(category_name);

-- =============================================================================
-- PACKAGE ITEMS TABLE (Junction table)
-- =============================================================================
CREATE TABLE IF NOT EXISTS package_items (
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
-- PACKAGE NOTES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS package_notes (
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
-- PACK LISTS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_lists (
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
-- PACK LIST ITEMS TABLE (Junction table for individual items)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_list_items (
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
-- PACK LIST PACKAGES TABLE (Junction table for packages)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pack_list_packages (
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
-- AUDIT LOG TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- User who performed the action
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  
  -- Related entities (all optional)
  item_id VARCHAR(20),
  client_id VARCHAR(20),
  package_id VARCHAR(50),
  pack_list_id UUID,
  reservation_id UUID,
  
  -- Additional context
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_type ON audit_log(type);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_item ON audit_log(item_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
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

-- =============================================================================
-- RLS POLICIES - Read access for authenticated users
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
-- RLS POLICIES - Write access for authenticated users
-- =============================================================================

-- Users can update their own profile
CREATE POLICY "update_own_profile" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- General write access for most tables
CREATE POLICY "insert_locations" ON locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_locations" ON locations FOR UPDATE TO authenticated USING (true);

CREATE POLICY "insert_clients" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_clients" ON clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_clients" ON clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "insert_client_notes" ON client_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_client_notes" ON client_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "insert_inventory" ON inventory FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_inventory" ON inventory FOR UPDATE TO authenticated USING (true);

CREATE POLICY "insert_item_notes" ON item_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_item_notes" ON item_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "insert_item_reminders" ON item_reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_item_reminders" ON item_reminders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_item_reminders" ON item_reminders FOR DELETE TO authenticated USING (true);

CREATE POLICY "insert_reservations" ON reservations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_reservations" ON reservations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_reservations" ON reservations FOR DELETE TO authenticated USING (true);

CREATE POLICY "insert_maintenance" ON maintenance_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_maintenance" ON maintenance_records FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_maintenance" ON maintenance_records FOR DELETE TO authenticated USING (true);

CREATE POLICY "insert_checkout_history" ON checkout_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "insert_packages" ON packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_packages" ON packages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "delete_packages" ON packages FOR DELETE TO authenticated USING (true);

CREATE POLICY "all_package_items" ON package_items FOR ALL TO authenticated USING (true);
CREATE POLICY "insert_package_notes" ON package_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_package_notes" ON package_notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "all_pack_lists" ON pack_lists FOR ALL TO authenticated USING (true);
CREATE POLICY "all_pack_list_items" ON pack_list_items FOR ALL TO authenticated USING (true);
CREATE POLICY "all_pack_list_packages" ON pack_list_packages FOR ALL TO authenticated USING (true);

CREATE POLICY "insert_audit_log" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- RLS POLICIES - Admin-only operations
-- =============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role_id = 'role_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin-only policies
CREATE POLICY "admin_roles" ON roles FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_inventory" ON inventory FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "admin_categories" ON categories FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_specs" ON specs FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "admin_delete_locations" ON locations FOR DELETE TO authenticated USING (is_admin());

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
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

-- Function to create user profile after signup
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update location path when parent changes
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

DROP TRIGGER IF EXISTS update_location_path_trigger ON locations;
CREATE TRIGGER update_location_path_trigger
  BEFORE INSERT OR UPDATE OF parent_id ON locations
  FOR EACH ROW EXECUTE FUNCTION update_location_path();

-- Function to generate next item ID for a category
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

-- Function to generate next client ID
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

-- =============================================================================
-- VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View for inventory with computed fields
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

-- View for dashboard stats
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

-- View for reservation calendar
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

-- View for client rental history
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
-- GRANT PERMISSIONS
-- =============================================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION generate_item_id(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_client_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
