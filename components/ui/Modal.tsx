import { memo } from 'react';
import type React from 'react';
import { colors, styles, borderRadius, spacing, typography } from '../../theme';
import type React from 'react';

// ============================================================================
// Modal - Modal container
// ============================================================================

interface ModalProps {
  isOpen?: boolean;
  onClose: (...args: any[]) => any;
  title?: string;
  maxWidth?: number;
  children: React.ReactNode;
}

export const Modal = memo<ModalProps>(function Modal({
  isOpen,
  onClose,
  title,
  maxWidth = 500,
  children
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={styles.modal} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ ...styles.modalBox, maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div
            style={{
              ...styles.flexBetween,
              padding: spacing[4],
              borderBottom: `1px solid ${colors.borderLight}`,
            }}
          >
            <h3 id="modal-title" style={{ ...styles.heading, fontSize: typography.fontSize.lg }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="modal-close"
              aria-label="Close modal"
              type="button"
              style={{
                ...styles.flexCenter,
                justifyContent: 'center',
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                padding: spacing[2],
                borderRadius: borderRadius.full,
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: spacing[4] }}>
          {children}
        </div>
      </div>
    </div>
  );
});

