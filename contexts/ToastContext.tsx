// =============================================================================
// ToastContext — app-wide toast notification system
// =============================================================================
//
// Usage:
//   const { addToast } = useToast();
//   addToast('Item saved', 'success');
//   addToast('Save failed — changes may not persist', 'error');
// =============================================================================

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

const TOAST_DURATION = {
  success: 3000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    const duration = TOAST_DURATION[type] || 4000;

    setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // keep max 5

    setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

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

// =============================================================================
// Toast UI
// =============================================================================

const COLORS = {
  success: { bg: '#0d3320', border: '#16a34a', text: '#86efac' },
  error:   { bg: '#3b1118', border: '#dc2626', text: '#fca5a5' },
  warning: { bg: '#3b2f08', border: '#ca8a04', text: '#fde68a' },
  info:    { bg: '#0c2340', border: '#3b82f6', text: '#93c5fd' },
};

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(400px, calc(100vw - 32px))',
      }}
    >
      {toasts.map((toast) => {
        const colors = COLORS[toast.type] || COLORS.info;
        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              animation: 'toast-in 0.2s ease-out',
            }}
          >
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                color: colors.text,
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: 16,
                lineHeight: 1,
                opacity: 0.7,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
