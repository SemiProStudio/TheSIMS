// ============================================================================
// Modal - Basic modal dialog with backdrop
// Uses CSS Modules for styling
// ============================================================================

import React, { memo, forwardRef, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import styles from '../../styles/Modal.module.css';

/**
 * Join class names, filtering out falsy values
 */
const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Modal component - A dialog overlay
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {string} props.subtitle - Modal subtitle
 * @param {'small'|'medium'|'large'|'xlarge'|'fullscreen'} props.size - Modal size
 * @param {number} props.maxWidth - Custom max width (overrides size)
 * @param {React.ReactNode} props.children - Modal content
 */
export const Modal = memo(forwardRef(function Modal({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  size = 'medium',
  maxWidth,
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className: customClassName,
  ...props
}, ref) {
  const modalRef = useRef(null);
  
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);
  
  // Focus trap - focus modal when opened
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    }
  }, [isOpen]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  if (!isOpen) return null;

  const sizeClass = {
    small: styles.modalSmall,
    medium: styles.modalMedium,
    large: styles.modalLarge,
    xlarge: styles.modalXLarge,
    fullscreen: styles.modalFullscreen,
  }[size] || styles.modalMedium;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div 
      className={styles.overlay} 
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={(node) => {
          modalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx(styles.modal, sizeClass, customClassName)}
        style={maxWidth ? { maxWidth } : undefined}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={subtitle ? 'modal-subtitle' : undefined}
        {...props}
      >
        {(title || showCloseButton) && (
          <div className={styles.header}>
            <div className={styles.headerContent}>
              {title && <h2 id="modal-title" className={styles.title}>{title}</h2>}
              {subtitle && <p id="modal-subtitle" className={styles.subtitle}>{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={styles.closeButton}
                aria-label="Close modal"
                type="button"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}));

/**
 * ModalHeader component - Header for modals (when using without title prop)
 */
export const ModalHeader = memo(function ModalHeader({
  title,
  subtitle,
  onClose,
  showCloseButton = true,
  children,
  className: customClassName,
}) {
  return (
    <div className={cx(styles.header, customClassName)}>
      <div className={styles.headerContent}>
        {title && <h2 className={styles.title}>{title}</h2>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close"
          type="button"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
});

/**
 * ModalBody component - Body content for modals
 */
export const ModalBody = memo(function ModalBody({
  children,
  noPadding = false,
  scrollable = false,
  className: customClassName,
}) {
  return (
    <div className={cx(
      styles.body,
      noPadding && styles.bodyNoPadding,
      scrollable && styles.bodyScrollable,
      customClassName
    )}>
      {children}
    </div>
  );
});

/**
 * ModalFooter component - Footer for modals
 */
export const ModalFooter = memo(function ModalFooter({
  children,
  spaceBetween = false,
  sticky = false,
  className: customClassName,
}) {
  return (
    <div className={cx(
      styles.footer,
      spaceBetween && styles.footerSpaceBetween,
      sticky && styles.footerSticky,
      customClassName
    )}>
      {children}
    </div>
  );
});

/**
 * ConfirmDialog component - Confirmation modal
 */
export const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon: Icon,
}) {
  if (!isOpen) return null;
  
  const iconClass = {
    danger: styles.confirmIconDanger,
    warning: styles.confirmIconWarning,
    success: styles.confirmIconSuccess,
  }[variant] || '';
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={cx(styles.modal, styles.modalSmall)}
        onClick={e => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <div className={styles.confirmDialog}>
          {Icon && (
            <div className={cx(styles.confirmIcon, iconClass)}>
              <Icon size={48} />
            </div>
          )}
          <h2 id="confirm-title" className={styles.confirmTitle}>{title}</h2>
          <p id="confirm-message" className={styles.confirmMessage}>{message}</p>
          <div className={styles.confirmActions}>
            <button onClick={onClose} className="btn btn-secondary">{cancelText}</button>
            <button onClick={onConfirm} className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Alert component - Alert banner for modals
 */
export const ModalAlert = memo(function ModalAlert({
  type = 'info',
  title,
  message,
  icon: Icon,
  className: customClassName,
}) {
  const typeClass = {
    info: styles.alertBannerInfo,
    warning: styles.alertBannerWarning,
    danger: styles.alertBannerDanger,
    success: styles.alertBannerSuccess,
  }[type] || styles.alertBannerInfo;
  
  return (
    <div className={cx(styles.alertBanner, typeClass, customClassName)}>
      {Icon && <Icon size={20} className={styles.alertIcon} />}
      <div className={styles.alertContent}>
        {title && <p className={styles.alertTitle}>{title}</p>}
        {message && <p className={styles.alertMessage}>{message}</p>}
      </div>
    </div>
  );
});

// PropTypes
Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge', 'fullscreen']),
  maxWidth: PropTypes.number,
  showCloseButton: PropTypes.bool,
  closeOnOverlayClick: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};

ModalHeader.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onClose: PropTypes.func,
  showCloseButton: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
};

ModalBody.propTypes = {
  children: PropTypes.node,
  noPadding: PropTypes.bool,
  scrollable: PropTypes.bool,
  className: PropTypes.string,
};

ModalFooter.propTypes = {
  children: PropTypes.node,
  spaceBetween: PropTypes.bool,
  sticky: PropTypes.bool,
  className: PropTypes.string,
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'danger', 'warning', 'success']),
  icon: PropTypes.elementType,
};

ModalAlert.propTypes = {
  type: PropTypes.oneOf(['info', 'warning', 'danger', 'success']),
  title: PropTypes.string,
  message: PropTypes.string,
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

export default Modal;
