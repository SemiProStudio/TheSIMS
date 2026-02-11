// =============================================================================
// Field Mapping — Single Source of Truth
// Maps between frontend camelCase and database snake_case field names.
//
// Every transform function in services.js derives from these maps.
// To add a new field: add one entry here, and both directions work automatically.
// =============================================================================

// =============================================================================
// INVENTORY FIELDS
// Format: frontendKey → databaseKey
// =============================================================================

export const INVENTORY_FIELD_MAP = {
  // Category
  category:           'category_name',
  // Dates & prices
  purchaseDate:       'purchase_date',
  purchasePrice:      'purchase_price',
  currentValue:       'current_value',
  serialNumber:       'serial_number',
  reorderPoint:       'reorder_point',
  // Checkout state
  checkedOutTo:       'checked_out_to_name',
  checkedOutToUserId: 'checked_out_to_user_id',
  checkedOutDate:     'checked_out_date',
  dueBack:            'due_back',
  checkoutProject:    'checkout_project',
  checkoutClientId:   'checkout_client_id',
  // Kit fields
  isKit:              'is_kit',
  kitType:            'kit_type',
  kitItems:           'kit_contents',
  // Stats
  viewCount:          'view_count',
  checkoutCount:      'checkout_count',
  // Location
  location:           'location_display',
  locationId:         'location_id',
  // Timestamps
  createdAt:          'created_at',
  updatedAt:          'updated_at',
};

// =============================================================================
// RESERVATION FIELDS
// =============================================================================

export const RESERVATION_FIELD_MAP = {
  // Long aliases first (these get overwritten in reverseMap)
  startDate:       'start_date',
  endDate:         'end_date',
  // Short aliases last (these win in reverseMap → fromDb)
  start:           'start_date',
  end:             'end_date',
  contactName:     'contact_name',
  contactPhone:    'contact_phone',
  contactEmail:    'contact_email',
  itemId:          'item_id',
  clientId:        'client_id',
  createdById:     'created_by_id',
  createdByName:   'created_by_name',
  projectType:     'project_type',
  createdAt:       'created_at',
  updatedAt:       'updated_at',
};

// =============================================================================
// REMINDER FIELDS
// =============================================================================

export const REMINDER_FIELD_MAP = {
  itemId:          'item_id',
  dueDate:         'due_date',
  completedAt:     'completed_at',
  completedDate:   'completed_at',
  createdById:     'created_by_id',
  createdByName:   'created_by_name',
  createdAt:       'created_at',
  updatedAt:       'updated_at',
};

// =============================================================================
// MAINTENANCE FIELDS
// =============================================================================

export const MAINTENANCE_FIELD_MAP = {
  itemId:          'item_id',
  scheduledDate:   'scheduled_date',
  completedDate:   'completed_date',
  warrantyWork:    'warranty_work',
  vendorContact:   'vendor_contact',
  createdById:     'created_by_id',
  createdByName:   'created_by_name',
  createdAt:       'created_at',
  updatedAt:       'updated_at',
};

// =============================================================================
// CHECKOUT HISTORY FIELDS
// =============================================================================

export const CHECKOUT_HISTORY_FIELD_MAP = {
  itemId:            'item_id',
  userId:            'user_id',
  userName:          'user_name',
  clientId:          'client_id',
  clientName:        'client_name',
  conditionAtAction: 'condition_at_action',
};

// =============================================================================
// GENERIC TRANSFORM UTILITIES
// =============================================================================

/**
 * Build a reverse map (db → frontend) from a forward map (frontend → db).
 * Caches the result on the map object for performance.
 */
function reverseMap(fieldMap) {
  if (fieldMap._reverse) return fieldMap._reverse;
  const reversed = Object.fromEntries(
    Object.entries(fieldMap).map(([fe, db]) => [db, fe])
  );
  fieldMap._reverse = reversed;
  return reversed;
}

/**
 * Transform a database row to frontend format using a field map.
 * Spreads the original object, then overlays the mapped frontend keys.
 * Defaults can specify fallback values for specific frontend keys.
 *
 * @param {Object} row - Database row
 * @param {Object} fieldMap - frontend → db mapping
 * @param {Object} [defaults={}] - Default values for frontend keys (e.g. { isKit: false })
 * @returns {Object} Frontend-formatted object
 */
export function fromDb(row, fieldMap, defaults = {}) {
  if (!row) return null;
  const result = { ...row };
  const reversed = reverseMap(fieldMap);
  
  // Apply mapped fields: for each db column, set the frontend key
  for (const [dbKey, feKey] of Object.entries(reversed)) {
    if (row[dbKey] !== undefined) {
      result[feKey] = row[dbKey];
    } else if (row[feKey] !== undefined) {
      // Already has the frontend key (e.g. passed through from frontend)
      result[feKey] = row[feKey];
    } else if (feKey in defaults) {
      result[feKey] = defaults[feKey];
    }
  }

  // Apply defaults for any keys not yet set
  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (result[key] === undefined || result[key] === null) {
      result[key] = defaultValue;
    }
  }

  return result;
}

/**
 * Transform a frontend object to database format using a field map.
 * Only includes fields that are present in the input object.
 * Pass-through fields (not in the map) are included as-is.
 *
 * @param {Object} obj - Frontend object
 * @param {Object} fieldMap - frontend → db mapping
 * @param {Object} [options={}]
 * @param {boolean} [options.partial=false] - If true, only include fields present in obj (for updates)
 * @param {string[]} [options.passThroughFields=[]] - Fields to always include as-is
 * @param {Object} [options.numericFields={}] - Fields to coerce to Number { frontendKey: defaultValue }
 * @returns {Object} Database-formatted object
 */
export function toDb(obj, fieldMap, options = {}) {
  if (!obj) return null;
  const { partial = false, passThroughFields = [], numericFields = {} } = options;
  const result = {};

  if (!partial) {
    // Full transform: include all pass-through fields
    for (const field of passThroughFields) {
      if (obj[field] !== undefined) {
        result[field] = obj[field];
      }
    }
  }

  // Map frontend keys to db keys
  for (const [feKey, dbKey] of Object.entries(fieldMap)) {
    const value = obj[feKey] !== undefined ? obj[feKey] : obj[dbKey];
    if (value !== undefined) {
      // Apply numeric coercion if specified
      if (feKey in numericFields) {
        result[dbKey] = Number(value) || numericFields[feKey];
      } else {
        result[dbKey] = value;
      }
    }
  }

  // In partial mode, also pass through any unknown keys (they might be db-native keys)
  if (partial) {
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in fieldMap) && !(key in result)) {
        // Check if it's already a db key in the map values
        const isDbKey = Object.values(fieldMap).includes(key);
        if (!isDbKey) {
          result[key] = value;
        }
      }
    }
  }

  return result;
}
