// ============================================================================
// SIMS Main Application Component
// ============================================================================

import React, { useState, useCallback, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { VIEWS, MODALS, STATUS, EMPTY_ITEM_FORM, EMPTY_RESERVATION_FORM, DEFAULT_SPECS, CATEGORIES as DEFAULT_CATEGORIES, DEFAULT_CATEGORY_SETTINGS, DEFAULT_LOCATIONS, DEFAULT_LAYOUT_PREFS, DEFAULT_ROLES } from './constants.js';
import { colors, spacing } from './theme.js';
import { generateItemCode, generateId, getTodayISO, updateById, removeById, findById, addReplyToNote, markNoteDeleted, findNoteById, getNextDueDate } from './utils.js';
import { initialInventory, initialPackages, initialUsers, initialAuditLog, initialPackLists, initialKits, initialClients } from './data.js';
import { useTheme } from './ThemeContext.jsx';
import { PermissionsProvider, PermissionGate } from './PermissionsContext.jsx';
import { useAuth } from './lib/AuthContext.jsx';
import { useData } from './lib/DataContext.jsx';
import { SectionErrorBoundary } from './components/ErrorBoundary.jsx';
import { FullPageLoading, ContentLoading, ViewLoading, ModalLoading } from './components/Loading.jsx';

// Custom hooks for state management
import { useNavigation, useFilters, useModals, useSidebar, useInventoryActions } from './hooks/index.js';

// ============================================================================
// Core Components (always needed, loaded eagerly)
// ============================================================================
import Login from './Login.jsx';
import Sidebar from './Sidebar.jsx';
import Dashboard from './Dashboard.jsx';
import GearList from './GearList.jsx';
import ItemDetail from './ItemDetail.jsx';
import SearchView from './SearchView.jsx';
import { ConfirmDialog, SkipLink, VisuallyHidden } from './components/ui.jsx';

// ============================================================================
// Lazy-Loaded Views (loaded on demand when navigated to)
// ============================================================================
const LabelsView = lazy(() => import('./LabelsView.jsx'));
const PackagesView = lazy(() => import('./PackagesView.jsx'));
const PackListsView = lazy(() => import('./PackListsView.jsx'));
const ProfileModal = lazy(() => import('./ProfileModal.jsx'));
const ReservationDetail = lazy(() => import('./ReservationDetail.jsx'));
const ScheduleView = lazy(() => import('./ScheduleView.jsx'));
const NotificationSettings = lazy(() => import('./NotificationSettings.jsx'));
const LocationsManager = lazy(() => import('./LocationsManager.jsx'));
const LayoutCustomize = lazy(() => import('./LayoutCustomize.jsx'));
const ThemeSelector = lazy(() => import('./ThemeSelector.jsx'));
const ClientsView = lazy(() => import('./ClientsView.jsx'));
const RolesManager = lazy(() => import('./RolesManager.jsx'));
const ChangeLog = lazy(() => import('./ChangeLog.jsx'));

// Views from ./views directory
const PackagesList = lazy(() => import('./views/PackagesView.jsx').then(m => ({ default: m.PackagesList })));
const PackageDetail = lazy(() => import('./views/PackagesView.jsx').then(m => ({ default: m.PackageDetail })));
const AdminPanel = lazy(() => import('./views/AdminView.jsx').then(m => ({ default: m.AdminPanel })));
const UsersPanel = lazy(() => import('./views/UsersView.jsx').then(m => ({ default: m.UsersPanel })));
const ReportsPanel = lazy(() => import('./views/ReportsView.jsx').then(m => ({ default: m.ReportsPanel })));
const AuditLogPanel = lazy(() => import('./views/AuditLogView.jsx').then(m => ({ default: m.AuditLogPanel })));
const MaintenanceReportPanel = lazy(() => import('./views/MaintenanceReportView.jsx').then(m => ({ default: m.MaintenanceReportPanel })));
const InsuranceReportPanel = lazy(() => import('./views/InsuranceReportView.jsx').then(m => ({ default: m.InsuranceReportPanel })));
const ClientReportPanel = lazy(() => import('./views/ClientReportView.jsx').then(m => ({ default: m.ClientReportPanel })));

// ============================================================================
// Lazy-Loaded Modals (only loaded when opened)
// ============================================================================
const ItemModal = lazy(() => import('./modals/ItemModal.jsx').then(m => ({ default: m.ItemModal })));
const ReservationModal = lazy(() => import('./modals/ReservationModal.jsx').then(m => ({ default: m.ReservationModal })));
const QRModal = lazy(() => import('./modals/QRModal.jsx').then(m => ({ default: m.QRModal })));
const ExportModal = lazy(() => import('./modals/ExportModal.jsx').then(m => ({ default: m.ExportModal })));
const ImageSelectorModal = lazy(() => import('./modals/ImageSelectorModal.jsx').then(m => ({ default: m.ImageSelectorModal })));
const QRScannerModal = lazy(() => import('./modals/QRScannerModal.jsx').then(m => ({ default: m.QRScannerModal })));
const CSVImportModal = lazy(() => import('./modals/CSVImportModal.jsx').then(m => ({ default: m.CSVImportModal })));
const DatabaseExportModal = lazy(() => import('./modals/DatabaseExportModal.jsx').then(m => ({ default: m.DatabaseExportModal })));
const CheckOutModal = lazy(() => import('./modals/CheckOutModal.jsx').then(m => ({ default: m.CheckOutModal })));
const CheckInModal = lazy(() => import('./modals/CheckInModal.jsx').then(m => ({ default: m.CheckInModal })));
const MaintenanceModal = lazy(() => import('./modals/MaintenanceModal.jsx').then(m => ({ default: m.MaintenanceModal })));
const BulkStatusModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkStatusModal })));
const BulkLocationModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkLocationModal })));
const BulkCategoryModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkCategoryModal })));
const BulkDeleteModal = lazy(() => import('./modals/BulkModals.jsx').then(m => ({ default: m.BulkDeleteModal })));
const AddUserModal = lazy(() => import('./modals/AddUserModal.jsx').then(m => ({ default: m.AddUserModal })));

// Lazy-loaded Admin Pages
const ItemFormPage = lazy(() => import('./AdminPages.jsx').then(m => ({ default: m.ItemFormPage })));
const SpecsPage = lazy(() => import('./AdminPages.jsx').then(m => ({ default: m.SpecsPage })));
const CategoriesPage = lazy(() => import('./AdminPages.jsx').then(m => ({ default: m.CategoriesPage })));

export default function App() {
  // ============================================================================
  // Theme - for background and cursor
  // ============================================================================
  const { currentTheme } = useTheme();
  
  // ============================================================================
  // Auth from Context (used for Supabase mode)
  // ============================================================================
  const auth = useAuth();
  
  // ============================================================================
  // Data from Context (used for Supabase mode)
  // ============================================================================
  const dataContext = useData();
  
  // ============================================================================
  // Core Data State - synced from context
  // ============================================================================
  const [inventory, setInventory] = useState([]);
  const [packages, setPackages] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [specs, setSpecs] = useState(DEFAULT_SPECS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [categorySettings, setCategorySettings] = useState(DEFAULT_CATEGORY_SETTINGS);
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [auditLog, setAuditLog] = useState([]);
  const [changeLog, setChangeLog] = useState([]);
  const [packLists, setPackLists] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Sync with context data - always sync when data changes
  useEffect(() => {
    if (!dataContext.loading && dataContext.dataLoaded) {
      console.log('[App] Syncing data from context:', {
        inventory: dataContext.inventory?.length || 0,
        packages: dataContext.packages?.length || 0
      });
      setInventory(dataContext.inventory || []);
      setPackages(dataContext.packages || []);
      setClients(dataContext.clients || []);
      setUsers(dataContext.users || []);
      setPackLists(dataContext.packLists || []);
      setAuditLog(dataContext.auditLog || []);
      if (dataContext.roles?.length) setRoles(dataContext.roles);
      if (dataContext.locations?.length) setLocations(dataContext.locations);
      if (dataContext.categories?.length) setCategories(dataContext.categories);
      if (dataContext.specs && Object.keys(dataContext.specs).length) setSpecs(dataContext.specs);
    }
  }, [dataContext.loading, dataContext.dataLoaded, dataContext.inventory, dataContext.packages, dataContext.clients, dataContext.users, dataContext.packLists, dataContext.auditLog, dataContext.roles, dataContext.locations, dataContext.categories, dataContext.specs]);

  // ============================================================================
  // Auth State
  // ============================================================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  
  // ============================================================================
  // Custom Hooks - Navigation, Filters, Modals, Sidebar
  // ============================================================================
  const sidebar = useSidebar();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, toggleSidebarCollapsed } = sidebar;
  
  // Mobile user menu state
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  
  // Sync auth state with context and refresh data when authenticated
  useEffect(() => {
    if (auth.isAuthenticated && auth.userProfile) {
      console.log('[App] User authenticated:', auth.userProfile.email);
      setIsLoggedIn(true);
      setCurrentUser({
        ...auth.userProfile,
        layoutPrefs: auth.userProfile.layoutPrefs || DEFAULT_LAYOUT_PREFS,
      });
    } else if (!auth.loading && !auth.isAuthenticated) {
      setIsLoggedIn(false);
      setCurrentUser(null);
    }
  }, [auth.isAuthenticated, auth.userProfile, auth.loading]);

  // ============================================================================
  // Navigation State - Using custom hook
  // ============================================================================
  const navigation = useNavigation({ 
    isLoggedIn, 
    inventory, 
    packages 
  });
  
  // Destructure navigation for compatibility with existing code
  const {
    currentView, setCurrentView,
    selectedItem, setSelectedItem,
    selectedPackage, setSelectedPackage,
    selectedPackList, setSelectedPackList,
    selectedReservation, setSelectedReservation,
    selectedReservationItem, setSelectedReservationItem,
    itemBackContext, setItemBackContext,
  } = navigation;

  // ============================================================================
  // Filter State - Using custom hook
  // ============================================================================
  const filters = useFilters();
  
  // Destructure filters for compatibility with existing code
  const {
    searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    statusFilter, setStatusFilter,
    selectedCategories, setSelectedCategories,
    selectedStatuses, setSelectedStatuses,
    packageCategoryFilter, setPackageCategoryFilter,
    isGridView, setIsGridView,
    scheduleView, setScheduleView,
    scheduleMode, setScheduleMode,
    scheduleDate, setScheduleDate,
    selectedIds, setSelectedIds,
    clearSelection,
    hasActiveFilters,
  } = filters;

  // ============================================================================
  // Modal State - Using custom hook
  // ============================================================================
  const modals = useModals();
  
  // Destructure modals for compatibility with existing code
  const {
    activeModal, setActiveModal,
    editingItemId, setEditingItemId,
    editingReservationId, setEditingReservationId,
    itemForm, setItemForm,
    reservationForm, setReservationForm,
    confirmDialog,
    setConfirmDialog,
    showConfirm,
    showDeleteConfirm,
    closeConfirm,
    openAddItemModal,
    openEditItemModal,
    closeItemModal,
    openAddReservationModal,
    openEditReservationModal,
    openCheckOutModal,
    openCheckInModal,
  } = modals;

  // ============================================================================
  // Auth Handlers
  // ============================================================================
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    
    // Use auth context for login
    const { user, error } = await auth.signIn(loginForm.email, loginForm.password);
    
    if (error) {
      console.error('Login failed:', error);
      return;
    }
    
    if (user) {
      console.log('[App] Login successful, setting user and refreshing data');
      setIsLoggedIn(true);
      setCurrentUser({
        ...user,
        layoutPrefs: user.layoutPrefs || DEFAULT_LAYOUT_PREFS,
      });
      
      // Refresh data after login in case RLS policies affected initial load
      if (dataContext.refreshData) {
        dataContext.refreshData();
      }
    }
  }, [auth, loginForm, dataContext]);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
  }, [auth]);

  // Handler for saving layout preferences
  const handleSaveLayoutPrefs = useCallback((newPrefs) => {
    setCurrentUser(prev => ({
      ...prev,
      layoutPrefs: newPrefs,
    }));
    // Also update in users array to persist
    setUsers(prev => updateById(prev, currentUser?.id, { layoutPrefs: newPrefs }));
  }, [currentUser?.id]);

  // Handler for toggling section collapse state
  const handleToggleCollapse = useCallback((view, sectionId) => {
    setCurrentUser(prev => {
      if (!prev) return prev;
      const newPrefs = structuredClone(prev.layoutPrefs || {});
      if (!newPrefs[view]) newPrefs[view] = { sections: {} };
      if (!newPrefs[view].sections) newPrefs[view].sections = {};
      if (!newPrefs[view].sections[sectionId]) {
        newPrefs[view].sections[sectionId] = { visible: true, collapsed: false, order: 0 };
      }
      newPrefs[view].sections[sectionId].collapsed = !newPrefs[view].sections[sectionId].collapsed;
      return { ...prev, layoutPrefs: newPrefs };
    });
  }, []);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  const navigateToItem = useCallback((id, context = null) => {
    const item = findById(inventory, id);
    if (item) {
      // Set basic item immediately for fast UI response
      setSelectedItem(item);
      setInventory(prev => updateById(prev, id, { viewCount: (item.viewCount || 0) + 1 }));
      setCurrentView(VIEWS.GEAR_DETAIL);
      setActiveModal(null);
      // Store back context if provided (e.g., from Packages view)
      setItemBackContext(context);
      // Scroll to top when viewing item detail
      window.scrollTo(0, 0);
      
      // Fetch full item details with related data (notes, reminders, reservations, etc.)
      // This is async but we don't await it - UI updates when data arrives
      if (dataContext?.getItemWithDetails) {
        dataContext.getItemWithDetails(id)
          .then(itemWithDetails => {
            if (itemWithDetails) {
              setSelectedItem(itemWithDetails);
              // Also update inventory with the detailed data
              setInventory(prev => updateById(prev, id, itemWithDetails));
            }
          })
          .catch(err => {
            console.error('Failed to load item details:', err);
          });
      }
    }
  }, [inventory, dataContext]);

  const navigateToPackage = useCallback((id) => {
    const pkg = findById(packages, id);
    if (pkg) {
      setSelectedPackage(pkg);
      setCurrentView(VIEWS.PACKAGE_DETAIL);
      // Scroll to top when viewing package detail
      window.scrollTo(0, 0);
    }
  }, [packages]);

  const navigateToReservation = useCallback((reservation, item) => {
    setSelectedReservation(reservation);
    setSelectedReservationItem(item);
    setCurrentView(VIEWS.RESERVATION_DETAIL);
    // Scroll to top when viewing reservation detail
    window.scrollTo(0, 0);
  }, []);

  const navigateToFilteredSearch = useCallback((catFilter, statFilter) => {
    setCategoryFilter(catFilter);
    setStatusFilter(statFilter);
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, []);

  const navigateToAlerts = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter(STATUS.NEEDS_ATTENTION);
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, []);

  const navigateToOverdue = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter(STATUS.OVERDUE);
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, []);

  const navigateToLowStock = useCallback(() => {
    // Navigate to gear list and let it filter to low stock items
    setCategoryFilter('all');
    setStatusFilter('low-stock');
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, []);

  const navigateToReservations = useCallback(() => {
    setCurrentView(VIEWS.SCHEDULE);
  }, []);

  // Navigation handler that resets filters when going to Gear List
  const handleNavigate = useCallback((viewId) => {
    // Close any open modals when navigating
    setActiveModal(null);
    
    if (viewId === VIEWS.GEAR_LIST) {
      // Reset all filters when navigating to Gear List from sidebar
      setCategoryFilter('all');
      setStatusFilter('all');
      setSearchQuery('');
    }
    // Reset selected package when navigating to Packages view
    if (viewId === VIEWS.PACKAGES) {
      setSelectedPackage(null);
    }
    // Reset selected pack list when navigating to Pack Lists view
    if (viewId === VIEWS.PACK_LISTS) {
      setSelectedPackList(null);
    }
    setCurrentView(viewId);
  }, []);

  // ============================================================================
  // Form Handlers
  // ============================================================================
  const resetItemForm = useCallback(() => setItemForm(EMPTY_ITEM_FORM), []);
  const resetReservationForm = useCallback(() => setReservationForm(EMPTY_RESERVATION_FORM), []);

  const openModal = useCallback((modalId) => setActiveModal(modalId), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  // ============================================================================
  // Inventory Actions - Using custom hook with Supabase persistence
  // ============================================================================
  const inventoryActions = useInventoryActions({
    // DataContext for Supabase persistence
    dataContext,
    
    // State setters
    setInventory,
    setSelectedItem,
    setCurrentView,
    setAuditLog,
    setChangeLog,
    setConfirmDialog,
    
    // Current state
    inventory,
    selectedItem,
    currentUser,
    currentView,
    specs,
    
    // Modal state
    editingItemId,
    setEditingItemId,
    itemForm,
    setItemForm,
    resetItemForm,
    closeModal,
    openModal,
  });
  
  // Destructure inventory actions for compatibility
  const {
    isLoading: inventoryLoading,
    error: inventoryError,
    createItem,
    updateItem,
    deleteItem,
    bulkActionIds,
    setBulkActionIds,
    handleBulkAction,
    applyBulkStatus,
    applyBulkLocation,
    applyBulkCategory,
    applyBulkDelete,
    openEditItem,
    addChangeLog,
  } = inventoryActions;

  // Audit Log Helper
  const addAuditLog = useCallback((entry) => {
    setAuditLog(prev => [...prev, {
      ...entry,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // ============================================================================
  // Checkout Handlers
  // ============================================================================
  // State for checkout/checkin item
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkinItemData, setCheckinItemData] = useState(null);

  // State for maintenance
  const [maintenanceItem, setMaintenanceItem] = useState(null);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState(null);

  // Open checkout modal
  const openCheckoutModal = useCallback((id) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setCheckoutItem(item);
      openModal(MODALS.CHECK_OUT);
    }
  }, [inventory, openModal]);

  // Open checkin modal
  const openCheckinModal = useCallback((id) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setCheckinItemData(item);
      openModal(MODALS.CHECK_IN);
    }
  }, [inventory, openModal]);

  // Process checkout from modal
  const processCheckout = useCallback(async (checkoutData) => {
    const { itemId, borrowerName, borrowerEmail, borrowerPhone, project, projectType, dueDate, notes, conditionAtCheckout, checkedOutDate, checkedOutTime } = checkoutData;
    
    // Create checkout history entry
    const historyEntry = {
      id: generateId(),
      type: 'checkout',
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      project,
      projectType,
      dueDate,
      conditionAtCheckout,
      notes,
      checkedOutDate,
      checkedOutTime,
      checkedOutBy: currentUser?.name || 'Unknown'
    };
    
    const currentItem = inventory.find(i => i.id === itemId);
    const updates = {
      status: STATUS.CHECKED_OUT,
      checkedOutTo: borrowerName,
      checkedOutDate: checkedOutDate,
      dueBack: dueDate,
      checkoutProject: project,
      checkoutProjectType: projectType,
      checkoutCount: (currentItem?.checkoutCount || 0) + 1,
      checkoutHistory: [...(currentItem?.checkoutHistory || []), historyEntry]
    };
    
    // Use DataContext for Supabase persistence
    if (dataContext?.updateItem) {
      try {
        await dataContext.updateItem(itemId, updates);
      } catch (err) {
        console.error('Failed to save checkout:', err);
        // Fallback to local state
        setInventory(prev => updateById(prev, itemId, item => ({
          ...updates,
          checkoutCount: item.checkoutCount + 1,
          checkoutHistory: [...(item.checkoutHistory || []), historyEntry]
        })));
      }
    } else {
      setInventory(prev => updateById(prev, itemId, item => ({
        ...updates,
        checkoutCount: item.checkoutCount + 1,
        checkoutHistory: [...(item.checkoutHistory || []), historyEntry]
      })));
    }
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ 
        ...prev, 
        ...updates
      }));
    }
    
    // Add audit log entry
    addAuditLog({
      type: 'item_checkout',
      description: `${checkoutItem?.name || itemId} checked out to ${borrowerName}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
    
    // Add change log entry
    addChangeLog({
      type: 'checkout',
      itemId: itemId,
      itemType: 'item',
      itemName: checkoutItem?.name || itemId,
      description: `Checked out to ${borrowerName} for ${project || 'unspecified project'}`,
      changes: [
        { field: 'status', oldValue: STATUS.AVAILABLE, newValue: STATUS.CHECKED_OUT },
        { field: 'checkedOutTo', newValue: borrowerName },
        { field: 'dueBack', newValue: dueDate }
      ]
    });
    
    // Send checkout confirmation email (non-blocking)
    if (borrowerEmail && dataContext?.sendCheckoutEmail) {
      dataContext.sendCheckoutEmail({
        borrowerEmail,
        borrowerName,
        item: checkoutItem || { id: itemId, name: itemId },
        checkoutDate: checkedOutDate,
        dueDate,
        project
      }).catch(err => console.error('Email send failed:', err));
    }
    
    closeModal();
    setCheckoutItem(null);
  }, [currentUser, selectedItem, checkoutItem, closeModal, addAuditLog, addChangeLog, dataContext, inventory]);

  // Process checkin from modal
  const processCheckin = useCallback(async (checkinData) => {
    const { itemId, returnedBy, condition, conditionChanged, conditionAtCheckout, conditionNotes, returnNotes, damageReported, damageDescription, returnDate, returnTime } = checkinData;
    
    // Create checkout history entry for return
    const historyEntry = {
      id: generateId(),
      type: 'checkin',
      returnedBy,
      conditionAtReturn: condition,
      conditionAtCheckout,
      conditionChanged,
      conditionNotes,
      returnNotes,
      damageReported,
      damageDescription,
      returnDate,
      returnTime,
      processedBy: currentUser?.name || 'Unknown'
    };
    
    // Determine new status based on damage
    const newStatus = damageReported ? STATUS.NEEDS_ATTENTION : STATUS.AVAILABLE;
    
    const currentItem = inventory.find(i => i.id === itemId);
    const updates = {
      status: newStatus,
      condition: condition,
      checkedOutTo: null,
      checkedOutDate: null,
      dueBack: null,
      checkoutProject: null,
      checkoutProjectType: null,
      checkoutHistory: [...(currentItem?.checkoutHistory || []), historyEntry],
      // Add a note if there was damage
      notes: damageReported ? [...(currentItem?.notes || []), {
        id: generateId(),
        user: currentUser?.name || 'System',
        date: returnDate,
        text: `⚠️ Damage reported: ${damageDescription}`,
        replies: [],
        deleted: false
      }] : currentItem?.notes
    };
    
    // Use DataContext for Supabase persistence
    if (dataContext?.updateItem) {
      try {
        await dataContext.updateItem(itemId, updates);
      } catch (err) {
        console.error('Failed to save checkin:', err);
        // Fallback to local state
        setInventory(prev => updateById(prev, itemId, item => ({
          ...updates,
          checkoutHistory: [...(item.checkoutHistory || []), historyEntry],
          notes: damageReported ? [...(item.notes || []), {
            id: generateId(),
            user: currentUser?.name || 'System',
            date: returnDate,
            text: `⚠️ Damage reported: ${damageDescription}`,
            replies: [],
            deleted: false
          }] : item.notes
        })));
      }
    } else {
      setInventory(prev => updateById(prev, itemId, item => ({
        ...updates,
        checkoutHistory: [...(item.checkoutHistory || []), historyEntry],
        notes: damageReported ? [...(item.notes || []), {
          id: generateId(),
          user: currentUser?.name || 'System',
          date: returnDate,
          text: `⚠️ Damage reported: ${damageDescription}`,
          replies: [],
          deleted: false
        }] : item.notes
      })));
    }
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ 
        ...prev, 
        ...updates
      }));
    }
    
    // Add audit log entry
    addAuditLog({
      type: 'item_checkin',
      description: `${checkinItemData?.name || itemId} returned by ${returnedBy}${damageReported ? ' (damage reported)' : ''}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
    
    // Add change log entry
    addChangeLog({
      type: 'checkin',
      itemId: itemId,
      itemType: 'item',
      itemName: checkinItemData?.name || itemId,
      description: `Returned by ${returnedBy}${conditionChanged ? ` (condition: ${conditionAtCheckout} → ${condition})` : ''}`,
      changes: [
        { field: 'status', oldValue: STATUS.CHECKED_OUT, newValue: damageReported ? STATUS.NEEDS_ATTENTION : STATUS.AVAILABLE },
        { field: 'returnedBy', newValue: returnedBy },
        ...(conditionChanged ? [{ field: 'condition', oldValue: conditionAtCheckout, newValue: condition }] : [])
      ]
    });
    
    // Send checkin confirmation email (non-blocking)
    // Try to find borrower email from checkout history
    const lastCheckout = currentItem?.checkoutHistory?.filter(h => h.type === 'checkout').pop();
    const borrowerEmail = lastCheckout?.borrowerEmail;
    if (borrowerEmail && dataContext?.sendCheckinEmail) {
      dataContext.sendCheckinEmail({
        borrowerEmail,
        borrowerName: returnedBy,
        item: checkinItemData || currentItem || { id: itemId, name: itemId },
        returnDate
      }).catch(err => console.error('Email send failed:', err));
    }
    
    closeModal();
    setCheckinItemData(null);
  }, [currentUser, selectedItem, checkinItemData, closeModal, addAuditLog, addChangeLog, dataContext, inventory]);

  // ============================================================================
  // Maintenance Handlers
  // ============================================================================
  // Open maintenance modal for adding
  const openMaintenanceModal = useCallback(() => {
    if (selectedItem) {
      setMaintenanceItem(selectedItem);
      setEditingMaintenanceRecord(null);
      openModal(MODALS.MAINTENANCE);
    }
  }, [selectedItem, openModal]);

  // Save maintenance record (add or update)
  const saveMaintenance = useCallback((record) => {
    if (!maintenanceItem) return;

    const itemId = maintenanceItem.id;
    const isEdit = !!editingMaintenanceRecord;

    setInventory(prev => updateById(prev, itemId, item => {
      const existingHistory = item.maintenanceHistory || [];
      let newHistory;
      
      if (isEdit) {
        // Update existing record
        newHistory = existingHistory.map(m => m.id === record.id ? record : m);
      } else {
        // Add new record
        newHistory = [...existingHistory, record];
      }
      
      return { maintenanceHistory: newHistory };
    }));

    // Update selectedItem if viewing the same item
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => {
        const existingHistory = prev.maintenanceHistory || [];
        let newHistory;
        
        if (isEdit) {
          newHistory = existingHistory.map(m => m.id === record.id ? record : m);
        } else {
          newHistory = [...existingHistory, record];
        }
        
        return { ...prev, maintenanceHistory: newHistory };
      });
    }

    // Persist to Supabase
    if (isEdit) {
      if (dataContext?.updateMaintenance) {
        dataContext.updateMaintenance(record.id, record);
      }
    } else {
      if (dataContext?.addMaintenance) {
        dataContext.addMaintenance(itemId, record);
      }
    }

    // Add audit log entry
    addAuditLog({
      type: isEdit ? 'maintenance_updated' : 'maintenance_added',
      description: `${isEdit ? 'Updated' : 'Added'} ${record.type} for ${maintenanceItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
    
    // Add change log entry
    addChangeLog({
      type: 'maintenance',
      itemId: itemId,
      itemType: 'item',
      itemName: maintenanceItem.name,
      description: `${isEdit ? 'Updated' : 'Added'} maintenance: ${record.type}`,
      changes: [{ field: 'maintenance', newValue: `${record.type} - ${record.description || record.status}` }]
    });

    closeModal();
    setMaintenanceItem(null);
    setEditingMaintenanceRecord(null);
  }, [maintenanceItem, editingMaintenanceRecord, selectedItem, currentUser, closeModal, addAuditLog, addChangeLog]);

  // Update maintenance status (e.g., mark in-progress or completed)
  const updateMaintenanceStatus = useCallback((recordId, newStatus) => {
    if (!selectedItem) return;

    const itemId = selectedItem.id;
    const completedDate = newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null;

    setInventory(prev => updateById(prev, itemId, item => ({
      maintenanceHistory: (item.maintenanceHistory || []).map(m => 
        m.id === recordId 
          ? { ...m, status: newStatus, completedDate: completedDate || m.completedDate, updatedAt: new Date().toISOString() }
          : m
      )
    })));

    setSelectedItem(prev => ({
      ...prev,
      maintenanceHistory: (prev.maintenanceHistory || []).map(m =>
        m.id === recordId
          ? { ...m, status: newStatus, completedDate: completedDate || m.completedDate, updatedAt: new Date().toISOString() }
          : m
      )
    }));

    addAuditLog({
      type: 'maintenance_status_changed',
      description: `Maintenance status changed to ${newStatus} for ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: itemId
    });
  }, [selectedItem, currentUser, addAuditLog]);

  // ============================================================================
  // Kit / Container Handlers
  // ============================================================================
  // Convert item to a kit
  const setItemAsKit = useCallback((kitType) => {
    if (!selectedItem) return;

    setInventory(prev => updateById(prev, selectedItem.id, {
      isKit: true,
      kitType: kitType,
      childItemIds: [],
    }));

    setSelectedItem(prev => ({
      ...prev,
      isKit: true,
      kitType: kitType,
      childItemIds: [],
    }));

    addAuditLog({
      type: 'item_converted_to_kit',
      description: `${selectedItem.name} converted to ${kitType}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    addChangeLog({
      type: 'updated',
      itemId: selectedItem.id,
      itemType: 'item',
      itemName: selectedItem.name,
      description: `Converted "${selectedItem.name}" to ${kitType}`,
      changes: [{ field: 'kitType', oldValue: null, newValue: kitType }]
    });
  }, [selectedItem, currentUser, addAuditLog, addChangeLog]);

  // Add items to a kit
  const addItemsToKit = useCallback((childIds) => {
    if (!selectedItem || !selectedItem.isKit) return;

    const newChildIds = [...(selectedItem.childItemIds || []), ...childIds];
    const addedItems = inventory.filter(i => childIds.includes(i.id));

    // Update the kit item
    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: newChildIds });
      // Update each child to reference this kit as parent
      childIds.forEach(childId => {
        updated = updateById(updated, childId, { parentKitId: selectedItem.id });
      });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: newChildIds,
    }));

    addAuditLog({
      type: 'items_added_to_kit',
      description: `${childIds.length} item(s) added to kit ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    addChangeLog({
      type: 'updated',
      itemId: selectedItem.id,
      itemType: 'item',
      itemName: selectedItem.name,
      description: `Added ${childIds.length} item(s) to kit "${selectedItem.name}"`,
      changes: addedItems.map(item => ({ 
        field: 'kitContents', 
        oldValue: null, 
        newValue: `+ ${item.name} (${item.id})` 
      }))
    });
  }, [selectedItem, currentUser, inventory, addAuditLog, addChangeLog]);

  // Remove item from kit
  const removeItemFromKit = useCallback((childId) => {
    if (!selectedItem || !selectedItem.isKit) return;

    const removedItem = inventory.find(i => i.id === childId);
    const newChildIds = (selectedItem.childItemIds || []).filter(id => id !== childId);

    // Update the kit item
    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: newChildIds });
      // Remove parent reference from child
      updated = updateById(updated, childId, { parentKitId: null });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: newChildIds,
    }));
    
    if (removedItem) {
      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Removed "${removedItem.name}" from kit "${selectedItem.name}"`,
        changes: [{ 
          field: 'kitContents', 
          oldValue: `${removedItem.name} (${removedItem.id})`, 
          newValue: null 
        }]
      });
    }
  }, [selectedItem, inventory, addChangeLog]);

  // Clear all items from kit
  const clearKitItems = useCallback(() => {
    if (!selectedItem || !selectedItem.isKit) return;

    const childIds = selectedItem.childItemIds || [];
    const clearedItems = inventory.filter(i => childIds.includes(i.id));

    // Update the kit and all children
    setInventory(prev => {
      let updated = updateById(prev, selectedItem.id, { childItemIds: [] });
      // Remove parent reference from all children
      childIds.forEach(childId => {
        updated = updateById(updated, childId, { parentKitId: null });
      });
      return updated;
    });

    setSelectedItem(prev => ({
      ...prev,
      childItemIds: [],
    }));

    addAuditLog({
      type: 'kit_cleared',
      description: `All items removed from kit ${selectedItem.name}`,
      user: currentUser?.name || 'Unknown',
      itemId: selectedItem.id
    });
    
    if (clearedItems.length > 0) {
      addChangeLog({
        type: 'updated',
        itemId: selectedItem.id,
        itemType: 'item',
        itemName: selectedItem.name,
        description: `Cleared all ${clearedItems.length} item(s) from kit "${selectedItem.name}"`,
        changes: clearedItems.map(item => ({ 
          field: 'kitContents', 
          oldValue: `${item.name} (${item.id})`, 
          newValue: null 
        }))
      });
    }
  }, [selectedItem, currentUser, inventory, addAuditLog, addChangeLog]);

  // ============================================================================
  // Required Accessories Handlers
  // ============================================================================
  const addRequiredAccessories = useCallback((itemId, accessoryIds) => {
    if (!itemId || !accessoryIds || accessoryIds.length === 0) return;
    
    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;
    
    const existingAccessories = targetItem.requiredAccessories || [];
    const newAccessories = [...new Set([...existingAccessories, ...accessoryIds])];
    
    setInventory(prev => updateById(prev, itemId, { requiredAccessories: newAccessories }));
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ ...prev, requiredAccessories: newAccessories }));
    }
    
    const addedItems = accessoryIds.map(id => inventory.find(i => i.id === id)).filter(Boolean);
    addChangeLog({
      type: 'updated',
      itemId: itemId,
      itemType: 'item',
      itemName: targetItem.name,
      description: `Added ${addedItems.length} required accessor${addedItems.length === 1 ? 'y' : 'ies'}`,
      changes: addedItems.map(item => ({ 
        field: 'requiredAccessories', 
        oldValue: null, 
        newValue: `${item.name} (${item.id})` 
      }))
    });
  }, [inventory, selectedItem, addChangeLog]);

  const removeRequiredAccessory = useCallback((itemId, accessoryId) => {
    if (!itemId || !accessoryId) return;
    
    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;
    
    const removedItem = inventory.find(i => i.id === accessoryId);
    const existingAccessories = targetItem.requiredAccessories || [];
    const newAccessories = existingAccessories.filter(id => id !== accessoryId);
    
    setInventory(prev => updateById(prev, itemId, { requiredAccessories: newAccessories }));
    
    if (selectedItem?.id === itemId) {
      setSelectedItem(prev => ({ ...prev, requiredAccessories: newAccessories }));
    }
    
    if (removedItem) {
      addChangeLog({
        type: 'updated',
        itemId: itemId,
        itemType: 'item',
        itemName: targetItem.name,
        description: `Removed required accessory: ${removedItem.name}`,
        changes: [{ 
          field: 'requiredAccessories', 
          oldValue: `${removedItem.name} (${removedItem.id})`, 
          newValue: null 
        }]
      });
    }
  }, [inventory, selectedItem, addChangeLog]);

  // ============================================================================
  // Image Handler
  // ============================================================================
  const selectImage = useCallback(async (image) => {
    if (selectedItem) {
      // Update local state immediately
      setInventory(prev => updateById(prev, selectedItem.id, { image }));
      setSelectedItem(prev => ({ ...prev, image }));
      
      // Persist to database
      if (dataContext?.updateItem) {
        try {
          await dataContext.updateItem(selectedItem.id, { image });
        } catch (err) {
          console.error('Failed to save image:', err);
        }
      }
    }
    closeModal();
  }, [selectedItem, closeModal, dataContext]);

  // ============================================================================
  // Reservation Handlers
  // ============================================================================
  const saveReservation = useCallback(async () => {
    // Editing existing reservation
    if (editingReservationId) {
      const updatedReservation = {
        ...reservationForm,
        id: editingReservationId,
        dueBack: reservationForm.end
      };

      const currentItem = inventory.find(i => i.id === selectedReservationItem.id);
      const updatedReservations = (currentItem.reservations || []).map(r => 
        r.id === editingReservationId ? updatedReservation : r
      );
      
      // Use DataContext for Supabase persistence
      if (dataContext?.updateReservation) {
        try {
          await dataContext.updateReservation(editingReservationId, reservationForm);
        } catch (err) {
          console.error('Failed to update reservation:', err);
        }
      }
      
      // Update local state
      setInventory(prev => updateById(prev, selectedReservationItem.id, item => ({
        reservations: (item.reservations || []).map(r => 
          r.id === editingReservationId ? updatedReservation : r
        )
      })));

      setSelectedReservation(updatedReservation);
      if (selectedItem?.id === selectedReservationItem.id) {
        setSelectedItem(prev => ({
          ...prev,
          reservations: (prev.reservations || []).map(r => 
            r.id === editingReservationId ? updatedReservation : r
          )
        }));
      }
      
      // Log reservation update
      addChangeLog({
        type: 'updated',
        itemId: selectedReservationItem.id,
        itemType: 'item',
        itemName: selectedReservationItem.name,
        description: `Updated reservation for ${reservationForm.project}`,
        changes: [{ field: 'reservation', newValue: `${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})` }]
      });
      
      setEditingReservationId(null);
    } else {
      // Creating new reservation(s) - support multiple items
      const itemIds = reservationForm.itemIds?.length 
        ? reservationForm.itemIds 
        : (reservationForm.itemId ? [reservationForm.itemId] : [selectedItem?.id || selectedReservationItem?.id].filter(Boolean));
      
      if (itemIds.length === 0) {
        console.error('No items selected for reservation');
        return;
      }
      
      // Create a reservation for each selected item
      for (const targetItemId of itemIds) {
        const targetItem = inventory.find(i => i.id === targetItemId);
        if (!targetItem) {
          console.error('Item not found:', targetItemId);
          continue;
        }
        
        const reservation = {
          id: generateId(),
          ...reservationForm,
          notes: [],
          dueBack: reservationForm.end
        };

        // Use DataContext for Supabase persistence
        if (dataContext?.createReservation) {
          try {
            await dataContext.createReservation(targetItemId, reservationForm);
          } catch (err) {
            console.error('Failed to create reservation for', targetItemId, err);
          }
        }
        
        // Update local state
        setInventory(prev => updateById(prev, targetItemId, item => ({
          reservations: [...(item.reservations || []), reservation]
        })));

        if (selectedItem?.id === targetItemId) {
          setSelectedItem(prev => ({
            ...prev,
            reservations: [...(prev.reservations || []), reservation]
          }));
        }
        
        // Log reservation creation
        addChangeLog({
          type: 'reservation_added',
          itemId: targetItemId,
          itemType: 'item',
          itemName: targetItem.name,
          description: `New reservation: ${reservationForm.project} (${reservationForm.start} - ${reservationForm.end})`,
          changes: [{ field: 'reservation', newValue: reservationForm.project }]
        });
      }
      
      // Send reservation confirmation email (non-blocking) - send once for all items
      const userEmail = reservationForm.contactEmail;
      const firstItemId = itemIds[0];
      const firstItem = inventory.find(i => i.id === firstItemId);
      if (userEmail && dataContext?.sendReservationEmail && firstItem) {
        dataContext.sendReservationEmail({
          userEmail,
          userName: reservationForm.user,
          item: firstItem,
          reservation: {
            ...reservationForm,
            itemCount: itemIds.length
          }
        }).catch(err => console.error('Email send failed:', err));
      }
      
      // Navigate to the first item's reservation
      if (firstItem) {
        const reservation = {
          id: generateId(),
          ...reservationForm,
          notes: [],
          dueBack: reservationForm.end
        };
        navigateToReservation(reservation, firstItem);
      }
    }
    
    closeModal();
    resetReservationForm();
  }, [reservationForm, editingReservationId, selectedItem, selectedReservationItem, closeModal, resetReservationForm, navigateToReservation, addChangeLog, dataContext, inventory]);

  const openEditReservation = useCallback((reservation) => {
    setEditingReservationId(reservation.id);
    setReservationForm({
      project: reservation.project,
      projectType: reservation.projectType || 'Other',
      start: reservation.start,
      end: reservation.end,
      user: reservation.user,
      contactPhone: reservation.contactPhone || '',
      contactEmail: reservation.contactEmail || '',
      location: reservation.location || ''
    });
    openModal(MODALS.ADD_RESERVATION);
  }, [openModal]);

  const deleteReservation = useCallback((itemId, resId) => {
    const item = inventory.find(i => i.id === itemId);
    const reservation = item?.reservations?.find(r => r.id === resId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this reservation? This action cannot be undone.',
      onConfirm: async () => {
        // Use DataContext deleteReservation for Supabase persistence
        if (dataContext?.deleteReservation) {
          try {
            await dataContext.deleteReservation(resId);
          } catch (err) {
            console.error('Failed to delete reservation:', err);
          }
        }
        
        // Update local state
        const updatedReservations = (item?.reservations || []).filter(r => r.id !== resId);
        setInventory(prev => updateById(prev, itemId, itm => ({
          reservations: (itm.reservations || []).filter(r => r.id !== resId)
        })));
        
        if (selectedItem?.id === itemId) {
          setSelectedItem(prev => ({
            ...prev,
            reservations: (prev.reservations || []).filter(r => r.id !== resId)
          }));
        }
        
        // Log reservation removal
        addChangeLog({
          type: 'reservation_removed',
          itemId: itemId,
          itemType: 'item',
          itemName: item?.name || itemId,
          description: `Cancelled reservation: ${reservation?.project || 'Unknown'}`,
          changes: [{ field: 'reservation', oldValue: reservation?.project }]
        });
        
        // Navigate back if we were viewing this reservation
        if (selectedReservation?.id === resId) {
          setSelectedReservation(null);
          setCurrentView(selectedItem ? VIEWS.GEAR_DETAIL : VIEWS.SCHEDULE);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedItem, selectedReservation, inventory, addChangeLog, dataContext]);

  // ============================================================================
  // Note Handlers - Generic factory for items/packages/reservations
  // ============================================================================
  const createNoteHandler = useCallback((entityType) => {
    const getEntity = () => {
      if (entityType === 'item') return selectedItem;
      if (entityType === 'package') return selectedPackage;
      if (entityType === 'reservation') return selectedReservation;
      return null;
    };

    const setEntity = (updater) => {
      if (entityType === 'item') setSelectedItem(updater);
      else if (entityType === 'package') setSelectedPackage(updater);
      else if (entityType === 'reservation') setSelectedReservation(updater);
    };

    const updateCollection = (entityId, notesUpdater) => {
      if (entityType === 'item') {
        setInventory(prev => updateById(prev, entityId, item => ({
          notes: notesUpdater(item.notes)
        })));
      } else if (entityType === 'package') {
        setPackages(prev => updateById(prev, entityId, pkg => ({
          notes: notesUpdater(pkg.notes || [])
        })));
      } else if (entityType === 'reservation') {
        setInventory(prev => updateById(prev, selectedReservationItem.id, item => ({
          reservations: (item.reservations || []).map(r =>
            r.id === entityId ? { ...r, notes: notesUpdater(r.notes || []) } : r
          )
        })));
      }
    };

    return {
      add: (text) => {
        const entity = getEntity();
        if (!text?.trim() || !entity) return;

        const note = {
          id: generateId(),
          user: currentUser.name,
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false
        };

        const currentNotes = entity.notes || [];
        const updatedNotes = [...currentNotes, note];

        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        // Persist to Supabase
        if (entityType === 'item' && dataContext?.addItemNote) {
          dataContext.addItemNote(entity.id, note);
        }
      },

      reply: (parentId, text) => {
        const entity = getEntity();
        if (!text?.trim() || !entity) return;

        const reply = {
          id: generateId(),
          user: currentUser.name,
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false,
          parentId: parentId
        };

        const updatedNotes = addReplyToNote(entity.notes || [], parentId, reply);
        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        // Persist reply to Supabase
        if (entityType === 'item' && dataContext?.addItemNote) {
          dataContext.addItemNote(entity.id, reply);
        }
      },

      delete: (noteId) => {
        const entity = getEntity();
        if (!entity) return;

        const note = findNoteById(entity.notes || [], noteId);
        if (note) {
          setAuditLog(prev => [...prev, {
            type: 'note_deleted',
            timestamp: new Date().toISOString(),
            description: `Note deleted from ${entityType} ${entity.id}`,
            content: note.text,
            user: currentUser.name,
            itemId: entity.id
          }]);
        }

        const updatedNotes = markNoteDeleted(entity.notes || [], noteId);
        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        // Persist delete to Supabase
        if (entityType === 'item' && dataContext?.deleteItemNote) {
          dataContext.deleteItemNote(noteId);
        }
      }
    };
  }, [selectedItem, selectedPackage, selectedReservation, selectedReservationItem, currentUser, dataContext]);

  // Memoized note handlers
  const itemNoteHandlers = useMemo(() => createNoteHandler('item'), [createNoteHandler]);
  const packageNoteHandlers = useMemo(() => createNoteHandler('package'), [createNoteHandler]);
  const reservationNoteHandlers = useMemo(() => createNoteHandler('reservation'), [createNoteHandler]);

  // ============================================================================
  // Client Note Handlers
  // ============================================================================
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  const clientNoteHandlers = useMemo(() => ({
    add: (clientId, text) => {
      if (!text?.trim() || !clientId) return;
      
      const note = {
        id: generateId(),
        user: currentUser?.name || 'Unknown',
        date: getTodayISO(),
        text: text.trim(),
        replies: [],
        deleted: false
      };
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: [...(client.clientNotes || []), note] }
          : client
      ));
    },
    
    reply: (clientId, parentId, text) => {
      if (!text?.trim() || !clientId) return;
      
      const reply = {
        id: generateId(),
        user: currentUser?.name || 'Unknown',
        date: getTodayISO(),
        text: text.trim(),
        replies: [],
        deleted: false
      };
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: addReplyToNote(client.clientNotes || [], parentId, reply) }
          : client
      ));
    },
    
    delete: (clientId, noteId) => {
      if (!clientId) return;
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: markNoteDeleted(client.clientNotes || [], noteId) }
          : client
      ));
    }
  }), [currentUser]);

  // ============================================================================
  // Reminder Handlers
  // ============================================================================
  const addReminder = useCallback((reminder) => {
    if (!selectedItem) return;
    
    const updatedReminders = [...(selectedItem.reminders || []), reminder];
    
    setInventory(prev => updateById(prev, selectedItem.id, item => ({
      reminders: [...(item.reminders || []), reminder]
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    // Persist to Supabase
    if (dataContext?.addItemReminder) {
      dataContext.addItemReminder(selectedItem.id, {
        ...reminder,
        createdBy: currentUser.name
      });
    }
    
    setAuditLog(prev => [...prev, {
      type: 'reminder_added',
      timestamp: new Date().toISOString(),
      description: `Reminder "${reminder.title}" added to ${selectedItem.name}`,
      user: currentUser.name,
      itemId: selectedItem.id
    }]);
  }, [selectedItem, currentUser, dataContext]);

  const completeReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    if (!reminder) return;
    
    // Simply mark as completed (don't auto-advance recurring reminders)
    const updatedReminders = (selectedItem.reminders || []).map(r =>
      r.id === reminderId ? { ...r, completed: true, completedDate: getTodayISO() } : r
    );
    
    setInventory(prev => updateById(prev, selectedItem.id, () => ({
      reminders: updatedReminders
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    // Persist to Supabase
    if (dataContext?.updateItemReminder) {
      dataContext.updateItemReminder(reminderId, { completed: true, completedDate: getTodayISO() });
    }
    
    setAuditLog(prev => [...prev, {
      type: 'reminder_completed',
      timestamp: new Date().toISOString(),
      description: `Reminder "${reminder.title}" completed for ${selectedItem.name}`,
      user: currentUser.name,
      itemId: selectedItem.id
    }]);
  }, [selectedItem, currentUser, dataContext]);

  const uncompleteReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    if (!reminder) return;
    
    // Mark as not completed
    const updatedReminders = (selectedItem.reminders || []).map(r =>
      r.id === reminderId ? { ...r, completed: false, completedDate: null } : r
    );
    
    setInventory(prev => updateById(prev, selectedItem.id, () => ({
      reminders: updatedReminders
    })));
    setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
    
    // Persist to Supabase
    if (dataContext?.updateItemReminder) {
      dataContext.updateItemReminder(reminderId, { completed: false, completedDate: null });
    }
  }, [selectedItem, dataContext]);

  const deleteReminder = useCallback((reminderId) => {
    if (!selectedItem) return;
    
    const reminder = (selectedItem.reminders || []).find(r => r.id === reminderId);
    
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Reminder',
      message: `Are you sure you want to delete "${reminder?.title || 'this reminder'}"?`,
      onConfirm: () => {
        const updatedReminders = (selectedItem.reminders || []).filter(r => r.id !== reminderId);
        
        setInventory(prev => updateById(prev, selectedItem.id, () => ({
          reminders: updatedReminders
        })));
        setSelectedItem(prev => ({ ...prev, reminders: updatedReminders }));
        
        // Persist to Supabase
        if (dataContext?.deleteItemReminder) {
          dataContext.deleteItemReminder(reminderId);
        }
        
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedItem, dataContext]);

  // ============================================================================
  // Package Handlers
  // ============================================================================
  const deletePackage = useCallback((id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Package',
      message: 'Are you sure you want to delete this package? This action cannot be undone.',
      onConfirm: () => {
        setPackages(prev => removeById(prev, id));
        if (selectedPackage?.id === id) {
          setSelectedPackage(null);
          setCurrentView(VIEWS.PACKAGES);
        }
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, [selectedPackage]);

  const addItemToPackage = useCallback((packageId, itemId) => {
    const pkg = packages.find(p => p.id === packageId);
    const item = inventory.find(i => i.id === itemId);
    
    if (pkg && item && !pkg.items.includes(itemId)) {
      setPackages(prev => updateById(prev, packageId, p => ({
        items: [...p.items, itemId]
      })));
      
      addChangeLog({
        type: 'updated',
        itemId: packageId,
        itemType: 'package',
        itemName: pkg.name,
        description: `Added "${item.name}" to package "${pkg.name}"`,
        changes: [{ 
          field: 'packageContents', 
          oldValue: null, 
          newValue: `+ ${item.name} (${item.id})` 
        }]
      });
    }
  }, [packages, inventory, addChangeLog]);

  const addPackage = useCallback(() => {
    const newId = `pkg-${Date.now()}`;
    const newPackage = {
      id: newId,
      name: 'New Package',
      description: 'Package description',
      category: categories[0] || 'General',
      items: [],
      notes: []
    };
    setPackages(prev => [...prev, newPackage]);
    setSelectedPackage(newPackage);
    setCurrentView(VIEWS.PACKAGE_DETAIL);
    
    addChangeLog({
      type: 'created',
      itemId: newId,
      itemType: 'package',
      itemName: 'New Package',
      description: 'Created new package',
      changes: [{ field: 'package', oldValue: null, newValue: 'New Package' }]
    });
  }, [categories, addChangeLog]);

  // ============================================================================
  // User Handlers
  // ============================================================================
  const updateUserProfile = useCallback((updatedUser) => {
    setUsers(prev => updateById(prev, updatedUser.id, updatedUser));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  // ============================================================================
  // Export Handler
  // ============================================================================
  const exportData = useCallback((options) => {
    const items = selectedIds.length
      ? inventory.filter(i => selectedIds.includes(i.id))
      : inventory;

    if (options.format === 'csv') {
      const headers = options.columns.join(',');
      const rows = items.map(i =>
        options.columns.map(col => col === 'value' ? i.currentValue : i[col] || '').join(',')
      );
      const csv = headers + '\n' + rows.join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'inventory.csv';
      a.click();
    }
  }, [inventory, selectedIds]);

  // Close sidebar when navigating on mobile
  const handleMobileNavigate = useCallback((view) => {
    setSidebarOpen(false);
    handleNavigate(view);
  }, [handleNavigate]);

  // ============================================================================
  // ============================================================================
  // Show loading while auth or data is initializing
  // ============================================================================
  if (auth.loading || dataContext.loading) {
    return <FullPageLoading message="Loading SIMS..." />;
  }

  // ============================================================================
  // Render Login
  // ============================================================================
  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.bgDark,
        backgroundImage: currentTheme.backgroundImage || 'none',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
        cursor: currentTheme.cursor || 'default',
      }}>
        <Login
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          onLogin={handleLogin}
          isLoading={auth.loading}
          error={auth.error?.message}
        />
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <PermissionsProvider currentUser={currentUser} roles={roles}>
    <div className={`app-wrapper ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`} style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: colors.textPrimary,
      backgroundColor: colors.bgDark,
      backgroundImage: currentTheme.backgroundImage || 'none',
      backgroundRepeat: 'repeat',
      backgroundAttachment: 'fixed',
      cursor: currentTheme.cursor || 'default',
    }}>
      {/* Skip link for keyboard navigation */}
      <SkipLink targetId="main-content" />
      
      {/* Mobile sidebar overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      
      <Sidebar
        currentView={currentView}
        setCurrentView={handleMobileNavigate}
        user={currentUser}
        onLogout={handleLogout}
        onOpenProfile={() => { setSidebarOpen(false); openModal(MODALS.PROFILE); }}
        onOpenScanner={() => { setSidebarOpen(false); openModal(MODALS.QR_SCANNER); }}
        onOpenImport={() => { setSidebarOpen(false); openModal(MODALS.CSV_IMPORT); }}
        onOpenExport={() => { setSidebarOpen(false); openModal(MODALS.DATABASE_EXPORT); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main 
        id="main-content"
        className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} 
        role="main"
        tabIndex={-1}
        style={{
          flex: 1,
          minHeight: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Mobile header with menu button - FIXED at top */}
        <div className="mobile-header">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textPrimary,
            }}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8,
            flex: 1,
          }}>
            <img 
              src="/moe.png" 
              alt="" 
              style={{ width: 28, height: 28, borderRadius: 6 }}
              onError={(e) => e.target.style.display = 'none'}
            />
            <span style={{ fontWeight: 600, fontSize: 16, color: colors.textPrimary }}>SIMS</span>
          </div>
          {currentUser && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMobileUserMenuOpen(!mobileUserMenuOpen)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: colors.primary,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.bgDark,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
                aria-label="User menu"
              >
                {currentUser.name?.charAt(0).toUpperCase() || 'U'}
              </button>
              {mobileUserMenuOpen && (
                <>
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999,
                    }}
                    onClick={() => setMobileUserMenuOpen(false)}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: colors.bgMedium,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 12,
                    padding: spacing[2],
                    minWidth: 180,
                    zIndex: 1000,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      borderBottom: `1px solid ${colors.borderLight}`,
                      marginBottom: spacing[2],
                    }}>
                      <div style={{ fontWeight: 600, color: colors.textPrimary }}>{currentUser.name}</div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>{currentUser.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileUserMenuOpen(false);
                        openModal(MODALS.PROFILE);
                      }}
                      style={{
                        width: '100%',
                        padding: `${spacing[2]}px ${spacing[3]}px`,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: colors.textPrimary,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setMobileUserMenuOpen(false);
                        setCurrentView(VIEWS.THEME_SELECTOR);
                      }}
                      style={{
                        width: '100%',
                        padding: `${spacing[2]}px ${spacing[3]}px`,
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        color: colors.textPrimary,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Theme
                    </button>
                    <div style={{ 
                      borderTop: `1px solid ${colors.borderLight}`,
                      marginTop: spacing[2],
                      paddingTop: spacing[2],
                    }}>
                      <button
                        onClick={() => {
                          setMobileUserMenuOpen(false);
                          handleLogout();
                        }}
                        style={{
                          width: '100%',
                          padding: `${spacing[2]}px ${spacing[3]}px`,
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          color: colors.danger,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing[2],
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
        {currentView === VIEWS.DASHBOARD && (
          <Dashboard
            inventory={inventory}
            categorySettings={categorySettings}
            layoutPrefs={currentUser?.layoutPrefs?.dashboard}
            onViewItem={navigateToItem}
            onFilteredView={navigateToFilteredSearch}
            onViewAlerts={navigateToAlerts}
            onViewOverdue={navigateToOverdue}
            onViewLowStock={navigateToLowStock}
            onViewReservations={navigateToReservations}
            onCustomizeLayout={() => setCurrentView(VIEWS.CUSTOMIZE_DASHBOARD)}
            onToggleCollapse={handleToggleCollapse}
          />
        )}

        {currentView === VIEWS.GEAR_LIST && (
          <GearList
            inventory={inventory}
            categories={categories}
            categorySettings={categorySettings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            isGridView={isGridView}
            setIsGridView={setIsGridView}
            onViewItem={navigateToItem}
            onAddItem={() => { resetItemForm(); setCurrentView(VIEWS.ADD_ITEM); }}
            onBulkAction={handleBulkAction}
          />
        )}

        {currentView === VIEWS.GEAR_DETAIL && selectedItem && (
          <ItemDetail
            item={selectedItem}
            inventory={inventory}
            packages={packages}
            specs={specs}
            categorySettings={categorySettings}
            layoutPrefs={currentUser?.layoutPrefs?.itemDetail}
            onBack={() => {
              if (itemBackContext?.returnTo === 'package' && itemBackContext.packageId) {
                const pkg = packages.find(p => p.id === itemBackContext.packageId);
                if (pkg) {
                  setSelectedPackage(pkg);
                  setCurrentView(VIEWS.PACKAGES);
                }
              } else if (itemBackContext?.returnTo === 'packList' && itemBackContext.packListId) {
                const list = packLists.find(pl => pl.id === itemBackContext.packListId);
                if (list) {
                  setSelectedPackList(list);
                  setCurrentView(VIEWS.PACK_LISTS);
                }
              } else {
                setCurrentView(VIEWS.GEAR_LIST);
              }
              setItemBackContext(null);
            }}
            backLabel={itemBackContext?.backLabel || 'Back to Gear List'}
            onCheckout={openCheckoutModal}
            onCheckin={openCheckinModal}
            onEdit={openEditItem}
            onDelete={deleteItem}
            onShowQR={() => openModal(MODALS.QR_CODE)}
            onAddReservation={() => { resetReservationForm(); setEditingReservationId(null); openModal(MODALS.ADD_RESERVATION); }}
            onDeleteReservation={deleteReservation}
            onAddNote={itemNoteHandlers.add}
            onReplyNote={itemNoteHandlers.reply}
            onDeleteNote={itemNoteHandlers.delete}
            onAddReminder={addReminder}
            onCompleteReminder={completeReminder}
            onUncompleteReminder={uncompleteReminder}
            onDeleteReminder={deleteReminder}
            onAddMaintenance={openMaintenanceModal}
            onUpdateMaintenance={(record) => { setEditingMaintenanceRecord(record); setMaintenanceItem(selectedItem); openModal(MODALS.MAINTENANCE); }}
            onCompleteMaintenance={updateMaintenanceStatus}
            onUpdateValue={(newValue) => {
              setInventory(prev => updateById(prev, selectedItem.id, { currentValue: newValue }));
              setSelectedItem(prev => ({ ...prev, currentValue: newValue }));
            }}
            onSetAsKit={setItemAsKit}
            onAddToKit={addItemsToKit}
            onAddToPackage={addItemToPackage}
            onRemoveFromKit={removeItemFromKit}
            onClearKit={clearKitItems}
            onAddAccessory={addRequiredAccessories}
            onRemoveAccessory={removeRequiredAccessory}
            onViewItem={navigateToItem}
            onSelectImage={() => openModal(MODALS.IMAGE_SELECT)}
            onViewReservation={(r) => navigateToReservation(r, selectedItem)}
            onCustomizeLayout={() => setCurrentView(VIEWS.CUSTOMIZE_ITEM_DETAIL)}
            onToggleCollapse={handleToggleCollapse}
            user={currentUser}
          />
        )}

        {currentView === VIEWS.PACKAGES && (
          <Suspense fallback={<ViewLoading message="Loading Packages..." />}>
            <PackagesView
              packages={packages}
              setPackages={setPackages}
              inventory={inventory}
              onViewItem={navigateToItem}
              initialSelectedPackage={selectedPackage}
              onPackageSelect={setSelectedPackage}
            />
          </Suspense>
        )}

        {currentView === VIEWS.PACK_LISTS && (
          <Suspense fallback={<ViewLoading message="Loading Pack Lists..." />}>
            <PackListsView
              packLists={packLists}
              setPackLists={setPackLists}
              inventory={inventory}
              packages={packages}
              categorySettings={categorySettings}
              onViewItem={navigateToItem}
              addAuditLog={addAuditLog}
              currentUser={currentUser}
              initialSelectedList={selectedPackList}
              onListSelect={setSelectedPackList}
            />
          </Suspense>
        )}

        {currentView === VIEWS.SCHEDULE && (
          <Suspense fallback={<ViewLoading message="Loading Schedule..." />}>
            <ScheduleView
              inventory={inventory}
              scheduleView={scheduleView}
              setScheduleView={setScheduleView}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            scheduleMode={scheduleMode}
            setScheduleMode={setScheduleMode}
            onViewItem={navigateToItem}
            onViewReservation={navigateToReservation}
            onAddReservation={() => { resetReservationForm(); setEditingReservationId(null); openModal(MODALS.ADD_RESERVATION); }}
          />
          </Suspense>
        )}

        {currentView === VIEWS.SEARCH && (
          <SearchView
            inventory={inventory}
            categories={categories}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedStatuses={selectedStatuses}
            setSelectedStatuses={setSelectedStatuses}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            onViewItem={navigateToItem}
          />
        )}

        {currentView === VIEWS.LABELS && (
          <Suspense fallback={<ViewLoading message="Loading Labels..." />}>
            <LabelsView inventory={inventory} packages={packages} user={currentUser} />
          </Suspense>
        )}

        {currentView === VIEWS.CLIENTS && (
          <Suspense fallback={<ViewLoading message="Loading Clients..." />}>
            <ClientsView
              clients={clients}
              inventory={inventory}
              onUpdateClients={setClients}
              onViewReservation={navigateToReservation}
              onAddNote={clientNoteHandlers.add}
              onReplyNote={clientNoteHandlers.reply}
              onDeleteNote={clientNoteHandlers.delete}
              user={currentUser}
              addAuditLog={addAuditLog}
            />
          </Suspense>
        )}

        {currentView === VIEWS.RESERVATION_DETAIL && selectedReservation && (
          <Suspense fallback={<ViewLoading message="Loading Reservation..." />}>
            <ReservationDetail
              reservation={selectedReservation}
              item={selectedReservationItem}
              onBack={() => setCurrentView(selectedItem ? VIEWS.GEAR_DETAIL : VIEWS.SCHEDULE)}
              onEdit={() => openEditReservation(selectedReservation)}
              onDelete={() => {
                if (selectedReservationItem) {
                  deleteReservation(selectedReservationItem.id, selectedReservation.id);
                }
              }}
              onAddNote={reservationNoteHandlers.add}
              onReplyNote={reservationNoteHandlers.reply}
              onDeleteNote={reservationNoteHandlers.delete}
              user={currentUser}
            />
          </Suspense>
        )}

        <PermissionGate permission="admin_users">
          {currentView === VIEWS.ADMIN && (
            <Suspense fallback={<ViewLoading message="Loading Admin Panel..." />}>
              <AdminPanel
                setCurrentView={setCurrentView}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="gear_list" requireEdit>
          {currentView === VIEWS.ADD_ITEM && (
          <Suspense fallback={<ViewLoading message="Loading Item Form..." />}>
            <ItemFormPage
              isEdit={false}
              itemForm={itemForm}
              setItemForm={setItemForm}
              specs={specs}
              categories={categories}
              categorySettings={categorySettings}
              locations={locations}
              inventory={inventory}
              onSave={createItem}
              onBack={() => setCurrentView(VIEWS.GEAR_LIST)}
            />
          </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_specs">
          {currentView === VIEWS.EDIT_SPECS && (
          <Suspense fallback={<ViewLoading message="Loading Specs Editor..." />}>
            <SpecsPage
              specs={specs}
              onSave={(newSpecs) => setSpecs(newSpecs)}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_categories">
          {currentView === VIEWS.EDIT_CATEGORIES && (
            <Suspense fallback={<ViewLoading message="Loading Categories..." />}>
              <CategoriesPage
                categories={categories}
                inventory={inventory}
                specs={specs}
                categorySettings={categorySettings}
                onSave={(newCategories, newSpecs, newSettings) => {
                  setCategories(newCategories);
                  setSpecs(newSpecs);
                  setCategorySettings(newSettings);
                }}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        {currentView === VIEWS.CUSTOMIZE_DASHBOARD && (
          <Suspense fallback={<ViewLoading message="Loading Layout Editor..." />}>
            <LayoutCustomize
              context="dashboard"
              layoutPrefs={currentUser?.layoutPrefs}
              onSave={handleSaveLayoutPrefs}
              onBack={() => setCurrentView(VIEWS.DASHBOARD)}
            />
          </Suspense>
        )}

        {currentView === VIEWS.CUSTOMIZE_ITEM_DETAIL && (
          <Suspense fallback={<ViewLoading message="Loading Layout Editor..." />}>
            <LayoutCustomize
              context="itemDetail"
              layoutPrefs={currentUser?.layoutPrefs}
              onSave={handleSaveLayoutPrefs}
              onBack={() => setCurrentView(VIEWS.GEAR_DETAIL)}
            />
          </Suspense>
        )}

        {currentView === VIEWS.THEME_SELECTOR && (
          <Suspense fallback={<ViewLoading message="Loading Themes..." />}>
            <ThemeSelector
              onBack={() => setCurrentView(VIEWS.DASHBOARD)}
            />
          </Suspense>
        )}

        <PermissionGate permission="admin_users">
          {currentView === VIEWS.USERS && (
            <Suspense fallback={<ViewLoading message="Loading Users..." />}>
              <UsersPanel
                users={users}
                currentUserId={currentUser?.id}
                onAddUser={() => openModal(MODALS.ADD_USER)}
                onDeleteUser={(userId) => {
                  const userToDelete = users.find(u => u.id === userId);
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Delete User',
                    message: 'Are you sure you want to delete this user? This action cannot be undone.',
                    onConfirm: () => {
                      setUsers(prev => prev.filter(u => u.id !== userId));
                      addAuditLog({
                        type: 'user_deleted',
                        description: `User deleted: ${userToDelete?.name || userId}`,
                        user: currentUser?.name || 'Unknown',
                        itemId: userId
                      });
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    }
                  });
                }}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="reports">
          {currentView === VIEWS.REPORTS && (
          <Suspense fallback={<ViewLoading message="Loading Reports..." />}>
            <ReportsPanel
              inventory={inventory}
              onExport={() => openModal(MODALS.EXPORT)}
              onBack={() => setCurrentView(VIEWS.ADMIN)}
            />
          </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_audit">
          {currentView === VIEWS.AUDIT_LOG && (
            <Suspense fallback={<ViewLoading message="Loading Audit Log..." />}>
              <AuditLogPanel 
                auditLog={auditLog} 
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="reports">
          {currentView === VIEWS.MAINTENANCE_REPORT && (
            <Suspense fallback={<ViewLoading message="Loading Maintenance Report..." />}>
              <MaintenanceReportPanel
                inventory={inventory}
                onViewItem={navigateToItem}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="reports">
          {currentView === VIEWS.INSURANCE_REPORT && (
            <Suspense fallback={<ViewLoading message="Loading Insurance Report..." />}>
              <InsuranceReportPanel
                inventory={inventory}
                categories={categories}
                onViewItem={navigateToItem}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_locations">
          {currentView === VIEWS.LOCATIONS_MANAGE && (
            <Suspense fallback={<ViewLoading message="Loading Locations..." />}>
              <LocationsManager
                locations={locations}
                inventory={inventory}
                onSave={(newLocations) => setLocations(newLocations)}
                onClose={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_audit">
          {currentView === VIEWS.CHANGE_LOG && (
            <Suspense fallback={<ViewLoading message="Loading Change Log..." />}>
              <ChangeLog
                changeLog={changeLog}
                inventory={inventory}
                packages={packages}
                onViewItem={navigateToItem}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        <PermissionGate permission="admin_roles">
          {currentView === VIEWS.ROLES_MANAGE && (
            <Suspense fallback={<ViewLoading message="Loading Roles..." />}>
              <RolesManager
                roles={roles}
                users={users}
                onSaveRole={(roleData) => {
                  if (roleData.id) {
                    // Update existing role
                    setRoles(prev => prev.map(r => r.id === roleData.id ? roleData : r));
                  } else {
                    // Create new role
                    const newRole = { ...roleData, id: `role_${generateId()}` };
                    setRoles(prev => [...prev, newRole]);
                  }
                }}
                onDeleteRole={(roleId) => {
                  setRoles(prev => prev.filter(r => r.id !== roleId));
                  // Reset users with this role to default role
                  setUsers(prev => prev.map(u => 
                    u.roleId === roleId ? { ...u, roleId: 'role_user' } : u
                  ));
                }}
                onAssignUsers={(roleId, userIds) => {
                  setUsers(prev => prev.map(u => 
                    userIds.includes(u.id) ? { ...u, roleId } : u
                  ));
                }}
                onBack={() => setCurrentView(VIEWS.ADMIN)}
              />
            </Suspense>
          )}
        </PermissionGate>

        {currentView === VIEWS.NOTIFICATIONS && (
          <Suspense fallback={<ViewLoading message="Loading Notifications..." />}>
            <NotificationSettings
              preferences={currentUser?.notificationPreferences}
              isAdmin={currentUser?.roleId === 'role_admin'}
              onSave={async (prefs) => {
                // Save notification preferences to Supabase
                if (dataContext?.saveNotificationPreferences) {
                  try {
                    await dataContext.saveNotificationPreferences(currentUser.id, prefs);
                  } catch (err) {
                    console.error('Failed to save notification preferences:', err);
                  }
                }
                // Also update local state
                setUsers(prev => updateById(prev, currentUser.id, {
                  notificationPreferences: prefs
                }));
                setCurrentUser(prev => ({
                  ...prev,
                  notificationPreferences: prefs
                }));
              }}
              onClose={() => setCurrentView(VIEWS.DASHBOARD)}
            />
          </Suspense>
        )}
        </div>
      </main>

      {/* Modals - All lazy loaded with Suspense */}
      <Suspense fallback={<ModalLoading />}>
        {activeModal === MODALS.ADD_ITEM && (
          <ItemModal
            isEdit={false}
            itemForm={itemForm}
            setItemForm={setItemForm}
            specs={specs}
            categories={categories}
            categorySettings={categorySettings}
            locations={locations}
            inventory={inventory}
            onSave={createItem}
            onClose={closeModal}
          />
        )}

        {activeModal === MODALS.EDIT_ITEM && (
          <ItemModal
            isEdit={true}
            itemId={editingItemId}
          itemForm={itemForm}
          setItemForm={setItemForm}
          specs={specs}
          categories={categories}
          categorySettings={categorySettings}
          locations={locations}
          inventory={inventory}
          onSave={updateItem}
          onClose={closeModal}
          onDelete={deleteItem}
        />
      )}

      {activeModal === MODALS.ADD_RESERVATION && (
        <ReservationModal
          key={editingReservationId || 'new-reservation'}
          isEdit={!!editingReservationId}
          reservationForm={reservationForm}
          setReservationForm={setReservationForm}
          onSave={saveReservation}
          onClose={() => { closeModal(); setEditingReservationId(null); }}
          clients={clients}
          inventory={inventory}
          item={editingReservationId ? (selectedItem || selectedReservationItem) : null}
          editingReservationId={editingReservationId}
        />
      )}

      {activeModal === MODALS.QR_CODE && selectedItem && (
        <QRModal item={selectedItem} onClose={closeModal} />
      )}

      {activeModal === MODALS.EXPORT && (
        <ExportModal
          onExport={exportData}
          onClose={closeModal}
          user={currentUser}
        />
      )}

      {activeModal === MODALS.PROFILE && (
        <ProfileModal
          user={currentUser}
          onSave={updateUserProfile}
          onClose={closeModal}
        />
      )}

      {activeModal === MODALS.IMAGE_SELECT && (
        <ImageSelectorModal
          images={[]}
          currentImage={selectedItem?.image}
          itemId={selectedItem?.id}
          onSelect={selectImage}
          onClose={closeModal}
        />
      )}

      {activeModal === MODALS.QR_SCANNER && (
        <QRScannerModal
          inventory={inventory}
          onItemFound={(item) => {
            closeModal();
            setSelectedItem(item);
            setCurrentView(VIEWS.GEAR_DETAIL);
          }}
          onQuickCheckout={(item) => {
            closeModal();
            setCheckoutItem(item);
            openModal(MODALS.CHECK_OUT);
          }}
          onQuickCheckin={(item) => {
            closeModal();
            setCheckinItemData(item);
            openModal(MODALS.CHECK_IN);
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === MODALS.CSV_IMPORT && (
        <CSVImportModal
          categories={categories}
          specs={specs}
          onImport={(items) => {
            // Generate IDs and add items
            const newItems = items.map(item => ({
              ...item,
              id: generateItemCode(item.category, inventory.map(i => i.id)),
              image: null,
            }));
            setInventory(prev => [...prev, ...newItems]);
            addAuditLog({
              type: 'csv_import',
              description: `Imported ${newItems.length} items from CSV`,
              user: currentUser?.name || 'Unknown'
            });
          }}
          onClose={closeModal}
        />
      )}

      {activeModal === MODALS.DATABASE_EXPORT && (
        <DatabaseExportModal
          inventory={inventory}
          packages={packages}
          users={users}
          categories={categories}
          specs={specs}
          auditLog={auditLog}
          packLists={packLists}
          onClose={closeModal}
        />
      )}

      {activeModal === MODALS.CHECK_OUT && checkoutItem && (
        <CheckOutModal
          item={checkoutItem}
          users={users}
          currentUser={currentUser}
          onCheckOut={processCheckout}
          onClose={() => { closeModal(); setCheckoutItem(null); }}
        />
      )}

      {activeModal === MODALS.CHECK_IN && checkinItemData && (
        <CheckInModal
          item={checkinItemData}
          currentUser={currentUser}
          onCheckIn={processCheckin}
          onClose={() => { closeModal(); setCheckinItemData(null); }}
        />
      )}

      {activeModal === MODALS.MAINTENANCE && maintenanceItem && (
        <MaintenanceModal
          item={maintenanceItem}
          editingRecord={editingMaintenanceRecord}
          onSave={saveMaintenance}
          onClose={() => { closeModal(); setMaintenanceItem(null); setEditingMaintenanceRecord(null); }}
        />
      )}

      {activeModal === MODALS.ADD_USER && (
        <AddUserModal
          existingEmails={users.map(u => u.email.toLowerCase())}
          onSave={(newUser) => {
            setUsers(prev => [...prev, newUser]);
            addAuditLog({
              type: 'user_created',
              description: `New user created: ${newUser.name} (${newUser.role?.name || newUser.roleId || 'User'})`,
              user: currentUser?.name || 'Unknown',
              itemId: newUser.id
            });
            closeModal();
          }}
          onClose={closeModal}
        />
      )}

      {/* Bulk Action Modals */}
      {activeModal === MODALS.BULK_STATUS && (
        <BulkStatusModal
          selectedIds={bulkActionIds}
          inventory={inventory}
          onApply={applyBulkStatus}
          onClose={() => { closeModal(); setBulkActionIds([]); }}
        />
      )}

      {activeModal === MODALS.BULK_LOCATION && (
        <BulkLocationModal
          selectedIds={bulkActionIds}
          locations={locations}
          onApply={applyBulkLocation}
          onClose={() => { closeModal(); setBulkActionIds([]); }}
        />
      )}

      {activeModal === MODALS.BULK_CATEGORY && (
        <BulkCategoryModal
          selectedIds={bulkActionIds}
          categories={categories}
          onApply={applyBulkCategory}
          onClose={() => { closeModal(); setBulkActionIds([]); }}
        />
      )}

      {activeModal === MODALS.BULK_DELETE && (
        <BulkDeleteModal
          selectedIds={bulkActionIds}
          inventory={inventory}
          onConfirm={applyBulkDelete}
          onClose={() => { closeModal(); setBulkActionIds([]); }}
        />
      )}
      </Suspense>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
    </PermissionsProvider>
  );
}
