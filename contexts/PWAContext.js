// =============================================================================
// PWAContext - Context object and hook
// Provider lives in PWAContext.jsx
// =============================================================================

import { createContext, useContext } from 'react';

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
      swStatus: 'idle',
      updateAvailable: false,
      updateServiceWorker: () => {},
    };
  }

  return context;
}

export default PWAContext;
