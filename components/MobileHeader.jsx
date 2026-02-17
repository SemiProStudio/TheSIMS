// ============================================================================
// Mobile Header Component
// Hamburger menu + logo + user dropdown for mobile viewports
// ============================================================================

import { useState, memo } from 'react';
import { colors, spacing, typography, borderRadius } from '../theme.js';
import { VIEWS, MODALS } from '../constants.js';

export default memo(function MobileHeader({
  currentUser,
  onOpenSidebar,
  onOpenModal,
  onSetView,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="mobile-header">
      <button
        onClick={onOpenSidebar}
        style={{
          background: 'transparent',
          border: 'none',
          borderRadius: borderRadius.md,
          padding: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textPrimary,
        }}
        aria-label="Open menu"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
        }}
      >
        <img
          src="/moe.png"
          alt=""
          style={{ width: 28, height: 28, borderRadius: borderRadius.md }}
          onError={(e) => (e.target.style.display = 'none')}
        />
        <span
          style={{
            fontWeight: typography.fontWeight.semibold,
            fontSize: typography.fontSize.lg,
            color: colors.textPrimary,
          }}
        >
          SIMS
        </span>
      </div>
      {currentUser && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: colors.primary,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.bgDark,
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.base,
              cursor: 'pointer',
            }}
            aria-label="User menu"
          >
            {currentUser.name?.charAt(0).toUpperCase() || 'U'}
          </button>
          {menuOpen && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 8,
                  background: colors.bgMedium,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.xl,
                  padding: spacing[2],
                  minWidth: 180,
                  zIndex: 1000,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              >
                <div
                  style={{
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    borderBottom: `1px solid ${colors.borderLight}`,
                    marginBottom: spacing[2],
                  }}
                >
                  <div
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      color: colors.textPrimary,
                    }}
                  >
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                    {currentUser.email}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenModal(MODALS.PROFILE);
                  }}
                  style={{
                    width: '100%',
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onSetView(VIEWS.THEME_SELECTOR);
                  }}
                  style={{
                    width: '100%',
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Theme
                </button>
                <div
                  style={{
                    borderTop: `1px solid ${colors.borderLight}`,
                    marginTop: spacing[2],
                    paddingTop: spacing[2],
                  }}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: `${spacing[2]}px ${spacing[3]}px`,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: borderRadius.md,
                      color: colors.danger,
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[2],
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});
