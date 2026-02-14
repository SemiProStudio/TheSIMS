// =============================================================================
// SidebarContext - Context object and hook
// Provider lives in SidebarContext.jsx
// =============================================================================

import { createContext, useContext } from 'react';

const SidebarContext = createContext(null);

export function useSidebarContext() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarContext must be used within SidebarProvider');
  return ctx;
}

export default SidebarContext;
