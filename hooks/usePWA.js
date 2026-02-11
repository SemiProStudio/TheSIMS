// =============================================================================
// usePWA Hook
// Manages PWA installation, service worker, and online/offline status
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { log, error as logError } from '../lib/logger.js';

/**
 * PWA installation status
 */
export const InstallStatus = {
  IDLE: 'idle',
  AVAILABLE: 'available',
  INSTALLED: 'installed',
  DISMISSED: 'dismissed',
};

/**
 * Custom hook for PWA functionality
 * @returns {Object} PWA state and methods
 */
export function usePWA() {
  // Installation state
  const [installStatus, setInstallStatus] = useState(InstallStatus.IDLE);
  const [installPrompt, setInstallPrompt] = useState(null);
  
  // Online/offline state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // Service worker state
  const [swStatus, setSwStatus] = useState('idle'); // idle, installing, installed, updating, updated
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Refs
  const deferredPrompt = useRef(null);

  // ============================================================================
  // Online/Offline Detection
  // ============================================================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      log('[PWA] Online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      log('[PWA] Offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ============================================================================
  // Install Prompt Handling
  // ============================================================================

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome's default mini-infobar
      e.preventDefault();
      
      // Store the event for later use
      deferredPrompt.current = e;
      setInstallPrompt(e);
      setInstallStatus(InstallStatus.AVAILABLE);
      
      log('[PWA] Install prompt available');
    };
    
    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setInstallPrompt(null);
      setInstallStatus(InstallStatus.INSTALLED);
      
      log('[PWA] App installed');
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallStatus(InstallStatus.INSTALLED);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Prompt user to install the PWA
   */
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt.current) {
      log('[PWA] No install prompt available');
      return { outcome: 'unavailable' };
    }
    
    // Show the prompt
    deferredPrompt.current.prompt();
    
    // Wait for user choice
    const { outcome } = await deferredPrompt.current.userChoice;
    
    log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
      setInstallStatus(InstallStatus.INSTALLED);
    } else {
      setInstallStatus(InstallStatus.DISMISSED);
    }
    
    // Clear the prompt
    deferredPrompt.current = null;
    setInstallPrompt(null);
    
    return { outcome };
  }, []);

  /**
   * Dismiss install prompt
   */
  const dismissInstall = useCallback(() => {
    setInstallStatus(InstallStatus.DISMISSED);
    log('[PWA] Install dismissed');
  }, []);

  // ============================================================================
  // Service Worker Registration
  // ============================================================================

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      log('[PWA] Service workers not supported');
      return;
    }

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
        
        // Handle controller change (after skipWaiting)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        
        setSwStatus('installed');
      } catch (error) {
        logError('[PWA] Service worker registration failed:', error);
        setSwStatus('idle');
      }
    };

    registerSW();
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

  /**
   * Check for service worker updates
   */
  const checkForUpdates = useCallback(async () => {
    if (!swRegistration) return;
    
    try {
      await swRegistration.update();
      log('[PWA] Checked for updates');
    } catch (error) {
      logError('[PWA] Update check failed:', error);
    }
  }, [swRegistration]);

  /**
   * Clear all caches
   */
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      log('[PWA] Cache cleared');
    }
  }, []);

  // ============================================================================
  // Push Notifications
  // ============================================================================

  /**
   * Request notification permission
   */
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      log('[PWA] Notifications not supported');
      return 'unsupported';
    }
    
    const permission = await Notification.requestPermission();
    log('[PWA] Notification permission:', permission);
    return permission;
  }, []);

  /**
   * Check if notifications are enabled
   */
  const notificationsEnabled = 
    typeof Notification !== 'undefined' && 
    Notification.permission === 'granted';

  /**
   * Send a local notification
   */
  const sendNotification = useCallback((title, options = {}) => {
    if (!notificationsEnabled) {
      log('[PWA] Notifications not enabled');
      return null;
    }
    
    return new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });
  }, [notificationsEnabled]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const canInstall = installStatus === InstallStatus.AVAILABLE;
  const isInstalled = installStatus === InstallStatus.INSTALLED || 
    window.matchMedia('(display-mode: standalone)').matches;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  return {
    // Online status
    isOnline,
    
    // Installation
    installStatus,
    canInstall,
    isInstalled,
    isStandalone,
    promptInstall,
    dismissInstall,
    
    // Service worker
    swStatus,
    swRegistration,
    updateAvailable,
    updateServiceWorker,
    checkForUpdates,
    clearCache,
    
    // Notifications
    notificationsEnabled,
    requestNotificationPermission,
    sendNotification,
  };
}

export default usePWA;
