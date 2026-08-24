// =============================================================================
// PWA Context Provider
// Provides the service-worker update state (see hooks/usePWA.js)
// =============================================================================

import { useMemo } from 'react';
import { usePWA } from '../hooks/usePWA.js';
import PWAContext from './PWAContext.js';

/**
 * PWA Provider Component
 * Wraps the app to provide PWA functionality throughout
 */
export function PWAProvider({ children }) {
  const { swStatus, updateAvailable, updateServiceWorker } = usePWA();

  // Memoize on the individual fields — memoizing on the hook's (always
  // fresh) result object was a no-op that re-rendered every consumer
  const contextValue = useMemo(
    () => ({ swStatus, updateAvailable, updateServiceWorker }),
    [swStatus, updateAvailable, updateServiceWorker],
  );

  return <PWAContext.Provider value={contextValue}>{children}</PWAContext.Provider>;
}
