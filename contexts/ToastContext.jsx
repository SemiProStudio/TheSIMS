// =============================================================================
// ToastContext — app-wide toast notification system
// =============================================================================
//
// Usage:
//   const { addToast } = useToast();
//   addToast('Item saved', 'success');
//   addToast('Save failed — changes may not persist', 'error');
// =============================================================================

import { useState, useCallback, useRef } from 'react';
import ToastContext from './ToastContext.js';
import { colors, withOpacity, typography } from '../theme.js';

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

  const addToast = useCallback(
    (message, type = 'info') => {
      const id = ++idRef.current;
      const duration = TOAST_DURATION[type] || 4000;

      setToasts((prev) => [...prev.slice(-4), { id, message, type }]); // keep max 5

      setTimeout(() => removeToast(id), duration);
      return id;
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

// =============================================================================
// Toast UI
// =============================================================================

const TOAST_COLORS = {
  success: {
    bg: withOpacity(colors.success, 15),
    border: colors.success,
    text: colors.textPrimary,
  },
  error: { bg: withOpacity(colors.danger, 15), border: colors.danger, text: colors.textPrimary },
  warning: {
    bg: withOpacity(colors.warning, 15),
    border: colors.warning,
    text: colors.textPrimary,
  },
  info: { bg: withOpacity(colors.primary, 15), border: colors.primary, text: colors.textPrimary },
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
        const toastColors = TOAST_COLORS[toast.type] || TOAST_COLORS.info;
        return (
          <div
            key={toast.id}
            role="alert"
            style={{
              background: toastColors.bg,
              border: `1px solid ${toastColors.border}`,
              color: toastColors.text,
              fontFamily: typography.fontFamily,
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              boxShadow: 'var(--shadow-md)',
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
                color: toastColors.text,
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
