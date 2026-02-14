// =============================================================================
// ModalContext - Context object and hook (non-component exports)
// Separated from ModalContext.jsx to enable React Fast Refresh
// =============================================================================

import { createContext, useContext } from 'react';

const ModalContext = createContext(null);

export function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModalContext must be used within ModalProvider');
  return ctx;
}

export default ModalContext;
