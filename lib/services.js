// =============================================================================
// SIMS Data Services
// Service layer for Supabase database operations
// =============================================================================

import { getSupabase } from './supabase.js';
import { warn } from './logger.js';
import { liftUserRow } from './userSettings.js';

import {
  INVENTORY_FIELD_MAP,
  RESERVATION_FIELD_MAP,
  REMINDER_FIELD_MAP,
  MAINTENANCE_FIELD_MAP,
  CHECKOUT_HISTORY_FIELD_MAP,
  fromDb,
  toDb,
} from './fieldMap.js';

// Helper to get Supabase client — throws if unavailable
async function db() {
  const supabase = await getSupabase();
  if (!supabase) {
    throw new Error(
      'Database connection unavailable. Please check your internet connection and try again.',
    );
  }
  return supabase;
}

// =============================================================================
// FRESHNESS SERVICE — lightweight staleness check for incremental refresh
// =============================================================================
export const freshnessService = {
  async check() {
    const supabase = await db();
    const { data, error } = await supabase.rpc('get_data_freshness');
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// INVENTORY SERVICE
// =============================================================================

// Default values for inventory items
const INVENTORY_DEFAULTS = {
  isKit: false,
  kitItems: [],
  viewCount: 0,
  checkoutCount: 0,
  location: '',
};

// Inventory pass-through fields (same name in frontend and DB)
const INVENTORY_PASSTHROUGH = [
  'id',
  'name',
  'brand',
  'status',
  'condition',
  'image',
  'specs',
  'quantity',
];

// Numeric fields with their default values
const INVENTORY_NUMERIC = { purchasePrice: 0, currentValue: 0, reorderPoint: 0 };

// Transform database row to frontend format
function transformInventoryItem(item) {
  if (!item) return null;
  const result = fromDb(item, INVENTORY_FIELD_MAP, INVENTORY_DEFAULTS);
  // Dual-key compat: ensure category_name is also set
  result.category_name = result.category || result.category_name;
  return result;
}

// Transform frontend object to database format (full insert)
function transformItemForDb(item) {
  if (!item) return null;
  const dbItem = toDb(item, INVENTORY_FIELD_MAP, {
    passThroughFields: INVENTORY_PASSTHROUGH,
    numericFields: INVENTORY_NUMERIC,
  });
  // Ensure defaults
  if (!dbItem.status) dbItem.status = 'available';
  if (!dbItem.condition) dbItem.condition = 'excellent';
  if (!dbItem.specs) dbItem.specs = {};
  if (!dbItem.quantity) dbItem.quantity = 1;
  return dbItem;
}

export const inventoryService = {
  // Columns needed for list views (GearList, Dashboard, Search, PackLists, Labels, etc.)
  // This is everything except notes, checkout_history, and maintenance which come from separate tables
  LIST_COLUMNS: [
    'id',
    'name',
    'brand',
    'status',
    'condition',
    'image',
    'quantity',
    'category_name',
    'serial_number',
    'specs',
    'purchase_date',
    'purchase_price',
    'current_value',
    'reorder_point',
    'is_kit',
    'kit_type',
    'kit_contents',
    'required_accessories',
    'checked_out_to_name',
    'checked_out_to_user_id',
    'checked_out_date',
    'due_back',
    'checkout_project',
    'checkout_client_id',
    'location_display',
    'location_id',
    'view_count',
    'checkout_count',
    'created_at',
    'updated_at',
  ].join(','),

  // Get all inventory items (slim: list columns only, no related data)
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('inventory')
      .select(this.LIST_COLUMNS)
      .order('category_name')
      .order('name');

    if (error) throw error;
    return (data || []).map(transformInventoryItem);
  },

  // Get single item by ID
  async getById(id) {
    const supabase = await db();

    const { data, error } = await supabase.from('inventory').select('*').eq('id', id).single();

    if (error) throw error;
    return transformInventoryItem(data);
  },

  // Get item with all related data (notes, reminders, reservations, maintenance)
  async getByIdWithDetails(id) {
    // Get base item
    const item = await this.getById(id);
    if (!item) return null;

    // Get related data in parallel
    const [notes, reminders, reservations, maintenance, checkoutHistory] = await Promise.all([
      itemNotesService.getByItemId(id),
      itemRemindersService.getByItemId(id),
      reservationsService.getByItemId(id),
      maintenanceService.getByItemId(id),
      checkoutHistoryService.getByItemId(id),
    ]);

    return {
      ...item,
      notes: notes || [],
      reminders: reminders || [],
      reservations: reservations || [],
      maintenanceHistory: maintenance || [],
      checkoutHistory: checkoutHistory || [],
    };
  },

  // Create new item
  async create(item) {
    const supabase = await db();

    // Validate before writing. Category validity is enforced upstream against
    // the LIVE category list (ItemForm passes customCategories, the CSV
    // importer matches rows against DB categories) — this stateless layer only
    // knows the hardcoded defaults, so checking here rejected every item in an
    // admin-added or renamed category after preflight had approved it.
    const { validateItem } = await import('./validators.js');
    const validation = validateItem(item, { skipCategoryCheck: true });
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
    }

    // Transform from frontend camelCase to database snake_case
    const dbItem = transformItemForDb(validation.data || item);

    const { data, error } = await supabase.from('inventory').insert(dbItem).select().single();

    if (error) throw error;

    // Transform response back to frontend format
    return transformInventoryItem(data);
  },

  // Update item
  async update(id, updates) {
    const supabase = await db();

    // Transform updates to database format (partial update)
    const dbUpdates = toDb(updates, INVENTORY_FIELD_MAP, {
      partial: true,
      numericFields: INVENTORY_NUMERIC,
    });

    const { data, error } = await supabase
      .from('inventory')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformInventoryItem(data);
  },

  // Delete item
  async delete(id) {
    const supabase = await db();

    const { data, error } = await supabase.from('inventory').delete().eq('id', id).select('id');

    if (error) throw error;
    // RLS-filtered deletes "succeed" with zero rows: the DELETE policy is
    // is_admin()-only, so a non-admin bulk delete looked successful in the
    // UI while every item came back on reload. Surface it as a real error.
    if (!data || data.length === 0) {
      throw new Error('Delete blocked — removing items requires administrator access.');
    }
    return { id };
  },

  // Check out item
  async checkOut(id, { userId, userName, clientId, clientName, project, dueBack }) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('inventory')
      .update({
        status: 'checked-out',
        checked_out_to_user_id: userId,
        checked_out_to_name: userName,
        checkout_client_id: clientId,
        checked_out_date: new Date().toISOString().split('T')[0],
        due_back: dueBack,
        checkout_project: project,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Increment checkout count (non-blocking, may not exist yet)
    supabase.rpc('increment_checkout_count', { item_id: id }).then(({ error: rpcErr }) => {
      if (rpcErr) warn('increment_checkout_count RPC not available:', rpcErr.message);
    });

    // Record checkout history. Non-fatal — the checkout itself already
    // committed — but awaited so the caller can mirror the real row into the
    // cached activity feed (a fire-and-forget insert left the Activity report
    // blind to every event created this session).
    let historyRow = null;
    try {
      historyRow = await checkoutHistoryService.create({
        item_id: id,
        user_id: userId,
        user_name: userName,
        client_id: clientId,
        client_name: clientName,
        action: 'checkout',
        project,
      });
    } catch (err) {
      warn('Checkout history not saved:', err.message);
    }

    return {
      item: transformInventoryItem(data),
      historyEvent: historyRow ? transformCheckoutHistory(historyRow) : null,
    };
  },

  // Check in item
  async checkIn(id, { userId, userName, notes, condition, damageReported, returnStatus }) {
    const supabase = await db();

    // Get current item state for history
    const item = await this.getById(id);

    // returnStatus lets the caller return the item to 'reserved' when a
    // confirmed reservation covers today; damage always wins
    const updates = {
      status: damageReported ? 'needs-attention' : returnStatus || 'available',
      checked_out_to_user_id: null,
      checked_out_to_name: null,
      checkout_client_id: null,
      checked_out_date: null,
      due_back: null,
      checkout_project: null,
    };

    if (condition) updates.condition = condition;

    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Record checkin history — awaited-but-non-fatal, same contract as checkOut.
    // NOTE: item is the TRANSFORMED (camelCase) row from getById
    let historyRow = null;
    try {
      historyRow = await checkoutHistoryService.create({
        item_id: id,
        user_id: userId,
        user_name: userName,
        client_id: item?.checkoutClientId,
        action: 'checkin',
        notes,
        condition_at_action: condition,
      });
    } catch (err) {
      warn('Checkin history not saved:', err.message);
    }

    return {
      item: transformInventoryItem(data),
      historyEvent: historyRow ? transformCheckoutHistory(historyRow) : null,
    };
  },

  // Generate next ID for category
  async generateId(categoryPrefix) {
    const supabase = await db();

    const { data, error } = await supabase.rpc('generate_item_id', {
      category_prefix: categoryPrefix,
    });

    if (error) throw error;
    return data;
  },

  // Increment view count
  async incrementViewCount(id) {
    const supabase = await db();

    await supabase.rpc('increment_view_count', { item_id: id });
  },

  // Get items by status
  async getByStatus(status) {
    const supabase = await db();

    const { data, error } = await supabase.from('inventory').select('*').eq('status', status);

    if (error) throw error;
    return (data || []).map(transformInventoryItem);
  },

  // Get overdue items
  async getOverdue() {
    const supabase = await db();

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'checked-out')
      .lt('due_back', today);

    if (error) throw error;
    return (data || []).map(transformInventoryItem);
  },

  // Get items modified since a timestamp (for incremental refresh)
  async getSince(timestamp) {
    const supabase = await db();
    const { data, error } = await supabase
      .from('inventory')
      .select(this.LIST_COLUMNS)
      .gte('updated_at', timestamp)
      .order('category_name')
      .order('name');
    if (error) throw error;
    return (data || []).map(transformInventoryItem);
  },

  // Get all item IDs (lightweight, for detecting deletions)
  async getIds() {
    const supabase = await db();
    const { data, error } = await supabase.from('inventory').select('id');
    if (error) throw error;
    return new Set((data || []).map((row) => row.id));
  },
};

// =============================================================================
// ITEM NOTES SERVICE
// =============================================================================
export const itemNotesService = {
  async getByItemId(itemId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_notes')
      .select('*')
      .eq('item_id', itemId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Build threaded structure
    return buildThreadedNotes(data);
  },

  async create(note) {
    const supabase = await db();

    const { data, error } = await supabase.from('item_notes').insert(note).select().single();

    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_notes')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// ITEM REMINDERS SERVICE
// =============================================================================
// Helper to transform reminder fields
function transformReminder(reminder) {
  if (!reminder) return null;
  const result = fromDb(reminder, REMINDER_FIELD_MAP);
  // Transform nested item if present
  if (result.item) result.item = transformInventoryItem(result.item);
  return result;
}

export const itemRemindersService = {
  async getByItemId(itemId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_reminders')
      .select('*')
      .eq('item_id', itemId)
      .order('due_date');

    if (error) throw error;
    return (data || []).map(transformReminder);
  },

  // All incomplete reminders across the inventory. Merged into items during
  // the Tier 2 load so the dashboard's Due Reminders panel has data — the
  // inventory list load doesn't include reminders (separate table).
  async getAllActive() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_reminders')
      .select('*')
      .eq('completed', false)
      .order('due_date');

    if (error) throw error;
    return (data || []).map(transformReminder);
  },

  async getDue() {
    const supabase = await db();

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('item_reminders')
      .select(
        `
        *,
        item:inventory(id, name, category_name)
      `,
      )
      .lte('due_date', today)
      .eq('completed', false)
      .order('due_date');

    if (error) throw error;
    return (data || []).map(transformReminder);
  },

  async create(reminder) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_reminders')
      .insert(reminder)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_reminders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async complete(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('item_reminders')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('item_reminders').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },
};

// =============================================================================
// RESERVATIONS SERVICE
// =============================================================================

// Helper to transform reservation fields
function transformReservation(res) {
  if (!res) return null;

  // Parse notes if it's a string (JSONB comes back as string sometimes)
  let notes = res.notes || [];
  if (typeof notes === 'string') {
    try {
      notes = JSON.parse(notes);
    } catch (_e) {
      notes = [];
    }
  }
  // Ensure notes is always an array
  if (!Array.isArray(notes)) {
    notes = [];
  }

  const result = fromDb(res, RESERVATION_FIELD_MAP);
  result.notes = notes;

  // Normalize field aliases — the field map has duplicates (start/startDate both map
  // to start_date) and reverseMap only keeps the last one. Ensure the short names
  // used throughout the app are always present.
  if (result.startDate && !result.start) result.start = result.startDate;
  if (result.endDate && !result.end) result.end = result.endDate;
  if (result.start && !result.startDate) result.startDate = result.start;
  if (result.end && !result.endDate) result.endDate = result.end;
  // contactName ↔ user: the app uses 'user' for contact name in forms/display
  if (result.contactName && !result.user) result.user = result.contactName;
  if (result.user && !result.contactName) result.contactName = result.user;
  // Ensure dueBack is set (used by some views)
  if (!result.dueBack) result.dueBack = result.end || result.endDate;

  // Transform nested item if present
  if (result.item) result.item = transformInventoryItem(result.item);
  return result;
}

export const reservationsService = {
  async getAll() {
    const supabase = await db();

    // Cancelled reservations are excluded — they'd otherwise surface on the
    // dashboard's Upcoming Reservations and pollute per-item conflict checks.
    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand, status),
        client:clients(id, name, type, email, phone)
      `,
      )
      .neq('status', 'cancelled')
      .order('start_date');

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  async getByItemId(itemId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        client:clients(id, name, type)
      `,
      )
      .eq('item_id', itemId)
      .neq('status', 'cancelled') // consistent with getAll — cancelled rows are history
      .order('start_date');

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  async getByClientId(clientId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand)
      `,
      )
      .eq('client_id', clientId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  async getUpcoming(days = 7) {
    const supabase = await db();

    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + days);

    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand),
        client:clients(id, name, type)
      `,
      )
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('start_date', future.toISOString().split('T')[0])
      .eq('status', 'confirmed')
      .order('start_date');

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  async getByDateRange(startDate, endDate) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand),
        client:clients(id, name, type)
      `,
      )
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .neq('status', 'cancelled')
      .order('start_date');

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  async create(reservation) {
    // NOTE: no validateReservation here — this method receives the DB-shaped
    // row (start_date/end_date/contact_name), but the validator checks the
    // frontend shape (start/end/user), so validating here rejected EVERY
    // insert ("Start date is required...") while the error was swallowed
    // upstream and a ghost reservation was injected. Validation of the
    // frontend shape happens in DataContext.createReservation before the
    // field mapping.
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single();

    if (error) throw error;

    // No status side-effect here: it used to flip the item to 'reserved'
    // whenever start_date <= today, clobbering checked-out/missing items.
    // Status reconciliation lives with the callers (reconcileReservedStatus),
    // which only ever moves items between 'available' and 'reserved'.

    return transformReservation(data);
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformReservation(data);
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('reservations').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },

  async cancel(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformReservation(data);
  },

  // Cancel a whole reservation group in one statement — all-or-nothing, so a
  // failure can't leave half a multi-item reservation cancelled
  async cancelMany(ids) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .in('id', ids)
      .select();

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  // Update every row of a reservation group in one statement — editing a
  // multi-item reservation must never touch only the first row
  async updateMany(ids, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .in('id', ids)
      .select();

    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  // Get reservations modified since a timestamp (for incremental refresh).
  // Excludes cancelled — they're removed from local state via getIds pruning.
  async getSince(timestamp) {
    const supabase = await db();
    const { data, error } = await supabase
      .from('reservations')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand, status),
        client:clients(id, name, type, email, phone)
      `,
      )
      .gte('updated_at', timestamp)
      .neq('status', 'cancelled')
      .order('start_date');
    if (error) throw error;
    return (data || []).map(transformReservation);
  },

  // Get all live reservation IDs (lightweight, for detecting deletions).
  // Cancelled rows are excluded so a cancellation on another device prunes
  // the reservation from local state exactly like a deletion.
  async getIds() {
    const supabase = await db();
    const { data, error } = await supabase
      .from('reservations')
      .select('id')
      .neq('status', 'cancelled');
    if (error) throw error;
    return new Set((data || []).map((row) => row.id));
  },
};

// =============================================================================
// MAINTENANCE SERVICE
// =============================================================================
// Helper to transform maintenance record fields
function transformMaintenanceRecord(record) {
  if (!record) return null;
  const result = fromDb(record, MAINTENANCE_FIELD_MAP, { warrantyWork: false });
  // Transform nested item if present
  if (result.item) result.item = transformInventoryItem(result.item);
  return result;
}

// Writable maintenance_records columns — update payloads are whitelisted to
// these so form records carrying UI aliases or joined rows can't reach
// PostgREST (id/created_at excluded on purpose; updated_at is trigger-managed)
const MAINTENANCE_UPDATE_COLUMNS = [
  'item_id',
  'type',
  'description',
  'vendor',
  'vendor_contact',
  'cost',
  'scheduled_date',
  'completed_date',
  'status',
  'notes',
  'warranty_work',
  'created_by_id',
  'created_by_name',
];

export const maintenanceService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand)
      `,
      )
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformMaintenanceRecord);
  },

  async getByItemId(itemId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('item_id', itemId)
      .order('scheduled_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformMaintenanceRecord);
  },

  // Scheduled/in-progress records across the inventory. Merged into items
  // during the Tier 2 load so the dashboard's Upcoming Maintenance panel and
  // Maintenance stat have data without visiting each item.
  async getAllPending() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .in('status', ['scheduled', 'in-progress'])
      .order('scheduled_date');

    if (error) throw error;
    return (data || []).map(transformMaintenanceRecord);
  },

  async getPending() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select(
        `
        *,
        item:inventory(id, name, category_name, brand)
      `,
      )
      .in('status', ['scheduled', 'in-progress'])
      .order('scheduled_date');

    if (error) throw error;
    return (data || []).map(transformMaintenanceRecord);
  },

  async create(record) {
    const { validateMaintenanceRecord } = await import('./validators.js');
    const validation = validateMaintenanceRecord(record);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors).join(', '));
    }

    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return transformMaintenanceRecord(data);
  },

  async update(id, updates) {
    const supabase = await db();

    // The edit modal hands back its full camelCase form record, complete with
    // join artifacts (nested item, UI aliases). PostgREST rejects payloads
    // containing unknown columns (PGRST204), so map to snake_case and keep
    // only real maintenance_records columns. Hand-built snake_case payloads
    // (updateMaintenanceStatus) pass through toDb untouched.
    const mapped = toDb(updates, MAINTENANCE_FIELD_MAP, { partial: true });
    const payload = {};
    for (const col of MAINTENANCE_UPDATE_COLUMNS) {
      if (col in mapped) payload[col] = mapped[col];
    }

    const { data, error } = await supabase
      .from('maintenance_records')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformMaintenanceRecord(data);
  },

  async complete(id, { completedDate, notes, cost }) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .update({
        status: 'completed',
        completed_date: completedDate || new Date().toISOString().split('T')[0],
        notes,
        cost,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformMaintenanceRecord(data);
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('maintenance_records').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },

  // Get maintenance cost summary for an item
  async getCostSummary(itemId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('cost')
      .eq('item_id', itemId)
      .eq('status', 'completed');

    if (error) throw error;

    const total = data.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    return { total, count: data.length };
  },
};

// =============================================================================
// CHECKOUT HISTORY SERVICE
// =============================================================================
// Helper to transform checkout history fields
function transformCheckoutHistory(record) {
  if (!record) return null;
  const result = fromDb(record, CHECKOUT_HISTORY_FIELD_MAP);
  // Compat alias: 'user' field from user_name
  result.user = result.userName || result.user;
  // Compat alias: 'date' field from timestamp
  result.date = result.timestamp || result.date;

  // UI-compatible aliases — ItemDetail and ItemTimeline expect these field names
  // Map DB 'action' (checkout/checkin) → UI 'type' (checkout/return)
  result.type = result.action === 'checkin' ? 'return' : result.action;
  // Map user_name → borrowerName (for checkouts) and returnedBy (for checkins)
  if (result.action === 'checkout') {
    result.borrowerName = result.userName || result.clientName || 'Unknown';
    result.checkedOutDate = result.timestamp;
  } else if (result.action === 'checkin') {
    result.returnedBy = result.userName || 'Unknown';
    result.returnDate = result.timestamp;
  }
  return result;
}

export const checkoutHistoryService = {
  async getByItemId(itemId, limit = 50) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('checkout_history')
      .select('*')
      .eq('item_id', itemId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(transformCheckoutHistory);
  },

  async getByUserId(userId, limit = 50) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('checkout_history')
      .select(
        `
        *,
        item:inventory(id, name, category_name)
      `,
      )
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Trailing-window bulk fetch for the Activity report's time-series charts.
  // Chart-relevant columns only; idx_checkout_history_timestamp keeps it cheap.
  async getRecent(sinceISO) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('checkout_history')
      .select('id, item_id, user_name, client_id, client_name, action, project, timestamp')
      .gte('timestamp', sinceISO)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformCheckoutHistory);
  },

  async create(record) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('checkout_history')
      .insert({
        ...record,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// BACKUP SERVICE
// Complete-table reads for the database export. The old backup serialized
// whatever happened to be in React memory — lazy tables came out empty and
// notes/checkout history never came out at all.
// =============================================================================

export const backupService = {
  // Every row of a table, paged past PostgREST's per-request cap.
  // Ordered by primary key so pages can't skip or duplicate rows.
  async fetchAllRows(table) {
    const supabase = await db();
    const PAGE = 1000;
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    return rows;
  },

  // Cheap head-only counts so the export modal can show REAL table sizes
  // instead of whatever fraction the UI happened to have loaded.
  async tableCounts(tables) {
    const supabase = await db();
    const entries = await Promise.all(
      tables.map(async (table) => {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        return [table, error ? null : (count ?? 0)];
      }),
    );
    return Object.fromEntries(entries);
  },
};

// =============================================================================
// CLIENTS SERVICE
// =============================================================================

// Only real clients columns survive into insert/update payloads. The form
// layer historically stamped camelCase createdAt/updatedAt (and local state
// carries clientNotes/reservations) — PostgREST rejects unknown columns with
// PGRST204, which silently broke every UI create and update.
const CLIENT_DB_COLUMNS = [
  'id',
  'name',
  'type',
  'company',
  'email',
  'phone',
  'address',
  'notes',
  'favorite',
];

function toClientRow(client) {
  const row = {};
  for (const col of CLIENT_DB_COLUMNS) {
    if (client[col] !== undefined) row[col] = client[col];
  }
  return row;
}

export const clientsService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('favorite', { ascending: false })
      .order('name');

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const supabase = await db();

    const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();

    if (error) throw error;
    return data;
  },

  async getByIdWithDetails(id) {
    const client = await this.getById(id);
    if (!client) return null;

    const [notes, reservations] = await Promise.all([
      clientNotesService.getByClientId(id),
      reservationsService.getByClientId(id),
    ]);

    return {
      ...client,
      clientNotes: notes || [],
      reservations: reservations || [],
    };
  },

  async create(client) {
    const { validateClient } = await import('./validators.js');
    const validation = validateClient(client);
    if (!validation.isValid) {
      throw new Error(Object.values(validation.errors).join(', '));
    }

    const supabase = await db();
    const row = toClientRow(client);

    // Generate ID if not provided (CL### sequence, matching the seed data)
    if (!row.id) {
      const { data: newId } = await supabase.rpc('generate_client_id');
      row.id = newId;
    }

    const { data, error } = await supabase.from('clients').insert(row).select().single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();

    // Never move the primary key on an update
    const row = toClientRow(updates);
    delete row.id;

    const { data, error } = await supabase
      .from('clients')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('clients').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },

  async toggleFavorite(id, favorite) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('clients')
      .update({ favorite })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async generateId() {
    const supabase = await db();

    const { data, error } = await supabase.rpc('generate_client_id');
    if (error) throw error;
    return data;
  },
};

// =============================================================================
// CLIENT NOTES SERVICE
// =============================================================================
export const clientNotesService = {
  async getByClientId(clientId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('client_notes')
      .select('*')
      .eq('client_id', clientId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Build threaded structure
    return buildThreadedNotes(data);
  },

  async create(note) {
    const supabase = await db();

    const { data, error } = await supabase.from('client_notes').insert(note).select().single();

    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('client_notes')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// PACKAGES SERVICE
// =============================================================================
export const packagesService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('packages')
      .select(
        `
        *,
        package_items(item_id, sort_order)
      `,
      )
      .order('name');

    if (error) throw error;

    // Transform to expected format
    return data.map((pkg) => {
      const { package_items, category_name, item_quantities, ...rest } = pkg;
      return {
        ...rest,
        category: category_name || '',
        items: (package_items || [])
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((pi) => pi.item_id),
        itemQuantities: item_quantities || {},
      };
    });
  },

  async getById(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('packages')
      .select(
        `
        *,
        package_items(item_id, sort_order),
        package_notes(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    const { package_items, package_notes, category_name, item_quantities, ...rest } = data;
    return {
      ...rest,
      category: category_name || '',
      items: (package_items || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((pi) => pi.item_id),
      itemQuantities: item_quantities || {},
      notes: buildThreadedNotes(package_notes || []),
    };
  },

  async create(pkg) {
    const supabase = await db();

    // Extract fields that aren't in DB columns directly
    const { items, notes: _notes, category, itemQuantities, ...packageData } = pkg;

    // Map frontend field to DB column
    if (category) {
      packageData.category_name = category;
    }

    // Generate short human-readable ID (PKG-001, PKG-002, etc.) server-side —
    // the RPC is race-safe and orders numerically (PKG-999 → PKG-1000 works)
    if (!packageData.id) {
      const { data: newId, error: idError } = await supabase.rpc('generate_package_id');
      if (idError) throw idError;
      packageData.id = newId;
    }

    // Try with item_quantities first, fall back without if column doesn't exist
    let data;
    const hasQuantities = itemQuantities && Object.keys(itemQuantities).length > 0;
    if (hasQuantities) {
      packageData.item_quantities = itemQuantities;
    }

    const { data: result, error } = await supabase
      .from('packages')
      .insert(packageData)
      .select()
      .single();

    if (error) {
      // If column doesn't exist yet, retry without item_quantities
      if (error.message?.includes('item_quantities')) {
        delete packageData.item_quantities;
        const { data: fallback, error: fallbackErr } = await supabase
          .from('packages')
          .insert(packageData)
          .select()
          .single();
        if (fallbackErr) throw fallbackErr;
        data = fallback;
      } else {
        throw error;
      }
    } else {
      data = result;
    }

    // Add items via transactional sync; if it fails, remove the package row so
    // we never leave a half-created package behind
    if (items?.length > 0) {
      const { error: itemsError } = await supabase.rpc('sync_package_items', {
        p_package_id: data.id,
        p_item_ids: items,
      });
      if (itemsError) {
        await supabase.from('packages').delete().eq('id', data.id);
        throw itemsError;
      }
    }

    return {
      ...data,
      category: data.category_name || category || '',
      items: items || [],
      itemQuantities: data.item_quantities || itemQuantities || {},
      notes: [],
    };
  },

  async update(id, updates) {
    const supabase = await db();

    // Extract fields that aren't direct DB columns
    const { items, notes: _notes, category, itemQuantities, ...packageData } = updates;

    // Map frontend field to DB column
    if (category !== undefined) {
      packageData.category_name = category;
    }

    // Include itemQuantities if provided
    if (itemQuantities !== undefined) {
      packageData.item_quantities = Object.keys(itemQuantities).length > 0 ? itemQuantities : null;
    }

    // Update package (only if there are DB fields to update)
    let data = { id };
    if (Object.keys(packageData).length > 0) {
      const { data: updatedData, error } = await supabase
        .from('packages')
        .update(packageData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        // If item_quantities column doesn't exist yet, retry without it
        if (error.message?.includes('item_quantities')) {
          delete packageData.item_quantities;
          if (Object.keys(packageData).length > 0) {
            const { data: fallback, error: fallbackErr } = await supabase
              .from('packages')
              .update(packageData)
              .eq('id', id)
              .select()
              .single();
            if (fallbackErr) throw fallbackErr;
            data = fallback;
          }
        } else {
          throw error;
        }
      } else {
        data = updatedData;
      }
    }

    // Update items if provided — single transaction server-side, so a failed
    // insert can no longer wipe the package's items
    if (items !== undefined) {
      const { error: itemsError } = await supabase.rpc('sync_package_items', {
        p_package_id: id,
        p_item_ids: items,
      });
      if (itemsError) throw itemsError;
    }

    return {
      ...data,
      category: data.category_name || category || '',
      items: items || [],
      itemQuantities: data.item_quantities || itemQuantities || {},
    };
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('packages').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },
};

// =============================================================================
// PACKAGE NOTES SERVICE
// =============================================================================
export const packageNotesService = {
  async getByPackageId(packageId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('package_notes')
      .select('*')
      .eq('package_id', packageId)
      .eq('deleted', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Build threaded structure
    return buildThreadedNotes(data);
  },

  async create(note) {
    const supabase = await db();

    const { data, error } = await supabase.from('package_notes').insert(note).select().single();

    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('package_notes')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// PACK LISTS SERVICE
// =============================================================================
export const packListsService = {
  async getAll() {
    const supabase = await db();

    // pack_list_packages selects * so is_packed (added by the
    // package-packed migration) lifts when present and the query still
    // works on a database that hasn't run it yet
    const { data, error } = await supabase
      .from('pack_lists')
      .select(
        `
        *,
        pack_list_items(item_id, quantity, is_packed, sort_order),
        pack_list_packages(*)
      `,
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to expected format
    return data.map((list) => ({
      ...list,
      createdAt: list.created_at, // Map snake_case to camelCase
      createdByName: list.created_by_name,
      items: list.pack_list_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ id: i.item_id, quantity: i.quantity })),
      packages: list.pack_list_packages
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => p.package_id),
      packedItems: list.pack_list_items.filter((i) => i.is_packed).map((i) => i.item_id),
      packedPackages: list.pack_list_packages.filter((p) => p.is_packed).map((p) => p.package_id),
    }));
  },

  async getById(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('pack_lists')
      .select(
        `
        *,
        pack_list_items(item_id, quantity, is_packed, sort_order),
        pack_list_packages(*)
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      createdAt: data.created_at, // Map snake_case to camelCase
      createdByName: data.created_by_name,
      items: data.pack_list_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ id: i.item_id, quantity: i.quantity })),
      packages: data.pack_list_packages
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((p) => p.package_id),
      packedItems: data.pack_list_items.filter((i) => i.is_packed).map((i) => i.item_id),
      packedPackages: data.pack_list_packages.filter((p) => p.is_packed).map((p) => p.package_id),
    };
  },

  async create(packList) {
    const supabase = await db();

    const {
      items,
      packages,
      packedItems: _packedItems,
      packedPackages: _packedPackages,
      ...listData
    } = packList;

    // Strip any camelCase or relation fields that are not DB columns
    delete listData.createdAt;
    delete listData.updatedAt;
    delete listData.createdByName;
    delete listData.pack_list_items;
    delete listData.pack_list_packages;

    // Generate UUID for id if not provided
    if (!listData.id) {
      listData.id = crypto.randomUUID();
    }

    // Add created_at if not provided
    if (!listData.created_at) {
      listData.created_at = new Date().toISOString();
    }

    // Create pack list
    const { data, error } = await supabase.from('pack_lists').insert(listData).select().single();

    if (error) throw error;

    // Add items and packages in one transactional sync; if it fails, remove
    // the pack list row so we never leave a half-created list behind
    if (items?.length > 0 || packages?.length > 0) {
      const { error: syncError } = await supabase.rpc('sync_pack_list_children', {
        p_pack_list_id: data.id,
        p_items: (items || []).map((item) => ({
          id: item.id || item,
          quantity: item.quantity || 1,
          is_packed: false,
        })),
        p_package_ids: packages || [],
      });
      if (syncError) {
        await supabase.from('pack_lists').delete().eq('id', data.id);
        throw syncError;
      }
    }

    return {
      ...data,
      createdAt: data.created_at,
      createdByName: data.created_by_name,
      items: items || [],
      packages: packages || [],
      packedItems: [],
      packedPackages: [],
    };
  },

  async update(id, updates) {
    const supabase = await db();

    // packedPackages is stripped (not a pack_lists column); its persistence
    // is togglePackagePacked's job, and the child sync preserves it on the
    // DB side by upserting rows that stay on the list
    const { items, packages, packedItems, packedPackages: _packedPackages, ...listData } = updates;

    // Strip any camelCase or relation fields that are not DB columns
    delete listData.createdAt;
    delete listData.updatedAt;
    delete listData.createdByName;
    delete listData.pack_list_items;
    delete listData.pack_list_packages;

    // Update pack list main record (only if there are valid DB fields)
    if (Object.keys(listData).length > 0) {
      const { error } = await supabase.from('pack_lists').update(listData).eq('id', id);

      if (error) throw error;
    }

    // Update children if provided — single transaction server-side (a failed
    // insert previously left the list silently emptied); passing null for a
    // side leaves it untouched
    if (items !== undefined || packages !== undefined) {
      const { error: syncError } = await supabase.rpc('sync_pack_list_children', {
        p_pack_list_id: id,
        p_items:
          items !== undefined
            ? items.map((item) => ({
                id: item.id || item,
                quantity: item.quantity || 1,
                is_packed: packedItems?.includes(item.id || item) || false,
              }))
            : null,
        p_package_ids: packages !== undefined ? packages : null,
      });
      if (syncError) throw syncError;

      // Children-only updates skip the parent row, so get_data_freshness's
      // MAX(pack_lists.updated_at) watermark would never move and other
      // devices would keep stale data. Touch the parent (the BEFORE UPDATE
      // trigger replaces the value with server NOW()). Non-fatal: the update
      // itself succeeded, so a failed touch must not report failure.
      if (Object.keys(listData).length === 0) {
        const { error: touchError } = await supabase
          .from('pack_lists')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', id);
        if (touchError) warn('Pack list watermark touch failed:', touchError.message);
      }
    }

    return { id, ...updates };
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('pack_lists').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },

  async toggleItemPacked(packListId, itemId, isPacked) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('pack_list_items')
      .update({ is_packed: isPacked })
      .eq('pack_list_id', packListId)
      .eq('item_id', itemId)
      .select()
      .single();

    if (error) throw error;

    // Touch the parent row so the freshness watermark sees packed changes —
    // MAX(pack_lists.updated_at) never moves on child-only writes, leaving
    // other devices with stale pack progress. The BEFORE UPDATE trigger
    // replaces the value with server NOW(). Non-fatal: the toggle itself
    // succeeded, so a failed touch must not report failure.
    const { error: touchError } = await supabase
      .from('pack_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', packListId);
    if (touchError) warn('Pack list watermark touch failed:', touchError.message);

    return data;
  },

  // Mirrors toggleItemPacked for packages on the list. Throws until the
  // pack_list_packages.is_packed migration has run — callers surface that
  // as a failed save rather than pretending the box was ticked.
  async togglePackagePacked(packListId, packageId, isPacked) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('pack_list_packages')
      .update({ is_packed: isPacked })
      .eq('pack_list_id', packListId)
      .eq('package_id', packageId)
      .select()
      .single();

    if (error) throw error;

    // Same watermark touch as toggleItemPacked, same non-fatal semantics
    const { error: touchError } = await supabase
      .from('pack_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', packListId);
    if (touchError) warn('Pack list watermark touch failed:', touchError.message);

    return data;
  },
};

// =============================================================================
// CATEGORIES SERVICE
// =============================================================================
export const categoriesService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase.from('categories').select('*').order('sort_order');

    if (error) throw error;
    return data;
  },

  async create(category) {
    const supabase = await db();

    const { data, error } = await supabase.from('categories').insert(category).select().single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(name) {
    const supabase = await db();

    const { error } = await supabase.from('categories').delete().eq('name', name);

    if (error) throw error;
    return { name };
  },

  /**
   * Sync the full categories list + settings to the DB.
   * Compares current DB state with the new list and applies creates, updates, deletes.
   * @param {string[]} newNames - Ordered list of category names
   * @param {Object} settings - { categoryName: { trackQuantity, trackSerialNumbers, lowStockThreshold } }
   * @param {Object} renames - { oldName: newName } — applied as row UPDATEs so
   *   the category keeps its id and ID prefix, and its spec rows follow.
   *   Without this, a rename diffed as delete+recreate: the category got a
   *   fresh prefix and its specs were deleted out from under it.
   */
  async syncAll(newNames, settings = {}, renames = {}) {
    const supabase = await db();

    // Apply renames FIRST (name is a plain column everywhere — no FKs)
    for (const [oldName, newName] of Object.entries(renames)) {
      if (!oldName || !newName || oldName === newName) continue;
      const { error: renameErr } = await supabase
        .from('categories')
        .update({ name: newName })
        .eq('name', oldName);
      if (renameErr) {
        throw new Error(`Failed to rename category "${oldName}": ${renameErr.message}`);
      }
      const { error: specsErr } = await supabase
        .from('specs')
        .update({ category_name: newName })
        .eq('category_name', oldName);
      if (specsErr) {
        throw new Error(`Failed to move specs for "${oldName}": ${specsErr.message}`);
      }
    }

    // Fetch current DB state (post-rename)
    const { data: existing, error: fetchErr } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (fetchErr) throw fetchErr;

    const existingByName = {};
    (existing || []).forEach((c) => {
      existingByName[c.name] = c;
    });

    const existingNames = new Set((existing || []).map((c) => c.name));
    const newNameSet = new Set(newNames);

    // Delete removed categories
    const toDelete = [...existingNames].filter((n) => !newNameSet.has(n));
    for (const name of toDelete) {
      const { error: delErr } = await supabase.from('categories').delete().eq('name', name);
      if (delErr) throw new Error(`Failed to delete category "${name}": ${delErr.message}`);
      // Also delete specs for the removed category
      const { error: specErr } = await supabase.from('specs').delete().eq('category_name', name);
      if (specErr) throw new Error(`Failed to delete specs for "${name}": ${specErr.message}`);
    }

    // Collect existing prefixes to ensure uniqueness
    const usedPrefixes = new Set(
      (existing || []).filter((c) => newNameSet.has(c.name)).map((c) => c.prefix),
    );

    // Create new categories and update existing ones
    for (let i = 0; i < newNames.length; i++) {
      const name = newNames[i];
      const catSettings = settings[name] || {};
      const row = {
        track_quantity: catSettings.trackQuantity || false,
        track_serial_numbers: catSettings.trackSerialNumbers !== false,
        low_stock_threshold: catSettings.lowStockThreshold || 0,
        sort_order: i,
      };

      if (existingByName[name]) {
        // Update existing
        const { error: updateErr } = await supabase
          .from('categories')
          .update(row)
          .eq('id', existingByName[name].id);
        if (updateErr) {
          throw new Error(`Failed to update category "${name}": ${updateErr.message}`);
        }
        usedPrefixes.add(existingByName[name].prefix);
      } else {
        // Create new — generate a unique prefix from the name
        let prefix = name.substring(0, 2).toUpperCase();
        // Ensure prefix uniqueness: try 2-char, then 3-char, then with numbers
        if (usedPrefixes.has(prefix)) {
          prefix = name.substring(0, 3).toUpperCase();
        }
        let attempt = 1;
        while (usedPrefixes.has(prefix) && attempt < 100) {
          prefix = name.charAt(0).toUpperCase() + attempt;
          attempt++;
        }
        usedPrefixes.add(prefix);

        const { error: insertErr } = await supabase
          .from('categories')
          .insert({ name, prefix, ...row });
        if (insertErr) {
          throw new Error(`Failed to create category "${name}": ${insertErr.message}`);
        }
      }
    }
  },
};

// =============================================================================
// SPECS SERVICE
// =============================================================================
export const specsService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('specs')
      .select('*')
      .order('category_name')
      .order('sort_order');

    if (error) throw error;

    // Group by category
    const grouped = {};
    data.forEach((spec) => {
      if (!grouped[spec.category_name]) {
        grouped[spec.category_name] = [];
      }
      grouped[spec.category_name].push({
        name: spec.name,
        required: spec.required,
      });
    });

    return grouped;
  },

  async getByCategory(categoryName) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('specs')
      .select('*')
      .eq('category_name', categoryName)
      .order('sort_order');

    if (error) throw error;
    return data;
  },

  async upsert(categoryName, specs) {
    const supabase = await db();

    // Transactional replace server-side — a failed insert previously left the
    // category's specs deleted while reporting success
    const { error } = await supabase.rpc('replace_specs', {
      p_category: categoryName,
      p_specs: specs.map((spec) => ({
        name: spec.name,
        required: spec.required || false,
      })),
    });

    if (error) throw error;
    return specs;
  },
};

// =============================================================================
// LOCATIONS SERVICE
// =============================================================================
export const locationsService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase.from('locations').select('*').order('path');

    if (error) throw error;

    // Build tree structure
    return buildLocationTree(data);
  },

  async getFlat() {
    const supabase = await db();

    const { data, error } = await supabase.from('locations').select('*').order('path');

    if (error) throw error;
    return data;
  },

  async create(location) {
    const supabase = await db();

    const { data, error } = await supabase.from('locations').insert(location).select().single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('locations').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },

  /**
   * Sync the full locations tree to the DB.
   * Flattens the tree, diffs against current DB state, and applies changes.
   * @param {Array} tree - Nested location tree from LocationsManager
   */
  async syncAll(tree) {
    const supabase = await db();

    // Flatten tree to rows
    const flatRows = [];
    const flatten = (nodes, parentId = null, path = '', depth = 0) => {
      nodes.forEach((node, i) => {
        const nodePath = path ? `${path}/${node.name}` : node.name;
        flatRows.push({
          id: node.id,
          name: node.name,
          type: node.type || 'room',
          parent_id: parentId,
          path: nodePath,
          depth,
          sort_order: i,
        });
        if (node.children?.length) {
          flatten(node.children, node.id, nodePath, depth + 1);
        }
      });
    };
    flatten(tree);

    // Fetch current DB state
    const { data: existing, error: fetchErr } = await supabase.from('locations').select('id');
    if (fetchErr) throw fetchErr;

    const existingIds = new Set((existing || []).map((l) => l.id));
    const newIds = new Set(flatRows.map((r) => r.id));

    // Delete removed locations
    const toDelete = [...existingIds].filter((id) => !newIds.has(id));
    if (toDelete.length > 0) {
      // Delete leaf nodes first (deepest first) to avoid FK issues
      for (const id of toDelete) {
        await supabase.from('locations').delete().eq('id', id);
      }
    }

    // Upsert all current locations
    if (flatRows.length > 0) {
      const { error: upsertErr } = await supabase
        .from('locations')
        .upsert(flatRows, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
    }
  },
};

// =============================================================================
// USERS SERVICE
// =============================================================================
export const usersService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        role:roles(id, name, permissions)
      `,
      )
      .order('name');

    if (error) throw error;
    // Lift profile-JSON settings (layoutPrefs, savedFilterViews, uiPrefs) and
    // roleId to top-level camelCase — raw fields are kept. Without this the
    // app read user.layoutPrefs (never present on the raw row) and reset
    // every user's customizations to defaults at login.
    return (data || []).map(liftUserRow);
  },

  async getById(id) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('users')
      .select(
        `
        *,
        role:roles(id, name, permissions)
      `,
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return liftUserRow(data);
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return liftUserRow(data);
  },

  async updateRole(id, roleId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('users')
      .update({ role_id: roleId })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('users').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },
};

// =============================================================================
// ROLES SERVICE
// =============================================================================
export const rolesService = {
  async getAll() {
    const supabase = await db();

    const { data, error } = await supabase.from('roles').select('*').order('name');

    if (error) throw error;
    return data;
  },

  async create(role) {
    const supabase = await db();

    const { data, error } = await supabase.from('roles').insert(role).select().single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();

    const { error } = await supabase.from('roles').delete().eq('id', id);

    if (error) throw error;
    return { id };
  },
};

// =============================================================================
// AUDIT LOG SERVICE
// =============================================================================
export const auditLogService = {
  async getAll(options = {}) {
    const supabase = await db();

    let query = supabase.from('audit_log').select('*').order('timestamp', { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.type) query = query.eq('type', options.type);
    if (options.itemId) query = query.eq('item_id', options.itemId);

    const { data, error } = await query;
    if (error) throw error;

    // Map snake_case DB columns → camelCase JS fields
    return (data || []).map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      user: row.user_name,
      userId: row.user_id,
      itemId: row.item_id,
      clientId: row.client_id,
      packageId: row.package_id,
      packListId: row.pack_list_id,
      reservationId: row.reservation_id,
      timestamp: row.timestamp,
      ...(row.metadata || {}),
    }));
  },

  async create(entry) {
    const supabase = await db();

    // Map camelCase JS fields to snake_case DB columns
    const row = {
      type: entry.type,
      description: entry.description,
      user_name: entry.user || entry.userName,
      timestamp: new Date().toISOString(),
    };
    // Map optional reference IDs
    if (entry.userId) row.user_id = entry.userId;
    if (entry.itemId) row.item_id = entry.itemId;
    if (entry.clientId) row.client_id = entry.clientId;
    if (entry.packageId) row.package_id = entry.packageId;
    if (entry.packListId) row.pack_list_id = entry.packListId;
    if (entry.reservationId) row.reservation_id = entry.reservationId;
    // Store any extra fields in metadata
    const {
      type: _type,
      description: _desc,
      user: _user,
      userName: _uName,
      userId: _uId,
      itemId: _iId,
      clientId: _cId,
      packageId: _pkgId,
      packListId: _plId,
      reservationId: _rId,
      timestamp: _ts,
      ...extra
    } = entry;
    if (Object.keys(extra).length > 0) {
      row.metadata = extra;
    }

    // No .select() on purpose: returning the inserted row requires SELECT
    // visibility under RLS, and audit reads are restricted to admin_audit
    // viewers — chaining .select() made every non-admin audit write fail.
    // The caller ignores the return value; hand back the row we sent.
    const { error } = await supabase.from('audit_log').insert(row);

    if (error) throw error;
    return row;
  },
};

// =============================================================================
// DASHBOARD SERVICE
// =============================================================================
export const dashboardService = {
  async getStats() {
    const supabase = await db();

    const { data, error } = await supabase.from('dashboard_stats').select('*').single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Build threaded notes structure
function buildThreadedNotes(notes) {
  if (!notes || notes.length === 0) return [];

  // Transform note fields
  const transformNote = (note) => ({
    ...note,
    user: note.user_name || note.user,
    userName: note.user_name || note.userName,
    userId: note.user_id || note.userId,
    itemId: note.item_id || note.itemId,
    parentId: note.parent_id || note.parentId,
    date: note.created_at || note.date,
    createdAt: note.created_at || note.createdAt,
    replies: [],
  });

  const notesMap = new Map();
  const rootNotes = [];

  // First pass: create map and initialize replies
  notes.forEach((note) => {
    const transformed = transformNote(note);
    notesMap.set(transformed.id, transformed);
  });

  // Second pass: build tree
  notesMap.forEach((note) => {
    const parentId = note.parent_id || note.parentId;
    if (parentId) {
      const parent = notesMap.get(parentId);
      if (parent) parent.replies.push(note);
    } else {
      rootNotes.push(note);
    }
  });

  return rootNotes;
}

// Build location tree structure
function buildLocationTree(locations) {
  if (!locations || locations.length === 0) return [];

  const buildTree = (items, parentId = null) => {
    return items
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }));
  };

  return buildTree(locations);
}

// =============================================================================
// NOTIFICATION PREFERENCES SERVICE
// =============================================================================
export const notificationPreferencesService = {
  // Get preferences for a user
  async getByUserId(userId) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Create or update preferences (upsert)
  async upsert(userId, preferences) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      )
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update specific preferences
  async update(userId, updates) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// NOTIFICATION LOG SERVICE
// =============================================================================
export const notificationLogService = {
  // Get notification history for a user
  async getByUserId(userId, limit = 50) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Log a notification (usually called by edge functions)
  async create(notification) {
    const supabase = await db();

    const { data, error } = await supabase
      .from('notification_log')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update notification status
  async updateStatus(id, status, errorMessage = null) {
    const supabase = await db();

    const updates = {
      status,
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
      ...(errorMessage ? { error_message: errorMessage } : {}),
    };

    const { data, error } = await supabase
      .from('notification_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// =============================================================================
// EMAIL SERVICE (calls Supabase Edge Function)
// =============================================================================
export const emailService = {
  // Send an email via Edge Function
  async send({ to, templateKey, templateData, userId }) {
    const supabase = await db();

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          templateKey,
          templateData,
          userId,
        },
      });

      if (error) {
        warn('Email send failed (Edge Function may not be deployed):', error.message);
        return { success: false, error: error.message };
      }
      return data;
    } catch (err) {
      warn('Email service unavailable:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Send checkout confirmation email
  async sendCheckoutConfirmation({
    borrowerEmail,
    borrowerName,
    item,
    checkoutDate,
    dueDate,
    project,
  }) {
    return this.send({
      to: borrowerEmail,
      templateKey: 'checkout_confirmation',
      templateData: {
        borrower_name: borrowerName,
        item_name: item.name,
        item_id: item.id,
        item_brand: item.brand || '',
        checkout_date: checkoutDate,
        due_date: dueDate,
        project: project || '',
        company_name: 'SIMS',
      },
    });
  },

  // Send checkin confirmation email
  async sendCheckinConfirmation({ borrowerEmail, borrowerName, item, returnDate }) {
    return this.send({
      to: borrowerEmail,
      templateKey: 'checkin_confirmation',
      templateData: {
        borrower_name: borrowerName,
        item_name: item.name,
        item_id: item.id,
        return_date: returnDate,
        company_name: 'SIMS',
      },
    });
  },

  // Send reservation confirmation email
  async sendReservationConfirmation({ userEmail, userName, item, reservation }) {
    return this.send({
      to: userEmail,
      templateKey: 'reservation_confirmation',
      templateData: {
        user_name: userName,
        item_name: item.name,
        item_id: item.id,
        item_brand: item.brand || '',
        project_name: reservation.project,
        start_date: reservation.start,
        end_date: reservation.end,
        company_name: 'SIMS',
      },
    });
  },

  // Send due date reminder email
  async sendDueDateReminder({ borrowerEmail, borrowerName, item, dueDate, daysUntilDue }) {
    const templateKey = daysUntilDue < 0 ? 'overdue_notice' : 'due_date_reminder';
    return this.send({
      to: borrowerEmail,
      templateKey,
      templateData: {
        borrower_name: borrowerName,
        item_name: item.name,
        item_id: item.id,
        due_date: dueDate,
        days_until_due: Math.abs(daysUntilDue),
        company_name: 'SIMS',
      },
    });
  },
};

// =============================================================================
// EXPORT ALL SERVICES
// =============================================================================
export default {
  freshness: freshnessService,
  inventory: inventoryService,
  itemNotes: itemNotesService,
  itemReminders: itemRemindersService,
  reservations: reservationsService,
  maintenance: maintenanceService,
  checkoutHistory: checkoutHistoryService,
  clients: clientsService,
  clientNotes: clientNotesService,
  packages: packagesService,
  packageNotes: packageNotesService,
  packLists: packListsService,
  categories: categoriesService,
  specs: specsService,
  locations: locationsService,
  users: usersService,
  roles: rolesService,
  auditLog: auditLogService,
  dashboard: dashboardService,
  notificationPreferences: notificationPreferencesService,
  notificationLog: notificationLogService,
  email: emailService,
};
