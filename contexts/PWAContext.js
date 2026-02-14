// =============================================================================
// PWAContext - Context object and hook
// Provider lives in PWAContext.jsx
// =============================================================================

import { createContext, useContext } from 'react';
import { InstallStatus } from '../hooks/usePWA.js';

const PWAContext = createContext(null);

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

export default PWAContext;
