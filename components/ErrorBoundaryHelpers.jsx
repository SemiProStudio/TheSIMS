// =============================================================================
// Error Boundary Helper Components
// Section-level wrapper for ErrorBoundary
// =============================================================================

import { ErrorBoundary } from './ErrorBoundary.jsx';

// Section-level error boundary with simpler UI
export function SectionErrorBoundary({ children, name = 'This section' }) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#94a3b8',
          backgroundColor: '#16213e',
          borderRadius: '8px',
          margin: '20px',
        }}>
          <p style={{ margin: '0 0 12px 0' }}>
            {name} encountered an error and couldn&apos;t load.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#334155',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
