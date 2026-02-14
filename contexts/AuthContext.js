// =============================================================================
// AuthContext - Context object and hook (non-component exports)
// Separated from AuthContext.jsx to enable React Fast Refresh
// =============================================================================

import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
