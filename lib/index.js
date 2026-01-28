// =============================================================================
// SIMS Library Exports
// =============================================================================

// Supabase client
export { supabase, auth, getSupabase } from './supabase.js';

// Storage service
export { storageService, isDataUrl, isStorageUrl, getStoragePathFromUrl } from './storage.js';

// Services
export {
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
  dashboardService,
  notificationPreferencesService,
  notificationLogService,
  emailService
} from './services.js';

// Hooks
export {
  useData as useDataFetch,
  useAuth as useAuthHook,
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
} from './hooks.js';

// Context providers
export { DataProvider, useData } from './DataContext.jsx';
export { AuthProvider, useAuth } from './AuthContext.jsx';
