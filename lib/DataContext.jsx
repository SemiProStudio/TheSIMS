// =============================================================================
// SIMS Data Context
// Provides centralized state management with Supabase or demo mode support
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { isDemoMode } from './supabase.js';
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

// Import demo data for offline/demo mode
import { 
  initialInventory, 
  initialPackages, 
  initialUsers, 
  initialAuditLog, 
  initialPackLists, 
  initialKits, 
  initialClients 
} from '../data.js';
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
        if (isDemoMode) {
          // Load demo data
          const allInventory = [...initialInventory, ...initialKits];
          setInventory(allInventory);
          setPackages(initialPackages);
          setPackLists(initialPackLists);
          setClients(initialClients);
          setUsers(initialUsers);
          setRoles(DEFAULT_ROLES);
          setLocations(DEFAULT_LOCATIONS);
          setCategories(['Cameras', 'Lenses', 'Lighting', 'Audio', 'Support', 'Accessories', 'Storage', 'Grip', 'Monitors', 'Power']);
          setSpecs(DEFAULT_SPECS);
          setAuditLog(initialAuditLog);
        } else {
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
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err);
        
        // Fall back to demo data on error
        const allInventory = [...initialInventory, ...initialKits];
        setInventory(allInventory);
        setPackages(initialPackages);
        setPackLists(initialPackLists);
        setClients(initialClients);
        setUsers(initialUsers);
        setRoles(DEFAULT_ROLES);
        setLocations(DEFAULT_LOCATIONS);
        setCategories(['Cameras', 'Lenses', 'Lighting', 'Audio', 'Support', 'Accessories', 'Storage', 'Grip', 'Monitors', 'Power']);
        setSpecs(DEFAULT_SPECS);
        setAuditLog(initialAuditLog);
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

    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    
    if (!isDemoMode) {
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
    if (!isDemoMode) {
      try {
        await inventoryService.delete(id);
      } catch (err) {
        console.error('Failed to delete item:', err);
        throw err;
      }
    }
    
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  // =============================================================================
  // PACKAGES OPERATIONS
  // =============================================================================

  const updatePackages = useCallback(async (newPackages) => {
    setPackages(newPackages);
  }, []);

  const createPackage = useCallback(async (pkg) => {
    let newPackage = pkg;
    
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    if (!isDemoMode) {
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
    if (isDemoMode) {
      return null;
    }
    
    try {
      return await notificationPreferencesService.getByUserId(userId);
    } catch (err) {
      console.error('Failed to get notification preferences:', err);
      return null;
    }
  }, []);

  // Send checkout confirmation email
  const sendCheckoutEmail = useCallback(async ({ borrowerEmail, borrowerName, item, checkoutDate, dueDate, project }) => {
    if (isDemoMode) {
      console.log('[Demo Mode] Would send checkout email to:', borrowerEmail);
      return { success: true, demo: true };
    }
    
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
    if (isDemoMode) {
      console.log('[Demo Mode] Would send checkin email to:', borrowerEmail);
      return { success: true, demo: true };
    }
    
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
    if (isDemoMode) {
      console.log('[Demo Mode] Would send reservation email to:', userEmail);
      return { success: true, demo: true };
    }
    
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
    isDemoMode,
    
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
