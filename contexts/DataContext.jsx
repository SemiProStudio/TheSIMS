// =============================================================================
// SIMS Data Context
// Provides centralized state management with Supabase
// =============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  freshnessService,
  inventoryService,
  reservationsService,
  maintenanceService,
  checkoutHistoryService,
  itemNotesService,
  itemRemindersService,
  clientsService,
  clientNotesService,
  packagesService,
  packageNotesService,
  packListsService,
  categoriesService,
  specsService,
  locationsService,
  usersService,
  rolesService,
  auditLogService,
  notificationPreferencesService,
  emailService,
  notificationLogService,
} from '../lib/services.js';

import { DEFAULT_ROLES } from '../constants.js';
import { log, error as logError } from '../lib/logger.js';
import {
  validateReservation,
  validateClient,
  validateMaintenanceRecord,
} from '../lib/validators.js';
import { updateById, removeById, getTodayISO } from '../utils';
import { reconcileReservedStatuses } from '../lib/reconcileReservedStatuses.js';
import DataContext from './DataContext.js';

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

  // Staleness tracking
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const [tier2Loaded, setTier2Loaded] = useState(false);

  // Lazy-load tracking — these tables are fetched on-demand, not at startup
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [auditLogLoaded, setAuditLogLoaded] = useState(false);
  const [packListsLoaded, setPackListsLoaded] = useState(false);
  // Full maintenance history (Tier 2 carries pending-only) and the trailing
  // year of checkout events — both loaded on demand by the Reports views
  const [maintenanceLoaded, setMaintenanceLoaded] = useState(false);
  const [checkoutEvents, setCheckoutEvents] = useState([]);
  const [checkoutEventsLoaded, setCheckoutEventsLoaded] = useState(false);
  // Per-layer lazy-load failure flags, keyed by lazyLoad()'s key. A failed
  // layer stays unloaded (so ensure* retries), but without this signal the
  // consuming views rendered a permanent spinner or a silently-empty list.
  const [lazyErrors, setLazyErrors] = useState({});

  // Ref mirrors of the two report latches: loadData (a []-dep callback) must
  // know whether the lazy layers were hydrated so a mid-session refresh can
  // re-hydrate them instead of silently serving pending-only data forever
  const maintenanceLoadedRef = useRef(false);
  const checkoutEventsLoadedRef = useRef(false);
  const markMaintenanceLoaded = useCallback((v) => {
    maintenanceLoadedRef.current = v;
    setMaintenanceLoaded(v);
  }, []);
  const markCheckoutEventsLoaded = useCallback((v) => {
    checkoutEventsLoadedRef.current = v;
    setCheckoutEventsLoaded(v);
  }, []);

  // =============================================================================
  // DATA LOADING FUNCTION (Tiered)
  //
  // Tier 1 (blocking): inventory, categories, roles, locations, specs
  //   → UI renders as soon as these arrive
  // Tier 2 (background): reservations, packages, users
  //   → Loaded after first paint, merged into state progressively
  // Lazy (on-demand): clients, packLists, auditLog
  //   → Loaded when the consuming view mounts
  // =============================================================================

  // Shared by ensureMaintenance and loadData's re-hydration: merge the full
  // maintenance history into inventory. Merge-by-id keeps records the server
  // snapshot doesn't know yet (a create landing while the fetch was in
  // flight — the notes-clobber lesson).
  const mergeMaintenanceIntoInventory = useCallback((records) => {
    const byItemId = {};
    records.forEach((r) => {
      if (!byItemId[r.itemId]) byItemId[r.itemId] = [];
      byItemId[r.itemId].push(r);
    });
    setInventory((prev) =>
      prev.map((item) => {
        const serverRecords = byItemId[item.id] || [];
        const serverIds = new Set(serverRecords.map((r) => r.id));
        const localOnly = (item.maintenanceHistory || []).filter((r) => !serverIds.has(r.id));
        return { ...item, maintenanceHistory: [...serverRecords, ...localOnly] };
      }),
    );
  }, []);

  // Trailing year of checkout_history events — one window covers every range
  // selector (30/90/365 days); views filter locally.
  const fetchCheckoutWindow = useCallback(() => {
    const since = new Date();
    since.setDate(since.getDate() - 365);
    return checkoutHistoryService.getRecent(since.toISOString());
  }, []);

  const loadData = useCallback(async () => {
    log('[DataContext] Starting tiered data load...');
    setLoading(true);
    setError(null);
    setTier2Loaded(false);

    try {
      // --- Tier 1: Critical data (blocks rendering) ---
      // The freshness check rides along to supply a SERVER-side watermark for
      // incremental refresh — a fast local clock would otherwise skip
      // colleagues' changes within the skew window.
      const [inventoryData, categoriesData, rolesData, locationsData, specsData, freshnessData] =
        await Promise.all([
          inventoryService.getAll(),
          categoriesService.getAll(),
          rolesService.getAll(),
          locationsService.getAll(),
          specsService.getAll(),
          freshnessService.check().catch(() => null),
        ]);

      log('[DataContext] Tier 1 loaded:', {
        inventory: inventoryData?.length || 0,
        categories: categoriesData?.length || 0,
      });

      setInventory(inventoryData || []);
      // Extract category names and settings from DB records
      const catNames = (categoriesData || []).map((c) => c.name);
      const catSettings = {};
      (categoriesData || []).forEach((c) => {
        catSettings[c.name] = {
          trackQuantity: c.track_quantity || false,
          trackSerialNumbers: c.track_serial_numbers !== false,
        };
      });
      setCategories(catNames);
      setCategorySettings(catSettings);
      setRoles(rolesData || DEFAULT_ROLES);
      setLocations(locationsData || []);
      setSpecs(specsData || {});
      setDataLoaded(true);
      setLastLoadedAt(freshnessData?.server_time || new Date().toISOString());
    } catch (err) {
      logError('[DataContext] Tier 1 load failed:', err);
      setError(err);
    } finally {
      setLoading(false);
    }

    // --- Tier 2: Secondary data (non-blocking, after first paint) ---
    // Note: clients, packLists, and auditLog are lazy-loaded on demand.
    // Reminders and pending maintenance ride along because the dashboard's
    // Due Reminders / Upcoming Maintenance panels need them inventory-wide —
    // the Tier 1 list load intentionally omits those tables.
    try {
      const [reservationsData, packagesData, usersData, remindersData, maintenanceData] =
        await Promise.all([
          reservationsService.getAll(),
          packagesService.getAll(),
          usersService.getAll(),
          itemRemindersService.getAllActive(),
          maintenanceService.getAllPending(),
        ]);

      log('[DataContext] Tier 2 loaded:', {
        reservations: reservationsData?.length || 0,
        packages: packagesData?.length || 0,
        users: usersData?.length || 0,
        reminders: remindersData?.length || 0,
        maintenance: maintenanceData?.length || 0,
      });

      // Merge reservations, reminders, and pending maintenance into items
      const groupByItemId = (rows) => {
        const map = {};
        (rows || []).forEach((row) => {
          if (!map[row.itemId]) map[row.itemId] = [];
          map[row.itemId].push(row);
        });
        return map;
      };
      const reservationsByItemId = groupByItemId(reservationsData);
      const remindersByItemId = groupByItemId(remindersData);
      const maintenanceByItemId = groupByItemId(maintenanceData);

      setInventory((prev) =>
        reconcileReservedStatuses(
          prev.map((item) => ({
            ...item,
            reservations: reservationsByItemId[item.id] || item.reservations || [],
            reminders: remindersByItemId[item.id] || item.reminders || [],
            maintenanceHistory: maintenanceByItemId[item.id] || item.maintenanceHistory || [],
          })),
        ),
      );

      setPackages(packagesData || []);
      setUsers(usersData || []);
      setTier2Loaded(true);
    } catch (err) {
      logError('[DataContext] Tier 2 load failed (non-critical):', err);
      // Don't set error state — Tier 1 data is already available
      setTier2Loaded(true); // Mark loaded even on error to prevent permanent loading state
    }

    // --- Lazy-layer re-hydration ---
    // The report latches survive a mid-session reload, but Tier 1 just
    // replaced every item with slim list rows and Tier 2 re-merged only
    // PENDING maintenance. Without this step a refreshData() (e.g. after
    // creating a user) would leave ensureMaintenance()/ensureCheckoutActivity()
    // early-returning forever over data that no longer contains what the
    // latch promises — the Maintenance report would silently collapse to
    // pending-only records.
    if (maintenanceLoadedRef.current) {
      try {
        mergeMaintenanceIntoInventory(await maintenanceService.getAll());
      } catch (err) {
        // Honest latch: drop it so report views fall back to their loading
        // state and the next ensureMaintenance() retries.
        markMaintenanceLoaded(false);
        logError('[DataContext] Maintenance re-hydration failed:', err);
      }
    }
    if (checkoutEventsLoadedRef.current) {
      try {
        setCheckoutEvents(await fetchCheckoutWindow());
      } catch (err) {
        markCheckoutEventsLoaded(false);
        logError('[DataContext] Checkout activity re-hydration failed:', err);
      }
    }
  }, [
    mergeMaintenanceIntoInventory,
    fetchCheckoutWindow,
    markMaintenanceLoaded,
    markCheckoutEventsLoaded,
  ]);

  // =============================================================================
  // LAZY-LOAD FUNCTIONS — fetch on first access, then cache
  // =============================================================================

  // In-flight promise per lazy table: dedupes concurrent callers, and — unlike
  // the previous `loaded = true` latch on error — a FAILED load stays unloaded
  // so the next view mount retries instead of caching an empty list forever.
  const lazyLoadsRef = useRef({});

  const lazyLoad = useCallback((key, fetcher, onData, setLoaded) => {
    const inflight = lazyLoadsRef.current[key];
    if (inflight) return inflight;

    // Clear the failure flag as the attempt STARTS so a retry drops the
    // error banner back to the normal loading state while it runs
    setLazyErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));

    const promise = (async () => {
      try {
        const data = await fetcher();
        onData(data || []);
        setLoaded(true);
        log(`[DataContext] Lazy-loaded ${key}:`, data?.length || 0);
      } catch (err) {
        setLazyErrors((prev) => ({ ...prev, [key]: true }));
        logError(`[DataContext] Failed to lazy-load ${key} (will retry on next access):`, err);
      } finally {
        lazyLoadsRef.current[key] = null;
      }
    })();

    lazyLoadsRef.current[key] = promise;
    return promise;
  }, []);

  const ensureClients = useCallback(async () => {
    if (clientsLoaded) return;
    return lazyLoad('clients', () => clientsService.getAll(), setClients, setClientsLoaded);
  }, [clientsLoaded, lazyLoad]);

  // Fetch one client directly — callers that need a client mid-flow (e.g.
  // resolving the borrower email during check-in) can't rely on the lazy
  // clients list being loaded, and a state update wouldn't reach their
  // in-flight closure anyway.
  const getClientById = useCallback(async (id) => {
    if (!id) return null;
    try {
      return await clientsService.getById(id);
    } catch (err) {
      logError('Failed to fetch client:', err);
      return null;
    }
  }, []);

  const ensureAuditLog = useCallback(async () => {
    if (auditLogLoaded) return;
    return lazyLoad(
      'auditLog',
      () => auditLogService.getAll({ limit: 100 }),
      setAuditLog,
      setAuditLogLoaded,
    );
  }, [auditLogLoaded, lazyLoad]);

  const ensurePackLists = useCallback(async () => {
    if (packListsLoaded) return;
    return lazyLoad('packLists', () => packListsService.getAll(), setPackLists, setPackListsLoaded);
  }, [packListsLoaded, lazyLoad]);

  // Full maintenance history for the Reports views. Tier 2 merges only
  // PENDING records (dashboard needs), so cost/vendor stats computed from
  // items would be blind to completed work — and would mutate as ItemDetail
  // visits merged per-item history in.
  const ensureMaintenance = useCallback(async () => {
    if (maintenanceLoaded) return;
    return lazyLoad(
      'maintenance',
      () => maintenanceService.getAll(),
      mergeMaintenanceIntoInventory,
      markMaintenanceLoaded,
    );
  }, [maintenanceLoaded, lazyLoad, mergeMaintenanceIntoInventory, markMaintenanceLoaded]);

  // Trailing year of checkout_history events for activity charts. Merge-by-id
  // instead of replacing: checkOutItem/checkInItem append events created this
  // session, and a snapshot fetched before one of those commits must not
  // clobber it out of the cache.
  const ensureCheckoutActivity = useCallback(async () => {
    if (checkoutEventsLoaded) return;
    return lazyLoad(
      'checkoutActivity',
      fetchCheckoutWindow,
      (events) => {
        setCheckoutEvents((prev) => {
          if (!prev.length) return events;
          const serverIds = new Set(events.map((e) => e.id));
          const localOnly = prev.filter((e) => !serverIds.has(e.id));
          return [...events, ...localOnly];
        });
      },
      markCheckoutEventsLoaded,
    );
  }, [checkoutEventsLoaded, lazyLoad, fetchCheckoutWindow, markCheckoutEventsLoaded]);

  // =============================================================================
  // INITIAL DATA LOAD
  // =============================================================================

  useEffect(() => {
    loadData();
  }, [loadData]);

  // =============================================================================
  // INCREMENTAL REFRESH — detect stale data and merge only changed rows
  // =============================================================================

  const refreshStaleData = useCallback(async () => {
    if (!lastLoadedAt) return;

    try {
      const freshness = await freshnessService.check();
      const staleTables = [];

      if (freshness.inventory && freshness.inventory > lastLoadedAt) {
        staleTables.push('inventory');
      }
      if (freshness.reservations && freshness.reservations > lastLoadedAt) {
        staleTables.push('reservations');
      }
      if (clientsLoaded && freshness.clients && freshness.clients > lastLoadedAt) {
        staleTables.push('clients');
      }
      if (freshness.packages && freshness.packages > lastLoadedAt) {
        staleTables.push('packages');
      }
      if (packListsLoaded && freshness.pack_lists && freshness.pack_lists > lastLoadedAt) {
        staleTables.push('pack_lists');
      }

      // NOTE: no early return when staleTables is empty — deletions don't bump
      // MAX(updated_at), so the id-based prune below must always run
      log('[DataContext] Stale tables detected:', staleTables);

      // Fetch changed rows in parallel. ID sets are always fetched (cheap,
      // id-only) because deletions don't bump MAX(updated_at) — without them,
      // deleted items and cancelled reservations would linger as phantoms
      // until a full reload.
      const [
        updatedItems,
        updatedReservations,
        updatedClients,
        updatedPackages,
        updatedPackLists,
        currentItemIds,
        currentReservationIds,
      ] = await Promise.all([
        staleTables.includes('inventory') ? inventoryService.getSince(lastLoadedAt) : null,
        staleTables.includes('reservations') ? reservationsService.getSince(lastLoadedAt) : null,
        staleTables.includes('clients') ? clientsService.getAll() : null,
        staleTables.includes('packages') ? packagesService.getAll() : null,
        staleTables.includes('pack_lists') ? packListsService.getAll() : null,
        inventoryService.getIds(),
        reservationsService.getIds(),
      ]);

      // Merge updated inventory items, drop deleted ones, and prune
      // reservations that no longer exist server-side
      setInventory((prev) => {
        let next = prev.filter((item) => currentItemIds.has(item.id));

        if (updatedItems && updatedItems.length > 0) {
          const updatedMap = new Map(updatedItems.map((i) => [i.id, i]));
          next = next.map((item) =>
            updatedMap.has(item.id) ? { ...item, ...updatedMap.get(item.id) } : item,
          );
          // Add any new items not already in state
          const existingIds = new Set(next.map((i) => i.id));
          const newItems = updatedItems.filter((i) => !existingIds.has(i.id));
          if (newItems.length > 0) next = [...next, ...newItems];
        }

        return next.map((item) => {
          const reservations = item.reservations || [];
          const pruned = reservations.filter((r) => currentReservationIds.has(r.id));
          return pruned.length === reservations.length ? item : { ...item, reservations: pruned };
        });
      });

      // Re-merge reservations into inventory if reservations changed
      if (updatedReservations && updatedReservations.length > 0) {
        const reservationsByItemId = {};
        updatedReservations.forEach((res) => {
          if (!reservationsByItemId[res.itemId]) reservationsByItemId[res.itemId] = [];
          reservationsByItemId[res.itemId].push(res);
        });
        setInventory((prev) =>
          reconcileReservedStatuses(
            prev.map((item) =>
              reservationsByItemId[item.id]
                ? { ...item, reservations: reservationsByItemId[item.id] }
                : item,
            ),
          ),
        );
      }

      // Replace full arrays for other stale tables (these are small)
      if (updatedClients) setClients(updatedClients);
      if (updatedPackages) setPackages(updatedPackages);
      if (updatedPackLists) setPackLists(updatedPackLists);

      // Server-side watermark — never trust the local clock
      setLastLoadedAt(freshness.server_time || new Date().toISOString());
      log('[DataContext] Incremental refresh complete');
    } catch (err) {
      logError('[DataContext] Freshness check failed:', err);
      // Non-fatal — stale data is better than no data
    }
  }, [lastLoadedAt, clientsLoaded, packListsLoaded]);

  // =============================================================================
  // AUTOMATIC STALENESS POLLING
  // Check for stale data every 5 minutes while the tab is visible,
  // and immediately when the tab regains focus.
  // =============================================================================

  useEffect(() => {
    if (!dataLoaded) return;

    const STALE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshStaleData();
      }
    }, STALE_CHECK_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStaleData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dataLoaded, refreshStaleData]);

  // =============================================================================
  // AUDIT LOG HELPER
  // =============================================================================

  const addAuditLog = useCallback(async (entry) => {
    const newEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    try {
      await auditLogService.create(newEntry);
    } catch (err) {
      // No local append on failure — the view used to show phantom entries
      // that existed nowhere but this session
      logError('Failed to create audit log:', err);
      return;
    }

    setAuditLog((prev) => [newEntry, ...prev]);
  }, []);

  // =============================================================================
  // INVENTORY OPERATIONS
  // =============================================================================

  const updateItem = useCallback(async (id, updates) => {
    try {
      await inventoryService.update(id, updates);
    } catch (err) {
      logError('Failed to update item:', err);
      throw err;
    }

    setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const createItem = useCallback(async (item) => {
    let newItem = item;

    try {
      newItem = await inventoryService.create(item);
    } catch (err) {
      logError('Failed to create item:', err);
      throw err;
    }

    setInventory((prev) => [...prev, newItem]);
    return newItem;
  }, []);

  const deleteItem = useCallback(async (id) => {
    // Delete the DB record FIRST — destroying storage images before a delete
    // that then fails would leave a live item with permanently broken images
    try {
      await inventoryService.delete(id);
    } catch (err) {
      logError('Failed to delete item:', err);
      throw err;
    }

    // Clean up storage images after the record is gone (non-fatal: an orphaned
    // image wastes a little storage, which beats a live item with no image)
    try {
      const { storageService } = await import('../lib/storage.js');
      await storageService.deleteItemImages(id);
    } catch (imgErr) {
      logError('Failed to clean up item images from storage:', imgErr);
    }

    setInventory((prev) => prev.filter((item) => item.id !== id));

    // Clean up stale item references in packages (DB cascades, but local state needs sync)
    setPackages((prev) =>
      prev.map((pkg) => {
        if (!pkg.items?.includes(id)) return pkg;
        return { ...pkg, items: pkg.items.filter((itemId) => itemId !== id) };
      }),
    );

    // Clean up stale item references in pack lists
    setPackLists((prev) =>
      prev.map((pl) => {
        const hasItem = pl.items?.some((i) => i.id === id);
        const hasPacked = pl.packedItems?.includes(id);
        if (!hasItem && !hasPacked) return pl;
        return {
          ...pl,
          items: pl.items?.filter((i) => i.id !== id) || [],
          packedItems: pl.packedItems?.filter((itemId) => itemId !== id) || [],
        };
      }),
    );
  }, []);

  // Fetch item with all related data (notes, reminders, reservations, maintenance)
  const getItemWithDetails = useCallback(
    async (id) => {
      try {
        const itemWithDetails = await inventoryService.getByIdWithDetails(id);
        return itemWithDetails;
      } catch (err) {
        logError('Failed to fetch item details:', err);
        return inventory.find((item) => item.id === id) || null;
      }
    },
    [inventory],
  );

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
        deleted: false,
      };
      const result = await itemNotesService.create(dbNote);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save note:', err);
      return null;
    }
  }, []);

  // Returns true/false so the handler can roll back the optimistic
  // soft-delete — swallowing the failure resurrected "deleted" notes on
  // reload while the audit log claimed they were removed
  const deleteItemNote = useCallback(async (noteId) => {
    try {
      await itemNotesService.softDelete(noteId);
      return true;
    } catch (err) {
      logError('Failed to delete note:', err);
      return false;
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
        created_by_name: reminder.createdBy || 'Unknown',
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
      return true;
    } catch (err) {
      logError('Failed to update reminder:', err);
      return false;
    }
  }, []);

  const deleteItemReminder = useCallback(async (reminderId) => {
    try {
      await itemRemindersService.delete(reminderId);
      return true;
    } catch (err) {
      logError('Failed to delete reminder:', err);
      return false;
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
        vendor_contact: record.vendorContact || null,
        cost: record.cost || 0,
        scheduled_date: record.date || record.scheduledDate || null,
        completed_date: record.completedDate || null,
        status: record.status || 'completed',
        notes: record.notes || '',
        warranty_work: record.warrantyWork || false,
        created_by_name: record.performedBy || 'Unknown',
      };
      const result = await maintenanceService.create(dbRecord);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save maintenance record:', err);
      throw err; // Callers rely on this to roll back optimistic updates
    }
  }, []);

  const updateMaintenance = useCallback(async (recordId, updates) => {
    try {
      await maintenanceService.update(recordId, updates);
    } catch (err) {
      logError('Failed to update maintenance record:', err);
      throw err; // Callers rely on this to roll back optimistic updates
    }
  }, []);

  const deleteMaintenance = useCallback(async (recordId) => {
    try {
      await maintenanceService.delete(recordId);
    } catch (err) {
      logError('Failed to delete maintenance record:', err);
      throw err;
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
        group_id: reservation.groupId || null,
        created_by_id: reservation.createdById || null,
        created_by_name: reservation.createdByName || null,
        project: reservation.project,
        project_type: reservation.projectType || 'Other',
        start_date: reservation.start,
        end_date: reservation.end,
        status: reservation.status || 'confirmed',
        contact_name: reservation.user,
        contact_phone: reservation.contactPhone || '',
        contact_email: reservation.contactEmail || '',
        location: reservation.location || '',
        notes: reservation.notes || [], // Supabase handles JSONB directly
      };
      const result = await reservationsService.create(dbReservation);
      return result;
    } catch (err) {
      logError('Failed to create reservation:', err);
      throw err;
    }
  }, []);

  // Map camelCase reservation-form fields to DB columns. '' clientId means
  // "no client" and must become NULL — an empty string would violate the FK.
  const mapReservationUpdates = (updates) => {
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
    if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId || null;
    // Notes are JSONB on the reservation row. This mapping was missing, so
    // the note handlers' claim that reservation notes "persist through the
    // reservation update path" was false — every note vanished on reload.
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    return dbUpdates;
  };

  const updateReservation = useCallback(async (reservationId, updates) => {
    try {
      await reservationsService.update(reservationId, mapReservationUpdates(updates));
    } catch (err) {
      logError('Failed to update reservation:', err);
      throw err;
    }
  }, []);

  // Update every row of a multi-item reservation in one statement
  const updateReservationRows = useCallback(async (reservationIds, updates) => {
    try {
      await reservationsService.updateMany(reservationIds, mapReservationUpdates(updates));
    } catch (err) {
      logError('Failed to update reservation group:', err);
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

  // Soft-cancel: rows keep their history with status='cancelled'; every load
  // path excludes them, and getIds pruning removes them on other devices
  const cancelReservations = useCallback(async (reservationIds) => {
    try {
      await reservationsService.cancelMany(reservationIds);
    } catch (err) {
      logError('Failed to cancel reservations:', err);
      throw err;
    }
  }, []);

  // =============================================================================
  // CHECK IN/OUT OPERATIONS
  // =============================================================================

  const checkOutItem = useCallback(async (itemId, checkoutData) => {
    try {
      const { item: serverItem, historyEvent } = await inventoryService.checkOut(
        itemId,
        checkoutData,
      );

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: 'checked-out',
                checkedOutTo: checkoutData.userName,
                checkedOutToUserId: checkoutData.userId,
                checkedOutDate: getTodayISO(),
                dueBack: checkoutData.dueBack,
                checkoutProject: checkoutData.project,
                checkoutClientId: checkoutData.clientId,
                // Mirror the server-side increment_checkout_count RPC — the
                // list copy used to lag the detail copy until the next poll
                checkoutCount: (item.checkoutCount || 0) + 1,
              }
            : item,
        ),
      );

      // Mirror the real history row into the cached activity window so the
      // Activity report reflects this session's events without a reload.
      // Safe pre-load too: ensureCheckoutActivity merges by id.
      if (historyEvent) {
        setCheckoutEvents((prev) => [...prev, historyEvent]);
      }

      return serverItem;
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
        damageDescription,
        returnStatus,
      } = checkinData;

      // Use the dedicated checkIn service method. returnStatus lets the
      // caller return the item to 'reserved' when a confirmed reservation
      // covers today (damage still wins).
      const { item: serverItem, historyEvent } = await inventoryService.checkIn(itemId, {
        userId: userId,
        userName: returnedBy,
        notes: returnNotes || conditionNotes,
        condition: condition,
        damageReported: !!damageReported,
        returnStatus,
      });

      // Determine new status based on damage
      const newStatus = damageReported ? 'needs-attention' : returnStatus || 'available';

      // Update local state
      setInventory((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: newStatus,
                condition: condition,
                checkedOutTo: null,
                checkedOutToUserId: null,
                checkedOutDate: null,
                dueBack: null,
                checkoutProject: null,
                checkoutClientId: null,
              }
            : item,
        ),
      );

      // Mirror the real history row into the cached activity window (see
      // checkOutItem — same contract).
      if (historyEvent) {
        setCheckoutEvents((prev) => [...prev, historyEvent]);
      }

      // If damage reported, add a note — and mirror it into state so the
      // "⚠️ Damage reported" entry (and the notes badge) shows without a
      // re-navigation. Only when the item's notes are already hydrated:
      // an undefined list means the next detail visit fetches the complete
      // set, damage note included.
      if (damageReported && damageDescription) {
        try {
          const row = await itemNotesService.create({
            item_id: itemId,
            user_name: returnedBy || 'System',
            text: `⚠️ Damage reported: ${damageDescription}`,
          });
          const uiNote = {
            id: row?.id,
            user: returnedBy || 'System',
            date: getTodayISO(),
            text: `⚠️ Damage reported: ${damageDescription}`,
            replies: [],
            deleted: false,
          };
          if (uiNote.id) {
            setInventory((prev) =>
              prev.map((item) =>
                item.id === itemId && item.notes !== undefined
                  ? { ...item, notes: [...item.notes, uiNote] }
                  : item,
              ),
            );
          }
        } catch (noteErr) {
          logError('Failed to add damage note:', noteErr);
        }
      }

      return serverItem;
    } catch (err) {
      logError('Failed to check in item:', err);
      throw err;
    }
  }, []);

  // =============================================================================
  // PACKAGES OPERATIONS
  // =============================================================================

  const createPackage = useCallback(async (pkg) => {
    let newPackage = pkg;

    try {
      newPackage = await packagesService.create(pkg);
    } catch (err) {
      logError('Failed to create package:', err);
      throw err;
    }

    setPackages((prev) => [...prev, newPackage]);
    return newPackage;
  }, []);

  const updatePackage = useCallback(async (id, updates) => {
    try {
      await packagesService.update(id, updates);
    } catch (err) {
      logError('Failed to update package:', err);
      throw err;
    }

    setPackages((prev) => prev.map((pkg) => (pkg.id === id ? { ...pkg, ...updates } : pkg)));
  }, []);

  const deletePackage = useCallback(async (id) => {
    try {
      await packagesService.delete(id);
    } catch (err) {
      logError('Failed to delete package:', err);
      throw err;
    }

    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));

    // Clean up stale package references in pack lists
    setPackLists((prev) =>
      prev.map((pl) => {
        if (!pl.packages?.includes(id)) return pl;
        return { ...pl, packages: pl.packages.filter((pkgId) => pkgId !== id) };
      }),
    );
  }, []);

  // =============================================================================
  // PACKAGE NOTES OPERATIONS
  // =============================================================================

  // getAll() doesn't join notes (only getById does), so packages start with
  // notes === undefined; the detail view calls this once to hydrate them.
  const loadPackageNotes = useCallback(async (packageId) => {
    try {
      const notes = await packageNotesService.getByPackageId(packageId);
      setPackages((prev) =>
        prev.map((pkg) => {
          if (pkg.id !== packageId) return pkg;
          // MERGE, never replace — same in-flight race as loadClientNotes:
          // an optimistic note added before this snapshot lands must survive
          const serverIds = new Set(notes.map((n) => n.id));
          const localOnly = (pkg.notes || []).filter((n) => !serverIds.has(n.id));
          return { ...pkg, notes: [...notes, ...localOnly] };
        }),
      );
      return notes;
    } catch (err) {
      logError('Failed to load package notes:', err);
      return [];
    }
  }, []);

  const addPackageNote = useCallback(async (packageId, note) => {
    try {
      const dbNote = {
        // Don't pass id - let DB generate UUID
        package_id: packageId,
        user_name: note.user,
        text: note.text,
        parent_id: note.parentId || null,
        deleted: false,
      };
      const result = await packageNotesService.create(dbNote);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save package note:', err);
      return null;
    }
  }, []);

  const deletePackageNote = useCallback(async (noteId) => {
    try {
      await packageNotesService.softDelete(noteId);
      return true;
    } catch (err) {
      logError('Failed to delete package note:', err);
      return false;
    }
  }, []);

  // =============================================================================
  // PACK LISTS OPERATIONS
  // =============================================================================

  const createPackList = useCallback(async (packList) => {
    let newPackList = packList;

    try {
      newPackList = await packListsService.create(packList);
    } catch (err) {
      logError('Failed to create pack list:', err);
      throw err;
    }

    setPackLists((prev) => [...prev, newPackList]);
    return newPackList;
  }, []);

  const updatePackList = useCallback(async (id, updates) => {
    try {
      await packListsService.update(id, updates);
    } catch (err) {
      logError('Failed to update pack list:', err);
      throw err;
    }

    setPackLists((prev) => prev.map((pl) => (pl.id === id ? { ...pl, ...updates } : pl)));
  }, []);

  const deletePackList = useCallback(async (id) => {
    try {
      await packListsService.delete(id);
    } catch (err) {
      logError('Failed to delete pack list:', err);
      throw err;
    }

    setPackLists((prev) => prev.filter((pl) => pl.id !== id));
  }, []);

  // Toggle a single item's packed state — updates one row instead of
  // rewriting the whole child table, so rapid consecutive scans can't
  // clobber each other
  const togglePackListItemPacked = useCallback(async (listId, itemId, isPacked) => {
    try {
      await packListsService.toggleItemPacked(listId, itemId, isPacked);
    } catch (err) {
      logError('Failed to toggle packed state:', err);
      throw err;
    }
  }, []);

  // Same single-row semantics for packages on the list
  const togglePackListPackagePacked = useCallback(async (listId, packageId, isPacked) => {
    try {
      await packListsService.togglePackagePacked(listId, packageId, isPacked);
    } catch (err) {
      logError('Failed to toggle package packed state:', err);
      throw err;
    }
  }, []);

  // =============================================================================
  // CLIENTS OPERATIONS
  // =============================================================================

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

    setClients((prev) => [...prev, newClient]);
    return newClient;
  }, []);

  const updateClient = useCallback(async (id, updates) => {
    try {
      await clientsService.update(id, updates);
    } catch (err) {
      logError('Failed to update client:', err);
      throw err;
    }

    setClients((prev) =>
      prev.map((client) => (client.id === id ? { ...client, ...updates } : client)),
    );
  }, []);

  const deleteClient = useCallback(async (id) => {
    try {
      await clientsService.delete(id);
    } catch (err) {
      logError('Failed to delete client:', err);
      throw err;
    }

    setClients((prev) => prev.filter((client) => client.id !== id));
  }, []);

  // =============================================================================
  // CLIENT NOTES OPERATIONS
  // =============================================================================

  // getAll() doesn't join notes, so clients start with clientNotes ===
  // undefined; the detail view calls this once to hydrate them.
  const loadClientNotes = useCallback(async (clientId) => {
    try {
      const notes = await clientNotesService.getByClientId(clientId);
      setClients((prev) =>
        prev.map((c) => {
          if (c.id !== clientId) return c;
          // MERGE, never replace: a note added optimistically while this
          // fetch was in flight is not in the (older) server snapshot —
          // replacing wholesale made it vanish from the screen even though
          // the insert succeeded (deterministic on slow networks; CI caught
          // it). Server rows win on id collision; local-only rows survive.
          const serverIds = new Set(notes.map((n) => n.id));
          const localOnly = (c.clientNotes || []).filter((n) => !serverIds.has(n.id));
          return { ...c, clientNotes: [...notes, ...localOnly] };
        }),
      );
      return notes;
    } catch (err) {
      logError('Failed to load client notes:', err);
      return [];
    }
  }, []);

  const addClientNote = useCallback(async (clientId, note) => {
    try {
      const dbNote = {
        // Don't pass id - let DB generate UUID
        client_id: clientId,
        user_name: note.user,
        text: note.text,
        parent_id: note.parentId || null,
        deleted: false,
      };
      const result = await clientNotesService.create(dbNote);
      return result; // Returns record with real UUID
    } catch (err) {
      logError('Failed to save client note:', err);
      return null;
    }
  }, []);

  const deleteClientNote = useCallback(async (noteId) => {
    try {
      await clientNotesService.softDelete(noteId);
      return true;
    } catch (err) {
      logError('Failed to delete client note:', err);
      return false;
    }
  }, []);

  // =============================================================================
  // CATEGORIES OPERATIONS
  // =============================================================================

  const updateCategories = useCallback(
    async (newCategories, newSettings = {}, renames = {}) => {
      const prevCategories = categories;
      const prevSettings = categorySettings;
      setCategories(newCategories);
      setCategorySettings(newSettings);
      try {
        await categoriesService.syncAll(newCategories, newSettings, renames);
      } catch (err) {
        logError('Failed to save categories:', err);
        setCategories(prevCategories);
        setCategorySettings(prevSettings);
        throw err;
      }
    },
    [categories, categorySettings],
  );

  // =============================================================================
  // SPECS OPERATIONS
  // =============================================================================

  const updateSpecs = useCallback(
    async (newSpecs) => {
      const prevSpecs = specs;
      setSpecs(newSpecs);
      try {
        // Upsert specs for each category
        const promises = Object.entries(newSpecs).map(([categoryName, fields]) =>
          specsService.upsert(categoryName, fields),
        );
        await Promise.all(promises);
      } catch (err) {
        logError('Failed to save specs:', err);
        setSpecs(prevSpecs);
        throw err;
      }
    },
    [specs],
  );

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

  const sendCheckoutEmail = useCallback(
    async ({ borrowerEmail, borrowerName, item, checkoutDate, dueDate, project, companyName }) => {
      try {
        return await emailService.sendCheckoutConfirmation({
          borrowerEmail,
          borrowerName,
          item,
          checkoutDate,
          dueDate,
          project,
          companyName,
        });
      } catch (err) {
        logError('Failed to send checkout email:', err);
        return { success: false, error: err.message };
      }
    },
    [],
  );

  const sendCheckinEmail = useCallback(
    async ({ borrowerEmail, borrowerName, item, returnDate, companyName }) => {
      try {
        return await emailService.sendCheckinConfirmation({
          borrowerEmail,
          borrowerName,
          item,
          returnDate,
          companyName,
        });
      } catch (err) {
        logError('Failed to send checkin email:', err);
        return { success: false, error: err.message };
      }
    },
    [],
  );

  const sendReservationEmail = useCallback(
    async ({ userEmail, userName, item, reservation, companyName }) => {
      try {
        return await emailService.sendReservationConfirmation({
          userEmail,
          userName,
          item,
          reservation,
          companyName,
        });
      } catch (err) {
        logError('Failed to send reservation email:', err);
        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Damage reported at check-in → admins (each admin's own toggle is applied
  // server-side)
  const sendDamageReportEmail = useCallback(async (args) => {
    try {
      return await emailService.sendDamageReport(args);
    } catch (err) {
      logError('Failed to send damage report:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const sendTestEmail = useCallback(async (args) => {
    try {
      return await emailService.sendTestEmail(args);
    } catch (err) {
      logError('Failed to send test email:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const getNotificationLog = useCallback(async (opts) => notificationLogService.list(opts), []);

  // =============================================================================
  // LOCAL STATE PATCH OPERATIONS
  // Controlled API for optimistic UI updates. These only update local state —
  // callers are responsible for persisting via service calls or DataContext ops.
  // =============================================================================

  // -- Inventory --
  const patchInventoryItem = useCallback((id, updates) => {
    setInventory((prev) => updateById(prev, id, updates));
  }, []);

  const addInventoryItems = useCallback((items) => {
    const arr = Array.isArray(items) ? items : [items];
    setInventory((prev) => [...prev, ...arr]);
  }, []);

  const removeInventoryItems = useCallback((ids) => {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    setInventory((prev) => prev.filter((item) => !idSet.has(item.id)));
  }, []);

  const mapInventory = useCallback((mapFn) => {
    setInventory((prev) => prev.map(mapFn));
  }, []);

  // -- Packages --
  const patchPackage = useCallback((id, updates) => {
    setPackages((prev) => updateById(prev, id, updates));
  }, []);

  const addLocalPackage = useCallback((pkg) => {
    setPackages((prev) => [...prev, pkg]);
  }, []);

  const removeLocalPackage = useCallback((id) => {
    setPackages((prev) => removeById(prev, id));
  }, []);

  // -- Pack Lists --
  const patchPackList = useCallback((id, updates) => {
    setPackLists((prev) => updateById(prev, id, updates));
  }, []);

  const addLocalPackList = useCallback((list) => {
    setPackLists((prev) => [...prev, list]);
  }, []);

  const removeLocalPackList = useCallback((id) => {
    setPackLists((prev) => removeById(prev, id));
  }, []);

  // -- Clients --
  const patchClient = useCallback((id, updates) => {
    setClients((prev) => updateById(prev, id, updates));
  }, []);

  // -- Users --
  const patchUser = useCallback((id, updates) => {
    setUsers((prev) => updateById(prev, id, updates));
  }, []);

  const addLocalUser = useCallback((user) => {
    setUsers((prev) => [...prev, user]);
  }, []);

  const removeLocalUser = useCallback((id) => {
    setUsers((prev) => removeById(prev, id));
  }, []);

  // -- Roles --
  const patchRole = useCallback((id, updates) => {
    setRoles((prev) => updateById(prev, id, updates));
  }, []);

  const addLocalRole = useCallback((role) => {
    setRoles((prev) => [...prev, role]);
  }, []);

  const removeLocalRole = useCallback((id) => {
    setRoles((prev) => removeById(prev, id));
  }, []);

  // -- Locations --
  const replaceLocations = useCallback((newLocations) => {
    setLocations(newLocations);
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value = useMemo(
    () => ({
      // State
      loading,
      error,
      dataLoaded,
      tier2Loaded,

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
      auditLogLoaded,
      packListsLoaded,
      clientsLoaded,
      maintenanceLoaded,
      checkoutEvents,
      checkoutEventsLoaded,
      lazyErrors,

      // Refresh functions
      refreshData: loadData,

      // Lazy-load functions — call these before accessing the data
      ensureClients,
      getClientById,
      ensureAuditLog,
      ensurePackLists,
      ensureMaintenance,
      ensureCheckoutActivity,

      // Local State Patch Operations (optimistic UI updates)
      patchInventoryItem,
      addInventoryItems,
      removeInventoryItems,
      mapInventory,
      patchPackage,
      addLocalPackage,
      removeLocalPackage,
      patchPackList,
      addLocalPackList,
      removeLocalPackList,
      patchClient,
      patchUser,
      addLocalUser,
      removeLocalUser,
      patchRole,
      addLocalRole,
      removeLocalRole,
      replaceLocations,

      // Inventory Operations
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
      updateReservationRows,
      deleteReservation,
      cancelReservations,

      // Check In/Out Operations
      checkOutItem,
      checkInItem,

      // Package Operations
      createPackage,
      updatePackage,
      deletePackage,
      loadPackageNotes,
      addPackageNote,
      deletePackageNote,

      // Pack List Operations
      createPackList,
      updatePackList,
      deletePackList,
      togglePackListItemPacked,
      togglePackListPackagePacked,

      // Client Operations
      createClient,
      updateClient,
      deleteClient,
      loadClientNotes,
      addClientNote,
      deleteClientNote,

      // Notification Operations
      saveNotificationPreferences,
      getNotificationPreferences,
      sendCheckoutEmail,
      sendCheckinEmail,
      sendReservationEmail,
      sendDamageReportEmail,
      sendTestEmail,
      getNotificationLog,

      // Other Operations
      updateCategories,
      updateSpecs,
      addAuditLog,
    }),
    [
      loading,
      error,
      dataLoaded,
      tier2Loaded,
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
      auditLogLoaded,
      packListsLoaded,
      clientsLoaded,
      maintenanceLoaded,
      checkoutEvents,
      checkoutEventsLoaded,
      lazyErrors,
      loadData,
      ensureClients,
      getClientById,
      ensureAuditLog,
      ensurePackLists,
      ensureMaintenance,
      ensureCheckoutActivity,
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
      updateReservationRows,
      deleteReservation,
      cancelReservations,
      checkOutItem,
      checkInItem,
      createPackage,
      updatePackage,
      deletePackage,
      loadPackageNotes,
      addPackageNote,
      deletePackageNote,
      createPackList,
      updatePackList,
      deletePackList,
      togglePackListItemPacked,
      togglePackListPackagePacked,
      createClient,
      updateClient,
      deleteClient,
      loadClientNotes,
      addClientNote,
      deleteClientNote,
      saveNotificationPreferences,
      getNotificationPreferences,
      sendCheckoutEmail,
      sendCheckinEmail,
      sendReservationEmail,
      sendDamageReportEmail,
      sendTestEmail,
      getNotificationLog,
      updateCategories,
      updateSpecs,
      addAuditLog,
      patchInventoryItem,
      addInventoryItems,
      removeInventoryItems,
      mapInventory,
      patchPackage,
      addLocalPackage,
      removeLocalPackage,
      patchPackList,
      addLocalPackList,
      removeLocalPackList,
      patchClient,
      patchUser,
      addLocalUser,
      removeLocalUser,
      patchRole,
      addLocalRole,
      removeLocalRole,
      replaceLocations,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
