// =============================================================================
// SidebarContext
// Provides sidebar state via context so toggling sidebar only re-renders
// sidebar-dependent components — not the entire App tree.
// =============================================================================

import { useState, useEffect, useMemo } from 'react';
import SidebarContext from './SidebarContext.js';
import { breakpoints } from '../theme.js';

const STORAGE_KEY = 'sims-sidebar-collapsed';

// Safe localStorage wrapper
const safeLocalStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === 'true';
    // No stored choice: default to the icon rail on tablet-width screens.
    // An explicit user toggle (or profile pref applied later) always wins.
    if (
      typeof window !== 'undefined' &&
      window.innerWidth > breakpoints.phone &&
      window.innerWidth <= breakpoints.desktop
    ) {
      return true;
    }
    return false;
  });

  // Phones get the off-canvas drawer; 641-1024px keeps the real sidebar as
  // a collapsed icon rail (see above) so tablets don't get the phone nav
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoints.phone;
  });

  // Persist collapsed state
  useEffect(() => {
    safeLocalStorage.setItem(STORAGE_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Responsive resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < breakpoints.phone;
      setIsMobile(mobile);
      if (!mobile && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Escape key closes mobile sidebar
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen && isMobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isMobile]);

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      sidebarCollapsed,
      setSidebarCollapsed,
    }),
    [sidebarOpen, sidebarCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}
