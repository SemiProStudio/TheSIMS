// =============================================================================
// SIMS Data Services
// Service layer for Supabase database operations
// =============================================================================

import { getSupabase, isDemoMode } from './supabase.js';

// Helper to get Supabase client (returns null in demo mode)
async function db() {
  if (isDemoMode) return null;
  return await getSupabase();
}

// =============================================================================
// INVENTORY SERVICE
// =============================================================================
export const inventoryService = {
  // Get all inventory items
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('category_name')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Get single item by ID
  async getById(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get item with all related data (notes, reminders, reservations, maintenance)
  async getByIdWithDetails(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    // Get base item
    const item = await this.getById(id);
    if (!item) return null;
    
    // Get related data in parallel
    const [notes, reminders, reservations, maintenance, checkoutHistory] = await Promise.all([
      itemNotesService.getByItemId(id),
      itemRemindersService.getByItemId(id),
      reservationsService.getByItemId(id),
      maintenanceService.getByItemId(id),
      checkoutHistoryService.getByItemId(id)
    ]);
    
    return {
      ...item,
      notes: notes || [],
      reminders: reminders || [],
      reservations: reservations || [],
      maintenanceHistory: maintenance || [],
      checkoutHistory: checkoutHistory || []
    };
  },

  // Create new item
  async create(item) {
    const supabase = await db();
    if (!supabase) return item;
    
    const { data, error } = await supabase
      .from('inventory')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update item
  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete item
  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  },

  // Check out item
  async checkOut(id, { userId, userName, clientId, clientName, project, dueBack }) {
    const supabase = await db();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('inventory')
      .update({
        status: 'checked-out',
        checked_out_to_user_id: userId,
        checked_out_to_name: userName,
        checkout_client_id: clientId,
        checked_out_date: new Date().toISOString().split('T')[0],
        due_back: dueBack,
        checkout_project: project
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Increment checkout count
    await supabase.rpc('increment_checkout_count', { item_id: id });
    
    // Add to checkout history
    await checkoutHistoryService.create({
      item_id: id,
      user_id: userId,
      user_name: userName,
      client_id: clientId,
      client_name: clientName,
      action: 'checkout',
      project
    });
    
    return data;
  },

  // Check in item
  async checkIn(id, { userId, userName, notes, condition }) {
    const supabase = await db();
    if (!supabase) return null;
    
    // Get current item state for history
    const item = await this.getById(id);
    
    const updates = {
      status: 'available',
      checked_out_to_user_id: null,
      checked_out_to_name: null,
      checkout_client_id: null,
      checked_out_date: null,
      due_back: null,
      checkout_project: null
    };
    
    if (condition) updates.condition = condition;
    
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Add to checkout history
    await checkoutHistoryService.create({
      item_id: id,
      user_id: userId,
      user_name: userName,
      client_id: item?.checkout_client_id,
      action: 'checkin',
      notes,
      condition_at_action: condition
    });
    
    return data;
  },

  // Generate next ID for category
  async generateId(categoryPrefix) {
    const supabase = await db();
    if (!supabase) return `${categoryPrefix}1001`;
    
    const { data, error } = await supabase.rpc('generate_item_id', {
      category_prefix: categoryPrefix
    });
    
    if (error) throw error;
    return data;
  },

  // Increment view count
  async incrementViewCount(id) {
    const supabase = await db();
    if (!supabase) return;
    
    await supabase.rpc('increment_view_count', { item_id: id });
  },

  // Search items
  async search(query) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%,id.ilike.%${query}%,serial_number.ilike.%${query}%`)
      .limit(50);
    
    if (error) throw error;
    return data;
  },

  // Get items by status
  async getByStatus(status) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', status);
    
    if (error) throw error;
    return data;
  },

  // Get overdue items
  async getOverdue() {
    const supabase = await db();
    if (!supabase) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('status', 'checked-out')
      .lt('due_back', today);
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// ITEM NOTES SERVICE
// =============================================================================
export const itemNotesService = {
  async getByItemId(itemId) {
    const supabase = await db();
    if (!supabase) return [];
    
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
    if (!supabase) return note;
    
    const { data, error } = await supabase
      .from('item_notes')
      .insert(note)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { data, error } = await supabase
      .from('item_notes')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// ITEM REMINDERS SERVICE
// =============================================================================
export const itemRemindersService = {
  async getByItemId(itemId) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('item_reminders')
      .select('*')
      .eq('item_id', itemId)
      .order('due_date');
    
    if (error) throw error;
    return data;
  },

  async getDue() {
    const supabase = await db();
    if (!supabase) return [];
    
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('item_reminders')
      .select(`
        *,
        item:inventory(id, name, category_name)
      `)
      .lte('due_date', today)
      .eq('completed', false)
      .order('due_date');
    
    if (error) throw error;
    return data;
  },

  async create(reminder) {
    const supabase = await db();
    if (!supabase) return reminder;
    
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
    if (!supabase) return { id, ...updates };
    
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
    if (!supabase) return { id, completed: true };
    
    const { data, error } = await supabase
      .from('item_reminders')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('item_reminders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  }
};

// =============================================================================
// RESERVATIONS SERVICE
// =============================================================================
export const reservationsService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        item:inventory(id, name, category_name, brand, status),
        client:clients(id, name, type, email, phone)
      `)
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  async getByItemId(itemId) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        client:clients(id, name, type)
      `)
      .eq('item_id', itemId)
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  async getByClientId(clientId) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        item:inventory(id, name, category_name, brand)
      `)
      .eq('client_id', clientId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getUpcoming(days = 7) {
    const supabase = await db();
    if (!supabase) return [];
    
    const today = new Date();
    const future = new Date(today);
    future.setDate(future.getDate() + days);
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        item:inventory(id, name, category_name, brand),
        client:clients(id, name, type)
      `)
      .gte('end_date', today.toISOString().split('T')[0])
      .lte('start_date', future.toISOString().split('T')[0])
      .eq('status', 'confirmed')
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  async getByDateRange(startDate, endDate) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        item:inventory(id, name, category_name, brand),
        client:clients(id, name, type)
      `)
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .neq('status', 'cancelled')
      .order('start_date');
    
    if (error) throw error;
    return data;
  },

  async create(reservation) {
    const supabase = await db();
    if (!supabase) return reservation;
    
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update item status if reservation starts today or earlier
    const today = new Date().toISOString().split('T')[0];
    if (reservation.start_date <= today) {
      await inventoryService.update(reservation.item_id, { status: 'reserved' });
    }
    
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  },

  async cancel(id) {
    const supabase = await db();
    if (!supabase) return { id, status: 'cancelled' };
    
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// MAINTENANCE SERVICE
// =============================================================================
export const maintenanceService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        item:inventory(id, name, category_name, brand)
      `)
      .order('scheduled_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getByItemId(itemId) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('item_id', itemId)
      .order('scheduled_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getPending() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        item:inventory(id, name, category_name, brand)
      `)
      .in('status', ['scheduled', 'in-progress'])
      .order('scheduled_date');
    
    if (error) throw error;
    return data;
  },

  async create(record) {
    const supabase = await db();
    if (!supabase) return record;
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async complete(id, { completedDate, notes, cost }) {
    const supabase = await db();
    if (!supabase) return { id, status: 'completed' };
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({
        status: 'completed',
        completed_date: completedDate || new Date().toISOString().split('T')[0],
        notes,
        cost
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  },

  // Get maintenance cost summary for an item
  async getCostSummary(itemId) {
    const supabase = await db();
    if (!supabase) return { total: 0, count: 0 };
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('cost')
      .eq('item_id', itemId)
      .eq('status', 'completed');
    
    if (error) throw error;
    
    const total = data.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    return { total, count: data.length };
  }
};

// =============================================================================
// CHECKOUT HISTORY SERVICE
// =============================================================================
export const checkoutHistoryService = {
  async getByItemId(itemId, limit = 50) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('checkout_history')
      .select('*')
      .eq('item_id', itemId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async getByUserId(userId, limit = 50) {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('checkout_history')
      .select(`
        *,
        item:inventory(id, name, category_name)
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  async create(record) {
    const supabase = await db();
    if (!supabase) return record;
    
    const { data, error } = await supabase
      .from('checkout_history')
      .insert({
        ...record,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// CLIENTS SERVICE
// =============================================================================
export const clientsService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
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
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getByIdWithDetails(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    const client = await this.getById(id);
    if (!client) return null;
    
    const [notes, reservations] = await Promise.all([
      clientNotesService.getByClientId(id),
      reservationsService.getByClientId(id)
    ]);
    
    return {
      ...client,
      clientNotes: notes || [],
      reservations: reservations || []
    };
  },

  async create(client) {
    const supabase = await db();
    if (!supabase) return client;
    
    // Generate ID if not provided
    if (!client.id) {
      const { data: newId } = await supabase.rpc('generate_client_id');
      client.id = newId;
    }
    
    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  },

  async toggleFavorite(id, favorite) {
    const supabase = await db();
    if (!supabase) return { id, favorite };
    
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
    if (!supabase) return 'CL001';
    
    const { data, error } = await supabase.rpc('generate_client_id');
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// CLIENT NOTES SERVICE
// =============================================================================
export const clientNotesService = {
  async getByClientId(clientId) {
    const supabase = await db();
    if (!supabase) return [];
    
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
    if (!supabase) return note;
    
    const { data, error } = await supabase
      .from('client_notes')
      .insert(note)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async softDelete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { data, error } = await supabase
      .from('client_notes')
      .update({ deleted: true })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// PACKAGES SERVICE
// =============================================================================
export const packagesService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        package_items(item_id, sort_order)
      `)
      .order('name');
    
    if (error) throw error;
    
    // Transform to expected format
    return data.map(pkg => ({
      ...pkg,
      items: pkg.package_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(pi => pi.item_id)
    }));
  },

  async getById(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        package_items(item_id, sort_order),
        package_notes(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      items: data.package_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(pi => pi.item_id),
      notes: buildThreadedNotes(data.package_notes || [])
    };
  },

  async create(pkg) {
    const supabase = await db();
    if (!supabase) return pkg;
    
    const { items, notes, ...packageData } = pkg;
    
    // Create package
    const { data, error } = await supabase
      .from('packages')
      .insert(packageData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Add items
    if (items?.length > 0) {
      await supabase
        .from('package_items')
        .insert(items.map((itemId, index) => ({
          package_id: data.id,
          item_id: itemId,
          sort_order: index
        })));
    }
    
    return { ...data, items: items || [], notes: [] };
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { items, notes, ...packageData } = updates;
    
    // Update package
    const { data, error } = await supabase
      .from('packages')
      .update(packageData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update items if provided
    if (items !== undefined) {
      // Delete existing items
      await supabase
        .from('package_items')
        .delete()
        .eq('package_id', id);
      
      // Add new items
      if (items.length > 0) {
        await supabase
          .from('package_items')
          .insert(items.map((itemId, index) => ({
            package_id: id,
            item_id: itemId,
            sort_order: index
          })));
      }
    }
    
    return { ...data, items: items || [] };
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  }
};

// =============================================================================
// PACK LISTS SERVICE
// =============================================================================
export const packListsService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('pack_lists')
      .select(`
        *,
        pack_list_items(item_id, quantity, is_packed, sort_order),
        pack_list_packages(package_id, sort_order)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform to expected format
    return data.map(list => ({
      ...list,
      items: list.pack_list_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(i => ({ id: i.item_id, quantity: i.quantity })),
      packages: list.pack_list_packages
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(p => p.package_id),
      packedItems: list.pack_list_items
        .filter(i => i.is_packed)
        .map(i => i.item_id)
    }));
  },

  async getById(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('pack_lists')
      .select(`
        *,
        pack_list_items(item_id, quantity, is_packed, sort_order),
        pack_list_packages(package_id, sort_order)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      items: data.pack_list_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(i => ({ id: i.item_id, quantity: i.quantity })),
      packages: data.pack_list_packages
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(p => p.package_id),
      packedItems: data.pack_list_items
        .filter(i => i.is_packed)
        .map(i => i.item_id)
    };
  },

  async create(packList) {
    const supabase = await db();
    if (!supabase) return packList;
    
    const { items, packages, packedItems, ...listData } = packList;
    
    // Create pack list
    const { data, error } = await supabase
      .from('pack_lists')
      .insert(listData)
      .select()
      .single();
    
    if (error) throw error;
    
    // Add items
    if (items?.length > 0) {
      await supabase
        .from('pack_list_items')
        .insert(items.map((item, index) => ({
          pack_list_id: data.id,
          item_id: item.id || item,
          quantity: item.quantity || 1,
          is_packed: false,
          sort_order: index
        })));
    }
    
    // Add packages
    if (packages?.length > 0) {
      await supabase
        .from('pack_list_packages')
        .insert(packages.map((pkgId, index) => ({
          pack_list_id: data.id,
          package_id: pkgId,
          sort_order: index
        })));
    }
    
    return { ...data, items: items || [], packages: packages || [], packedItems: [] };
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { items, packages, packedItems, ...listData } = updates;
    
    // Update pack list
    if (Object.keys(listData).length > 0) {
      const { error } = await supabase
        .from('pack_lists')
        .update(listData)
        .eq('id', id);
      
      if (error) throw error;
    }
    
    // Update items if provided
    if (items !== undefined) {
      await supabase.from('pack_list_items').delete().eq('pack_list_id', id);
      if (items.length > 0) {
        await supabase.from('pack_list_items').insert(
          items.map((item, index) => ({
            pack_list_id: id,
            item_id: item.id || item,
            quantity: item.quantity || 1,
            is_packed: packedItems?.includes(item.id || item) || false,
            sort_order: index
          }))
        );
      }
    }
    
    // Update packages if provided
    if (packages !== undefined) {
      await supabase.from('pack_list_packages').delete().eq('pack_list_id', id);
      if (packages.length > 0) {
        await supabase.from('pack_list_packages').insert(
          packages.map((pkgId, index) => ({
            pack_list_id: id,
            package_id: pkgId,
            sort_order: index
          }))
        );
      }
    }
    
    return { id, ...updates };
  },

  async delete(id) {
    const supabase = await db();
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('pack_lists')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  },

  async toggleItemPacked(packListId, itemId, isPacked) {
    const supabase = await db();
    if (!supabase) return { packListId, itemId, isPacked };
    
    const { data, error } = await supabase
      .from('pack_list_items')
      .update({ is_packed: isPacked })
      .eq('pack_list_id', packListId)
      .eq('item_id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// CATEGORIES SERVICE
// =============================================================================
export const categoriesService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    
    if (error) throw error;
    return data;
  },

  async create(category) {
    const supabase = await db();
    if (!supabase) return category;
    
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
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
    if (!supabase) return { name };
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);
    
    if (error) throw error;
    return { name };
  }
};

// =============================================================================
// SPECS SERVICE
// =============================================================================
export const specsService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return {};
    
    const { data, error } = await supabase
      .from('specs')
      .select('*')
      .order('category_name')
      .order('sort_order');
    
    if (error) throw error;
    
    // Group by category
    const grouped = {};
    data.forEach(spec => {
      if (!grouped[spec.category_name]) {
        grouped[spec.category_name] = [];
      }
      grouped[spec.category_name].push({
        name: spec.name,
        required: spec.required
      });
    });
    
    return grouped;
  },

  async getByCategory(categoryName) {
    const supabase = await db();
    if (!supabase) return [];
    
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
    if (!supabase) return specs;
    
    // Delete existing specs for category
    await supabase
      .from('specs')
      .delete()
      .eq('category_name', categoryName);
    
    // Insert new specs
    if (specs.length > 0) {
      const { data, error } = await supabase
        .from('specs')
        .insert(specs.map((spec, index) => ({
          category_name: categoryName,
          name: spec.name,
          required: spec.required || false,
          sort_order: index
        })))
        .select();
      
      if (error) throw error;
      return data;
    }
    
    return [];
  }
};

// =============================================================================
// LOCATIONS SERVICE
// =============================================================================
export const locationsService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('path');
    
    if (error) throw error;
    
    // Build tree structure
    return buildLocationTree(data);
  },

  async getFlat() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('path');
    
    if (error) throw error;
    return data;
  },

  async create(location) {
    const supabase = await db();
    if (!supabase) return location;
    
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
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
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  }
};

// =============================================================================
// USERS SERVICE
// =============================================================================
export const usersService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(id, name, permissions)
      `)
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const supabase = await db();
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        role:roles(id, name, permissions)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRole(id, roleId) {
    const supabase = await db();
    if (!supabase) return { id, role_id: roleId };
    
    const { data, error } = await supabase
      .from('users')
      .update({ role_id: roleId })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// ROLES SERVICE
// =============================================================================
export const rolesService = {
  async getAll() {
    const supabase = await db();
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async create(role) {
    const supabase = await db();
    if (!supabase) return role;
    
    const { data, error } = await supabase
      .from('roles')
      .insert(role)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const supabase = await db();
    if (!supabase) return { id, ...updates };
    
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
    if (!supabase) return { id };
    
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { id };
  }
};

// =============================================================================
// AUDIT LOG SERVICE
// =============================================================================
export const auditLogService = {
  async getAll(options = {}) {
    const supabase = await db();
    if (!supabase) return [];
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (options.limit) query = query.limit(options.limit);
    if (options.type) query = query.eq('type', options.type);
    if (options.itemId) query = query.eq('item_id', options.itemId);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(entry) {
    const supabase = await db();
    if (!supabase) return entry;
    
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        ...entry,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// DASHBOARD SERVICE
// =============================================================================
export const dashboardService = {
  async getStats() {
    if (isDemoMode) {
      return {
        total_items: 0,
        available: 0,
        checked_out: 0,
        reserved: 0,
        needs_attention: 0,
        overdue: 0,
        total_value: 0,
        upcoming_reservations: 0,
        due_reminders: 0,
        pending_maintenance: 0
      };
    }
    
    const { data, error } = await supabase
      .from('dashboard_stats')
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Build threaded notes structure
function buildThreadedNotes(notes) {
  if (!notes || notes.length === 0) return [];
  
  const notesMap = new Map();
  const rootNotes = [];
  
  // First pass: create map and initialize replies
  notes.forEach(note => {
    note.replies = [];
    notesMap.set(note.id, note);
  });
  
  // Second pass: build tree
  notes.forEach(note => {
    if (note.parent_id) {
      const parent = notesMap.get(note.parent_id);
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
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
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
    if (!supabase) return null;
    
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
    if (!supabase) return preferences;
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update specific preferences
  async update(userId, updates) {
    const supabase = await db();
    if (!supabase) return updates;
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// NOTIFICATION LOG SERVICE
// =============================================================================
export const notificationLogService = {
  // Get notification history for a user
  async getByUserId(userId, limit = 50) {
    const supabase = await db();
    if (!supabase) return [];
    
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
    if (!supabase) return notification;
    
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
    if (!supabase) return { id, status };
    
    const updates = {
      status,
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
      ...(errorMessage ? { error_message: errorMessage } : {})
    };
    
    const { data, error } = await supabase
      .from('notification_log')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// =============================================================================
// EMAIL SERVICE (calls Supabase Edge Function)
// =============================================================================
export const emailService = {
  // Send an email via Edge Function
  async send({ to, templateKey, templateData, userId }) {
    const supabase = await db();
    if (!supabase) {
      console.log('[Demo Mode] Would send email:', { to, templateKey, templateData });
      return { success: true, demo: true };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          templateKey,
          templateData,
          userId
        }
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Failed to send email:', err);
      throw err;
    }
  },

  // Send checkout confirmation email
  async sendCheckoutConfirmation({ borrowerEmail, borrowerName, item, checkoutDate, dueDate, project }) {
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
        company_name: 'SIMS'
      }
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
        company_name: 'SIMS'
      }
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
        company_name: 'SIMS'
      }
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
        company_name: 'SIMS'
      }
    });
  }
};

// =============================================================================
// EXPORT ALL SERVICES
// =============================================================================
export default {
  inventory: inventoryService,
  itemNotes: itemNotesService,
  itemReminders: itemRemindersService,
  reservations: reservationsService,
  maintenance: maintenanceService,
  checkoutHistory: checkoutHistoryService,
  clients: clientsService,
  clientNotes: clientNotesService,
  packages: packagesService,
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
  email: emailService
};
