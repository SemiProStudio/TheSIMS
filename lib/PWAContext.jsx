// =============================================================================
// PWA Context Provider
// Provides PWA functionality (install prompt, offline status, service worker)
// =============================================================================

import React, { createContext, useContext, useMemo } from 'react';
import { usePWA, InstallStatus } from '../hooks/usePWA.js';

// Create context
const PWAContext = createContext(null);

/**
 * PWA Provider Component
 * Wraps the app to provide PWA functionality throughout
 */
export function PWAProvider({ children }) {
  const pwa = usePWA();
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => pwa, [
    pwa.isOnline,
    pwa.installStatus,
    pwa.swStatus,
    pwa.updateAvailable,
    pwa.notificationsEnabled,
  ]);
  
  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
}

/**
 * Hook to access PWA context
 * @returns {Object} PWA state and methods
 */
export function usePWAContext() {
  const context = useContext(PWAContext);
  
  if (!context) {
    // Return a fallback if not in provider (for testing or SSR)
    return {
      isOnline: true,
      installStatus: InstallStatus.IDLE,
      canInstall: false,
      isInstalled: false,
      isStandalone: false,
      promptInstall: () => Promise.resolve({ outcome: 'unavailable' }),
      dismissInstall: () => {},
      swStatus: 'idle',
      swRegistration: null,
      updateAvailable: false,
      updateServiceWorker: () => {},
      checkForUpdates: () => Promise.resolve(false),
      clearCache: () => Promise.resolve(),
      notificationsEnabled: false,
      requestNotificationPermission: () => Promise.resolve(false),
      sendNotification: () => null,
    };
  }
  
  return context;
}

// Re-export InstallStatus for convenience
export { InstallStatus };

export default PWAProvider;
