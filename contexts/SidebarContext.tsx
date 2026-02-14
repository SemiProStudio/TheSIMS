// =============================================================================
// SidebarContext
// Provides sidebar state via context so toggling sidebar only re-renders
// sidebar-dependent components — not the entire App tree.
// =============================================================================

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const SidebarContext = createContext(null);

// Safe localStorage wrapper
const safeLocalStorage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); } catch { /* ignore */ } },
};

export function SidebarProvider({ children, storageKey = 'sims-sidebar-collapsed', defaultCollapsed = false, mobileBreakpoint = 768 }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = safeLocalStorage.getItem(storageKey);
    return saved === 'true' ? true : defaultCollapsed;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < mobileBreakpoint;
  });

  // Persist collapsed state
  useEffect(() => {
    safeLocalStorage.setItem(storageKey, String(sidebarCollapsed));
  }, [sidebarCollapsed, storageKey]);

  // Responsive resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < mobileBreakpoint;
      setIsMobile(mobile);
      if (!mobile && sidebarOpen) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileBreakpoint, sidebarOpen]);

  // Escape key closes mobile sidebar
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = (sidebarOpen && isMobile) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, isMobile]);

  // Handlers
  const toggleSidebarOpen = useCallback(() => setSidebarOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed(prev => !prev), []);
  const collapseSidebar = useCallback(() => setSidebarCollapsed(true), []);
  const expandSidebar = useCallback(() => setSidebarCollapsed(false), []);
  const handleNavClick = useCallback(() => { if (isMobile) setSidebarOpen(false); }, [isMobile]);

  // Computed
  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const mainContentMargin = isMobile ? 0 : sidebarWidth;

  const value = useMemo(() => ({
    sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, isMobile,
    toggleSidebarOpen, openSidebar, closeSidebar,
    toggleSidebarCollapsed, collapseSidebar, expandSidebar, handleNavClick,
    sidebarWidth, mainContentMargin,
    isExpanded: !sidebarCollapsed,
    showOverlay: sidebarOpen && isMobile,
  }), [
    sidebarOpen, sidebarCollapsed, isMobile, sidebarWidth, mainContentMargin,
    toggleSidebarOpen, openSidebar, closeSidebar,
    toggleSidebarCollapsed, collapseSidebar, expandSidebar, handleNavClick,
  ]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarContext must be used within SidebarProvider');
  return ctx;
}

export default SidebarContext;
