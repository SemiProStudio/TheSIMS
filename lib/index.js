// =============================================================================
// SIMS Library Exports
// =============================================================================

// Supabase client
export { supabase, auth, getSupabase } from './supabase.js';

// Storage service
export { storageService, isDataUrl, isStorageUrl, getStoragePathFromUrl, getThumbnailUrl } from './storage.js';

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

// Context providers
export { DataProvider, useData } from './DataContext.jsx';
export { AuthProvider, useAuth } from './AuthContext.jsx';
