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

// =============================================================================
// Context Hooks (preferred for components that need shared state)
// These subscribe to state via React Context instead of creating local state.
// Use these when you want changes to be isolated from the App.jsx render cycle.
// =============================================================================
export { useNavigationContext } from '../contexts/NavigationContext.jsx';
export { useFilterContext } from '../contexts/FilterContext.jsx';
export { useModalContext } from '../contexts/ModalContext.jsx';
export { useSidebarContext } from '../contexts/SidebarContext.jsx';
