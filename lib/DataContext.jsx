// =============================================================================
// SIMS Data Context
// Provides centralized state management with Supabase
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  inventoryService,
  reservationsService,
  maintenanceService,
  itemNotesService,
  itemRemindersService,
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
  const [dataLoaded, setDataLoaded] = useState(false);

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
  // DATA LOADING FUNCTION
  // =============================================================================
  
  const loadData = useCallback(async () => {
    console.log('[DataContext] Starting data load...');
    setLoading(true);
    setError(null);

    try {
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

      console.log('[DataContext] Data loaded:', {
        inventory: inventoryData?.length || 0,
        packages: packagesData?.length || 0,
        packLists: packListsData?.length || 0,
        clients: clientsData?.length || 0,
        users: usersData?.length || 0,
        roles: rolesData?.length || 0,
        locations: locationsData?.length || 0,
        categories: categoriesData?.length || 0
      });

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
      setDataLoaded(true);
    } catch (err) {
      console.error('[DataContext] Failed to load data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // =============================================================================
  // INITIAL DATA LOAD
  // =============================================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    
    setInventory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Fetch item with all related data (notes, reminders, reservations, maintenance)
  const getItemWithDetails = useCallback(async (id) => {
    try {
      const itemWithDetails = await inventoryService.getByIdWithDetails(id);
      return itemWithDetails;
    } catch (err) {
      console.error('Failed to fetch item details:', err);
      return inventory.find(item => item.id === id) || null;
    }
  }, [inventory]);

  // =============================================================================
  // ITEM NOTES OPERATIONS
  // =============================================================================

  const addItemNote = useCallback(async (itemId, note) => {
    try {
      const dbNote = {
        // Don't pass id - let DB generate UUID
        item_id: itemId,
        user_name: note.user,
        text: note.text,
        parent_id: note.parentId || null,
        deleted: false
      };
      await itemNotesService.create(dbNote);
    } catch (err) {
      console.error('Failed to save note:', err);
      // Continue with local state update even if DB fails
    }
  }, []);

  const deleteItemNote = useCallback(async (noteId) => {
    try {
      await itemNotesService.softDelete(noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, []);

  // =============================================================================
  // ITEM REMINDERS OPERATIONS
  // =============================================================================

  const addItemReminder = useCallback(async (itemId, reminder) => {
    try {
      const dbReminder = {
        // Don't pass id - let DB generate UUID
        item_id: itemId,
        title: reminder.title,
        description: reminder.description || '',
        due_date: reminder.dueDate,
        recurrence: reminder.recurrence || 'none',
        completed: false,
        created_by_name: reminder.createdBy || 'Unknown'
      };
      await itemRemindersService.create(dbReminder);
    } catch (err) {
      console.error('Failed to save reminder:', err);
    }
  }, []);

  const updateItemReminder = useCallback(async (reminderId, updates) => {
    try {
      const dbUpdates = {};
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.completedDate !== undefined) dbUpdates.completed_at = updates.completedDate;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      
      await itemRemindersService.update(reminderId, dbUpdates);
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  }, []);

  const deleteItemReminder = useCallback(async (reminderId) => {
    try {
      await itemRemindersService.delete(reminderId);
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  }, []);

  // =============================================================================
  // MAINTENANCE OPERATIONS
  // =============================================================================

  const addMaintenance = useCallback(async (itemId, record) => {
    try {
      const dbRecord = {
        // Don't pass id - let DB generate UUID
        item_id: itemId,
        type: record.type,
        description: record.description || '',
        vendor: record.vendor || null,
        cost: record.cost || 0,
        scheduled_date: record.date || record.scheduledDate || null,
        completed_date: record.completedDate || null,
        status: record.status || 'completed',
        notes: record.notes || '',
        created_by_name: record.performedBy || 'Unknown'
      };
      await maintenanceService.create(dbRecord);
    } catch (err) {
      console.error('Failed to save maintenance record:', err);
    }
  }, []);

  const updateMaintenance = useCallback(async (recordId, updates) => {
    try {
      await maintenanceService.update(recordId, updates);
    } catch (err) {
      console.error('Failed to update maintenance record:', err);
    }
  }, []);

  const deleteMaintenance = useCallback(async (recordId) => {
    try {
      await maintenanceService.delete(recordId);
    } catch (err) {
      console.error('Failed to delete maintenance record:', err);
    }
  }, []);

  // =============================================================================
  // RESERVATIONS OPERATIONS
  // =============================================================================

  const createReservation = useCallback(async (itemId, reservation) => {
    try {
      const dbReservation = {
        // Don't pass id - let DB generate UUID
        item_id: itemId,
        client_id: reservation.clientId || null,
        project: reservation.project,
        project_type: reservation.projectType || 'Other',
        start_date: reservation.start,
        end_date: reservation.end,
        status: reservation.status || 'confirmed',
        contact_name: reservation.user,
        contact_phone: reservation.contactPhone || '',
        contact_email: reservation.contactEmail || '',
        location: reservation.location || '',
        notes: reservation.notes || ''
      };
      const result = await reservationsService.create(dbReservation);
      return result;
    } catch (err) {
      console.error('Failed to create reservation:', err);
      throw err;
    }
  }, []);

  const updateReservation = useCallback(async (reservationId, updates) => {
    try {
      const dbUpdates = {};
      if (updates.project !== undefined) dbUpdates.project = updates.project;
      if (updates.projectType !== undefined) dbUpdates.project_type = updates.projectType;
      if (updates.start !== undefined) dbUpdates.start_date = updates.start;
      if (updates.end !== undefined) dbUpdates.end_date = updates.end;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.user !== undefined) dbUpdates.contact_name = updates.user;
      if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
      
      await reservationsService.update(reservationId, dbUpdates);
    } catch (err) {
      console.error('Failed to update reservation:', err);
      throw err;
    }
  }, []);

  const deleteReservation = useCallback(async (reservationId) => {
    try {
      await reservationsService.delete(reservationId);
    } catch (err) {
      console.error('Failed to delete reservation:', err);
      throw err;
    }
  }, []);

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

  const saveNotificationPreferences = useCallback(async (userId, preferences) => {
    try {
      await notificationPreferencesService.upsert(userId, preferences);
    } catch (err) {
      console.error('Failed to save notification preferences:', err);
      throw err;
    }
    
    return preferences;
  }, []);

  const getNotificationPreferences = useCallback(async (userId) => {
    try {
      return await notificationPreferencesService.getByUserId(userId);
    } catch (err) {
      console.error('Failed to get notification preferences:', err);
      return null;
    }
  }, []);

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
      return { success: false, error: err.message };
    }
  }, []);

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
    dataLoaded,
    
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
    
    // Refresh function
    refreshData: loadData,
    
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
    
    // Item Notes Operations
    addItemNote,
    deleteItemNote,
    
    // Item Reminders Operations
    addItemReminder,
    updateItemReminder,
    deleteItemReminder,
    
    // Maintenance Operations
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    
    // Reservation Operations
    createReservation,
    updateReservation,
    deleteReservation,
    
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
    dataLoaded,
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
    loadData,
    updateInventory,
    updateItem,
    createItem,
    deleteItem,
    getItemWithDetails,
    addItemNote,
    deleteItemNote,
    addItemReminder,
    updateItemReminder,
    deleteItemReminder,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    createReservation,
    updateReservation,
    deleteReservation,
    updatePackages,
    createPackage,
    updatePackage,
    deletePackage,
    updatePackLists,
    createPackList,
    updatePackList,
    deletePackList,
    updateClients,
    createClient,
    updateClient,
    deleteClient,
    saveNotificationPreferences,
    getNotificationPreferences,
    sendCheckoutEmail,
    sendCheckinEmail,
    sendReservationEmail,
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

export default DataContext;
