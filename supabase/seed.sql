-- =============================================================================
-- SIMS Database Seed Data
-- Run this after schema.sql to populate with sample data
-- =============================================================================

-- =============================================================================
-- SAMPLE CLIENTS
-- =============================================================================
INSERT INTO clients (id, name, type, company, email, phone, address, notes, favorite) VALUES
  ('CL001', 'Acme Productions', 'Company', NULL, 'bookings@acmeproductions.com', '555-100-2000', '123 Studio Way, Los Angeles, CA 90001', 'Long-term client. Prefers Canon equipment.', true),
  ('CL002', 'Sarah Johnson', 'Individual', 'Freelance Photographer', 'sarah.j@email.com', '555-200-3000', '', 'Wedding and event specialist', false),
  ('CL003', 'TechCorp Inc', 'Company', NULL, 'media@techcorp.com', '555-300-4000', '456 Innovation Blvd, San Francisco, CA 94102', 'Corporate video projects. Net 30 payment terms.', true),
  ('CL004', 'Bright Ideas Agency', 'Agency', NULL, 'rentals@brightideas.co', '555-400-5000', '789 Creative Ave, New York, NY 10001', 'Ad agency - usually books full kits', false),
  ('CL005', 'Michael Chen', 'Individual', 'Documentary Films', 'mchen@docfilms.net', '555-500-6000', '', 'Documentary filmmaker. Often needs long-term rentals.', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INVENTORY (Cameras)
-- =============================================================================
INSERT INTO inventory (id, name, brand, category_name, status, condition, location_display, purchase_date, purchase_price, current_value, serial_number, specs, view_count, checkout_count) VALUES
  ('CA1001', 'Sony A7S III', 'Sony', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 1', '2023-06-15', 3498.00, 2800.00, 'SN-A7S3-001', '{"Sensor Type": "Full Frame BSI CMOS", "Effective Pixels": "12.1MP", "Video Resolution": "4K 120fps", "ISO Range": "80-102400", "Mount Type": "Sony E-mount"}', 45, 23),
  ('CA1002', 'Canon EOS R5', 'Canon', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 1', '2023-03-20', 3899.00, 3200.00, 'SN-R5-002', '{"Sensor Type": "Full Frame CMOS", "Effective Pixels": "45MP", "Video Resolution": "8K 30fps", "Mount Type": "Canon RF"}', 62, 31),
  ('CA1003', 'Blackmagic URSA Mini Pro 12K', 'Blackmagic Design', 'Cameras', 'available', 'excellent', 'Studio B - Camera Cage', '2023-09-10', 5995.00, 5200.00, 'SN-URSA12K-003', '{"Sensor Type": "Super 35 CMOS", "Effective Pixels": "12288 x 6480", "Video Resolution": "12K 60fps", "Mount Type": "PL/EF", "Video Format": "BRAW, ProRes"}', 28, 8),
  ('CA1004', 'Sony FX6', 'Sony', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 2', '2023-01-15', 5998.00, 5000.00, 'SN-FX6-004', '{"Sensor Type": "Full Frame BSI CMOS", "Effective Pixels": "10.2MP", "Video Resolution": "4K 120fps", "Mount Type": "Sony E-mount"}', 55, 27),
  ('CA1005', 'Canon C70', 'Canon', 'Cameras', 'available', 'good', 'Studio A - Shelf 2', '2022-06-01', 5499.00, 4200.00, 'SN-C70-005', '{"Sensor Type": "Super 35 DGO CMOS", "Video Resolution": "4K 120fps", "Mount Type": "Canon RF"}', 38, 19),
  ('CA1006', 'RED Komodo 6K', 'RED', 'Cameras', 'available', 'excellent', 'Studio B - Camera Cage', '2023-04-20', 5999.00, 5200.00, 'SN-KOMODO-006', '{"Sensor Type": "Super 35 CMOS", "Effective Pixels": "19.9MP", "Video Resolution": "6K 40fps", "Mount Type": "Canon RF", "Video Format": "REDCODE RAW"}', 42, 15),
  ('CA1007', 'Panasonic GH6', 'Panasonic', 'Cameras', 'available', 'excellent', 'Studio A - Shelf 3', '2023-07-10', 2197.00, 1800.00, 'SN-GH6-007', '{"Sensor Type": "Micro Four Thirds", "Effective Pixels": "25.2MP", "Video Resolution": "5.7K 60fps", "Mount Type": "Micro Four Thirds"}', 31, 12)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INVENTORY (Lenses)
-- =============================================================================
INSERT INTO inventory (id, name, brand, category_name, status, condition, location_display, purchase_date, purchase_price, current_value, serial_number, specs, view_count, checkout_count) VALUES
  ('LE1001', 'Sony 24-70mm f/2.8 GM II', 'Sony', 'Lenses', 'available', 'excellent', 'Studio A - Lens Cabinet', '2023-04-10', 2298.00, 2000.00, 'SN-2470GM-001', '{"Focal Length": "24-70mm", "Maximum Aperture": "f/2.8", "Lens Mount": "Sony E-mount", "Filter Thread": "82mm"}', 89, 45),
  ('LE1002', 'Canon RF 70-200mm f/2.8L IS', 'Canon', 'Lenses', 'available', 'excellent', 'Studio A - Lens Cabinet', '2023-02-28', 2699.00, 2400.00, 'SN-70200RF-002', '{"Focal Length": "70-200mm", "Maximum Aperture": "f/2.8", "Lens Mount": "Canon RF", "Stabilization": "5 stops"}', 56, 28),
  ('LE1003', 'Sony 50mm f/1.2 GM', 'Sony', 'Lenses', 'available', 'excellent', 'Studio A - Lens Cabinet', '2023-05-15', 1998.00, 1800.00, 'SN-50GM-003', '{"Focal Length": "50mm", "Maximum Aperture": "f/1.2", "Lens Mount": "Sony E-mount", "Filter Thread": "72mm"}', 72, 36),
  ('LE1004', 'Sigma 18-35mm f/1.8 Art', 'Sigma', 'Lenses', 'available', 'excellent', 'Studio A - Lens Cabinet', '2022-11-20', 799.00, 650.00, 'SN-1835ART-004', '{"Focal Length": "18-35mm", "Maximum Aperture": "f/1.8", "Lens Mount": "Canon EF", "Filter Thread": "72mm"}', 45, 22),
  ('LE1005', 'Canon RF 15-35mm f/2.8L IS', 'Canon', 'Lenses', 'available', 'excellent', 'Studio A - Lens Cabinet', '2023-01-08', 2399.00, 2100.00, 'SN-1535RF-005', '{"Focal Length": "15-35mm", "Maximum Aperture": "f/2.8", "Lens Mount": "Canon RF", "Stabilization": "5 stops"}', 38, 18)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INVENTORY (Lighting)
-- =============================================================================
INSERT INTO inventory (id, name, brand, category_name, status, condition, location_display, purchase_date, purchase_price, current_value, serial_number, specs, view_count, checkout_count) VALUES
  ('LI1001', 'Aputure 600d Pro', 'Aputure', 'Lighting', 'available', 'excellent', 'Warehouse - Lighting Storage', '2023-03-15', 1590.00, 1400.00, 'SN-600D-001', '{"Light Type": "LED COB", "Color Temperature": "Daylight 5600K", "Power Output": "600W equiv", "CRI": "96+", "TLCI": "98+"}', 52, 26),
  ('LI1002', 'Aputure 300x', 'Aputure', 'Lighting', 'available', 'excellent', 'Warehouse - Lighting Storage', '2023-04-20', 1149.00, 1000.00, 'SN-300X-002', '{"Light Type": "LED COB", "Color Temperature": "2700-6500K Bi-Color", "Power Output": "350W equiv", "CRI": "95+"}', 48, 24),
  ('LI1003', 'Nanlite Forza 500', 'Nanlite', 'Lighting', 'available', 'excellent', 'Warehouse - Lighting Storage', '2023-02-10', 899.00, 780.00, 'SN-FORZA500-003', '{"Light Type": "LED COB", "Color Temperature": "Daylight 5600K", "Power Output": "500W", "CRI": "98"}', 35, 17)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INVENTORY (Audio)
-- =============================================================================
INSERT INTO inventory (id, name, brand, category_name, status, condition, location_display, purchase_date, purchase_price, current_value, serial_number, specs, view_count, checkout_count) VALUES
  ('AU1001', 'Sennheiser MKH 416', 'Sennheiser', 'Audio', 'available', 'excellent', 'Audio Cabinet', '2023-01-20', 999.00, 900.00, 'SN-MKH416-001', '{"Microphone Type": "Shotgun", "Polar Pattern": "Super-cardioid/Lobar", "Frequency Response": "40Hz-20kHz", "Connector": "XLR"}', 65, 32),
  ('AU1002', 'Rode NTG5', 'Rode', 'Audio', 'available', 'excellent', 'Audio Cabinet', '2023-03-05', 499.00, 450.00, 'SN-NTG5-002', '{"Microphone Type": "Shotgun", "Polar Pattern": "Super-cardioid", "Frequency Response": "20Hz-20kHz", "Self Noise": "10dB"}', 42, 21),
  ('AU1003', 'Sony UWP-D21 Wireless', 'Sony', 'Audio', 'available', 'excellent', 'Audio Cabinet', '2023-05-12', 599.00, 520.00, 'SN-UWPD21-003', '{"Type": "Wireless Lavalier System", "Frequency Range": "UHF", "Range": "100m", "Battery Life": "8 hours"}', 58, 29)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE INVENTORY (Support)
-- =============================================================================
INSERT INTO inventory (id, name, brand, category_name, status, condition, location_display, purchase_date, purchase_price, current_value, serial_number, specs, view_count, checkout_count) VALUES
  ('SU1001', 'Sachtler Video 18 S2', 'Sachtler', 'Support', 'available', 'excellent', 'Warehouse - Support', '2023-02-15', 3999.00, 3500.00, 'SN-V18S2-001', '{"Head Type": "Fluid Head", "Payload": "2-18kg", "Counterbalance": "18 steps", "Pan/Tilt Drag": "Continuous"}', 35, 18),
  ('SU1002', 'DJI RS 3 Pro', 'DJI', 'Support', 'available', 'excellent', 'Studio B - Gimbal Area', '2023-06-20', 999.00, 850.00, 'SN-RS3PRO-002', '{"Type": "3-Axis Gimbal", "Payload": "4.5kg", "Battery Life": "12 hours", "Modes": "Pan Follow, Lock, FPV"}', 48, 24)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE PACKAGES
-- =============================================================================
INSERT INTO packages (id, name, description, category_name) VALUES
  ('pkg-interview', 'Interview Kit - 2 Person', 'Complete two-person interview setup with wireless audio and LED lighting', 'Audio'),
  ('pkg-doc', 'Documentary Run & Gun', 'Lightweight documentary setup - handheld friendly with quality audio', 'Cameras'),
  ('pkg-wedding', 'Wedding Photography/Video', 'Dual-camera setup for wedding coverage with fast primes', 'Cameras'),
  ('pkg-corporate', 'Corporate Video Kit', 'Professional setup for corporate videos and talking heads', 'Cameras')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SAMPLE PACKAGE ITEMS
-- =============================================================================
INSERT INTO package_items (package_id, item_id, sort_order) VALUES
  ('pkg-interview', 'CA1001', 0),
  ('pkg-interview', 'LE1003', 1),
  ('pkg-interview', 'LI1001', 2),
  ('pkg-interview', 'LI1002', 3),
  ('pkg-interview', 'AU1003', 4),
  ('pkg-interview', 'SU1001', 5),
  ('pkg-doc', 'CA1004', 0),
  ('pkg-doc', 'LE1001', 1),
  ('pkg-doc', 'LE1005', 2),
  ('pkg-doc', 'AU1001', 3),
  ('pkg-doc', 'SU1002', 4),
  ('pkg-wedding', 'CA1001', 0),
  ('pkg-wedding', 'CA1002', 1),
  ('pkg-wedding', 'LE1001', 2),
  ('pkg-wedding', 'LE1003', 3),
  ('pkg-corporate', 'CA1005', 0),
  ('pkg-corporate', 'LE1004', 1),
  ('pkg-corporate', 'LI1002', 2),
  ('pkg-corporate', 'AU1002', 3)
ON CONFLICT (package_id, item_id) DO NOTHING;

-- =============================================================================
-- SAMPLE RESERVATIONS
-- =============================================================================
INSERT INTO reservations (item_id, client_id, project, project_type, start_date, end_date, contact_name, contact_phone, contact_email, location, status) VALUES
  ('CA1001', 'CL002', 'Wedding - Smith/Jones', 'Wedding', CURRENT_DATE + 5, CURRENT_DATE + 7, 'Sarah Johnson', '555-200-3000', 'sarah.j@email.com', 'LA Wedding Venue', 'confirmed'),
  ('CA1003', 'CL005', 'Documentary - Urban Life', 'Documentary', CURRENT_DATE + 10, CURRENT_DATE + 14, 'Michael Chen', '555-500-6000', 'mchen@docfilms.net', 'Downtown LA', 'confirmed'),
  ('CA1004', 'CL003', 'Corporate - TechCorp', 'Corporate', CURRENT_DATE + 1, CURRENT_DATE + 3, 'Jennifer Lee', '555-333-4444', 'jlee@tech.com', 'TechCorp HQ', 'confirmed')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE MAINTENANCE RECORDS
-- =============================================================================
INSERT INTO maintenance_records (item_id, type, description, vendor, vendor_contact, cost, scheduled_date, completed_date, status, notes, warranty_work) VALUES
  ('CA1001', 'Cleaning', 'Professional sensor cleaning', 'Camera Service Center', '555-123-4567', 75.00, CURRENT_DATE - 45, CURRENT_DATE - 44, 'completed', 'Annual cleaning - sensor was dusty', false),
  ('CA1001', 'Firmware Update', 'Updated to firmware v3.0', '', '', 0, CURRENT_DATE - 30, CURRENT_DATE - 30, 'completed', 'Improved autofocus performance', false),
  ('CA1001', 'Calibration', 'Scheduled annual calibration check', 'Sony Service Center', 'service@sony.com', 0, CURRENT_DATE + 30, NULL, 'scheduled', '', true),
  ('CA1002', 'Repair', 'Shutter mechanism replacement', 'Canon Authorized Service', '1-800-828-4040', 450.00, CURRENT_DATE - 60, CURRENT_DATE - 52, 'completed', 'Shutter count exceeded 300k, replaced under extended warranty', true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE ITEM NOTES
-- =============================================================================
INSERT INTO item_notes (item_id, user_name, text) VALUES
  ('CA1001', 'Admin', 'Firmware updated to v3.0'),
  ('CA1005', 'Mike', 'Minor LCD scratch - functional')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE ITEM REMINDERS
-- =============================================================================
INSERT INTO item_reminders (item_id, title, description, due_date, recurrence, completed) VALUES
  ('CA1001', 'Sensor cleaning', 'Professional cleaning', CURRENT_DATE, 'quarterly', false),
  ('CA1001', 'Check repair status', 'Follow up with Sony service center', CURRENT_DATE + 7, 'none', false)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE CLIENT NOTES
-- =============================================================================
INSERT INTO client_notes (client_id, user_name, text) VALUES
  ('CL001', 'Admin', 'Discussed potential long-term rental agreement for their new studio space.'),
  ('CL001', 'Mike', 'Client requested quote for RED Komodo package for upcoming commercial shoot.'),
  ('CL003', 'Admin', 'Annual product launch event scheduled for Q2. Will need full video production kit.')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SAMPLE SPECS
-- =============================================================================
INSERT INTO specs (category_name, name, required, sort_order) VALUES
  -- Cameras
  ('Cameras', 'Sensor Type', true, 0),
  ('Cameras', 'Effective Pixels', false, 1),
  ('Cameras', 'Video Resolution', true, 2),
  ('Cameras', 'ISO Range', false, 3),
  ('Cameras', 'Mount Type', true, 4),
  ('Cameras', 'Video Format', false, 5),
  -- Lenses
  ('Lenses', 'Focal Length', true, 0),
  ('Lenses', 'Maximum Aperture', true, 1),
  ('Lenses', 'Lens Mount', true, 2),
  ('Lenses', 'Filter Thread', false, 3),
  ('Lenses', 'Stabilization', false, 4),
  -- Lighting
  ('Lighting', 'Light Type', true, 0),
  ('Lighting', 'Color Temperature', true, 1),
  ('Lighting', 'Power Output', false, 2),
  ('Lighting', 'CRI', false, 3),
  ('Lighting', 'TLCI', false, 4),
  -- Audio
  ('Audio', 'Microphone Type', true, 0),
  ('Audio', 'Polar Pattern', false, 1),
  ('Audio', 'Frequency Response', false, 2),
  ('Audio', 'Connector', false, 3),
  -- Support
  ('Support', 'Head Type', true, 0),
  ('Support', 'Payload', true, 1),
  ('Support', 'Type', false, 2)
ON CONFLICT (category_name, name) DO NOTHING;

-- =============================================================================
-- INITIAL AUDIT LOG ENTRY
-- =============================================================================
INSERT INTO audit_log (type, description, user_name) VALUES
  ('system', 'Database initialized with sample data', 'System')
ON CONFLICT DO NOTHING;
