// =============================================================================
// NavigationContext
// Provides navigation state via context so only navigation-dependent
// components re-render on view changes — not the entire App tree.
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VIEWS } from '../constants.js';
import { useData } from './DataContext.jsx';
import { useAuth } from './AuthContext.jsx';

const NavigationContext = createContext(null);

/**
 * NavigationProviderWithData - A wrapper that pulls inventory/packages from DataContext
 * and isLoggedIn from AuthContext, then passes them to NavigationProvider
 */
export function NavigationProviderWithData({ children }) {
  const { inventory, packages } = useData();
  const { isAuthenticated } = useAuth();
  
  return (
    <NavigationProvider isLoggedIn={isAuthenticated} inventory={inventory || []} packages={packages || []}>
      {children}
    </NavigationProvider>
  );
}

export function NavigationProvider({ children, isLoggedIn = false, inventory = [], packages = [] }) {
  // Navigation state
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPackList, setSelectedPackList] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedReservationItem, setSelectedReservationItem] = useState(null);
  const [itemBackContext, setItemBackContext] = useState(null);

  // Track if navigation is from popstate (browser back/forward)
  const isPopstateNav = useRef(false);

  // ============================================================================
  // Browser History Management
  // ============================================================================

  useEffect(() => {
    if (!isLoggedIn) return;

    if (isPopstateNav.current) {
      isPopstateNav.current = false;
      return;
    }

    const state = {
      view: currentView,
      selectedItemId: selectedItem?.id || null,
      selectedPackageId: selectedPackage?.id || null,
    };

    if (window.history.state?.view === undefined) {
      window.history.replaceState(state, '', window.location.pathname);
    } else if (window.history.state?.view !== currentView ||
               window.history.state?.selectedItemId !== state.selectedItemId) {
      window.history.pushState(state, '', window.location.pathname);
    }
  }, [currentView, selectedItem?.id, selectedPackage?.id, isLoggedIn]);

  useEffect(() => {
    const handlePopState = (event) => {
      if (!isLoggedIn) return;

      isPopstateNav.current = true;

      if (event.state?.view) {
        setCurrentView(event.state.view);

        if (event.state.view === VIEWS.GEAR_DETAIL && event.state.selectedItemId) {
          const item = inventory.find(i => i.id === event.state.selectedItemId);
          if (item) setSelectedItem(item);
        } else if (event.state.view === VIEWS.PACKAGE_DETAIL && event.state.selectedPackageId) {
          const pkg = packages.find(p => p.id === event.state.selectedPackageId);
          if (pkg) setSelectedPackage(pkg);
        }
      } else {
        setCurrentView(VIEWS.DASHBOARD);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, inventory, packages]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const navigate = useCallback((viewId) => {
    setCurrentView(viewId);
    window.scrollTo(0, 0);
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.scrollTop = 0;

    if (viewId === VIEWS.GEAR_LIST) setSelectedItem(null);
    else if (viewId === VIEWS.PACKAGES) setSelectedPackage(null);
    else if (viewId === VIEWS.PACK_LISTS) setSelectedPackList(null);
  }, []);

  const navigateToItem = useCallback((item, backContext = null) => {
    setSelectedItem(item);
    setItemBackContext(backContext);
    setCurrentView(VIEWS.GEAR_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  const navigateToPackage = useCallback((pkg) => {
    setSelectedPackage(pkg);
    setCurrentView(VIEWS.PACKAGE_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  const navigateToPackList = useCallback((packList) => {
    setSelectedPackList(packList);
    setCurrentView(VIEWS.PACK_LIST_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  const navigateToReservation = useCallback((reservation, item) => {
    setSelectedReservation(reservation);
    setSelectedReservationItem(item);
    setCurrentView(VIEWS.RESERVATION_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback(() => {
    if (currentView === VIEWS.GEAR_DETAIL) {
      setSelectedItem(null);
      setCurrentView(itemBackContext || VIEWS.GEAR_LIST);
      setItemBackContext(null);
    } else if (currentView === VIEWS.PACKAGE_DETAIL) {
      setSelectedPackage(null);
      setCurrentView(VIEWS.PACKAGES);
    } else if (currentView === VIEWS.PACK_LIST_DETAIL) {
      setSelectedPackList(null);
      setCurrentView(VIEWS.PACK_LISTS);
    } else if (currentView === VIEWS.RESERVATION_DETAIL) {
      setSelectedReservation(null);
      setSelectedReservationItem(null);
      setCurrentView(VIEWS.SCHEDULE);
    } else {
      setCurrentView(VIEWS.DASHBOARD);
    }
    window.scrollTo(0, 0);
  }, [currentView, itemBackContext]);

  const isDetailView = [
    VIEWS.GEAR_DETAIL,
    VIEWS.PACKAGE_DETAIL,
    VIEWS.PACK_LIST_DETAIL,
    VIEWS.RESERVATION_DETAIL,
  ].includes(currentView);

  const resetNavigation = useCallback(() => {
    setCurrentView(VIEWS.DASHBOARD);
    setSelectedItem(null);
    setSelectedPackage(null);
    setSelectedPackList(null);
    setSelectedReservation(null);
    setSelectedReservationItem(null);
    setItemBackContext(null);
  }, []);

  // ============================================================================
  // Memoized context value — only changes when actual state changes
  // ============================================================================
  const value = useMemo(() => ({
    // State
    currentView,
    selectedItem,
    selectedPackage,
    selectedPackList,
    selectedReservation,
    selectedReservationItem,
    itemBackContext,
    isDetailView,

    // Setters
    setCurrentView,
    setSelectedItem,
    setSelectedPackage,
    setSelectedPackList,
    setSelectedReservation,
    setSelectedReservationItem,
    setItemBackContext,

    // Handlers
    navigate,
    navigateToItem,
    navigateToPackage,
    navigateToPackList,
    navigateToReservation,
    goBack,
    resetNavigation,
  }), [
    currentView, selectedItem, selectedPackage, selectedPackList,
    selectedReservation, selectedReservationItem, itemBackContext, isDetailView,
    navigate, navigateToItem, navigateToPackage, navigateToPackList,
    navigateToReservation, goBack, resetNavigation,
  ]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigationContext must be used within NavigationProvider');
  return ctx;
}

export default NavigationContext;
