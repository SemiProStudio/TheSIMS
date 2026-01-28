// ============================================================================
// Base Modal Components
// Shared modal wrapper and header components with accessibility
// ============================================================================

import React, { memo, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { colors, styles, spacing, typography } from '../theme.js';

// ============================================================================
// Base Modal Component with Accessibility
// ============================================================================
export const Modal = memo(function Modal({ onClose, maxWidth = 500, title, children }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  
  // Store the previously focused element and focus the modal
  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    
    // Focus the modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      // Return focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, []);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
    
    // Trap focus within modal
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);
  
  return (
    <div 
      className="modal-backdrop" 
      style={styles.modal} 
      onClick={onClose}
      role="presentation"
    >
      <div 
        ref={modalRef}
        onClick={e => e.stopPropagation()} 
        onKeyDown={handleKeyDown}
        style={{ ...styles.modalBox, maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
});

// ============================================================================
// Modal Header
// ============================================================================
export const ModalHeader = memo(function ModalHeader({ title, onClose }) {
  return (
    <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h3 id="modal-title" style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>{title}</h3>
      <button 
        onClick={onClose} 
        style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: spacing[1] }}
        aria-label="Close dialog"
        type="button"
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>
  );
});

// ============================================================================
// Modal Footer - Common footer pattern
// ============================================================================
export const ModalFooter = memo(function ModalFooter({ children }) {
  return (
    <div style={{ 
      padding: spacing[4], 
      borderTop: `1px solid ${colors.borderLight}`, 
      display: 'flex', 
      gap: spacing[3], 
      justifyContent: 'flex-end' 
    }}>
      {children}
    </div>
  );
});

// ============================================================================
// Modal Body - Scrollable content area
// ============================================================================
export const ModalBody = memo(function ModalBody({ children, noPadding = false }) {
  return (
    <div style={{ 
      padding: noPadding ? 0 : spacing[4],
      maxHeight: '70vh',
      overflowY: 'auto'
    }}>
      {children}
    </div>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
Modal.propTypes = {
  /** Function called when modal should close */
  onClose: PropTypes.func.isRequired,
  /** Maximum width of the modal in pixels */
  maxWidth: PropTypes.number,
  /** Optional title for aria-labelledby */
  title: PropTypes.string,
  /** Modal content */
  children: PropTypes.node.isRequired,
};

ModalHeader.propTypes = {
  /** Title displayed in the header */
  title: PropTypes.string.isRequired,
  /** Function called when close button is clicked */
  onClose: PropTypes.func.isRequired,
};

ModalFooter.propTypes = {
  /** Footer content (typically buttons) */
  children: PropTypes.node.isRequired,
};

ModalBody.propTypes = {
  /** Body content */
  children: PropTypes.node.isRequired,
  /** If true, removes padding from body */
  noPadding: PropTypes.bool,
};
