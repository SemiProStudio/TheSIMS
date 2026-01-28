# SIMS Data Structure Analysis

## Executive Summary

This document analyzes all data structures in SIMS for scalability, maintainability, and best practices compliance before Supabase deployment.

---

## Current Data Entities

### 1. Inventory Items
**Current Structure:**
```javascript
{
  id: 'CA1001',                    // Category prefix + number
  name: 'Sony A7S III',
  brand: 'Sony',
  category: 'Cameras',             // String reference
  status: 'available',
  condition: 'excellent',
  location: 'Studio A - Shelf 1',  // String - not normalized
  purchaseDate: '2023-06-15',
  purchasePrice: 3498,
  currentValue: 2800,
  serialNumber: 'SN-A7S3-001',
  image: null,
  specs: { ... },                  // JSONB - flexible key-value
  notes: [ ... ],                  // Embedded array
  reservations: [ ... ],           // Embedded array ⚠️
  reminders: [ ... ],              // Embedded array
  maintenanceHistory: [ ... ],     // Embedded array
  checkedOutTo: 'Mike Thompson',   // String - not linked to users ⚠️
  checkedOutDate: '...',
  dueBack: '...',
  viewCount: 45,
  checkoutCount: 23,
  checkoutHistory: [ ... ],        // Embedded array
  // Kit-specific fields
  isKit: false,
  kitType: null,
  kitContents: []                  // Array of item IDs
}
```

**Issues Identified:**
1. ⚠️ **Embedded Reservations**: Reservations are stored inside each item, making cross-item queries difficult
2. ⚠️ **Embedded Maintenance**: Same issue - hard to query all maintenance across items
3. ⚠️ **checkedOutTo is a string**: Not linked to users table - can't track who actually checked out
4. ⚠️ **location is a string**: Not normalized to locations table
5. ⚠️ **category is a string**: Should reference categories table by ID
6. ✅ **ID format (CA1001)**: Good - human-readable and sortable within category

---

### 2. Reservations (Embedded in Items)
**Current Structure:**
```javascript
{
  id: 'r1',
  start: '2024-01-15',
  end: '2024-01-17',
  project: 'Wedding - Smith/Jones',
  projectType: 'Wedding',
  user: 'Sarah',                   // String - not linked ⚠️
  contactPhone: '555-111-2222',
  contactEmail: 'sarah@example.com',
  location: 'LA Wedding Venue',
  clientId: 'CL001',               // ✅ Links to client
  notes: []
}
```

**Issues Identified:**
1. ⚠️ **user is a string**: Should reference users table
2. ⚠️ **Embedded in items**: Should be separate table with item_id foreign key
3. ⚠️ **No created_at/updated_at**: Missing audit timestamps
4. ⚠️ **ID format ('r1')**: Not unique across items - collision risk

---

### 3. Maintenance Records (Embedded in Items)
**Current Structure:**
```javascript
{
  id: 'maint-1',
  type: 'Cleaning',
  description: 'Professional sensor cleaning',
  vendor: 'Camera Service Center',
  vendorContact: '555-123-4567',
  cost: 75,
  scheduledDate: '...',
  completedDate: '...',
  status: 'completed',
  notes: 'Annual cleaning',
  warrantyWork: false,
  createdAt: '...',
  updatedAt: '...'
}
```

**Issues Identified:**
1. ⚠️ **Embedded in items**: Should be separate table
2. ⚠️ **vendor is a string**: Could normalize to vendors table for repeat vendors
3. ✅ **Has timestamps**: Good practice

---

### 4. Packages
**Current Structure:**
```javascript
{
  id: 'pkg-interview',             // Slug-style ID ✅
  name: 'Interview Kit - 2 Person',
  description: '...',
  category: 'Audio',
  items: ['CA1001', 'LE1003', ...], // Array of item IDs
  notes: [ ... ]
}
```

**Issues Identified:**
1. ⚠️ **items is an array**: Should be junction table (package_items)
2. ⚠️ **No created_at/updated_at**: Missing audit timestamps
3. ✅ **ID format**: Good - descriptive and unique

---

### 5. Pack Lists
**Current Structure:**
```javascript
{
  id: 'uuid',
  name: 'Project Alpha Gear',
  project: 'Project Alpha',
  packages: ['pkg-interview', ...],  // Array of package IDs
  items: [
    { id: 'CA1001', quantity: 1 },
    { id: 'LE1001', quantity: 2 }
  ],
  packedItems: ['CA1001', ...],      // Checked-off items
  createdBy: 'user-uuid',
  createdAt: '...',
  updatedAt: '...'
}
```

**Issues Identified:**
1. ⚠️ **packages is an array**: Should be junction table
2. ⚠️ **items is an array**: Should be junction table with quantity
3. ✅ **Uses UUIDs**: Good for distributed systems
4. ✅ **Has timestamps**: Good practice

---

### 6. Clients
**Current Structure:**
```javascript
{
  id: 'CL001',                     // Prefix + number
  name: 'Acme Productions',
  type: 'Company',                 // Individual/Company/Agency
  company: '',                     // For individuals
  email: 'bookings@acme.com',
  phone: '555-100-2000',
  address: '123 Studio Way...',
  notes: 'Long-term client...',    // Simple notes field
  favorite: true,
  createdAt: '...',
  updatedAt: '...',
  clientNotes: [ ... ]             // Threaded notes ⚠️
}
```

**Issues Identified:**
1. ⚠️ **clientNotes embedded**: Should be separate table for threaded notes
2. ⚠️ **address is a single string**: Could normalize for better filtering
3. ✅ **ID format**: Good - human-readable
4. ✅ **Has timestamps**: Good practice

---

### 7. Users
**Current Structure:**
```javascript
{
  id: 'u1',                        // Simple ID ⚠️
  name: 'Admin',
  email: 'admin@studio.com',
  password: 'admin',               // ⚠️ Plain text in sample data
  role: 'admin',
  roleId: 'role_admin'
}
```

**Issues Identified:**
1. ⚠️ **Simple IDs**: Should use UUID for Supabase auth integration
2. ⚠️ **password in data**: Sample data only - Supabase handles auth
3. ⚠️ **Dual role fields**: Both `role` and `roleId` is redundant

---

### 8. Roles
**Current Structure:**
```javascript
{
  id: 'role_admin',
  name: 'Administrator',
  description: 'Full access',
  isSystem: true,
  permissions: {
    dashboard: 'edit',
    gear_list: 'edit',
    // ... per-feature permissions
  }
}
```

**Issues Identified:**
1. ✅ **Structure is good**: Flexible permission system
2. ⚠️ **permissions as JSONB**: Could normalize to role_permissions table for querying

---

### 9. Categories
**Current Structure:**
```javascript
// In constants.js - array of strings
CATEGORIES = ['Cameras', 'Lenses', ...]

// With settings
CATEGORY_SETTINGS = {
  Cameras: { trackQuantity: false, trackSerialNumbers: true, lowStockThreshold: 0 }
}

// With prefixes
CATEGORY_PREFIXES = { Cameras: 'CA', Lenses: 'LE', ... }
```

**Issues Identified:**
1. ⚠️ **Scattered definition**: Category data spread across multiple constants
2. ⚠️ **Not in database**: Should be in categories table with all settings

---

### 10. Specifications
**Current Structure:**
```javascript
// In constants.js
CATEGORY_SPECS = {
  Cameras: [
    { name: 'Sensor Type', required: true },
    { name: 'Effective Pixels', required: false },
    // ...
  ]
}
```

**Issues Identified:**
1. ⚠️ **Hardcoded**: Should be in database specs table
2. ✅ **Structure is good**: name + required is appropriate

---

### 11. Locations
**Current Structure:**
```javascript
{
  id: 'loc-studio-a',
  name: 'Studio A',
  type: 'building',
  children: [
    {
      id: 'loc-studio-a-main',
      name: 'Main Floor',
      type: 'room',
      children: [ ... ]
    }
  ]
}
```

**Issues Identified:**
1. ⚠️ **Nested structure**: Tree stored as nested objects
2. ⚠️ **Not in database**: Should use adjacency list or materialized path
3. ✅ **Hierarchical design**: Good UX for location management

---

### 12. Audit Log
**Current Structure:**
```javascript
{
  type: 'checkout',
  timestamp: '...',
  description: 'Item CA1001 checked out',
  user: 'Admin',                   // String ⚠️
  itemId: 'CA1001',
  clientId: 'CL001'
}
```

**Issues Identified:**
1. ⚠️ **user is string**: Should reference users table
2. ✅ **Structure is good**: Captures key audit info

---

## Recommended Schema Changes

### High Priority (Required for Deployment)

#### 1. Normalize Reservations
```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  client_id VARCHAR(20) REFERENCES clients(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  project VARCHAR(255),
  project_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  location VARCHAR(255),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  notes JSONB DEFAULT '[]',
  status VARCHAR(50) DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_item ON reservations(item_id);
CREATE INDEX idx_reservations_client ON reservations(client_id);
CREATE INDEX idx_reservations_dates ON reservations(start_date, end_date);
```

#### 2. Normalize Maintenance Records
```sql
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_item ON maintenance_records(item_id);
CREATE INDEX idx_maintenance_status ON maintenance_records(status);
```

#### 3. Normalize Package Items
```sql
CREATE TABLE package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id VARCHAR(50) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(package_id, item_id)
);

CREATE INDEX idx_package_items_package ON package_items(package_id);
CREATE INDEX idx_package_items_item ON package_items(item_id);
```

#### 4. Normalize Pack List Items
```sql
CREATE TABLE pack_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_list_id UUID NOT NULL REFERENCES pack_lists(id) ON DELETE CASCADE,
  item_id VARCHAR(20) REFERENCES inventory(id) ON DELETE SET NULL,
  package_id VARCHAR(50) REFERENCES packages(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  CHECK (item_id IS NOT NULL OR package_id IS NOT NULL)
);

CREATE INDEX idx_pack_list_items_list ON pack_list_items(pack_list_id);
```

#### 5. Add Clients Table to Schema
```sql
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

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_type ON clients(type);
```

#### 6. Add Client Notes Table
```sql
CREATE TABLE client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(20) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES client_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  text TEXT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_notes_client ON client_notes(client_id);
CREATE INDEX idx_client_notes_parent ON client_notes(parent_id);
```

### Medium Priority (Recommended)

#### 7. Normalize Locations
```sql
CREATE TABLE locations (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  parent_id VARCHAR(50) REFERENCES locations(id) ON DELETE CASCADE,
  path TEXT,  -- Materialized path: '/loc-studio-a/loc-studio-a-main/'
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_locations_path ON locations(path);
```

#### 8. Add Roles Table
```sql
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. Enhance Categories Table
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS track_quantity BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS track_serial_numbers BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
```

#### 10. Add Item Notes Table (Optional)
```sql
CREATE TABLE item_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES item_notes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  text TEXT NOT NULL,
  deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_notes_item ON item_notes(item_id);
```

### Low Priority (Nice to Have)

#### 11. Checkout History Table
```sql
CREATE TABLE checkout_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),
  client_id VARCHAR(20) REFERENCES clients(id),
  action VARCHAR(50) NOT NULL, -- 'checkout' or 'checkin'
  project VARCHAR(255),
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_history_item ON checkout_history(item_id);
CREATE INDEX idx_checkout_history_timestamp ON checkout_history(timestamp DESC);
```

#### 12. Item Reminders Table
```sql
CREATE TABLE item_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id VARCHAR(20) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  recurrence VARCHAR(50), -- 'none', 'weekly', 'monthly', 'quarterly', 'yearly'
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_item_reminders_item ON item_reminders(item_id);
CREATE INDEX idx_item_reminders_due ON item_reminders(due_date) WHERE NOT completed;
```

---

## Primary Key Strategy Recommendations

| Entity | Current | Recommended | Rationale |
|--------|---------|-------------|-----------|
| Inventory | `CA1001` | Keep | Human-readable, sortable, category-prefixed |
| Reservations | `r1` | UUID | Globally unique, no collision risk |
| Maintenance | `maint-1` | UUID | Globally unique across all items |
| Packages | `pkg-interview` | Keep | Descriptive slug, good for URLs |
| Pack Lists | UUID | Keep | Already using UUID |
| Clients | `CL001` | Keep | Human-readable, sequential |
| Users | UUID | UUID | Integrate with Supabase auth |
| Roles | `role_admin` | Keep | Descriptive, stable |
| Categories | UUID | Keep | Auto-generated |
| Locations | `loc-studio-a` | Keep | Hierarchical path friendly |
| Audit Log | UUID | Keep | Already using UUID |

---

## Migration Strategy

### Phase 1: Schema Creation
1. Create all new tables with foreign keys
2. Add indexes for common queries
3. Set up RLS policies

### Phase 2: Data Migration
1. Extract embedded reservations → reservations table
2. Extract embedded maintenance → maintenance_records table
3. Extract embedded notes → item_notes / client_notes tables
4. Create package_items from packages.items arrays
5. Create pack_list_items from pack_lists.items arrays
6. Migrate locations from nested to adjacency list

### Phase 3: Application Updates
1. Update API calls to use new tables
2. Update React state management
3. Add proper foreign key references in forms
4. Update queries to use JOINs instead of embedded data

### Phase 4: Cleanup
1. Remove JSONB arrays from inventory table (reservations, notes, etc.)
2. Remove JSONB arrays from packages table (items)
3. Verify all data migrated correctly
4. Update schema documentation

---

## Summary of Issues by Severity

### Critical (Must Fix)
- [ ] Reservations embedded in items - prevents cross-item queries
- [ ] Maintenance records embedded - same issue
- [ ] checkedOutTo not linked to users - can't track accountability

### High (Should Fix)
- [ ] Package items as array - should be junction table
- [ ] Pack list items as array - should be junction table
- [ ] Client notes embedded - limits query capability
- [ ] Locations not in database - can't persist hierarchy changes

### Medium (Recommended)
- [ ] Item notes embedded - could extract for better querying
- [ ] Checkout history embedded - extract for reporting
- [ ] Reminders embedded - extract for notification system
- [ ] Category settings scattered across constants

### Low (Nice to Have)
- [ ] Normalize vendors for maintenance
- [ ] Add proper address parsing for clients
- [ ] Add tags/labels system for items
