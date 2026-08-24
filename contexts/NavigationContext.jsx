// =============================================================================
// NavigationContext
// Provides navigation state via context so only navigation-dependent
// components re-render on view changes — not the entire App tree.
// =============================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VIEWS } from '../constants.js';
import { useData } from './DataContext.js';
import { useAuth } from './AuthContext.js';
import NavigationContext from './NavigationContext.js';

/**
 * NavigationProviderWithData - A wrapper that pulls inventory from DataContext
 * and isLoggedIn from AuthContext, then passes them to NavigationProvider
 */
export function NavigationProviderWithData({ children }) {
  const { inventory } = useData();
  const { isAuthenticated } = useAuth();

  return (
    <NavigationProvider isLoggedIn={isAuthenticated} inventory={inventory || []}>
      {children}
    </NavigationProvider>
  );
}

export function NavigationProvider({ children, isLoggedIn = false, inventory = [] }) {
  // Navigation state
  const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedPackList, setSelectedPackList] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedReservationItem, setSelectedReservationItem] = useState(null);
  const [itemBackContext, setItemBackContext] = useState(null);
  const [reservationBackView, setReservationBackView] = useState(null);
  // Bumped on every sidebar/menu navigation. Views that keep sub-views in
  // component state (Packages, Pack Lists) watch it so re-clicking the
  // current view's nav entry resets to the overview — a same-value
  // setCurrentView/setSelected*(null) alone produces no render signal.
  const [navigationNonce, setNavigationNonce] = useState(0);
  const bumpNavigationNonce = useCallback(() => setNavigationNonce((n) => n + 1), []);

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
    } else if (
      window.history.state?.view !== currentView ||
      window.history.state?.selectedItemId !== state.selectedItemId
    ) {
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
          const item = inventory.find((i) => i.id === event.state.selectedItemId);
          if (item) setSelectedItem(item);
        }
      } else {
        setCurrentView(VIEWS.DASHBOARD);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isLoggedIn, inventory]);

  // ============================================================================
  // Memoized context value — only changes when actual state changes
  // ============================================================================
  const value = useMemo(
    () => ({
      // State
      currentView,
      selectedItem,
      selectedPackage,
      selectedPackList,
      selectedReservation,
      selectedReservationItem,
      itemBackContext,
      reservationBackView,
      navigationNonce,

      // Setters
      setCurrentView,
      setSelectedItem,
      setSelectedPackage,
      setSelectedPackList,
      setSelectedReservation,
      setSelectedReservationItem,
      setItemBackContext,
      setReservationBackView,

      // Handlers
      bumpNavigationNonce,
    }),
    [
      currentView,
      selectedItem,
      selectedPackage,
      selectedPackList,
      selectedReservation,
      selectedReservationItem,
      itemBackContext,
      reservationBackView,
      navigationNonce,
      bumpNavigationNonce,
    ],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
