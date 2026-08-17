-- ============================================================================
-- Phase 1 of the Smart Paste redesign: typed canonical spec taxonomy
-- (sims-spec-taxonomy-proposal-2026-08-17.md, user-approved 2026-08-17;
--  units imperial per user decision: weights oz, payloads/loads lb)
--
-- 1. specs table gains field_type / unit / options
-- 2. replace_specs RPC carries the new columns (search_path re-pinned —
--    CREATE OR REPLACE drops the previous ALTER ... SET)
-- 3. All spec definitions are replaced with the canonical per-category sets
-- 4. Item spec keys migrate: renamed per the absorbs maps, value-shape
--    routing for the Cameras "Sensor" key, then unmapped keys are dropped
--    (all current data is test data per user 2026-08-17 — no preservation)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Schema
-- ----------------------------------------------------------------------------
ALTER TABLE specs
  ADD COLUMN IF NOT EXISTS field_type TEXT NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text', 'number', 'boolean', 'enum')),
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS options JSONB;

-- ----------------------------------------------------------------------------
-- 2. replace_specs carries type/unit/options
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION replace_specs(p_category VARCHAR, p_specs JSONB)
RETURNS void
SET search_path = public
AS $$
BEGIN
  DELETE FROM specs WHERE category_name = p_category;

  IF p_specs IS NOT NULL THEN
    INSERT INTO specs (category_name, name, required, sort_order, field_type, unit, options)
    SELECT p_category,
           x.value->>'name',
           COALESCE((x.value->>'required')::BOOLEAN, false),
           (x.ordinality - 1)::INTEGER,
           COALESCE(NULLIF(x.value->>'type', ''), 'text'),
           NULLIF(x.value->>'unit', ''),
           CASE WHEN jsonb_typeof(x.value->'options') = 'array'
                THEN x.value->'options' ELSE NULL END
    FROM jsonb_array_elements(p_specs) WITH ORDINALITY AS x(value, ordinality);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3. Canonical definitions (wipe + insert; sort_order = listed order)
-- ----------------------------------------------------------------------------
DELETE FROM specs;

INSERT INTO specs (category_name, name, required, sort_order, field_type, unit, options) VALUES
  -- Cameras (15)
  ('Cameras', 'Sensor Type',        true,  0,  'text',    NULL,  NULL),
  ('Cameras', 'Sensor Size',        false, 1,  'text',    NULL,  NULL),
  ('Cameras', 'Effective Pixels',   false, 2,  'text',    NULL,  NULL),
  ('Cameras', 'Lens Mount',         true,  3,  'enum',    NULL,  '["Sony E","Canon RF","Canon EF","PL","PL/EF","L-Mount","Nikon Z","Fujifilm X","MFT"]'),
  ('Cameras', 'Video Resolution',   true,  4,  'text',    NULL,  NULL),
  ('Cameras', 'Frame Rates',        false, 5,  'text',    NULL,  NULL),
  ('Cameras', 'Codecs / Formats',   false, 6,  'text',    NULL,  NULL),
  ('Cameras', 'Bit Depth',          false, 7,  'text',    NULL,  NULL),
  ('Cameras', 'ISO Range',          false, 8,  'text',    NULL,  NULL),
  ('Cameras', 'Dynamic Range',      false, 9,  'text',    NULL,  NULL),
  ('Cameras', 'Stabilization',      false, 10, 'text',    NULL,  NULL),
  ('Cameras', 'Media / Card Slots', false, 11, 'text',    NULL,  NULL),
  ('Cameras', 'Weather Sealing',    false, 12, 'boolean', NULL,  NULL),
  ('Cameras', 'Battery Type',       false, 13, 'text',    NULL,  NULL),
  ('Cameras', 'Weight',             false, 14, 'number',  'oz',  NULL),
  -- Lenses (13)
  ('Lenses', 'Lens Type',              false, 0,  'enum',    NULL, '["Prime","Zoom","Cine Prime","Cine Zoom","Anamorphic","Macro","Tilt-Shift"]'),
  ('Lenses', 'Focal Length',           true,  1,  'text',    NULL, NULL),
  ('Lenses', 'Maximum Aperture',       true,  2,  'text',    NULL, NULL),
  ('Lenses', 'T-Stop',                 false, 3,  'text',    NULL, NULL),
  ('Lenses', 'Lens Mount',             true,  4,  'enum',    NULL, '["Sony E","Canon RF","Canon EF","PL","PL/EF","L-Mount","Nikon Z","Fujifilm X","MFT"]'),
  ('Lenses', 'Format Coverage',        false, 5,  'enum',    NULL, '["Full-Frame","Super 35","APS-C","MFT","Large Format"]'),
  ('Lenses', 'Minimum Focus Distance', false, 6,  'text',    NULL, NULL),
  ('Lenses', 'Filter Thread',          false, 7,  'number',  'mm', NULL),
  ('Lenses', 'Image Stabilization',    false, 8,  'text',    NULL, NULL),
  ('Lenses', 'Autofocus',              false, 9,  'boolean', NULL, NULL),
  ('Lenses', 'Anamorphic Squeeze',     false, 10, 'text',    NULL, NULL),
  ('Lenses', 'Dimensions',             false, 11, 'text',    NULL, NULL),
  ('Lenses', 'Weight',                 false, 12, 'number',  'oz', NULL),
  -- Lighting (12)
  ('Lighting', 'Light Type',        true,  0,  'enum',    NULL, '["LED COB","LED Panel","LED Tube","Fresnel","HMI","Tungsten","Practical"]'),
  ('Lighting', 'Power Output',      true,  1,  'text',    NULL, NULL),
  ('Lighting', 'Color Temperature', true,  2,  'text',    NULL, NULL),
  ('Lighting', 'Color Mode',        false, 3,  'enum',    NULL, '["Daylight","Bi-Color","RGBWW","RGB+CCT","Tungsten"]'),
  ('Lighting', 'CRI',               false, 4,  'number',  NULL, NULL),
  ('Lighting', 'TLCI',              false, 5,  'number',  NULL, NULL),
  ('Lighting', 'Beam Angle',        false, 6,  'text',    NULL, NULL),
  ('Lighting', 'Mount Type',        false, 7,  'enum',    NULL, '["Bowens","Aputure","Godox AD","Yoke","Baby Pin (5/8 in)","Junior Pin (1-1/8 in)"]'),
  ('Lighting', 'DMX',               false, 8,  'boolean', NULL, NULL),
  ('Lighting', 'Power Source',      false, 9,  'text',    NULL, NULL),
  ('Lighting', 'Dimensions',        false, 10, 'text',    NULL, NULL),
  ('Lighting', 'Weight',            false, 11, 'number',  'oz', NULL),
  -- Audio (12)
  ('Audio', 'Audio Type',              true,  0,  'enum',    NULL, '["Shotgun Mic","Lavalier","Wireless System","Recorder","Mixer","Boom Pole","Handheld Mic","Timecode Device"]'),
  ('Audio', 'Polar Pattern',           false, 1,  'enum',    NULL, '["Cardioid","Supercardioid","Hypercardioid","Omnidirectional","Figure-8","Switchable"]'),
  ('Audio', 'Frequency Response',      false, 2,  'text',    NULL, NULL),
  ('Audio', 'Connectivity',            false, 3,  'text',    NULL, NULL),
  ('Audio', 'Channels',                false, 4,  'text',    NULL, NULL),
  ('Audio', 'Wireless Range',          false, 5,  'text',    NULL, NULL),
  ('Audio', 'Bit Depth / Sample Rate', false, 6,  'text',    NULL, NULL),
  ('Audio', 'Phantom Power',           false, 7,  'boolean', NULL, NULL),
  ('Audio', 'Timecode',                false, 8,  'boolean', NULL, NULL),
  ('Audio', 'Power Source',            false, 9,  'text',    NULL, NULL),
  ('Audio', 'Battery Life',            false, 10, 'text',    NULL, NULL),
  ('Audio', 'Weight',                  false, 11, 'number',  'oz', NULL),
  -- Monitors (12)
  ('Monitors', 'Monitor Type',     true,  0,  'enum',   NULL,   '["On-Camera","Production","Wireless RX","Wireless TX/RX Kit","Director''s","EVF"]'),
  ('Monitors', 'Screen Size',      true,  1,  'number', 'in',   NULL),
  ('Monitors', 'Resolution',       false, 2,  'text',   NULL,   NULL),
  ('Monitors', 'Brightness',       false, 3,  'number', 'nits', NULL),
  ('Monitors', 'Touchscreen',      false, 4,  'boolean', NULL,  NULL),
  ('Monitors', 'HDR Support',      false, 5,  'text',   NULL,   NULL),
  ('Monitors', 'Inputs / Outputs', false, 6,  'text',   NULL,   NULL),
  ('Monitors', 'Monitoring Tools', false, 7,  'text',   NULL,   NULL),
  ('Monitors', 'Recording',        false, 8,  'text',   NULL,   NULL),
  ('Monitors', 'Wireless Range',   false, 9,  'text',   NULL,   NULL),
  ('Monitors', 'Power',            false, 10, 'text',   NULL,   NULL),
  ('Monitors', 'Weight',           false, 11, 'number', 'oz',   NULL),
  -- Power (10)
  ('Power', 'Power Type',     true,  0, 'enum',    NULL, '["V-Mount Battery","Gold Mount Battery","NP-F Battery","Charger","Power Station","AC Adapter","Distribution"]'),
  ('Power', 'Capacity',       true,  1, 'text',    NULL, NULL),
  ('Power', 'Voltage',        false, 2, 'text',    NULL, NULL),
  ('Power', 'Max Output',     false, 3, 'text',    NULL, NULL),
  ('Power', 'Outputs',        false, 4, 'text',    NULL, NULL),
  ('Power', 'Charging',       false, 5, 'text',    NULL, NULL),
  ('Power', 'Charge Display', false, 6, 'boolean', NULL, NULL),
  ('Power', 'Mount Type',     false, 7, 'enum',    NULL, '["V-Mount","Gold Mount","NP-F","Sony BP","Custom"]'),
  ('Power', 'Dimensions',     false, 8, 'text',    NULL, NULL),
  ('Power', 'Weight',         false, 9, 'number',  'oz', NULL),
  -- Support (13)
  ('Support', 'Support Type',          true,  0,  'enum',   NULL, '["Tripod","Fluid Head","Gimbal","Slider","Monopod","Jib","Dolly","Shoulder Rig"]'),
  ('Support', 'Max Payload',           true,  1,  'number', 'lb', NULL),
  ('Support', 'Height Range',          false, 2,  'text',   NULL, NULL),
  ('Support', 'Folded Length',         false, 3,  'text',   NULL, NULL),
  ('Support', 'Head Type',             false, 4,  'text',   NULL, NULL),
  ('Support', 'Counterbalance',        false, 5,  'text',   NULL, NULL),
  ('Support', 'Bowl Size',             false, 6,  'enum',   NULL, '["Flat","60mm","75mm","100mm","150mm"]'),
  ('Support', 'Quick Release',         false, 7,  'text',   NULL, NULL),
  ('Support', 'Axes / Modes',          false, 8,  'text',   NULL, NULL),
  ('Support', 'Travel / Track Length', false, 9,  'text',   NULL, NULL),
  ('Support', 'Material',              false, 10, 'enum',   NULL, '["Carbon Fiber","Aluminum","Steel","Hybrid"]'),
  ('Support', 'Battery Life',          false, 11, 'text',   NULL, NULL),
  ('Support', 'Weight',                false, 12, 'number', 'lb', NULL),
  -- Drones (9)
  ('Drones', 'Drone Type',             false, 0, 'enum',   NULL,  '["Quadcopter","FPV","Cinelifter"]'),
  ('Drones', 'Camera Sensor',          true,  1, 'text',   NULL,  NULL),
  ('Drones', 'Video Resolution',       true,  2, 'text',   NULL,  NULL),
  ('Drones', 'Flight Time',            false, 3, 'number', 'min', NULL),
  ('Drones', 'Max Transmission Range', false, 4, 'text',   NULL,  NULL),
  ('Drones', 'Obstacle Sensing',       false, 5, 'text',   NULL,  NULL),
  ('Drones', 'Max Speed',              false, 6, 'text',   NULL,  NULL),
  ('Drones', 'FOV',                    false, 7, 'text',   NULL,  NULL),
  ('Drones', 'Takeoff Weight',         false, 8, 'number', 'oz',  NULL),
  -- Storage (9)
  ('Storage', 'Storage Type',        true,  0, 'enum', NULL, '["SD","microSD","CFexpress Type A","CFexpress Type B","SSD","HDD","RAID","Card Reader"]'),
  ('Storage', 'Capacity',            true,  1, 'text', NULL, NULL),
  ('Storage', 'Read Speed',          false, 2, 'text', NULL, NULL),
  ('Storage', 'Write Speed',         false, 3, 'text', NULL, NULL),
  ('Storage', 'Min Sustained Write', false, 4, 'text', NULL, NULL),
  ('Storage', 'Speed Class',         false, 5, 'text', NULL, NULL),
  ('Storage', 'Interface',           false, 6, 'text', NULL, NULL),
  ('Storage', 'Durability',          false, 7, 'text', NULL, NULL),
  ('Storage', 'Endurance',           false, 8, 'text', NULL, NULL),
  -- Grip (10)
  ('Grip', 'Grip Type',             true,  0, 'enum',   NULL, '["C-Stand","Combo Stand","Baby Stand","Boom/Arm","Clamp","Flag","Scrim/Rag","Frame","Sandbag","Apple Box"]'),
  ('Grip', 'Max Load',              false, 1, 'number', 'lb', NULL),
  ('Grip', 'Height / Length Range', false, 2, 'text',   NULL, NULL),
  ('Grip', 'Pin Size',              false, 3, 'enum',   NULL, '["Baby (5/8 in)","Junior (1-1/8 in)","Both"]'),
  ('Grip', 'Grip Head / Jaw',       false, 4, 'text',   NULL, NULL),
  ('Grip', 'Frame Size',            false, 5, 'text',   NULL, NULL),
  ('Grip', 'Fabric',                false, 6, 'text',   NULL, NULL),
  ('Grip', 'Material',              false, 7, 'enum',   NULL, '["Steel","Aluminum","Carbon Fiber"]'),
  ('Grip', 'Sections / Risers',     false, 8, 'text',   NULL, NULL),
  ('Grip', 'Weight',                false, 9, 'number', 'lb', NULL),
  -- Accessories (9)
  ('Accessories', 'Accessory Type',    true,  0, 'enum',   NULL, '["Filter","Matte Box","Follow Focus","Cage/Rig","Cable","Adapter","Plate/Mount","Case","Other"]'),
  ('Accessories', 'Compatibility',     false, 1, 'text',   NULL, NULL),
  ('Accessories', 'Filter Type',       false, 2, 'text',   NULL, NULL),
  ('Accessories', 'Filter Size',       false, 3, 'text',   NULL, NULL),
  ('Accessories', 'Connector / Cable', false, 4, 'text',   NULL, NULL),
  ('Accessories', 'Mounting',          false, 5, 'text',   NULL, NULL),
  ('Accessories', 'Material',          false, 6, 'text',   NULL, NULL),
  ('Accessories', 'Dimensions',        false, 7, 'text',   NULL, NULL),
  ('Accessories', 'Weight',            false, 8, 'number', 'oz', NULL),
  -- Consumables (4)
  ('Consumables', 'Consumable Type',   false, 0, 'enum', NULL, '["Gaffer Tape","Batteries (AA/AAA/9V)","Gels","Lens Cleaning","Cable Ties","Other"]'),
  ('Consumables', 'Size / Format',     false, 1, 'text', NULL, NULL),
  ('Consumables', 'Quantity Per Unit', false, 2, 'text', NULL, NULL),
  ('Consumables', 'Color',             false, 3, 'text', NULL, NULL);

-- ----------------------------------------------------------------------------
-- 4a. Cameras "Sensor" routes by value shape BEFORE the general renames:
--     dimension-looking values (e.g. "35.6 x 23.8mm") → Sensor Size,
--     everything else ("Full Frame BSI CMOS") → Sensor Type.
-- ----------------------------------------------------------------------------
UPDATE inventory
SET specs = (specs - 'Sensor') ||
  CASE
    WHEN specs->>'Sensor' ~ '\d+(\.\d+)?\s*[x×]\s*\d+' THEN
      CASE WHEN specs ? 'Sensor Size' THEN '{}'::jsonb
           ELSE jsonb_build_object('Sensor Size', specs->'Sensor') END
    ELSE
      CASE WHEN specs ? 'Sensor Type' THEN '{}'::jsonb
           ELSE jsonb_build_object('Sensor Type', specs->'Sensor') END
  END
WHERE category_name = 'Cameras' AND specs ? 'Sensor';

-- ----------------------------------------------------------------------------
-- 4b. Key renames per the absorbs maps. When the canonical key already
--     exists on an item, the existing (more specific) value wins and the
--     old key is simply dropped. Only categories that HAVE items appear —
--     the final sweep (4c) covers everything else.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  maps jsonb := '{
    "Cameras": {
      "Mount": "Lens Mount", "Mount Type": "Lens Mount",
      "Max Video Resolution": "Video Resolution", "Video": "Video Resolution",
      "Slow Motion": "Frame Rates",
      "Recording": "Codecs / Formats", "Video Format": "Codecs / Formats",
      "Codec Options": "Codecs / Formats", "RAW Recording": "Codecs / Formats",
      "ProRes Support": "Codecs / Formats",
      "Chroma Subsampling": "Bit Depth",
      "ISO": "ISO Range", "Native ISO Range": "ISO Range",
      "Extended ISO Range": "ISO Range", "Dual Native ISO": "ISO Range",
      "IBIS Stops": "Stabilization",
      "Memory Card Slots": "Media / Card Slots",
      "Card Types Supported": "Media / Card Slots", "CFexpress Type": "Media / Card Slots"
    },
    "Lenses": {
      "Type": "Lens Type", "Aperture": "Maximum Aperture",
      "Mount": "Lens Mount", "Interchangeable Mount": "Lens Mount",
      "Lens Format Coverage": "Format Coverage", "Filter Size": "Filter Thread",
      "Stabilization": "Image Stabilization", "AF Motor Type": "Autofocus",
      "Squeeze": "Anamorphic Squeeze",
      "Dimensions (DxL)": "Dimensions", "Length": "Dimensions", "Diameter": "Dimensions"
    },
    "Lighting": {
      "Type": "Light Type",
      "Power": "Power Output", "Max Power Output": "Power Output",
      "Equivalent Wattage": "Power Output",
      "Color": "Color Temperature", "CCT Range": "Color Temperature",
      "Bi-Color": "Color Mode", "RGB/HSI": "Color Mode", "RGBWW": "Color Mode",
      "Spot/Flood Range": "Beam Angle", "Adjustable Beam": "Beam Angle", "Spread": "Beam Angle",
      "Modifier Mount": "Mount Type", "Mount": "Mount Type",
      "DMX Channels": "DMX", "CRMX/LumenRadio": "DMX",
      "Power Input": "Power Source", "Battery Compatible": "Power Source",
      "Battery Mount Type": "Power Source", "Battery": "Power Source",
      "AC Input Range": "Power Source",
      "Size": "Dimensions", "Length": "Dimensions"
    },
    "Audio": {
      "Type": "Audio Type", "Microphone Type": "Audio Type",
      "Pattern": "Polar Pattern", "Pattern Options": "Polar Pattern",
      "Switchable Patterns": "Polar Pattern",
      "Freq": "Frequency Response", "Frequency Range": "Frequency Response",
      "Connector": "Connectivity", "Output Connector": "Connectivity", "Inputs": "Connectivity",
      "Transmitters": "Channels",
      "Range": "Wireless Range", "Line of Sight Range": "Wireless Range",
      "Bit Depth": "Bit Depth / Sample Rate", "Sample Rate": "Bit Depth / Sample Rate",
      "Plug-In Power": "Phantom Power",
      "Power Requirements": "Power Source", "Battery Type": "Power Source",
      "USB Power": "Power Source"
    },
    "Monitors": {
      "Type": "Monitor Type", "Size": "Screen Size",
      "Max Input Resolution": "Resolution",
      "Brightness (nits)": "Brightness", "Peak Brightness": "Brightness",
      "HDR": "HDR Support", "HDR Formats": "HDR Support",
      "HDMI Input": "Inputs / Outputs", "HDMI Output": "Inputs / Outputs",
      "SDI Input": "Inputs / Outputs", "SDI Output": "Inputs / Outputs",
      "Loop Out": "Inputs / Outputs", "Cross Conversion": "Inputs / Outputs",
      "Waveform": "Monitoring Tools", "False Color": "Monitoring Tools",
      "Focus Assist": "Monitoring Tools", "Zebras": "Monitoring Tools",
      "LUT Support": "Monitoring Tools",
      "Range": "Wireless Range", "Wireless Video": "Wireless Range",
      "Power Input": "Power", "DC Input": "Power", "Battery Plate": "Power",
      "Battery Plate Type": "Power", "D-Tap Output": "Power"
    },
    "Power": {
      "Type": "Power Type",
      "Capacity (Wh)": "Capacity", "Capacity (mAh)": "Capacity",
      "Voltage (Nominal)": "Voltage", "Voltage Range": "Voltage",
      "Max Discharge": "Max Output", "Max Continuous Draw": "Max Output",
      "Max Peak Draw": "Max Output",
      "D-Tap Outputs": "Outputs", "USB-A Outputs": "Outputs", "USB-C Outputs": "Outputs",
      "DC Outputs": "Outputs", "Hirose Output": "Outputs", "LEMO Output": "Outputs",
      "AC Output": "Outputs",
      "Charge Time": "Charging", "Charge Current": "Charging", "Charge Rate": "Charging",
      "Charger Type": "Charging", "Channels": "Charging", "Bays": "Charging",
      "USB-C PD Input": "Charging",
      "LED Indicator": "Charge Display", "Display": "Charge Display"
    },
    "Support": {
      "Type": "Support Type",
      "Payload": "Max Payload", "Load Capacity": "Max Payload",
      "Max Height": "Height Range", "Min Height": "Height Range",
      "Folded Dimensions": "Folded Length", "Collapsed Length": "Folded Length",
      "Length": "Folded Length",
      "Head Model": "Head Type",
      "Flat Base": "Bowl Size", "Leveling Ball": "Bowl Size",
      "Quick Release Plate": "Quick Release", "Plate Type": "Quick Release",
      "Axis Count": "Axes / Modes", "Follow Modes": "Axes / Modes", "Modes": "Axes / Modes",
      "Track Length": "Travel / Track Length", "Track": "Travel / Track Length",
      "Track Type": "Travel / Track Length", "Extension Range": "Travel / Track Length",
      "Leg Material": "Material",
      "Battery Type": "Battery Life", "Battery": "Battery Life", "USB Charging": "Battery Life"
    },
    "Drones": {
      "Type": "Drone Type", "Sensor": "Camera Sensor", "Sensors": "Obstacle Sensing",
      "Video": "Video Resolution", "Transmission": "Max Transmission Range",
      "Weight": "Takeoff Weight"
    }
  }'::jsonb;
  cat text;
  pair record;
BEGIN
  FOR cat IN SELECT jsonb_object_keys(maps) LOOP
    FOR pair IN SELECT key AS old_key, value #>> '{}' AS new_key FROM jsonb_each(maps->cat) LOOP
      UPDATE inventory
      SET specs = (specs - pair.old_key) ||
        CASE WHEN specs ? pair.new_key THEN '{}'::jsonb
             ELSE jsonb_build_object(pair.new_key, specs->pair.old_key) END
      WHERE category_name = cat AND specs ? pair.old_key;
    END LOOP;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4c. Drop item spec keys that aren't canonical for the item's category
-- ----------------------------------------------------------------------------
UPDATE inventory i
SET specs = COALESCE(
  (SELECT jsonb_object_agg(e.key, e.value)
   FROM jsonb_each(i.specs) e
   WHERE EXISTS (SELECT 1 FROM specs s
                 WHERE s.category_name = i.category_name AND s.name = e.key)),
  '{}'::jsonb)
WHERE i.specs IS NOT NULL AND i.specs <> '{}'::jsonb;
