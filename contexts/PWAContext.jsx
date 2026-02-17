// =============================================================================
// PWA Context Provider
// Provides PWA functionality (install prompt, offline status, service worker)
// =============================================================================

import { useMemo } from 'react';
import { usePWA } from '../hooks/usePWA.js';
import PWAContext from './PWAContext.js';

/**
 * PWA Provider Component
 * Wraps the app to provide PWA functionality throughout
 */
export function PWAProvider({ children }) {
  const pwa = usePWA();

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => pwa, [pwa]);

  return <PWAContext.Provider value={contextValue}>{children}</PWAContext.Provider>;
}
