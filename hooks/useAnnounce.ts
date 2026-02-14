// ============================================================================
// useAnnounce - React hook for screen reader announcements
// ============================================================================

import { useCallback, useEffect, useRef } from 'react';
import {
  announce,
  announceAssertive,
  announceAdded,
  announceRemoved,
  announceLoading,
  announceLoaded,
  announceError,
  announceSuccess,
  announcePageChange,
  announceModal,
  announceSelection,
  announceFilterChange,
} from '../utils/accessibility';

/**
 * Hook for screen reader announcements in React components
 * Provides memoized announcement functions that are stable across re-renders
 * 
 * @returns {Object} Announcement functions
 * 
 * @example
 * const { announcePageChange, announceSuccess } = useAnnounce();
 * 
 * useEffect(() => {
 *   announcePageChange('Dashboard');
 * }, [currentView]);
 */
export function useAnnounce() {
  return {
    announce: useCallback((message, politeness) => announce(message, politeness), []),
    announceAssertive: useCallback((message) => announceAssertive(message), []),
    announceAdded: useCallback((itemName, context) => announceAdded(itemName, context), []),
    announceRemoved: useCallback((itemName, context) => announceRemoved(itemName, context), []),
    announceLoading: useCallback((content) => announceLoading(content), []),
    announceLoaded: useCallback((content, count) => announceLoaded(content, count), []),
    announceError: useCallback((errorMessage) => announceError(errorMessage), []),
    announceSuccess: useCallback((message) => announceSuccess(message), []),
    announcePageChange: useCallback((pageName) => announcePageChange(pageName), []),
    announceModal: useCallback((modalName, isOpen) => announceModal(modalName, isOpen), []),
    announceSelection: useCallback((itemName, isSelected) => announceSelection(itemName, isSelected), []),
    announceFilterChange: useCallback((filterType, value) => announceFilterChange(filterType, value), []),
  };
}

/**
 * Hook that announces when a view/page changes
 * 
 * @param {string} viewName - Current view name to announce
 * @param {Object} options - Options
 * @param {boolean} options.skip - Skip the announcement
 * 
 * @example
 * useAnnounceViewChange(currentView === VIEWS.DASHBOARD ? 'Dashboard' : 'Gear List');
 */
export function useAnnounceViewChange(viewName, options = {}) {
  const { skip = false } = options;
  const previousViewRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render to avoid announcing on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousViewRef.current = viewName;
      return;
    }

    // Skip if view hasn't changed or skip option is true
    if (skip || viewName === previousViewRef.current) {
      return;
    }

    previousViewRef.current = viewName;
    announcePageChange(viewName);
  }, [viewName, skip]);
}

/**
 * Hook that announces loading state changes
 * 
 * @param {boolean} isLoading - Current loading state
 * @param {string} contentName - Name of content being loaded
 * @param {number} itemCount - Optional count of loaded items
 * 
 * @example
 * useAnnounceLoading(isLoading, 'Inventory', items.length);
 */
export function useAnnounceLoading(isLoading, contentName = 'Content', itemCount = null) {
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      announceLoading(contentName);
    } else if (!isLoading && wasLoadingRef.current) {
      announceLoaded(contentName, itemCount);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, contentName, itemCount]);
}

/**
 * Hook that announces modal open/close
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {string} modalName - Name of the modal
 * 
 * @example
 * useAnnounceModal(isAddItemOpen, 'Add Item');
 */
export function useAnnounceModal(isOpen, modalName) {
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen !== wasOpenRef.current) {
      announceModal(modalName, isOpen);
      wasOpenRef.current = isOpen;
    }
  }, [isOpen, modalName]);
}

/**
 * Hook that announces errors
 * 
 * @param {string|null} error - Current error message
 * 
 * @example
 * useAnnounceError(formError);
 */
export function useAnnounceError(error) {
  const previousErrorRef = useRef(null);

  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      announceError(error);
    }
    previousErrorRef.current = error;
  }, [error]);
}

export default useAnnounce;
