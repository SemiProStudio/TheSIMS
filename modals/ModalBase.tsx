// ============================================================================
// Base Modal Components
// Shared modal wrapper and header components with accessibility
// ============================================================================

import { memo, useRef, useEffect, useCallback } from 'react';
import type React from 'react';
import { X } from 'lucide-react';
import { colors, styles, spacing, typography } from '../theme';

// ============================================================================
// Interfaces
// ============================================================================
interface ModalProps {
  onClose: () => void;
  maxWidth?: number;
  title?: string;
  children: React.ReactNode;
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

interface ModalFooterProps {
  children: React.ReactNode;
}

interface ModalBodyProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

// ============================================================================
// Base Modal Component with Accessibility
// ============================================================================
export const Modal = memo<ModalProps>(function Modal({ onClose, maxWidth = 500, title, children }) {
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
export const ModalHeader = memo<ModalHeaderProps>(function ModalHeader({ title, onClose }) {
  return (
    <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, ...styles.flexBetween }}>
      <h3 id="modal-title" style={{ ...styles.heading, fontSize: typography.fontSize.lg }}>{title}</h3>
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
export const ModalFooter = memo<ModalFooterProps>(function ModalFooter({ children }) {
  return (
    <div style={{ 
      padding: spacing[4], 
      borderTop: `1px solid ${colors.borderLight}`, 
      ...styles.flexCenter,
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
export const ModalBody = memo<ModalBodyProps>(function ModalBody({ children, noPadding = false }) {
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

