// =============================================================================
// SIMS Data Context
// Provides centralized state management with Supabase
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  inventoryService,
  reservationsService,
  maintenanceService,
  clientsService,
  packagesService,
  packListsService,
  categoriesService,
  specsService,
  locationsService,
  usersService,
  rolesService,
  auditLogService,
  notificationPreferencesService,
  emailService
} from './services.js';

import { DEFAULT_ROLES, DEFAULT_LOCATIONS, DEFAULT_SPECS } from '../constants.js';

// =============================================================================
// CONTEXT
// =============================================================================

const DataContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

export function DataProvider({ children }) {
  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core data state
  const [inventory, setInventory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [packLists, setPackLists] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [specs, setSpecs] = useState({});
  const [auditLog, setAuditLog] = useState([]);

  // =============================================================================
  // INITIAL DATA LOAD
  // =============================================================================

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load from Supabase
        const [
          inventoryData,
          packagesData,
          packListsData,
          clientsData,
          usersData,
          rolesData,
          locationsData,
          categoriesData,
          specsData,
          auditLogData
        ] = await Promise.all([
          inventoryService.getAll(),
          packagesService.getAll(),
          packListsService.getAll(),
          clientsService.getAll(),
          usersService.getAll(),
          rolesService.getAll(),
          locationsService.getAll(),
          categoriesService.getAll(),
          specsService.getAll(),
          auditLogService.getAll({ limit: 100 })
        ]);

        setInventory(inventoryData || []);
        setPackages(packagesData || []);
        setPackLists(packListsData || []);
        setClients(clientsData || []);
        setUsers(usersData || []);
        setRoles(rolesData || []);
        setLocations(locationsData || []);
        setCategories(categoriesData?.map(c => c.name) || []);
        setSpecs(specsData || {});
        setAuditLog(auditLogData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // =============================================================================
  // AUDIT LOG HELPER
  // =============================================================================

  const addAuditLog = useCallback(async (entry) => {
    const newEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    
      try {
        await auditLogService.create(newEntry);
      } catch (err) {
        console.error('Failed to create audit log:', err);
      }
    }

    setAuditLog(prev => [newEntry, ...prev]);
  }, []);

  // =============================================================================
  // INVENTORY OPERATIONS
  // =============================================================================

  const updateInventory = useCallback(async (newInventory) => {
    setInventory(newInventory);
  }, []);

  const updateItem = useCallback(async (id, updates) => {
    
      try {
        await inventoryService.update(id, updates);
      } catch (err) {
        console.error('Failed to update item:', err);
        throw err;
      }
    }
    
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const createItem = useCallback(async (item) => {
    let newItem = item;
    
    
      try {
        newItem = await inventoryService.create(item);
      } catch (err) {
        console.error('Failed to create item:', err);
        throw err;
      }
    }
    
    setInventory(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const deleteItem = useCallback(async (id) => {
    
      try {
        await inventoryService.delete(id);
      } catch (err) {
        console.error('Failed to delete item:', err);
        throw err;
      }
    }
    
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Fetch item with all related data (notes, reminders, reservations, maintenance)
  const getItemWithDetails = useCallback(async (id) => {
    try {
      const itemWithDetails = await inventoryService.getByIdWithDetails(id);
      return itemWithDetails;
    } catch (err) {
      console.error('Failed to fetch item details:', err);
      // Fall back to local inventory
      return inventory.find(item => item.id === id) || null;
    }
  }, [inventory]);

  // =============================================================================
  // PACKAGES OPERATIONS
  // =============================================================================

  const updatePackages = useCallback(async (newPackages) => {
    setPackages(newPackages);
  }, []);

  const createPackage = useCallback(async (pkg) => {
    let newPackage = pkg;
    
    
      try {
        newPackage = await packagesService.create(pkg);
      } catch (err) {
        console.error('Failed to create package:', err);
        throw err;
      }
    }
    
    setPackages(prev => [...prev, newPackage]);
    return newPackage;
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    
      try {
        await packagesService.update(id, updates);
      } catch (err) {
        console.error('Failed to update package:', err);
        throw err;
      }
    }
    
    setPackages(prev => prev.map(pkg => 
      pkg.id === id ? { ...pkg, ...updates } : pkg
    ));
  }, []);

  const deletePackage = useCallback(async (id) => {
    
      try {
        await packagesService.delete(id);
      } catch (err) {
        console.error('Failed to delete package:', err);
        throw err;
      }
    }
    
    setPackages(prev => prev.filter(pkg => pkg.id !== id));
  }, []);

  // =============================================================================
  // PACK LISTS OPERATIONS
  // =============================================================================

  const updatePackLists = useCallback(async (newPackLists) => {
    setPackLists(newPackLists);
  }, []);

  const createPackList = useCallback(async (packList) => {
    let newPackList = packList;
    
    
      try {
        newPackList = await packListsService.create(packList);
      } catch (err) {
        console.error('Failed to create pack list:', err);
        throw err;
      }
    }
    
    setPackLists(prev => [...prev, newPackList]);
    return newPackList;
  }, []);

  const updatePackList = useCallback(async (id, updates) => {
    
      try {
        await packListsService.update(id, updates);
      } catch (err) {
        console.error('Failed to update pack list:', err);
        throw err;
      }
    }
    
    setPackLists(prev => prev.map(pl => 
      pl.id === id ? { ...pl, ...updates } : pl
    ));
  }, []);

  const deletePackList = useCallback(async (id) => {
    
      try {
        await packListsService.delete(id);
      } catch (err) {
        console.error('Failed to delete pack list:', err);
        throw err;
      }
    }
    
    setPackLists(prev => prev.filter(pl => pl.id !== id));
  }, []);

  // =============================================================================
  // CLIENTS OPERATIONS
  // =============================================================================

  const updateClients = useCallback(async (newClients) => {
    setClients(newClients);
  }, []);

  const createClient = useCallback(async (client) => {
    let newClient = client;
    
    
      try {
        newClient = await clientsService.create(client);
      } catch (err) {
        console.error('Failed to create client:', err);
        throw err;
      }
    }
    
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback(async (id, updates) => {
    
      try {
        await clientsService.update(id, updates);
      } catch (err) {
        console.error('Failed to update client:', err);
        throw err;
      }
    }
    
    setClients(prev => prev.map(client => 
      client.id === id ? { ...client, ...updates } : client
    ));
  }, []);

  const deleteClient = useCallback(async (id) => {
    
      try {
        await clientsService.delete(id);
      } catch (err) {
        console.error('Failed to delete client:', err);
        throw err;
      }
    }
    
    setClients(prev => prev.filter(client => client.id !== id));
  }, []);

  // =============================================================================
  // USERS OPERATIONS
  // =============================================================================

  const updateUsers = useCallback(async (newUsers) => {
    setUsers(newUsers);
  }, []);

  // =============================================================================
  // ROLES OPERATIONS
  // =============================================================================

  const updateRoles = useCallback(async (newRoles) => {
    setRoles(newRoles);
  }, []);

  // =============================================================================
  // LOCATIONS OPERATIONS
  // =============================================================================

  const updateLocations = useCallback(async (newLocations) => {
    setLocations(newLocations);
  }, []);

  // =============================================================================
  // CATEGORIES OPERATIONS
  // =============================================================================

  const updateCategories = useCallback(async (newCategories) => {
    setCategories(newCategories);
  }, []);

  // =============================================================================
  // SPECS OPERATIONS
  // =============================================================================

  const updateSpecs = useCallback(async (newSpecs) => {
    setSpecs(newSpecs);
  }, []);

  // =============================================================================
  // NOTIFICATION OPERATIONS
  // =============================================================================

  // Save notification preferences
  const saveNotificationPreferences = useCallback(async (userId, preferences) => {
    
      try {
        await notificationPreferencesService.upsert(userId, preferences);
      } catch (err) {
        console.error('Failed to save notification preferences:', err);
        throw err;
      }
    }
    
    // Update local user state
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, notificationPreferences: preferences } : u
    ));
    
    return preferences;
  }, []);

  // Get notification preferences for a user
  const getNotificationPreferences = useCallback(async (userId) => {
    try {
      return await notificationPreferencesService.getByUserId(userId);
    } catch (err) {
      console.error('Failed to get notification preferences:', err);
      return null;
    }
  }, []);

  // Send checkout confirmation email
  const sendCheckoutEmail = useCallback(async ({ borrowerEmail, borrowerName, item, checkoutDate, dueDate, project }) => {
    try {
      return await emailService.sendCheckoutConfirmation({
        borrowerEmail,
        borrowerName,
        item,
        checkoutDate,
        dueDate,
        project
      });
    } catch (err) {
      console.error('Failed to send checkout email:', err);
      // Don't throw - email failure shouldn't block checkout
      return { success: false, error: err.message };
    }
  }, []);

  // Send checkin confirmation email
  const sendCheckinEmail = useCallback(async ({ borrowerEmail, borrowerName, item, returnDate }) => {
    try {
      return await emailService.sendCheckinConfirmation({
        borrowerEmail,
        borrowerName,
        item,
        returnDate
      });
    } catch (err) {
      console.error('Failed to send checkin email:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Send reservation confirmation email
  const sendReservationEmail = useCallback(async ({ userEmail, userName, item, reservation }) => {
    try {
      return await emailService.sendReservationConfirmation({
        userEmail,
        userName,
        item,
        reservation
      });
    } catch (err) {
      console.error('Failed to send reservation email:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value = useMemo(() => ({
    // State
    loading,
    error,
    
    // Data
    inventory,
    packages,
    packLists,
    clients,
    users,
    roles,
    locations,
    categories,
    specs,
    auditLog,
    
    // Setters (for direct state updates)
    setInventory,
    setPackages,
    setPackLists,
    setClients,
    setUsers,
    setRoles,
    setLocations,
    setCategories,
    setSpecs,
    setAuditLog,
    
    // Inventory Operations
    updateInventory,
    updateItem,
    createItem,
    deleteItem,
    getItemWithDetails,
    
    // Package Operations
    updatePackages,
    createPackage,
    updatePackage,
    deletePackage,
    
    // Pack List Operations
    updatePackLists,
    createPackList,
    updatePackList,
    deletePackList,
    
    // Client Operations
    updateClients,
    createClient,
    updateClient,
    deleteClient,
    
    // Notification Operations
    saveNotificationPreferences,
    getNotificationPreferences,
    sendCheckoutEmail,
    sendCheckinEmail,
    sendReservationEmail,
    
    // Other Operations
    updateUsers,
    updateRoles,
    updateLocations,
    updateCategories,
    updateSpecs,
    addAuditLog
  }), [
    loading,
    error,
    inventory,
    packages,
    packLists,
    clients,
    users,
    roles,
    locations,
    categories,
    specs,
    auditLog,
    // Inventory
    updateInventory,
    updateItem,
    createItem,
    deleteItem,
    getItemWithDetails,
    // Packages
    updatePackages,
    createPackage,
    updatePackage,
    deletePackage,
    // Pack Lists
    updatePackLists,
    createPackList,
    updatePackList,
    deletePackList,
    // Clients
    updateClients,
    createClient,
    updateClient,
    deleteClient,
    // Notifications
    saveNotificationPreferences,
    getNotificationPreferences,
    sendCheckoutEmail,
    sendCheckinEmail,
    sendReservationEmail,
    // Other
    updateUsers,
    updateRoles,
    updateLocations,
    updateCategories,
    updateSpecs,
    addAuditLog
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}

// =============================================================================
// EXPORT
// =============================================================================

export default DataContext;
