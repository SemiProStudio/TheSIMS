// =============================================================================
// ToastContext - Context object and hook
// Provider lives in ToastContext.jsx
// =============================================================================

import { createContext, useContext } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if used outside provider — log to console instead of crashing
    return {
      addToast: (msg, type) => {
        if (type === 'error') console.error('[Toast]', msg);
        else console.log('[Toast]', msg);
      },
      removeToast: () => {},
    };
  }
  return ctx;
}

export default ToastContext;
