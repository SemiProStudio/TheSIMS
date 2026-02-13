// =============================================================================
// Loading Components
// Spinners, skeletons, and loading indicators
// =============================================================================

import React from 'react';

// =============================================================================
// SPINNER
// =============================================================================
export function Spinner({ size = 40, color = '#6366f1', className = '' }) {
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
// FULL PAGE LOADING
// =============================================================================
export function FullPageLoading({ message = 'Loading...' }) {
  return (
    <div style={styles.fullPage}>
      <Spinner size={48} />
      <p style={styles.message}>{message}</p>
    </div>
  );
}

// =============================================================================
// CONTENT LOADING
// =============================================================================
export function ContentLoading({ message = 'Loading...', minHeight = '200px' }) {
  return (
    <div style={{ ...styles.content, minHeight }}>
      <Spinner size={32} />
      <p style={styles.contentMessage}>{message}</p>
    </div>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================
export function Skeleton({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  className = '' 
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#334155',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// =============================================================================
// SKELETON CARD
// =============================================================================
export function SkeletonCard() {
  return (
    <div style={styles.skeletonCard}>
      <Skeleton height="120px" borderRadius="8px" />
      <div style={{ marginTop: '12px' }}>
        <Skeleton width="70%" height="16px" />
      </div>
      <div style={{ marginTop: '8px' }}>
        <Skeleton width="40%" height="14px" />
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON TABLE
// =============================================================================
export function SkeletonTable({ rows = 5 }) {
  return (
    <div style={styles.skeletonTable}>
      {/* Header */}
      <div style={styles.skeletonTableHeader}>
        <Skeleton width="15%" height="14px" />
        <Skeleton width="25%" height="14px" />
        <Skeleton width="20%" height="14px" />
        <Skeleton width="15%" height="14px" />
        <Skeleton width="15%" height="14px" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={styles.skeletonTableRow}>
          <Skeleton width="15%" height="12px" />
          <Skeleton width="25%" height="12px" />
          <Skeleton width="20%" height="12px" />
          <Skeleton width="15%" height="12px" />
          <Skeleton width="15%" height="12px" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SKELETON LIST
// =============================================================================
export function SkeletonList({ items = 5 }) {
  return (
    <div style={styles.skeletonList}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} style={styles.skeletonListItem}>
          <Skeleton width="40px" height="40px" borderRadius="8px" />
          <div style={{ flex: 1, marginLeft: '12px' }}>
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="12px" style={{ marginTop: '6px' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// INLINE LOADING
// =============================================================================
export function InlineLoading({ text = 'Loading' }) {
  return (
    <span style={styles.inline}>
      <Spinner size={16} />
      <span style={{ marginLeft: '8px' }}>{text}</span>
    </span>
  );
}

// =============================================================================
// BUTTON LOADING
// =============================================================================
export function ButtonLoading({ size = 16, color = 'currentColor' }) {
  return <Spinner size={size} color={color} />;
}

// =============================================================================
// PROGRESS BAR
// =============================================================================
export function ProgressBar({ progress = 0, color = '#6366f1' }) {
  return (
    <div style={styles.progressContainer}>
      <div 
        style={{
          ...styles.progressBar,
          width: `${Math.min(100, Math.max(0, progress))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

// =============================================================================
// MODAL LOADING - Suspense fallback for lazy-loaded modals
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
// SUSPENSE WRAPPER - Helper component for consistent Suspense boundaries
// =============================================================================
export function SuspenseView({ children, fallback }) {
  return (
    <React.Suspense fallback={fallback || <ViewLoading />}>
      {children}
    </React.Suspense>
  );
}

export function SuspenseModal({ children }) {
  return (
    <React.Suspense fallback={<ModalLoading />}>
      {children}
    </React.Suspense>
  );
}

// =============================================================================
// STYLES
// =============================================================================
const styles = {
  fullPage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#94a3b8',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  message: {
    marginTop: '16px',
    fontSize: '16px',
    color: '#94a3b8',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#94a3b8',
  },
  contentMessage: {
    marginTop: '12px',
    fontSize: '14px',
    color: '#64748b',
  },
  skeletonCard: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '16px',
  },
  skeletonTable: {
    backgroundColor: '#16213e',
    borderRadius: '8px',
    padding: '16px',
  },
  skeletonTableHeader: {
    display: 'flex',
    gap: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #334155',
    marginBottom: '12px',
  },
  skeletonTableRow: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
    borderBottom: '1px solid #1e293b',
  },
  skeletonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonListItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#16213e',
    borderRadius: '8px',
  },
  inline: {
    display: 'inline-flex',
    alignItems: 'center',
    color: '#94a3b8',
    fontSize: '14px',
  },
  progressContainer: {
    width: '100%',
    height: '4px',
    backgroundColor: '#334155',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
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
    backgroundColor: '#16213e',
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
    color: '#94a3b8',
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
    color: '#64748b',
  },
};

export default {
  Spinner,
  FullPageLoading,
  ContentLoading,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  InlineLoading,
  ButtonLoading,
  ProgressBar,
  ModalLoading,
  ViewLoading,
  SuspenseView,
  SuspenseModal,
};
