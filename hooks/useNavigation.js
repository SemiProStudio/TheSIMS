// =============================================================================
// useNavigation Hook
// Manages application navigation state and browser history
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { VIEWS } from '../constants.js';

/**
 * Custom hook for managing application navigation state and browser history
 * @param {Object} options - Configuration options
 * @param {boolean} options.isLoggedIn - Whether user is logged in
 * @param {Array} options.inventory - Inventory array for finding items
 * @param {Array} options.packages - Packages array for finding packages
 * @returns {Object} Navigation state and handlers
 */
export function useNavigation({ isLoggedIn = false, inventory = [], packages = [] } = {}) {
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
  
  // Push to browser history when view changes (unless it's from popstate)
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
    
    // Replace state on initial load, push on subsequent navigations
    if (window.history.state?.view === undefined) {
      window.history.replaceState(state, '', window.location.pathname);
    } else if (window.history.state?.view !== currentView || 
               window.history.state?.selectedItemId !== state.selectedItemId) {
      window.history.pushState(state, '', window.location.pathname);
    }
  }, [currentView, selectedItem?.id, selectedPackage?.id, isLoggedIn]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      if (!isLoggedIn) return;
      
      isPopstateNav.current = true;
      
      if (event.state?.view) {
        setCurrentView(event.state.view);
        
        // Restore selected item if navigating back to detail view
        if (event.state.view === VIEWS.GEAR_DETAIL && event.state.selectedItemId) {
          const item = inventory.find(i => i.id === event.state.selectedItemId);
          if (item) setSelectedItem(item);
        } else if (event.state.view === VIEWS.PACKAGE_DETAIL && event.state.selectedPackageId) {
          const pkg = packages.find(p => p.id === event.state.selectedPackageId);
          if (pkg) setSelectedPackage(pkg);
        }
      } else {
        // No state means we're at the beginning - go to dashboard
        setCurrentView(VIEWS.DASHBOARD);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, inventory, packages]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  /**
   * Navigate to a specific view
   * @param {string} viewId - The view to navigate to
   */
  const navigate = useCallback((viewId) => {
    setCurrentView(viewId);
    
    // Scroll to top on navigation (important for mobile)
    window.scrollTo(0, 0);
    // Also scroll main content area if it exists
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    
    // Clear selections when navigating to list views
    if (viewId === VIEWS.GEAR_LIST) {
      setSelectedItem(null);
    } else if (viewId === VIEWS.PACKAGES) {
      setSelectedPackage(null);
    } else if (viewId === VIEWS.PACK_LISTS) {
      setSelectedPackList(null);
    }
  }, []);

  /**
   * Navigate to item detail view
   * @param {Object} item - The item to view
   * @param {string} backContext - Where to return to (optional)
   */
  const navigateToItem = useCallback((item, backContext = null) => {
    setSelectedItem(item);
    setItemBackContext(backContext);
    setCurrentView(VIEWS.GEAR_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  /**
   * Navigate to package detail view
   * @param {Object} pkg - The package to view
   */
  const navigateToPackage = useCallback((pkg) => {
    setSelectedPackage(pkg);
    setCurrentView(VIEWS.PACKAGE_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  /**
   * Navigate to pack list detail view
   * @param {Object} packList - The pack list to view
   */
  const navigateToPackList = useCallback((packList) => {
    setSelectedPackList(packList);
    setCurrentView(VIEWS.PACK_LIST_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  /**
   * Navigate to reservation detail view
   * @param {Object} reservation - The reservation to view
   * @param {Object} item - The item the reservation is for
   */
  const navigateToReservation = useCallback((reservation, item) => {
    setSelectedReservation(reservation);
    setSelectedReservationItem(item);
    setCurrentView(VIEWS.RESERVATION_DETAIL);
    window.scrollTo(0, 0);
  }, []);

  /**
   * Go back from detail view to list view
   */
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

  /**
   * Check if current view is a detail view
   */
  const isDetailView = [
    VIEWS.GEAR_DETAIL,
    VIEWS.PACKAGE_DETAIL,
    VIEWS.PACK_LIST_DETAIL,
    VIEWS.RESERVATION_DETAIL,
  ].includes(currentView);

  /**
   * Reset navigation state (e.g., on logout)
   */
  const resetNavigation = useCallback(() => {
    setCurrentView(VIEWS.DASHBOARD);
    setSelectedItem(null);
    setSelectedPackage(null);
    setSelectedPackList(null);
    setSelectedReservation(null);
    setSelectedReservationItem(null);
    setItemBackContext(null);
  }, []);

  return {
    // State
    currentView,
    selectedItem,
    selectedPackage,
    selectedPackList,
    selectedReservation,
    selectedReservationItem,
    itemBackContext,
    isDetailView,
    
    // Setters (for direct manipulation if needed)
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
  };
}

export default useNavigation;
