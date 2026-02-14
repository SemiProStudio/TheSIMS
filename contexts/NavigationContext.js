// =============================================================================
// NavigationContext - Context object and hook
// Provider lives in NavigationContext.jsx
// =============================================================================

import { createContext, useContext } from 'react';

const NavigationContext = createContext(null);

export function useNavigationContext() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigationContext must be used within NavigationProvider');
  return ctx;
}

export default NavigationContext;
