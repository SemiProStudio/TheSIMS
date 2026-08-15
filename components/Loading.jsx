// =============================================================================
// Loading Components
// Spinner and the two loading shells the app actually mounts (modal overlay,
// lazy-view fallback). The skeleton/progress/inline family that used to live
// here had no importers — deleted in the 2026-08-14 dead-export sweep.
// Colors come from the theme CSS variables (index.css :root provides dark
// fallbacks for anything rendered before ThemeContext applies a theme).
// =============================================================================

// =============================================================================
// SPINNER
// =============================================================================
export function Spinner({ size = 40, color = 'var(--primary)', className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="3"
        strokeOpacity="0.25"
        fill="none"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

// =============================================================================
// MODAL LOADING - Loading overlay for lazy-loaded modals
// =============================================================================
export function ModalLoading() {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalLoadingBox}>
        <Spinner size={32} />
        <p style={styles.modalLoadingText}>Loading...</p>
      </div>
    </div>
  );
}

// =============================================================================
// VIEW LOADING - Suspense fallback for lazy-loaded views
// =============================================================================
export function ViewLoading({ message = 'Loading view...' }) {
  return (
    <div style={styles.viewLoading}>
      <Spinner size={36} />
      <p style={styles.viewLoadingText}>{message}</p>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = {
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalLoadingBox: {
    backgroundColor: 'var(--bg-medium)',
    borderRadius: '12px',
    padding: '32px 48px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  modalLoadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
  viewLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    minHeight: '300px',
  },
  viewLoadingText: {
    marginTop: '16px',
    fontSize: '14px',
    color: 'var(--text-muted)',
  },
};
