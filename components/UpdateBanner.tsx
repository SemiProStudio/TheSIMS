// =============================================================================
// UpdateBanner — shows a non-intrusive banner when a new version is available
// =============================================================================

import { usePWAContext } from '../contexts/PWAContext';

export default function UpdateBanner() {
  const { updateAvailable, updateServiceWorker } = usePWAContext();

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: '#1a1a2e',
        color: '#e0e0e0',
        padding: '10px 20px',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 14,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span>A new version is available.</span>
      <button
        onClick={updateServiceWorker}
        style={{
          background: '#4f8cff',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Update now
      </button>
    </div>
  );
}
