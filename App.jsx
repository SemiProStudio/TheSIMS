// ============================================================================
// SIMS Main Application Component
// Orchestrates auth, hooks, and state — delegates rendering to sub-components.
// ============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  VIEWS,
  MODALS,
  STATUS,
  DEFAULT_SPECS,
  DEFAULT_LAYOUT_PREFS,
  DEFAULT_ROLES,
} from './constants.js';
import { colors } from './theme.js';
import { findById, downloadCSV, getTodayISO } from './utils';
import { openPrintWindow } from './lib/printUtil.js';
import { escapeHtml } from './lib/escapeHtml.js';
import { resolveScannedCode, truncateScannedCode } from './lib/qrData.js';
import { useTheme } from './contexts/ThemeContext.js';
import { PermissionsProvider } from './contexts/PermissionsContext.jsx';
import { useAuth } from './contexts/AuthContext.js';
import { useData } from './contexts/DataContext.js';
import { SkipLink } from './components/ui.jsx';
import { log, error as logError } from './lib/logger.js';
import { useToast } from './contexts/ToastContext.js';
import { usersService } from './lib/services.js';
import {
  collectDeviceUiPrefs,
  resolveLoginSettings,
  cacheCustomTheme,
  clearLegacyDeviceKeys,
  getThemeOverride,
  isUiSettingsReadonly,
} from './lib/userSettings.js';

// Custom hooks for state management
import { useInventoryActions } from './hooks/index.js';
import {
  useCheckoutHandlers,
  useKitHandlers,
  useReservationHandlers,
  useNoteHandlers,
  useReminderHandlers,
  usePackageHandlers,
} from './hooks/handlers/index.js';

// Contexts
import { useNavigationContext } from './contexts/NavigationContext.js';
import { useFilterContext } from './contexts/FilterContext.js';
import { useModalContext } from './contexts/ModalContext.js';
import { useSidebarContext } from './contexts/SidebarContext.js';

// Core components (always needed)
import Login from './views/Login.jsx';
import Sidebar from './components/Sidebar.jsx';

// Extracted sub-components
import MobileHeader from './components/MobileHeader.jsx';
import AppViews from './AppViews.jsx';
import AppModals from './AppModals.jsx';

// QR deep link (/?item=<id>): captured at module load, BEFORE anything can
// rewrite the URL — NavigationContext strips the query string once the auth
// session restores, and the service worker's first install reloads the page.
// sessionStorage carries the pending item across that reload.
const DEEPLINK_STORAGE_KEY = 'sims-deeplink-item';
{
  const itemParam = new URLSearchParams(window.location.search).get('item');
  if (itemParam) sessionStorage.setItem(DEEPLINK_STORAGE_KEY, itemParam);
}

export default function App() {
  // ============================================================================
  // Theme
  // ============================================================================
  const { currentTheme, themeId, setTheme, updateCustomTheme } = useTheme();

  // ============================================================================
  // Auth & Data Contexts
  // ============================================================================
  const auth = useAuth();
  const dataContext = useData();
  const { addToast } = useToast();

  const {
    inventory,
    packages,
    tier2Loaded,
    roles: contextRoles,
    specs: contextSpecs,
    patchInventoryItem,
    patchUser,
    addAuditLog,
  } = dataContext;

  // Apply defaults for data that may not be loaded yet
  const roles = contextRoles?.length ? contextRoles : DEFAULT_ROLES;
  const specs = contextSpecs && Object.keys(contextSpecs).length ? contextSpecs : DEFAULT_SPECS;

  // Change log state — persisted to localStorage
  const [changeLog, setChangeLog] = useState(() => {
    try {
      const saved = localStorage.getItem('sims_change_log');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist change log to localStorage whenever it changes
  useEffect(() => {
    try {
      // Keep only the most recent 500 entries to avoid localStorage bloat
      const toSave = changeLog.slice(-500);
      localStorage.setItem('sims_change_log', JSON.stringify(toSave));
    } catch {
      // localStorage may be full or unavailable — silently ignore
    }
  }, [changeLog]);

  // ============================================================================
  // Auth State
  // ============================================================================
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  // Sync auth state with context. This also refires on token refresh (the
  // profile is refetched) — merge over the previous state so in-session data
  // the row doesn't carry (notificationPreferences) survives, and settings
  // lifted from profile JSON (layoutPrefs etc.) come back instead of
  // resetting to defaults mid-session.
  useEffect(() => {
    if (auth.isAuthenticated && auth.userProfile) {
      log('[App] User authenticated:', auth.userProfile.email);
      setIsLoggedIn(true);
      setCurrentUser((prev) => ({
        ...(prev && prev.id === auth.userProfile.id ? prev : {}),
        ...auth.userProfile,
        layoutPrefs: auth.userProfile.layoutPrefs || prev?.layoutPrefs || DEFAULT_LAYOUT_PREFS,
      }));
    } else if (!auth.loading && !auth.isAuthenticated) {
      setIsLoggedIn(false);
      setCurrentUser(null);
    }
  }, [auth.isAuthenticated, auth.userProfile, auth.loading]);

  // ============================================================================
  // Context Hooks
  // ============================================================================
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed } =
    useSidebarContext();

  const {
    currentView,
    setCurrentView,
    selectedItem,
    setSelectedItem,
    selectedPackage,
    setSelectedPackage,
    setSelectedPackList,
    selectedReservation,
    setSelectedReservation,
    selectedReservationItem,
    setSelectedReservationItem,
    setItemBackContext,
    setReservationBackView,
    bumpNavigationNonce,
  } = useNavigationContext();

  const {
    setSearchQuery,
    setCategoryFilter,
    setStatusFilter,
    setScheduleDate,
    selectedIds,
    setGlobalSearchQuery,
    setGlobalSearchTypes,
    setSelectedCategories,
    setSelectedStatuses,
    isGridView,
    setIsGridView,
    scheduleView,
    setScheduleView,
    scheduleMode,
    setScheduleMode,
  } = useFilterContext();

  const {
    setActiveModal,
    editingItemId,
    setEditingItemId,
    editingReservationId,
    setEditingReservationId,
    itemForm,
    setItemForm,
    reservationForm,
    setReservationForm,
    resetItemForm,
    resetReservationForm,
    showConfirm,
  } = useModalContext();

  // ============================================================================
  // Auth Handlers
  // ============================================================================
  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      const { user, error } = await auth.signIn(loginForm.email, loginForm.password);
      if (error) {
        logError('Login failed:', error);
        return;
      }
      if (user) {
        log('[App] Login successful');
        setIsLoggedIn(true);
        setCurrentUser({ ...user, layoutPrefs: user.layoutPrefs || DEFAULT_LAYOUT_PREFS });
        // The auth-sync effect above rebuilds currentUser from the fetched
        // profile; the per-user settings effect below applies theme/sidebar
        if (dataContext.refreshData) dataContext.refreshData();
      }
    },
    [auth, loginForm, dataContext],
  );

  const handleLogout = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (err) {
      // Clear the local session regardless — a failed server sign-out must
      // not leave the user stuck "logged in" with a dead button
      logError('Sign-out failed (clearing local session anyway):', err);
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    // Clear privileged device-local caches so the next user of a shared
    // machine can't read the previous user's activity. Supabase manages its
    // own session keys; these are ours.
    try {
      localStorage.removeItem('sims_change_log');
      localStorage.removeItem('sims-deeplink-item');
    } catch {
      /* ignore storage errors */
    }
  }, [auth]);

  // ============================================================================
  // Per-user settings persistence
  // ============================================================================
  // All profile-JSON writes go through ONE serialized writer. The previous
  // four ad-hoc writers each spread a possibly-stale profile snapshot, so
  // concurrent saves could silently clobber each other's keys — and the
  // profile modal replaced the whole JSON, wiping layoutPrefs/savedFilterViews.
  const currentUserRef = useRef(null);
  const profileRef = useRef({});
  useEffect(() => {
    currentUserRef.current = currentUser;
    profileRef.current = currentUser?.profile || {};
  }, [currentUser]);

  const profileWriteQueueRef = useRef(Promise.resolve());
  const persistProfilePatch = useCallback(
    (patch, { failureToast = 'Settings may not have saved', localOnly = false } = {}) => {
      const userId = currentUserRef.current?.id;
      if (!userId) return Promise.resolve();
      // Merge on the ref synchronously so back-to-back patches stack instead
      // of overwriting each other
      const merged = { ...profileRef.current, ...patch };
      profileRef.current = merged;
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, profile: merged };
        // Keep the lifted top-level mirrors in sync
        if ('layoutPrefs' in patch) next.layoutPrefs = patch.layoutPrefs;
        if ('savedFilterViews' in patch) next.savedFilterViews = patch.savedFilterViews;
        if ('uiPrefs' in patch) next.uiPrefs = patch.uiPrefs;
        return next;
      });
      if (localOnly) return Promise.resolve();
      // The queue never rejects (a rejection would wedge every later write)
      // but resolves a success boolean so callers can skip audit entries and
      // "saved" claims for writes that didn't happen
      profileWriteQueueRef.current = profileWriteQueueRef.current.then(() =>
        usersService.update(userId, { profile: merged }).then(
          () => true,
          (err) => {
            logError('Failed to save profile settings:', err);
            if (failureToast) addToast(failureToast, 'warning');
            return false;
          },
        ),
      );
      return profileWriteQueueRef.current;
    },
    [addToast],
  );

  // Discrete UI preferences (theme, sidebar, gear list sort/page size).
  // Skips writes when nothing changed so mount-time effects stay silent.
  // A device with frozen settings (kiosk/tests) keeps changes session-local.
  const updateUiPrefs = useCallback(
    (patch) => {
      const currentUi = profileRef.current?.uiPrefs || {};
      const changed = Object.entries(patch).some(
        ([key, value]) => JSON.stringify(currentUi[key]) !== JSON.stringify(value),
      );
      if (!changed) return Promise.resolve();
      return persistProfilePatch(
        { uiPrefs: { ...currentUi, ...patch } },
        { failureToast: 'Preferences may not have saved', localOnly: isUiSettingsReadonly() },
      );
    },
    [persistProfilePatch],
  );

  // ============================================================================
  // Layout Handlers
  // ============================================================================
  const handleSaveLayoutPrefs = useCallback(
    async (newPrefs) => {
      patchUser(currentUserRef.current?.id, { layoutPrefs: newPrefs });
      await persistProfilePatch(
        { layoutPrefs: newPrefs },
        {
          failureToast: 'Layout preferences may not have saved',
          localOnly: isUiSettingsReadonly(),
        },
      );
    },
    [persistProfilePatch, patchUser],
  );

  // Gear list saved filter views — persisted in the user profile (like
  // layout prefs) so they follow the user across browsers/devices.
  const handleSaveFilterViews = useCallback(
    (views) =>
      persistProfilePatch(
        { savedFilterViews: views },
        { failureToast: 'Saved views may not have synced', localOnly: isUiSettingsReadonly() },
      ),
    [persistProfilePatch],
  );

  const handleToggleCollapse = useCallback(
    (view, sectionId) => {
      const prev = currentUserRef.current;
      if (!prev) return;
      const newPrefs = structuredClone(prev.layoutPrefs || {});
      if (!newPrefs[view]) newPrefs[view] = { sections: {} };
      if (!newPrefs[view].sections) newPrefs[view].sections = {};
      if (!newPrefs[view].sections[sectionId]) {
        newPrefs[view].sections[sectionId] = { visible: true, collapsed: false, order: 0 };
      }
      newPrefs[view].sections[sectionId].collapsed = !newPrefs[view].sections[sectionId].collapsed;
      // Quiet persistence — a collapse toggle isn't worth a warning toast
      persistProfilePatch(
        { layoutPrefs: newPrefs },
        { failureToast: null, localOnly: isUiSettingsReadonly() },
      );
    },
    [persistProfilePatch],
  );

  // ============================================================================
  // Per-user settings: apply at login, seed/migrate once, sync on change
  // ============================================================================
  // Runs once per login. Applies the profile's theme/custom theme/sidebar
  // state to this device, seeds any never-stored settings from the legacy
  // device values (one-time migration), clears the migrated device stores so
  // the next account on this machine can't inherit them, and loads
  // notification preferences (saved-but-never-loaded before this round).
  const appliedForUserRef = useRef(null);
  const themeOverrideRef = useRef(false);
  // Values the login effect is steering the device toward. The change-sync
  // effects below must swallow those transitions (they're the application,
  // not a user action) instead of persisting the pre-apply device state
  // back over the profile.
  const pendingApplyRef = useRef({
    themeId: null,
    sidebarCollapsed: null,
    gearListGridView: null,
    scheduleView: null,
    scheduleMode: null,
  });
  useEffect(() => {
    const id = currentUser?.id;
    if (!id) {
      appliedForUserRef.current = null; // logging out re-arms the next login
      return;
    }
    if (appliedForUserRef.current === id) return;
    appliedForUserRef.current = id;

    const device = collectDeviceUiPrefs();
    const { apply, seedPatch } = resolveLoginSettings(currentUser.profile, device);

    // A device-forced theme (kiosk displays, visual test runs) wins over the
    // profile and is never seeded or persisted
    const themeOverride = getThemeOverride();
    themeOverrideRef.current = !!themeOverride;
    const themeToApply = themeOverride || apply.themeId;

    pendingApplyRef.current = {
      themeId: themeToApply ?? themeId,
      sidebarCollapsed:
        typeof apply.sidebarCollapsed === 'boolean'
          ? apply.sidebarCollapsed
          : (device.sidebarCollapsed ?? false),
      gearListGridView: apply.gearListGridView ?? isGridView,
      scheduleView: apply.scheduleView ?? scheduleView,
      scheduleMode: apply.scheduleMode ?? scheduleMode,
    };

    if (apply.customTheme) {
      cacheCustomTheme(apply.customTheme);
      updateCustomTheme({
        id: 'custom',
        isCustom: true,
        name: apply.customTheme.name,
        colors: apply.customTheme.colors,
      });
    }
    if (themeToApply && themeToApply !== themeId) setTheme(themeToApply);
    if (typeof apply.sidebarCollapsed === 'boolean') setSidebarCollapsed(apply.sidebarCollapsed);
    if (typeof apply.gearListGridView === 'boolean') setIsGridView(apply.gearListGridView);
    if (apply.scheduleView) setScheduleView(apply.scheduleView);
    if (apply.scheduleMode) setScheduleMode(apply.scheduleMode);

    if (themeOverride && seedPatch.uiPrefs) {
      // The overridden device theme is not the user's choice — don't adopt it
      delete seedPatch.uiPrefs.themeId;
      if (Object.keys(seedPatch.uiPrefs).length === 0) delete seedPatch.uiPrefs;
    }
    if (Object.keys(seedPatch).length > 0) {
      persistProfilePatch(seedPatch, {
        failureToast: null,
        localOnly: isUiSettingsReadonly(),
      });
    }
    clearLegacyDeviceKeys();

    dataContext
      .getNotificationPreferences(id)
      .then((prefs) => {
        if (prefs) {
          setCurrentUser((prev) =>
            prev?.id === id ? { ...prev, notificationPreferences: prefs } : prev,
          );
        }
      })
      .catch((err) => logError('Failed to load notification preferences:', err));
  }, [
    currentUser,
    themeId,
    setTheme,
    updateCustomTheme,
    setSidebarCollapsed,
    isGridView,
    setIsGridView,
    scheduleView,
    setScheduleView,
    scheduleMode,
    setScheduleMode,
    persistProfilePatch,
    dataContext,
  ]);

  // Theme picks persist to the profile
  useEffect(() => {
    if (!currentUser?.id || appliedForUserRef.current !== currentUser.id) return;
    if (themeOverrideRef.current) return; // forced device theme — never persist
    const pending = pendingApplyRef.current;
    if (pending.themeId !== null) {
      if (themeId === pending.themeId) pending.themeId = null; // application landed
      return;
    }
    if (themeId) updateUiPrefs({ themeId });
  }, [themeId, currentUser?.id, updateUiPrefs]);

  // Sidebar collapse follows the user, not the machine
  useEffect(() => {
    if (!currentUser?.id || appliedForUserRef.current !== currentUser.id) return;
    const pending = pendingApplyRef.current;
    if (pending.sidebarCollapsed !== null) {
      if (sidebarCollapsed === pending.sidebarCollapsed) pending.sidebarCollapsed = null;
      return;
    }
    updateUiPrefs({ sidebarCollapsed });
  }, [sidebarCollapsed, currentUser?.id, updateUiPrefs]);

  // Gear list grid/list mode follows the user
  useEffect(() => {
    if (!currentUser?.id || appliedForUserRef.current !== currentUser.id) return;
    const pending = pendingApplyRef.current;
    if (pending.gearListGridView !== null) {
      if (isGridView === pending.gearListGridView) pending.gearListGridView = null;
      return;
    }
    updateUiPrefs({ gearListGridView: isGridView });
  }, [isGridView, currentUser?.id, updateUiPrefs]);

  // Schedule period (day/week/month) and mode (calendar/list) follow the user
  useEffect(() => {
    if (!currentUser?.id || appliedForUserRef.current !== currentUser.id) return;
    const pending = pendingApplyRef.current;
    if (pending.scheduleView !== null) {
      if (scheduleView === pending.scheduleView) pending.scheduleView = null;
      return;
    }
    updateUiPrefs({ scheduleView });
  }, [scheduleView, currentUser?.id, updateUiPrefs]);

  useEffect(() => {
    if (!currentUser?.id || appliedForUserRef.current !== currentUser.id) return;
    const pending = pendingApplyRef.current;
    if (pending.scheduleMode !== null) {
      if (scheduleMode === pending.scheduleMode) pending.scheduleMode = null;
      return;
    }
    updateUiPrefs({ scheduleMode });
  }, [scheduleMode, currentUser?.id, updateUiPrefs]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================
  const navigateToItem = useCallback(
    (id, context = null) => {
      const item = findById(inventory, id);
      if (item) {
        setSelectedItem(item);
        setCurrentView(VIEWS.GEAR_DETAIL);
        setActiveModal(null);
        setItemBackContext(context);
        window.scrollTo(0, 0);

        dataContext
          .getItemWithDetails(id)
          .then((itemWithDetails) => {
            if (!itemWithDetails) return;
            // Hydrate ONLY the child collections the list rows don't carry.
            // The snapshot's SCALARS date from navigation time — applying
            // them wholesale reverted any edit/checkout/status change that
            // landed while the fetch was in flight (the optimistic-UI vs
            // lazy-fetch race class), and replacing selectedItem outright
            // also clobbered quick navigations away to another item.
            const collections = {};
            for (const key of [
              'notes',
              'reminders',
              'reservations',
              'maintenanceHistory',
              'checkoutHistory',
            ]) {
              if (itemWithDetails[key] !== undefined) collections[key] = itemWithDetails[key];
            }
            patchInventoryItem(id, collections);
            setSelectedItem((prev) => (prev?.id === id ? { ...prev, ...collections } : prev));
          })
          .catch((err) => logError('Failed to load item details:', err));
      }
    },
    [
      inventory,
      dataContext,
      patchInventoryItem,
      setActiveModal,
      setCurrentView,
      setItemBackContext,
      setSelectedItem,
    ],
  );

  // QR deep link: printed labels encode /?item=<id> so a phone's native
  // camera app lands directly on the item. Package labels carry their pkg id
  // in the same param, so both are resolved here (case-insensitively —
  // hand-typed URLs shouldn't fail on casing). Handled once, after login and
  // the first inventory load (see the module-scope capture above).
  const [pendingDeepLinkItem, setPendingDeepLinkItem] = useState(() =>
    sessionStorage.getItem(DEEPLINK_STORAGE_KEY),
  );
  useEffect(() => {
    // tier2Loaded gates the resolve: packages arrive in the tier-2 load, so
    // firing on the tier-1 inventory alone would bounce package deep links
    // to "no item found" while their data was still in flight
    if (!pendingDeepLinkItem || !isLoggedIn || inventory.length === 0 || !tier2Loaded) return;
    setPendingDeepLinkItem(null);
    sessionStorage.removeItem(DEEPLINK_STORAGE_KEY);
    const target = resolveScannedCode(pendingDeepLinkItem, inventory, packages);
    if (target?.type === 'item') {
      navigateToItem(target.entity.id);
    } else if (target?.type === 'package') {
      setSelectedPackage(target.entity);
      setCurrentView(VIEWS.PACKAGES);
    } else {
      addToast(`No item found for code "${truncateScannedCode(pendingDeepLinkItem)}"`, 'error');
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('item');
    window.history.replaceState({}, '', url);
  }, [
    pendingDeepLinkItem,
    isLoggedIn,
    inventory,
    packages,
    tier2Loaded,
    navigateToItem,
    setSelectedPackage,
    setCurrentView,
    addToast,
  ]);

  const navigateToReservation = useCallback(
    (reservation, item, backContext = null) => {
      setReservationBackView({ view: currentView, context: backContext });
      setSelectedReservation(reservation);
      setSelectedReservationItem(item);
      setCurrentView(VIEWS.RESERVATION_DETAIL);
      window.scrollTo(0, 0);
    },
    [
      currentView,
      setReservationBackView,
      setSelectedReservation,
      setSelectedReservationItem,
      setCurrentView,
    ],
  );

  const navigateToFilteredSearch = useCallback(
    (catFilter, statFilter, query = '') => {
      setCategoryFilter(catFilter);
      setStatusFilter(statFilter);
      setSearchQuery(query);
      setCurrentView(VIEWS.GEAR_LIST);
    },
    [setCategoryFilter, setStatusFilter, setSearchQuery, setCurrentView],
  );

  const navigateToAlerts = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter(STATUS.NEEDS_ATTENTION);
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, [setCategoryFilter, setStatusFilter, setSearchQuery, setCurrentView]);

  const navigateToOverdue = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter(STATUS.OVERDUE);
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, [setCategoryFilter, setStatusFilter, setSearchQuery, setCurrentView]);

  const navigateToLowStock = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter('low-stock');
    setSearchQuery('');
    setCurrentView(VIEWS.GEAR_LIST);
  }, [setCategoryFilter, setStatusFilter, setSearchQuery, setCurrentView]);

  const navigateToReservations = useCallback(() => {
    setCurrentView(VIEWS.SCHEDULE);
  }, [setCurrentView]);

  const handleNavigate = useCallback(
    (viewId) => {
      setActiveModal(null);
      if (viewId === VIEWS.GEAR_LIST) {
        setCategoryFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
      }
      // Sidebar click starts a fresh search — same symmetry as the gear
      // list. Back-navigation from a result doesn't pass through here, so
      // the in-progress search survives that round-trip.
      if (viewId === VIEWS.SEARCH) {
        setGlobalSearchQuery('');
        setGlobalSearchTypes([]);
        setSelectedCategories([]);
        setSelectedStatuses([]);
      }
      if (viewId === VIEWS.PACKAGES) setSelectedPackage(null);
      if (viewId === VIEWS.PACK_LISTS) setSelectedPackList(null);
      if (viewId === VIEWS.SCHEDULE) {
        const today = new Date();
        setScheduleDate(
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        );
      }
      setCurrentView(viewId);
      // Re-clicking the current view's nav entry produces no state change
      // above — the nonce is the render signal that lets Packages/Pack Lists
      // reset their internal subviews back to the overview
      bumpNavigationNonce();
    },
    [
      setActiveModal,
      setCategoryFilter,
      setStatusFilter,
      setSearchQuery,
      setGlobalSearchQuery,
      setGlobalSearchTypes,
      setSelectedCategories,
      setSelectedStatuses,
      setSelectedPackage,
      setSelectedPackList,
      setScheduleDate,
      setCurrentView,
      bumpNavigationNonce,
    ],
  );

  // ============================================================================
  // Form Helpers
  // ============================================================================
  const openModal = useCallback((modalId) => setActiveModal(modalId), [setActiveModal]);
  const closeModal = useCallback(() => setActiveModal(null), [setActiveModal]);

  // ============================================================================
  // Inventory Actions
  // ============================================================================
  const inventoryActions = useInventoryActions({
    dataContext,
    setSelectedItem,
    setCurrentView,
    setChangeLog,
    showConfirm,
    inventory,
    currentUser,
    currentView,
    specs,
    editingItemId,
    setEditingItemId,
    itemForm,
    setItemForm,
    resetItemForm,
    closeModal,
    openModal,
  });

  const {
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

  // ============================================================================
  // Domain Handler Hooks
  // ============================================================================
  const {
    checkoutItem,
    checkinItemData,
    openCheckoutModal,
    openCheckinModal,
    processCheckout,
    processCheckin,
    maintenanceItem,
    setMaintenanceItem,
    editingMaintenanceRecord,
    setEditingMaintenanceRecord,
    openMaintenanceModal,
    saveMaintenance,
    updateMaintenanceStatus,
  } = useCheckoutHandlers({
    inventory,
    selectedItem,
    setSelectedItem,
    dataContext,
    currentUser,
    openModal,
    closeModal,
    addAuditLog,
    addChangeLog,
  });

  const {
    setKitStatus,
    addKitItems,
    removeKitItem,
    addRequiredAccessories,
    removeRequiredAccessory,
    updateItemValue,
    selectImage,
  } = useKitHandlers({
    inventory,
    selectedItem,
    setSelectedItem,
    dataContext,
    closeModal,
    addChangeLog,
  });

  const { saveReservation, openEditReservation, deleteReservation } = useReservationHandlers({
    inventory,
    selectedItem,
    setSelectedItem,
    dataContext,
    openModal,
    closeModal,
    addChangeLog,
    addAuditLog,
    currentUser,
    reservationForm,
    setReservationForm,
    editingReservationId,
    setEditingReservationId,
    selectedReservationItem,
    selectedReservation,
    setSelectedReservation,
    setCurrentView,
    resetReservationForm,
    navigateToReservation,
    showConfirm,
  });

  const { itemNoteHandlers, packageNoteHandlers, reservationNoteHandlers, clientNoteHandlers } =
    useNoteHandlers({
      selectedItem,
      setSelectedItem,
      selectedPackage,
      setSelectedPackage,
      selectedReservation,
      setSelectedReservation,
      selectedReservationItem,
      dataContext,
      currentUser,
    });

  const { addReminder, completeReminder, uncompleteReminder, deleteReminder } = useReminderHandlers(
    {
      selectedItem,
      setSelectedItem,
      dataContext,
      currentUser,
      showConfirm,
    },
  );

  const { addItemToPackage } = usePackageHandlers({
    packages,
    inventory,
    addChangeLog,
    dataContext,
  });

  // Reserve every item in a package at once: prefill the multi-item
  // reservation form and open the Add Reservation modal. packageItems are the
  // package's items already resolved against inventory (deleted refs dropped).
  const reservePackage = useCallback(
    (pkg, packageItems) => {
      resetReservationForm();
      const itemIds = packageItems.map((i) => i.id);
      // Queued after the reset, so the updater receives the empty form
      setReservationForm((prev) => ({ ...prev, itemIds, itemId: itemIds[0] || '' }));
      openModal(MODALS.ADD_RESERVATION);
    },
    [resetReservationForm, setReservationForm, openModal],
  );

  // ============================================================================
  // Remaining Handlers
  // ============================================================================
  const updateUserProfile = useCallback(
    async (updatedUser) => {
      // The profile modal builds ONLY its branding fields — merge them into
      // the stored profile. Persisting it verbatim used to wipe
      // layoutPrefs/savedFilterViews/uiPrefs from the DB on every save.
      const ok = await persistProfilePatch(updatedUser.profile || {}, {
        failureToast: 'Profile changes may not have saved',
      });
      patchUser(updatedUser.id, { profile: profileRef.current });
      // Audit only what actually persisted — the entry used to be written
      // even when the DB write failed
      if (ok !== false) {
        addAuditLog({
          type: 'profile_updated',
          description: `${updatedUser.name || 'User'} updated their profile`,
        });
      }
    },
    [persistProfilePatch, addAuditLog, patchUser],
  );

  const exportData = useCallback(
    async (options) => {
      const items =
        options.scope !== 'all' && selectedIds.length
          ? inventory.filter((i) => selectedIds.includes(i.id))
          : inventory;

      // Notes live in their own lazy table — without this fetch the Notes
      // column exported empty for every item whose detail page hadn't been
      // visited this session
      let notesByItemId = null;
      if (options.columns.includes('notes')) {
        try {
          const { backupService } = await import('./lib/services.js');
          const rows = await backupService.fetchAllRows('item_notes');
          notesByItemId = {};
          rows.forEach((n) => {
            if (n.deleted) return;
            if (!notesByItemId[n.item_id]) notesByItemId[n.item_id] = [];
            notesByItemId[n.item_id].push(n.text);
          });
        } catch (err) {
          logError('Failed to fetch notes for export:', err);
          addToast('Export failed: could not load item notes', 'error');
          // false = nothing was exported — the modal stays open
          return false;
        }
      }

      const escHtml = escapeHtml;
      // Labels and getters come from the shared inventory column definition;
      // notes is this exporter's own lazily-fetched extension
      const { inventoryColumnById } = await import('./lib/inventoryCsv.js');
      const columnLabel = (col) =>
        col === 'notes' ? 'Notes' : inventoryColumnById[col]?.label || col;
      const getCellValue = (item, col) => {
        if (col === 'notes') return (notesByItemId?.[item.id] || []).join('; ');
        return inventoryColumnById[col] ? inventoryColumnById[col].value(item) : item[col];
      };
      const timestamp = getTodayISO();

      if (options.format === 'csv') {
        // The one shared CSV writer — this used to hand-roll the same
        // sanitize/blob/anchor dance downloadCSV already does
        downloadCSV(
          options.columns.map((col) => columnLabel(col)),
          items.map((i) => options.columns.map((col) => getCellValue(i, col))),
          `inventory-${timestamp}.csv`,
        );
      } else if (options.format === 'pdf') {
        // Build branding header if enabled
        let brandingHtml = '';
        if (options.includeBranding && currentUser?.profile) {
          const p = currentUser.profile;
          const sf = p.showFields || {};
          const parts = [];
          if (sf.businessName && p.businessName)
            parts.push(`<strong>${escHtml(p.businessName)}</strong>`);
          const details = [];
          if (sf.displayName && p.displayName) details.push(escHtml(p.displayName));
          if (sf.phone && p.phone) details.push(escHtml(p.phone));
          if (sf.email && p.email) details.push(escHtml(p.email));
          if (sf.address && p.address) details.push(escHtml(p.address));
          if (details.length)
            parts.push(
              `<span style="font-size:11px;color:#666;">${details.join(' &bull; ')}</span>`,
            );
          const logoHtml =
            sf.logo && p.logo
              ? `<img src="${escHtml(p.logo)}" style="height:36px;object-fit:contain;margin-right:12px;" />`
              : '';
          if (logoHtml || parts.length) {
            brandingHtml = `<div style="display:flex;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ddd;">${logoHtml}<div>${parts.join('<br/>')}</div></div>`;
          }
        }

        const headerRow = options.columns
          .map(
            (col) =>
              `<th style="padding:8px 12px;text-align:left;border-bottom:2px solid #333;font-size:12px;">${escHtml(columnLabel(col))}</th>`,
          )
          .join('');
        const bodyRows = items
          .map(
            (item) =>
              `<tr>${options.columns
                .map((col) => {
                  const val = getCellValue(item, col);
                  return `<td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:11px;">${escHtml(val)}</td>`;
                })
                .join('')}</tr>`,
          )
          .join('');
        openPrintWindow({
          title: 'Inventory Export',
          onBlocked: () => addToast('Print pop-up blocked — allow pop-ups for this site', 'error'),
          styles: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          tr:nth-child(even) { background: #f9f9f9; }
          @media print { body { padding: 0; } }
        `,
          body: `
          ${brandingHtml}
          <h1>Inventory Export</h1>
          <div class="meta">${items.length} items &bull; ${new Date().toLocaleDateString()}</div>
          <table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>
        `,
        });
      }
    },
    [inventory, selectedIds, currentUser, addToast],
  );

  const saveNotificationPreferences = useCallback(
    async (prefs) => {
      try {
        await dataContext.saveNotificationPreferences(currentUser.id, prefs);
      } catch (err) {
        // Rethrow so the settings view keeps its unsaved-changes state — the
        // old swallow patched the user anyway, so the UI asserted "saved"
        // over preferences that reverted on reload
        logError('Failed to save notification preferences:', err);
        addToast('Notification preferences did not save. Please try again.', 'error');
        throw err;
      }
      patchUser(currentUser.id, { notificationPreferences: prefs });
      setCurrentUser((prev) => ({ ...prev, notificationPreferences: prefs }));
    },
    [dataContext, currentUser, addToast, patchUser],
  );

  const openMaintenanceEditModal = useCallback(
    (record) => {
      setEditingMaintenanceRecord(record);
      setMaintenanceItem(selectedItem);
      openModal(MODALS.MAINTENANCE);
    },
    [selectedItem, setEditingMaintenanceRecord, setMaintenanceItem, openModal],
  );

  const handleMobileNavigate = useCallback(
    (view) => {
      setSidebarOpen(false);
      handleNavigate(view);
    },
    [handleNavigate, setSidebarOpen],
  );

  // ============================================================================
  // Handler Objects (passed to AppViews and AppModals)
  // ============================================================================
  const viewHandlers = useMemo(
    () => ({
      navigateToItem,
      navigateToReservation,
      navigateToFilteredSearch,
      navigateToAlerts,
      navigateToOverdue,
      navigateToLowStock,
      navigateToReservations,
      handleToggleCollapse,
      handleSaveLayoutPrefs,
      handleSaveFilterViews,
      updateUiPrefs,
      createItem,
      deleteItem,
      openEditItem,
      handleBulkAction,
      openCheckoutModal,
      openCheckinModal,
      openMaintenanceModal,
      openMaintenanceEditModal,
      itemNoteHandlers,
      packageNoteHandlers,
      clientNoteHandlers,
      reservationNoteHandlers,
      addReminder,
      completeReminder,
      uncompleteReminder,
      deleteReminder,
      openEditReservation,
      deleteReservation,
      saveReservation,
      reservePackage,
      setKitStatus,
      addKitItems,
      removeKitItem,
      addRequiredAccessories,
      removeRequiredAccessory,
      updateItemValue,
      selectImage,
      addItemToPackage,
      updateMaintenanceStatus,
      updateUserProfile,
      addAuditLog,
      resetItemForm,
      resetReservationForm,
      openModal,
      closeModal,
      saveNotificationPreferences,
    }),
    [
      navigateToItem,
      navigateToReservation,
      navigateToFilteredSearch,
      navigateToAlerts,
      navigateToOverdue,
      navigateToLowStock,
      navigateToReservations,
      handleToggleCollapse,
      handleSaveLayoutPrefs,
      handleSaveFilterViews,
      updateUiPrefs,
      createItem,
      deleteItem,
      openEditItem,
      handleBulkAction,
      openCheckoutModal,
      openCheckinModal,
      openMaintenanceModal,
      openMaintenanceEditModal,
      itemNoteHandlers,
      packageNoteHandlers,
      clientNoteHandlers,
      reservationNoteHandlers,
      addReminder,
      completeReminder,
      uncompleteReminder,
      deleteReminder,
      openEditReservation,
      deleteReservation,
      saveReservation,
      reservePackage,
      setKitStatus,
      addKitItems,
      removeKitItem,
      addRequiredAccessories,
      removeRequiredAccessory,
      updateItemValue,
      selectImage,
      addItemToPackage,
      updateMaintenanceStatus,
      updateUserProfile,
      addAuditLog,
      resetItemForm,
      resetReservationForm,
      openModal,
      closeModal,
      saveNotificationPreferences,
    ],
  );

  const modalHandlers = useMemo(
    () => ({
      createItem,
      updateItem,
      deleteItem,
      saveReservation,
      selectImage,
      navigateToItem,
      exportData,
      updateUserProfile,
      addAuditLog,
      openModal,
      closeModal,
      checkoutItem,
      checkinItemData,
      openCheckoutModal,
      openCheckinModal,
      processCheckout,
      processCheckin,
      maintenanceItem,
      editingMaintenanceRecord,
      setEditingMaintenanceRecord,
      saveMaintenance,
      bulkActionIds,
      setBulkActionIds,
      applyBulkStatus,
      applyBulkLocation,
      applyBulkCategory,
      applyBulkDelete,
    }),
    [
      createItem,
      updateItem,
      deleteItem,
      saveReservation,
      selectImage,
      navigateToItem,
      exportData,
      updateUserProfile,
      addAuditLog,
      openModal,
      closeModal,
      checkoutItem,
      checkinItemData,
      openCheckoutModal,
      openCheckinModal,
      processCheckout,
      processCheckin,
      maintenanceItem,
      editingMaintenanceRecord,
      setEditingMaintenanceRecord,
      saveMaintenance,
      bulkActionIds,
      setBulkActionIds,
      applyBulkStatus,
      applyBulkLocation,
      applyBulkCategory,
      applyBulkDelete,
    ],
  );

  // ============================================================================
  // Loading / Login
  // ============================================================================
  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.bgDark,
          backgroundImage: currentTheme.backgroundImage || 'none',
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'fixed',
          cursor: currentTheme.cursor || 'default',
        }}
      >
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
      <div
        className={`app-wrapper ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''}`}
        style={{
          display: 'flex',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: colors.textPrimary,
          backgroundColor: colors.bgDark,
          backgroundImage: currentTheme.backgroundImage || 'none',
          backgroundRepeat: 'repeat',
          backgroundAttachment: 'fixed',
          cursor: currentTheme.cursor || 'default',
        }}
      >
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
          onOpenProfile={() => {
            setSidebarOpen(false);
            openModal(MODALS.PROFILE);
          }}
          onOpenScanner={() => {
            setSidebarOpen(false);
            openModal(MODALS.QR_SCANNER);
          }}
          onOpenImport={() => {
            setSidebarOpen(false);
            openModal(MODALS.CSV_IMPORT);
          }}
          onOpenExport={() => {
            setSidebarOpen(false);
            openModal(MODALS.DATABASE_EXPORT);
          }}
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

          {dataContext.loading && (
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
                animation: 'shimmer 1.5s infinite',
                flexShrink: 0,
              }}
            />
          )}

          <AppViews handlers={viewHandlers} currentUser={currentUser} changeLog={changeLog} />
        </main>

        <AppModals handlers={modalHandlers} currentUser={currentUser} />
      </div>
    </PermissionsProvider>
  );
}
