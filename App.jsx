// ============================================================================
// SIMS Main Application Component
// Orchestrates auth, hooks, and state — delegates rendering to sub-components.
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import { VIEWS, MODALS, STATUS, DEFAULT_SPECS, CATEGORIES as DEFAULT_CATEGORIES, DEFAULT_LAYOUT_PREFS, DEFAULT_ROLES } from './constants.js';
import { colors } from './theme.js';
import { updateById, findById } from './utils.js';
import { useTheme } from './contexts/ThemeContext.jsx';
import { PermissionsProvider } from './contexts/PermissionsContext.jsx';
import { useAuth } from './lib/AuthContext.jsx';
import { useData } from './lib/DataContext.jsx';
import { FullPageLoading } from './components/Loading.jsx';
import { SkipLink } from './components/ui.jsx';
import { log, error as logError } from './lib/logger.js';
import { usersService } from './lib/services.js';

// Custom hooks for state management
import { useInventoryActions } from './hooks/index.js';
import { useCheckoutHandlers, useKitHandlers, useReservationHandlers, useNoteHandlers, useReminderHandlers, usePackageHandlers } from './hooks/handlers/index.js';

// Contexts
import { useNavigationContext } from './contexts/NavigationContext.jsx';
import { useFilterContext } from './contexts/FilterContext.jsx';
import { useModalContext } from './contexts/ModalContext.jsx';
import { useSidebarContext } from './contexts/SidebarContext.jsx';

// Core components (always needed)
import Login from './views/Login.jsx';
import Sidebar from './components/Sidebar.jsx';

// Extracted sub-components
import MobileHeader from './components/MobileHeader.jsx';
import AppViews from './AppViews.jsx';
import AppModals from './AppModals.jsx';

export default function App() {
  // ============================================================================
  // Theme
  // ============================================================================
  const { currentTheme } = useTheme();

  // ============================================================================
  // Auth & Data Contexts
  // ============================================================================
  const auth = useAuth();
  const dataContext = useData();

  const {
    inventory, setInventory,
    packages, setPackages,
    setUsers,
    roles: contextRoles,
    specs: contextSpecs,
    categories: contextCategories,
    setAuditLog,
    setClients,
  } = dataContext;

  // Apply defaults for data that may not be loaded yet
  const roles = contextRoles?.length ? contextRoles : DEFAULT_ROLES;
  const specs = contextSpecs && Object.keys(contextSpecs).length ? contextSpecs : DEFAULT_SPECS;
  const categories = contextCategories?.length ? contextCategories : DEFAULT_CATEGORIES;

  // Local-only state
  const [changeLog, setChangeLog] = useState([]);

  // ============================================================================
  // Auth State
  // ============================================================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Sync auth state with context
  useEffect(() => {
    if (auth.isAuthenticated && auth.userProfile) {
      log('[App] User authenticated:', auth.userProfile.email);
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
  // Context Hooks
  // ============================================================================
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useSidebarContext();

  const {
    currentView, setCurrentView,
    selectedItem, setSelectedItem,
    selectedPackage, setSelectedPackage,
    setSelectedPackList,
    selectedReservation, setSelectedReservation,
    selectedReservationItem, setSelectedReservationItem,
    setItemBackContext,
  } = useNavigationContext();

  const {
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    setScheduleDate,
    selectedIds,
  } = useFilterContext();

  const {
    setActiveModal,
    editingItemId, setEditingItemId,
    editingReservationId, setEditingReservationId,
    itemForm, setItemForm,
    reservationForm, setReservationForm,
    resetItemForm, resetReservationForm,
    showConfirm,
  } = useModalContext();

  // ============================================================================
  // Auth Handlers
  // ============================================================================
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    const { user, error } = await auth.signIn(loginForm.email, loginForm.password);
    if (error) { logError('Login failed:', error); return; }
    if (user) {
      log('[App] Login successful');
      setIsLoggedIn(true);
      setCurrentUser({ ...user, layoutPrefs: user.layoutPrefs || DEFAULT_LAYOUT_PREFS });
      if (dataContext.refreshData) dataContext.refreshData();
    }
  }, [auth, loginForm, dataContext]);

  const handleLogout = useCallback(async () => {
    await auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
  }, [auth]);

  // ============================================================================
  // Layout Handlers
  // ============================================================================
  const handleSaveLayoutPrefs = useCallback(async (newPrefs) => {
    setCurrentUser(prev => ({ ...prev, layoutPrefs: newPrefs }));
    setUsers(prev => updateById(prev, currentUser?.id, { layoutPrefs: newPrefs }));
    // Persist to DB in the user's profile JSON
    if (currentUser?.id) {
      try {
        const currentProfile = currentUser.profile || {};
        await usersService.update(currentUser.id, {
          profile: { ...currentProfile, layoutPrefs: newPrefs }
        });
      } catch (err) {
        console.error('Failed to save layout prefs:', err);
      }
    }
  }, [currentUser?.id, currentUser?.profile]);

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

      // Persist (fire and forget to avoid blocking UI)
      if (prev.id) {
        usersService.update(prev.id, {
          profile: { ...(prev.profile || {}), layoutPrefs: newPrefs }
        }).catch(() => {});
      }

      return { ...prev, layoutPrefs: newPrefs };
    });
  }, []);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  const navigateToItem = useCallback((id, context = null) => {
    const item = findById(inventory, id);
    if (item) {
      setSelectedItem(item);
      setInventory(prev => updateById(prev, id, existingItem => ({
        ...existingItem,
        viewCount: (existingItem.viewCount || 0) + 1
      })));
      setCurrentView(VIEWS.GEAR_DETAIL);
      setActiveModal(null);
      setItemBackContext(context);
      window.scrollTo(0, 0);

      dataContext.getItemWithDetails(id)
        .then(itemWithDetails => {
          if (itemWithDetails) {
            setSelectedItem(itemWithDetails);
            setInventory(prev => updateById(prev, id, itemWithDetails));
          }
        })
        .catch(err => logError('Failed to load item details:', err));
    }
  }, [inventory, dataContext]);

  const navigateToReservation = useCallback((reservation, item) => {
    setSelectedReservation(reservation);
    setSelectedReservationItem(item);
    setCurrentView(VIEWS.RESERVATION_DETAIL);
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
    setCategoryFilter('all');
    setStatusFilter('low-stock');
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, []);

  const navigateToReservations = useCallback(() => {
    setCurrentView(VIEWS.SCHEDULE);
  }, []);

  const handleNavigate = useCallback((viewId) => {
    setActiveModal(null);
    if (viewId === VIEWS.GEAR_LIST) {
      setCategoryFilter('all');
      setStatusFilter('all');
      setSearchQuery('');
    }
    if (viewId === VIEWS.PACKAGES) setSelectedPackage(null);
    if (viewId === VIEWS.PACK_LISTS) setSelectedPackList(null);
    if (viewId === VIEWS.SCHEDULE) {
      const today = new Date();
      setScheduleDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    }
    setCurrentView(viewId);
  }, [setScheduleDate]);

  // ============================================================================
  // Form Helpers
  // ============================================================================
  const openModal = useCallback((modalId) => setActiveModal(modalId), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  // ============================================================================
  // Inventory Actions
  // ============================================================================
  const inventoryActions = useInventoryActions({
    dataContext, setInventory, setSelectedItem, setCurrentView, setAuditLog, setChangeLog, showConfirm,
    inventory, selectedItem, currentUser, currentView, specs,
    editingItemId, setEditingItemId, itemForm, setItemForm, resetItemForm, closeModal, openModal,
  });

  const {
    createItem, updateItem, deleteItem,
    bulkActionIds, setBulkActionIds, handleBulkAction,
    applyBulkStatus, applyBulkLocation, applyBulkCategory, applyBulkDelete,
    openEditItem, addChangeLog,
  } = inventoryActions;

  // Audit Log Helper
  const addAuditLog = useCallback((entry) => {
    dataContext.addAuditLog(entry);
  }, [dataContext]);

  // ============================================================================
  // Domain Handler Hooks
  // ============================================================================
  const {
    checkoutItem, checkinItemData,
    openCheckoutModal, openCheckinModal, processCheckout, processCheckin,
    maintenanceItem, setMaintenanceItem, editingMaintenanceRecord, setEditingMaintenanceRecord,
    openMaintenanceModal, saveMaintenance, updateMaintenanceStatus,
  } = useCheckoutHandlers({
    inventory, setInventory, selectedItem, setSelectedItem,
    dataContext, currentUser, openModal, closeModal, addAuditLog, addChangeLog,
  });

  const {
    setItemAsKit, addItemsToKit, removeItemFromKit, clearKitItems,
    addRequiredAccessories, removeRequiredAccessory, selectImage,
  } = useKitHandlers({
    inventory, setInventory, selectedItem, setSelectedItem,
    dataContext, currentUser, closeModal, addAuditLog, addChangeLog,
  });

  const {
    saveReservation, openEditReservation, deleteReservation,
  } = useReservationHandlers({
    inventory, setInventory, selectedItem, setSelectedItem,
    dataContext, openModal, closeModal, addChangeLog, addAuditLog, currentUser,
    reservationForm, setReservationForm,
    editingReservationId, setEditingReservationId,
    selectedReservationItem, selectedReservation, setSelectedReservation,
    setCurrentView, resetReservationForm, navigateToReservation, showConfirm,
  });

  const {
    itemNoteHandlers, reservationNoteHandlers, clientNoteHandlers,
  } = useNoteHandlers({
    selectedItem, setSelectedItem, setInventory,
    selectedPackage, setSelectedPackage,
    selectedReservation, setSelectedReservation, selectedReservationItem,
    setPackages, setClients, setAuditLog, dataContext, currentUser,
  });

  const {
    addReminder, completeReminder, uncompleteReminder, deleteReminder,
  } = useReminderHandlers({
    selectedItem, setSelectedItem, setInventory,
    setAuditLog, dataContext, currentUser, showConfirm,
  });

  const {
    addItemToPackage,
  } = usePackageHandlers({
    packages, setPackages, inventory,
    selectedPackage, setSelectedPackage, setCurrentView,
    categories, showConfirm, addChangeLog,
  });

  // ============================================================================
  // Remaining Handlers
  // ============================================================================
  const updateUserProfile = useCallback(async (updatedUser) => {
    setUsers(prev => updateById(prev, updatedUser.id, updatedUser));
    if (currentUser.id === updatedUser.id) setCurrentUser(updatedUser);
    // Persist to database
    try {
      await usersService.update(updatedUser.id, { profile: updatedUser.profile });
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
    // Audit log
    addAuditLog({
      type: 'profile_updated',
      description: `${updatedUser.name || 'User'} updated their profile`,
    });
  }, [currentUser, addAuditLog]);

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

  const saveNotificationPreferences = useCallback(async (prefs) => {
    try {
      await dataContext.saveNotificationPreferences(currentUser.id, prefs);
    } catch (err) {
      logError('Failed to save notification preferences:', err);
    }
    setUsers(prev => updateById(prev, currentUser.id, { notificationPreferences: prefs }));
    setCurrentUser(prev => ({ ...prev, notificationPreferences: prefs }));
  }, [dataContext, currentUser]);

  const openMaintenanceEditModal = useCallback((record) => {
    setEditingMaintenanceRecord(record);
    setMaintenanceItem(selectedItem);
    openModal(MODALS.MAINTENANCE);
  }, [selectedItem, setEditingMaintenanceRecord, setMaintenanceItem, openModal]);

  const handleMobileNavigate = useCallback((view) => {
    setSidebarOpen(false);
    handleNavigate(view);
  }, [handleNavigate]);

  // ============================================================================
  // Handler Objects (passed to AppViews and AppModals)
  // ============================================================================
  const viewHandlers = useMemo(() => ({
    navigateToItem, navigateToReservation,
    navigateToFilteredSearch, navigateToAlerts, navigateToOverdue,
    navigateToLowStock, navigateToReservations,
    handleToggleCollapse, handleSaveLayoutPrefs,
    createItem, deleteItem, openEditItem, handleBulkAction,
    openCheckoutModal, openCheckinModal, openMaintenanceModal,
    openMaintenanceEditModal,
    itemNoteHandlers, clientNoteHandlers, reservationNoteHandlers,
    addReminder, completeReminder, uncompleteReminder, deleteReminder,
    openEditReservation, deleteReservation, saveReservation,
    setItemAsKit, addItemsToKit, removeItemFromKit, clearKitItems,
    addRequiredAccessories, removeRequiredAccessory, selectImage,
    addItemToPackage, updateMaintenanceStatus, updateUserProfile,
    addAuditLog, resetItemForm, resetReservationForm,
    openModal, closeModal,
    saveNotificationPreferences,
  }), [
    navigateToItem, navigateToReservation,
    navigateToFilteredSearch, navigateToAlerts, navigateToOverdue,
    navigateToLowStock, navigateToReservations,
    handleToggleCollapse, handleSaveLayoutPrefs,
    createItem, deleteItem, openEditItem, handleBulkAction,
    openCheckoutModal, openCheckinModal, openMaintenanceModal,
    openMaintenanceEditModal,
    itemNoteHandlers, clientNoteHandlers, reservationNoteHandlers,
    addReminder, completeReminder, uncompleteReminder, deleteReminder,
    openEditReservation, deleteReservation, saveReservation,
    setItemAsKit, addItemsToKit, removeItemFromKit, clearKitItems,
    addRequiredAccessories, removeRequiredAccessory, selectImage,
    addItemToPackage, updateMaintenanceStatus, updateUserProfile,
    addAuditLog, resetItemForm, resetReservationForm,
    openModal, closeModal,
    saveNotificationPreferences,
  ]);

  const modalHandlers = useMemo(() => ({
    createItem, updateItem, deleteItem, saveReservation, selectImage,
    exportData, updateUserProfile, addAuditLog, openModal, closeModal,
    checkoutItem, checkinItemData,
    openCheckoutModal, openCheckinModal, processCheckout, processCheckin,
    maintenanceItem, editingMaintenanceRecord, setEditingMaintenanceRecord,
    saveMaintenance,
    bulkActionIds, setBulkActionIds,
    applyBulkStatus, applyBulkLocation, applyBulkCategory, applyBulkDelete,
  }), [
    createItem, updateItem, deleteItem, saveReservation, selectImage,
    exportData, updateUserProfile, addAuditLog, openModal, closeModal,
    checkoutItem, checkinItemData,
    openCheckoutModal, openCheckinModal, processCheckout, processCheckin,
    maintenanceItem, editingMaintenanceRecord, setEditingMaintenanceRecord,
    saveMaintenance,
    bulkActionIds, setBulkActionIds,
    applyBulkStatus, applyBulkLocation, applyBulkCategory, applyBulkDelete,
  ]);

  // ============================================================================
  // Loading / Login
  // ============================================================================
  if (auth.loading || dataContext.loading) {
    return <FullPageLoading message="Loading SIMS..." />;
  }

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
  // Main Layout
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
          <MobileHeader
            currentUser={currentUser}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenModal={openModal}
            onSetView={setCurrentView}
            onLogout={handleLogout}
          />

          <AppViews
            handlers={viewHandlers}
            currentUser={currentUser}
            changeLog={changeLog}
          />
        </main>

        <AppModals
          handlers={modalHandlers}
          currentUser={currentUser}
        />
      </div>
    </PermissionsProvider>
  );
}
