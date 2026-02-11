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
  emailService,
  checkoutHistoryService
} from './services.js';

import { DEFAULT_ROLES, DEFAULT_LOCATIONS, DEFAULT_SPECS } from '../constants.js';
import { log, error as logError } from './logger.js';
import { validateReservation, validateClient, validateMaintenanceRecord } from './validators.js';

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
  const [categorySettings, setCategorySettings] = useState({});
  const [specs, setSpecs] = useState({});
  const [auditLog, setAuditLog] = useState([]);

  // =============================================================================
  // DATA LOADING FUNCTION (Tiered)
  //
  // Tier 1 (blocking): inventory, categories, users, roles, locations, specs
  //   → UI renders as soon as these arrive
  // Tier 2 (background): reservations, packages, pack lists, clients, audit log
  //   → Loaded after first paint, merged into state progressively
  // =============================================================================
  
  const loadData = useCallback(async () => {
    log('[DataContext] Starting tiered data load...');
    setLoading(true);
    setError(null);

    try {
      // --- Tier 1: Critical data (blocks rendering) ---
      const [
        inventoryData,
        categoriesData,
        usersData,
        rolesData,
        locationsData,
        specsData,
      ] = await Promise.all([
        inventoryService.getAll(),
        categoriesService.getAll(),
        usersService.getAll(),
        rolesService.getAll(),
        locationsService.getAll(),
        specsService.getAll(),
      ]);

      log('[DataContext] Tier 1 loaded:', {
        inventory: inventoryData?.length || 0,
        categories: categoriesData?.length || 0,
        users: usersData?.length || 0,
      });

      setInventory(inventoryData || []);
      // Extract category names and settings from DB records
      const catNames = (categoriesData || []).map(c => c.name);
      const catSettings = {};
      (categoriesData || []).forEach(c => {
        catSettings[c.name] = {
          trackQuantity: c.track_quantity || false,
          trackSerialNumbers: c.track_serial_numbers !== false,
          lowStockThreshold: c.low_stock_threshold || 0,
        };
      });
      setCategories(catNames);
      setCategorySettings(catSettings);
      setUsers(usersData || []);
      setRoles(rolesData || DEFAULT_ROLES);
      setLocations(locationsData || []);
      setSpecs(specsData || {});
      setDataLoaded(true);

    } catch (err) {
      logError('[DataContext] Tier 1 load failed:', err);
      setError(err);
    } finally {
      setLoading(false);
    }

    // --- Tier 2: Secondary data (non-blocking, after first paint) ---
    try {
      const [
        reservationsData,
        packagesData,
        packListsData,
        clientsData,
        auditLogData,
      ] = await Promise.all([
        reservationsService.getAll(),
        packagesService.getAll(),
        packListsService.getAll(),
        clientsService.getAll(),
        auditLogService.getAll({ limit: 100 }),
      ]);

      log('[DataContext] Tier 2 loaded:', {
        reservations: reservationsData?.length || 0,
        packages: packagesData?.length || 0,
        packLists: packListsData?.length || 0,
        clients: clientsData?.length || 0,
      });

      // Merge reservations into inventory items
      const reservationsByItemId = {};
      (reservationsData || []).forEach(res => {
        if (!reservationsByItemId[res.itemId]) {
          reservationsByItemId[res.itemId] = [];
        }
        reservationsByItemId[res.itemId].push(res);
      });

      setInventory(prev => prev.map(item => ({
        ...item,
        reservations: reservationsByItemId[item.id] || item.reservations || []
      })));

      setPackages(packagesData || []);
      setPackLists(packListsData || []);
      setClients(clientsData || []);
      setAuditLog(auditLogData || []);

    } catch (err) {
      logError('[DataContext] Tier 2 load failed (non-critical):', err);
      // Don't set error state — Tier 1 data is already available
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
      logError('Failed to create audit log:', err);
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
      logError('Failed to update item:', err);
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
      logError('Failed to create item:', err);
      throw err;
    }
    
    setInventory(prev => [...prev, newItem]);
    return newItem;
  }, []);

  const deleteItem = useCallback(async (id) => {
    try {
      await inventoryService.delete(id);
    } catch (err) {
      logError('Failed to delete item:', err);
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
      logError('Failed to fetch item details:', err);
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
      const result = await itemNotesService.create(dbNote);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save note:', err);
      return null;
    }
  }, []);

  const deleteItemNote = useCallback(async (noteId) => {
    try {
      await itemNotesService.softDelete(noteId);
    } catch (err) {
      logError('Failed to delete note:', err);
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
      const result = await itemRemindersService.create(dbReminder);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save reminder:', err);
      return null;
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
      logError('Failed to update reminder:', err);
    }
  }, []);

  const deleteItemReminder = useCallback(async (reminderId) => {
    try {
      await itemRemindersService.delete(reminderId);
    } catch (err) {
      logError('Failed to delete reminder:', err);
    }
  }, []);

  // =============================================================================
  // MAINTENANCE OPERATIONS
  // =============================================================================

  const addMaintenance = useCallback(async (itemId, record) => {
    try {
      // Validate before writing (still in camelCase at this point)
      const validation = validateMaintenanceRecord(record);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
      }
      
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
      const result = await maintenanceService.create(dbRecord);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save maintenance record:', err);
      return null;
    }
  }, []);

  const updateMaintenance = useCallback(async (recordId, updates) => {
    try {
      await maintenanceService.update(recordId, updates);
    } catch (err) {
      logError('Failed to update maintenance record:', err);
    }
  }, []);

  const deleteMaintenance = useCallback(async (recordId) => {
    try {
      await maintenanceService.delete(recordId);
    } catch (err) {
      logError('Failed to delete maintenance record:', err);
    }
  }, []);

  // =============================================================================
  // RESERVATIONS OPERATIONS
  // =============================================================================

  const createReservation = useCallback(async (itemId, reservation) => {
    try {
      // Validate before writing (still in camelCase at this point)
      const validation = validateReservation(reservation);
      if (!validation.isValid) {
        throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
      }
      
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
        notes: reservation.notes || []  // Supabase handles JSONB directly
      };
      const result = await reservationsService.create(dbReservation);
      return result;
    } catch (err) {
      logError('Failed to create reservation:', err);
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
      logError('Failed to update reservation:', err);
      throw err;
    }
  }, []);

  const deleteReservation = useCallback(async (reservationId) => {
    try {
      await reservationsService.delete(reservationId);
    } catch (err) {
      logError('Failed to delete reservation:', err);
      throw err;
    }
  }, []);

  // =============================================================================
  // CHECK IN/OUT OPERATIONS
  // =============================================================================

  const checkOutItem = useCallback(async (itemId, checkoutData) => {
    try {
      const result = await inventoryService.checkOut(itemId, checkoutData);
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: 'checked-out',
          checkedOutTo: checkoutData.userName,
          checkedOutToUserId: checkoutData.userId,
          checkedOutDate: new Date().toISOString().split('T')[0],
          dueBack: checkoutData.dueBack,
          checkoutProject: checkoutData.project,
          checkoutClientId: checkoutData.clientId
        } : item
      ));
      
      return result;
    } catch (err) {
      logError('Failed to check out item:', err);
      throw err;
    }
  }, []);

  const checkInItem = useCallback(async (itemId, checkinData) => {
    try {
      const { 
        returnedBy, 
        userId,
        condition, 
        conditionNotes, 
        returnNotes, 
        damageReported, 
        damageDescription 
      } = checkinData;
      
      // Use the dedicated checkIn service method
      const result = await inventoryService.checkIn(itemId, {
        userId: userId,
        userName: returnedBy,
        notes: returnNotes || conditionNotes,
        condition: condition
      });
      
      // Determine new status based on damage
      const newStatus = damageReported ? 'needs-attention' : 'available';
      
      // Update local state
      setInventory(prev => prev.map(item => 
        item.id === itemId ? { 
          ...item, 
          status: newStatus,
          condition: condition,
          checkedOutTo: null,
          checkedOutToUserId: null,
          checkedOutDate: null,
          dueBack: null,
          checkoutProject: null,
          checkoutClientId: null
        } : item
      ));
      
      // If damage reported, add a note
      if (damageReported && damageDescription) {
        try {
          await itemNotesService.create({
            item_id: itemId,
            user_name: returnedBy || 'System',
            text: `⚠️ Damage reported: ${damageDescription}`
          });
        } catch (noteErr) {
          logError('Failed to add damage note:', noteErr);
        }
      }
      
      return result;
    } catch (err) {
      logError('Failed to check in item:', err);
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
      logError('Failed to create package:', err);
      throw err;
    }
    
    setPackages(prev => [...prev, newPackage]);
    return newPackage;
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    try {
      await packagesService.update(id, updates);
    } catch (err) {
      logError('Failed to update package:', err);
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
      logError('Failed to delete package:', err);
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
      logError('Failed to create pack list:', err);
      throw err;
    }
    
    setPackLists(prev => [...prev, newPackList]);
    return newPackList;
  }, []);

  const updatePackList = useCallback(async (id, updates) => {
    try {
      await packListsService.update(id, updates);
    } catch (err) {
      logError('Failed to update pack list:', err);
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
      logError('Failed to delete pack list:', err);
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
    // Validate before writing
    const validation = validateClient(client);
    if (!validation.isValid) {
      throw new Error('Validation failed: ' + Object.values(validation.errors).join(', '));
    }
    
    let newClient = client;
    
    try {
      newClient = await clientsService.create(client);
    } catch (err) {
      logError('Failed to create client:', err);
      throw err;
    }
    
    setClients(prev => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback(async (id, updates) => {
    try {
      await clientsService.update(id, updates);
    } catch (err) {
      logError('Failed to update client:', err);
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
      logError('Failed to delete client:', err);
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

  const updateCategories = useCallback(async (newCategories, newSettings = {}) => {
    setCategories(newCategories);
    setCategorySettings(newSettings);
    try {
      await categoriesService.syncAll(newCategories, newSettings);
    } catch (err) {
      logError('Failed to save categories:', err);
    }
  }, []);

  // =============================================================================
  // SPECS OPERATIONS
  // =============================================================================

  const updateSpecs = useCallback(async (newSpecs) => {
    setSpecs(newSpecs);
    try {
      // Upsert specs for each category
      const promises = Object.entries(newSpecs).map(([categoryName, fields]) =>
        specsService.upsert(categoryName, fields)
      );
      await Promise.all(promises);
    } catch (err) {
      logError('Failed to save specs:', err);
    }
  }, []);

  // =============================================================================
  // NOTIFICATION OPERATIONS
  // =============================================================================

  const saveNotificationPreferences = useCallback(async (userId, preferences) => {
    try {
      await notificationPreferencesService.upsert(userId, preferences);
    } catch (err) {
      logError('Failed to save notification preferences:', err);
      throw err;
    }
    
    return preferences;
  }, []);

  const getNotificationPreferences = useCallback(async (userId) => {
    try {
      return await notificationPreferencesService.getByUserId(userId);
    } catch (err) {
      logError('Failed to get notification preferences:', err);
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
      logError('Failed to send checkout email:', err);
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
      logError('Failed to send checkin email:', err);
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
      logError('Failed to send reservation email:', err);
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
    categorySettings,
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
    setCategorySettings,
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
    
    // Check In/Out Operations
    checkOutItem,
    checkInItem,
    
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
    categorySettings,
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
    checkOutItem,
    checkInItem,
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
