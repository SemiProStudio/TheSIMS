// =============================================================================
// Custom Hooks Index
// Exports all custom hooks for easy importing
// =============================================================================

// Navigation
export { useNavigation } from './useNavigation.js';

// Filters and Search
export { useFilters } from './useFilters.js';

// Modal Management
export { useModals } from './useModals.js';

// Sidebar State
export { useSidebar } from './useSidebar.js';

// PWA Support
export { usePWA, InstallStatus } from './usePWA.js';

// Form Handling
export { useForm, createValidator } from './useForm.js';

// Inventory Actions (CRUD, bulk operations)
export { useInventoryActions } from './useInventoryActions.js';

// Pagination
export { usePagination } from './usePagination.js';

// Debounce
export { useDebounce } from './useDebounce.js';

// Screen Reader Announcements (existing)
export { 
  useAnnounce,
  useAnnounceViewChange,
  useAnnounceLoading,
  useAnnounceModal,
  useAnnounceError,
} from './useAnnounce.js';
