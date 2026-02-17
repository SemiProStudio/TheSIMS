import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, borderRadius, spacing, typography } from '../../theme.js';

// ============================================================================
// Modal - Modal container
// ============================================================================

export const Modal = memo(function Modal({ isOpen, onClose, title, maxWidth = 500, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" style={styles.modal} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalBox, maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div
            style={{
              padding: spacing[4],
              borderBottom: `1px solid ${colors.borderLight}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3
              id="modal-title"
              style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="modal-close"
              aria-label="Close modal"
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                padding: spacing[2],
                borderRadius: borderRadius.full,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: spacing[4] }}>{children}</div>
      </div>
    </div>
  );
});

Modal.propTypes = {
  /** Close handler */
  onClose: PropTypes.func.isRequired,
  /** Maximum width in pixels */
  maxWidth: PropTypes.number,
  /** Modal content */
  children: PropTypes.node.isRequired,
};
