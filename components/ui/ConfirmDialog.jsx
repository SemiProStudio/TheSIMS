// ============================================================================
// ConfirmDialog - Confirmation modal for destructive actions
// ============================================================================

import React, { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';
import { colors, spacing, typography, borderRadius, sharedStyles } from './shared.js';
import { Button } from './Button.jsx';

export const ConfirmDialog = memo(function ConfirmDialog({ 
  isOpen, 
  title = 'Confirm Action',
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  danger = true,
  onConfirm, 
  onCancel,
  loading = false,
}) {
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div 
      style={sharedStyles.modalBackdrop}
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={e => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onCancel?.();
          }
        }}
        tabIndex={-1}
        style={{
          ...sharedStyles.modalBox,
          maxWidth: 400,
          textAlign: 'center',
          padding: spacing[6],
        }}
      >
        {/* Warning Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto',
            marginBottom: spacing[4],
            borderRadius: borderRadius.full,
            background: danger 
              ? `color-mix(in srgb, ${colors.danger} 15%, transparent)`
              : `color-mix(in srgb, ${colors.warning} 15%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle 
            size={32} 
            color={danger ? colors.danger : colors.warning}
            aria-hidden="true"
          />
        </div>

        {/* Title */}
        <h3 
          id="confirm-title"
          style={{ 
            margin: 0, 
            marginBottom: spacing[2], 
            color: colors.textPrimary,
            fontSize: typography.fontSize.lg,
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p 
          id="confirm-message"
          style={{ 
            margin: 0, 
            marginBottom: spacing[6], 
            color: colors.textSecondary,
            fontSize: typography.fontSize.sm,
            lineHeight: typography.lineHeight.relaxed,
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'center' }}>
          <Button 
            variant="secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            ref={confirmButtonRef}
            variant="primary"
            danger={danger}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
});

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  danger: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default ConfirmDialog;
