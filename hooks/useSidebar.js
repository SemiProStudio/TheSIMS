// =============================================================================
// useSidebar Hook
// Manages sidebar open/collapsed state with localStorage persistence
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

// Safe localStorage wrapper (handles private browsing mode)
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
  removeItem(key) {
    try { 
      localStorage.removeItem(key); 
    } catch { 
      /* ignore */ 
    }
  },
};

/**
 * Custom hook for managing sidebar state
 * @param {Object} options - Configuration options
 * @param {string} options.storageKey - localStorage key for collapsed state
 * @param {boolean} options.defaultCollapsed - Default collapsed state
 * @param {number} options.mobileBreakpoint - Breakpoint for mobile behavior
 * @returns {Object} Sidebar state and handlers
 */
export function useSidebar({
  storageKey = 'sims-sidebar-collapsed',
  defaultCollapsed = false,
  mobileBreakpoint = 768,
} = {}) {
  // Mobile sidebar open state (overlay mode)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Desktop sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeLocalStorage.getItem(storageKey);
    return saved === 'true' ? true : defaultCollapsed;
  });
  
  // Track if we're on mobile
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < mobileBreakpoint;
  });

  // ============================================================================
  // Persist collapsed state to localStorage
  // ============================================================================
  
  useEffect(() => {
    safeLocalStorage.setItem(storageKey, String(sidebarCollapsed));
  }, [sidebarCollapsed, storageKey]);

  // ============================================================================
  // Handle window resize for responsive behavior
  // ============================================================================
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      
      // Close mobile sidebar when resizing to desktop
      if (!mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint, sidebarOpen]);

  // ============================================================================
  // Handlers
  // ============================================================================

  /**
   * Toggle mobile sidebar open/closed
   */
  const toggleSidebarOpen = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  /**
   * Open mobile sidebar
   */
  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  /**
   * Close mobile sidebar
   */
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  /**
   * Toggle desktop sidebar collapsed state
   */
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  /**
   * Collapse desktop sidebar
   */
  const collapseSidebar = useCallback(() => {
    setSidebarCollapsed(true);
  }, []);

  /**
   * Expand desktop sidebar
   */
  const expandSidebar = useCallback(() => {
    setSidebarCollapsed(false);
  }, []);

  /**
   * Handle navigation click - closes mobile sidebar
   */
  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  /**
   * Handle escape key to close mobile sidebar
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  /**
   * Prevent body scroll when mobile sidebar is open
   */
  useEffect(() => {
    if (sidebarOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen, isMobile]);

  // ============================================================================
  // Computed values
  // ============================================================================

  // Effective width for main content margin
  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const mainContentMargin = isMobile ? 0 : sidebarWidth;

  return {
    // State
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    
    // Handlers
    toggleSidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebarCollapsed,
    collapseSidebar,
    expandSidebar,
    handleNavClick,
    
    // Computed
    sidebarWidth,
    mainContentMargin,
    
    // Convenience
    isExpanded: !sidebarCollapsed,
    showOverlay: sidebarOpen && isMobile,
  };
}

export default useSidebar;
