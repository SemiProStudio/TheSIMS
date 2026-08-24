// =============================================================================
// usePWA Hook
// Service-worker registration and the update-available flow — the parts of
// the PWA layer the app actually ships. The former install-prompt, offline
// indicator, cache-management and push-notification surface had zero
// consumers (2026-08-24 audit §3.1) and was stripped to this working core.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { log, error as logError } from '../lib/logger.js';

/**
 * Registers /sw.js and tracks the update lifecycle.
 * @returns {{ swStatus: string, updateAvailable: boolean, updateServiceWorker: Function }}
 */
export function usePWA() {
  const [swStatus, setSwStatus] = useState('idle'); // idle, installing, installed, updated
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      log('[PWA] Service workers not supported');
      return;
    }

    // The controllerchange listener must be removed on cleanup — StrictMode's
    // double-mount used to stack a second listener that could double the
    // update reload
    let removeControllerListener = null;

    const registerSW = async () => {
      try {
        setSwStatus('installing');

        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        setSwRegistration(registration);
        log('[PWA] Service worker registered');

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available
                  setUpdateAvailable(true);
                  setSwStatus('updated');
                  log('[PWA] Update available');
                } else {
                  // First install
                  setSwStatus('installed');
                  log('[PWA] Service worker installed');
                }
              }
            });
          }
        });

        // Check for waiting worker on page load
        if (registration.waiting) {
          setUpdateAvailable(true);
          setSwStatus('updated');
        }

        // Handle controller change (after skipWaiting).
        // Only reload when a NEW worker takes over from a previous one (an
        // update). On FIRST install the claim also fires controllerchange,
        // but the page is already running fine — reloading then interrupts
        // the user seconds after arrival (and used to bounce QR deep-link
        // landings back to the dashboard).
        let hadController = !!navigator.serviceWorker.controller;
        let refreshing = false;
        const onControllerChange = () => {
          const wasControlled = hadController;
          hadController = true;
          if (!wasControlled || refreshing) return;
          refreshing = true;
          window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
        removeControllerListener = () =>
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);

        setSwStatus('installed');

        // Periodically check for SW updates (every 30 minutes)
        // This catches deploys that happen while the tab is open
        const updateInterval = setInterval(
          () => {
            registration.update().catch(() => {});
          },
          30 * 60 * 1000,
        );

        // Also check on visibility change (user returns to tab)
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
          clearInterval(updateInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      } catch (error) {
        logError('[PWA] Service worker registration failed:', error);
        setSwStatus('idle');
      }
    };

    const cleanup = registerSW();
    return () => {
      removeControllerListener?.();
      cleanup?.then?.((fn) => fn?.());
    };
  }, []);

  /**
   * Update the service worker immediately
   */
  const updateServiceWorker = useCallback(() => {
    if (!swRegistration?.waiting) {
      return;
    }

    // Send skip waiting message to waiting worker
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);

    log('[PWA] Updating service worker');
  }, [swRegistration]);

  return {
    swStatus,
    updateAvailable,
    updateServiceWorker,
  };
}
