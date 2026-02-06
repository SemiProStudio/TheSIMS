// =============================================================================
// SIMS Data Hooks
// React hooks for Supabase data fetching and mutations
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, auth } from './supabase.js';
import { error as logError } from './logger.js';

import {
  inventoryService,
  itemNotesService,
  itemRemindersService,
  reservationsService,
  maintenanceService,
  checkoutHistoryService,
  clientsService,
  clientNotesService,
  packagesService,
  packListsService,
  categoriesService,
  specsService,
  locationsService,
  usersService,
  rolesService,
  auditLogService,
  dashboardService
} from './services.js';

// =============================================================================
// GENERIC DATA HOOK
// =============================================================================

/**
 * Generic hook for fetching data with loading/error states
 */
export function useData(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        logError('Data fetch error:', err);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [...deps, refetch]);

  return { data, loading, error, refetch, setData };
}

// =============================================================================
// AUTH HOOK
// =============================================================================

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    auth.getSession().then(session => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email, password) => {
    const result = await auth.signIn(email, password);
    return result;
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    const result = await auth.signUp(email, password, name);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };
}

// =============================================================================
// INVENTORY HOOKS
// =============================================================================

export function useInventory() {
  const { data, loading, error, refetch, setData } = useData(
    () => inventoryService.getAll(),
    []
  );

  const createItem = useCallback(async (item) => {
    const newItem = await inventoryService.create(item);
    setData(prev => [...(prev || []), newItem]);
    return newItem;
  }, [setData]);

  const updateItem = useCallback(async (id, updates) => {
    const updated = await inventoryService.update(id, updates);
    setData(prev => prev?.map(item => item.id === id ? { ...item, ...updated } : item));
    return updated;
  }, [setData]);

  const deleteItem = useCallback(async (id) => {
    await inventoryService.delete(id);
    setData(prev => prev?.filter(item => item.id !== id));
  }, [setData]);

  const checkOutItem = useCallback(async (id, checkoutData) => {
    const updated = await inventoryService.checkOut(id, checkoutData);
    setData(prev => prev?.map(item => item.id === id ? { ...item, ...updated } : item));
    return updated;
  }, [setData]);

  const checkInItem = useCallback(async (id, checkinData) => {
    const updated = await inventoryService.checkIn(id, checkinData);
    setData(prev => prev?.map(item => item.id === id ? { ...item, ...updated } : item));
    return updated;
  }, [setData]);

  return {
    inventory: data || [],
    loading,
    error,
    refetch,
    createItem,
    updateItem,
    deleteItem,
    checkOutItem,
    checkInItem
  };
}

export function useItem(id) {
  const { data, loading, error, refetch } = useData(
    () => id ? inventoryService.getByIdWithDetails(id) : Promise.resolve(null),
    [id]
  );

  return { item: data, loading, error, refetch };
}

// =============================================================================
// RESERVATIONS HOOKS
// =============================================================================

export function useReservations() {
  const { data, loading, error, refetch, setData } = useData(
    () => reservationsService.getAll(),
    []
  );

  const createReservation = useCallback(async (reservation) => {
    const newRes = await reservationsService.create(reservation);
    setData(prev => [...(prev || []), newRes]);
    return newRes;
  }, [setData]);

  const updateReservation = useCallback(async (id, updates) => {
    const updated = await reservationsService.update(id, updates);
    setData(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }, [setData]);

  const deleteReservation = useCallback(async (id) => {
    await reservationsService.delete(id);
    setData(prev => prev?.filter(r => r.id !== id));
  }, [setData]);

  const cancelReservation = useCallback(async (id) => {
    const updated = await reservationsService.cancel(id);
    setData(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }, [setData]);

  return {
    reservations: data || [],
    loading,
    error,
    refetch,
    createReservation,
    updateReservation,
    deleteReservation,
    cancelReservation
  };
}

export function useUpcomingReservations(days = 7) {
  const { data, loading, error, refetch } = useData(
    () => reservationsService.getUpcoming(days),
    [days]
  );

  return { reservations: data || [], loading, error, refetch };
}

// =============================================================================
// MAINTENANCE HOOKS
// =============================================================================

export function useMaintenance() {
  const { data, loading, error, refetch, setData } = useData(
    () => maintenanceService.getAll(),
    []
  );

  const createRecord = useCallback(async (record) => {
    const newRecord = await maintenanceService.create(record);
    setData(prev => [...(prev || []), newRecord]);
    return newRecord;
  }, [setData]);

  const updateRecord = useCallback(async (id, updates) => {
    const updated = await maintenanceService.update(id, updates);
    setData(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }, [setData]);

  const completeRecord = useCallback(async (id, data) => {
    const updated = await maintenanceService.complete(id, data);
    setData(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }, [setData]);

  const deleteRecord = useCallback(async (id) => {
    await maintenanceService.delete(id);
    setData(prev => prev?.filter(r => r.id !== id));
  }, [setData]);

  return {
    maintenance: data || [],
    loading,
    error,
    refetch,
    createRecord,
    updateRecord,
    completeRecord,
    deleteRecord
  };
}

export function usePendingMaintenance() {
  const { data, loading, error, refetch } = useData(
    () => maintenanceService.getPending(),
    []
  );

  return { maintenance: data || [], loading, error, refetch };
}

// =============================================================================
// CLIENTS HOOKS
// =============================================================================

export function useClients() {
  const { data, loading, error, refetch, setData } = useData(
    () => clientsService.getAll(),
    []
  );

  const createClient = useCallback(async (client) => {
    const newClient = await clientsService.create(client);
    setData(prev => [...(prev || []), newClient]);
    return newClient;
  }, [setData]);

  const updateClient = useCallback(async (id, updates) => {
    const updated = await clientsService.update(id, updates);
    setData(prev => prev?.map(c => c.id === id ? { ...c, ...updated } : c));
    return updated;
  }, [setData]);

  const deleteClient = useCallback(async (id) => {
    await clientsService.delete(id);
    setData(prev => prev?.filter(c => c.id !== id));
  }, [setData]);

  const toggleFavorite = useCallback(async (id, favorite) => {
    const updated = await clientsService.toggleFavorite(id, favorite);
    setData(prev => prev?.map(c => c.id === id ? { ...c, ...updated } : c));
    return updated;
  }, [setData]);

  return {
    clients: data || [],
    loading,
    error,
    refetch,
    createClient,
    updateClient,
    deleteClient,
    toggleFavorite
  };
}

export function useClient(id) {
  const { data, loading, error, refetch } = useData(
    () => id ? clientsService.getByIdWithDetails(id) : Promise.resolve(null),
    [id]
  );

  return { client: data, loading, error, refetch };
}

// =============================================================================
// PACKAGES HOOKS
// =============================================================================

export function usePackages() {
  const { data, loading, error, refetch, setData } = useData(
    () => packagesService.getAll(),
    []
  );

  const createPackage = useCallback(async (pkg) => {
    const newPkg = await packagesService.create(pkg);
    setData(prev => [...(prev || []), newPkg]);
    return newPkg;
  }, [setData]);

  const updatePackage = useCallback(async (id, updates) => {
    const updated = await packagesService.update(id, updates);
    setData(prev => prev?.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }, [setData]);

  const deletePackage = useCallback(async (id) => {
    await packagesService.delete(id);
    setData(prev => prev?.filter(p => p.id !== id));
  }, [setData]);

  return {
    packages: data || [],
    loading,
    error,
    refetch,
    createPackage,
    updatePackage,
    deletePackage
  };
}

// =============================================================================
// PACK LISTS HOOKS
// =============================================================================

export function usePackLists() {
  const { data, loading, error, refetch, setData } = useData(
    () => packListsService.getAll(),
    []
  );

  const createPackList = useCallback(async (packList) => {
    const newList = await packListsService.create(packList);
    setData(prev => [...(prev || []), newList]);
    return newList;
  }, [setData]);

  const updatePackList = useCallback(async (id, updates) => {
    const updated = await packListsService.update(id, updates);
    setData(prev => prev?.map(l => l.id === id ? { ...l, ...updated } : l));
    return updated;
  }, [setData]);

  const deletePackList = useCallback(async (id) => {
    await packListsService.delete(id);
    setData(prev => prev?.filter(l => l.id !== id));
  }, [setData]);

  const toggleItemPacked = useCallback(async (packListId, itemId, isPacked) => {
    await packListsService.toggleItemPacked(packListId, itemId, isPacked);
    setData(prev => prev?.map(l => {
      if (l.id !== packListId) return l;
      const packedItems = isPacked
        ? [...(l.packedItems || []), itemId]
        : (l.packedItems || []).filter(id => id !== itemId);
      return { ...l, packedItems };
    }));
  }, [setData]);

  return {
    packLists: data || [],
    loading,
    error,
    refetch,
    createPackList,
    updatePackList,
    deletePackList,
    toggleItemPacked
  };
}

// =============================================================================
// CATEGORIES & SPECS HOOKS
// =============================================================================

export function useCategories() {
  const { data, loading, error, refetch, setData } = useData(
    () => categoriesService.getAll(),
    []
  );

  const createCategory = useCallback(async (category) => {
    const newCat = await categoriesService.create(category);
    setData(prev => [...(prev || []), newCat]);
    return newCat;
  }, [setData]);

  const updateCategory = useCallback(async (id, updates) => {
    const updated = await categoriesService.update(id, updates);
    setData(prev => prev?.map(c => c.id === id ? { ...c, ...updated } : c));
    return updated;
  }, [setData]);

  const deleteCategory = useCallback(async (name) => {
    await categoriesService.delete(name);
    setData(prev => prev?.filter(c => c.name !== name));
  }, [setData]);

  return {
    categories: data || [],
    loading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory
  };
}

export function useSpecs() {
  const { data, loading, error, refetch, setData } = useData(
    () => specsService.getAll(),
    []
  );

  const updateSpecs = useCallback(async (categoryName, specs) => {
    await specsService.upsert(categoryName, specs);
    setData(prev => ({ ...(prev || {}), [categoryName]: specs }));
  }, [setData]);

  return {
    specs: data || {},
    loading,
    error,
    refetch,
    updateSpecs
  };
}

// =============================================================================
// LOCATIONS HOOK
// =============================================================================

export function useLocations() {
  const { data, loading, error, refetch, setData } = useData(
    () => locationsService.getAll(),
    []
  );

  const createLocation = useCallback(async (location) => {
    const newLoc = await locationsService.create(location);
    refetch(); // Refetch to get updated tree
    return newLoc;
  }, [refetch]);

  const updateLocation = useCallback(async (id, updates) => {
    const updated = await locationsService.update(id, updates);
    refetch(); // Refetch to get updated tree
    return updated;
  }, [refetch]);

  const deleteLocation = useCallback(async (id) => {
    await locationsService.delete(id);
    refetch(); // Refetch to get updated tree
  }, [refetch]);

  return {
    locations: data || [],
    loading,
    error,
    refetch,
    createLocation,
    updateLocation,
    deleteLocation
  };
}

// =============================================================================
// USERS & ROLES HOOKS
// =============================================================================

export function useUsers() {
  const { data, loading, error, refetch, setData } = useData(
    () => usersService.getAll(),
    []
  );

  const updateUser = useCallback(async (id, updates) => {
    const updated = await usersService.update(id, updates);
    setData(prev => prev?.map(u => u.id === id ? { ...u, ...updated } : u));
    return updated;
  }, [setData]);

  const updateUserRole = useCallback(async (id, roleId) => {
    const updated = await usersService.updateRole(id, roleId);
    setData(prev => prev?.map(u => u.id === id ? { ...u, ...updated } : u));
    return updated;
  }, [setData]);

  return {
    users: data || [],
    loading,
    error,
    refetch,
    updateUser,
    updateUserRole
  };
}

export function useRoles() {
  const { data, loading, error, refetch, setData } = useData(
    () => rolesService.getAll(),
    []
  );

  const createRole = useCallback(async (role) => {
    const newRole = await rolesService.create(role);
    setData(prev => [...(prev || []), newRole]);
    return newRole;
  }, [setData]);

  const updateRole = useCallback(async (id, updates) => {
    const updated = await rolesService.update(id, updates);
    setData(prev => prev?.map(r => r.id === id ? { ...r, ...updated } : r));
    return updated;
  }, [setData]);

  const deleteRole = useCallback(async (id) => {
    await rolesService.delete(id);
    setData(prev => prev?.filter(r => r.id !== id));
  }, [setData]);

  return {
    roles: data || [],
    loading,
    error,
    refetch,
    createRole,
    updateRole,
    deleteRole
  };
}

// =============================================================================
// AUDIT LOG HOOK
// =============================================================================

export function useAuditLog(options = {}) {
  const { data, loading, error, refetch, setData } = useData(
    () => auditLogService.getAll(options),
    [JSON.stringify(options)]
  );

  const addEntry = useCallback(async (entry) => {
    const newEntry = await auditLogService.create(entry);
    setData(prev => [newEntry, ...(prev || [])]);
    return newEntry;
  }, [setData]);

  return {
    auditLog: data || [],
    loading,
    error,
    refetch,
    addEntry
  };
}

// =============================================================================
// DASHBOARD HOOK
// =============================================================================

export function useDashboardStats() {
  const { data, loading, error, refetch } = useData(
    () => dashboardService.getStats(),
    []
  );

  return {
    stats: data || {
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
    },
    loading,
    error,
    refetch
  };
}

// =============================================================================
// DUE REMINDERS HOOK
// =============================================================================

export function useDueReminders() {
  const { data, loading, error, refetch } = useData(
    () => itemRemindersService.getDue(),
    []
  );

  return {
    reminders: data || [],
    loading,
    error,
    refetch
  };
}

// =============================================================================
// REALTIME SUBSCRIPTION HOOK
// =============================================================================

export function useRealtimeSubscription(table, callback) {
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback]);
}

// =============================================================================
// EXPORT ALL HOOKS
// =============================================================================

export default {
  useData,
  useAuth,
  useInventory,
  useItem,
  useReservations,
  useUpcomingReservations,
  useMaintenance,
  usePendingMaintenance,
  useClients,
  useClient,
  usePackages,
  usePackLists,
  useCategories,
  useSpecs,
  useLocations,
  useUsers,
  useRoles,
  useAuditLog,
  useDashboardStats,
  useDueReminders,
  useRealtimeSubscription
};
