import { useCallback, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, borderRadius, spacing, typography } from '../../theme.js';

// ============================================================================
// ConfirmDialog - Styled confirmation modal
// ============================================================================

export const ConfirmDialog = memo(function ConfirmDialog({ 
  isOpen, 
  title = 'Confirm', 
  message, 
  confirmText = 'Delete', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel,
  danger = true 
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  
  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the cancel button when dialog opens
      cancelButtonRef.current?.focus();
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [onCancel]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="modal-backdrop" 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} 
      onClick={onCancel}
      role="presentation"
    >
      <div 
        ref={dialogRef}
        onClick={e => e.stopPropagation()} 
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        style={{
          background: colors.bgMedium,
          borderRadius: borderRadius.xl,
          border: `1px solid ${colors.border}`,
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ padding: spacing[5] }}>
          <h3 
            id="confirm-dialog-title"
            style={{ 
              margin: `0 0 ${spacing[3]}px`, 
              fontSize: typography.fontSize.lg, 
              color: colors.textPrimary 
            }}
          >
            {title}
          </h3>
          <p 
            id="confirm-dialog-message"
            style={{ 
              margin: 0, 
              color: colors.textSecondary,
              fontSize: typography.fontSize.sm,
              lineHeight: 1.5
            }}
          >
            {message}
          </p>
        </div>
        <div style={{ 
          padding: spacing[4], 
          borderTop: `1px solid ${colors.borderLight}`,
          display: 'flex',
          gap: spacing[3],
          justifyContent: 'flex-end'
        }}>
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            type="button"
            style={{
              ...styles.btnSec,
              padding: `${spacing[2]}px ${spacing[4]}px`
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            type="button"
            style={{
              ...styles.btn,
              padding: `${spacing[2]}px ${spacing[4]}px`,
              background: danger ? colors.danger : colors.primary
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

ConfirmDialog.propTypes = {
  /** Whether dialog is open */
  isOpen: PropTypes.bool.isRequired,
  /** Dialog title */
  title: PropTypes.string.isRequired,
  /** Dialog message */
  message: PropTypes.string.isRequired,
  /** Confirm button text */
  confirmText: PropTypes.string,
  /** Cancel button text */
  cancelText: PropTypes.string,
  /** Danger styling */
  danger: PropTypes.bool,
  /** Confirm handler */
  onConfirm: PropTypes.func.isRequired,
  /** Cancel/close handler */
  onCancel: PropTypes.func.isRequired,
};
