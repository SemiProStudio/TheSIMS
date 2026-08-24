// ============================================================================
// Base Modal Components
// Shared modal wrapper and header components with accessibility
// ============================================================================

import {
  memo,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
  useState,
  createContext,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { colors, styles, spacing, typography } from '../theme.js';

// Body scroll lock is shared by every open modal. A per-instance set/clear
// let a nested modal (Item → Smart Paste) restore scrolling behind its
// still-open parent when it closed — so the lock is reference-counted.
let openModalCount = 0;
const lockBodyScroll = () => {
  openModalCount += 1;
  document.body.style.overflow = 'hidden';
};
const unlockBodyScroll = () => {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) document.body.style.overflow = '';
};

// Lets ModalHeader hand its (per-instance) title id up to Modal for
// aria-labelledby — nested modals used to both render id="modal-title",
// and dialogs whose callers skipped Modal's `title` prop had no name.
const ModalTitleContext = createContext(null);

// ============================================================================
// Base Modal Component with Accessibility
// ============================================================================
export const Modal = memo(function Modal({ onClose, maxWidth = 500, title, children }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);
  const titleId = useId();
  // Flipped by a ModalHeader inside this modal registering itself
  const [hasHeaderTitle, setHasHeaderTitle] = useState(false);
  const titleContextValue = useMemo(
    () => ({ titleId, registerTitle: () => setHasHeaderTitle(true) }),
    [titleId],
  );

  // Store the previously focused element and focus the modal
  useEffect(() => {
    previousActiveElement.current = document.activeElement;

    // Focus the modal container
    if (modalRef.current) {
      modalRef.current.focus();
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
      // Return focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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
    },
    [onClose],
  );

  return (
    <div className="modal-backdrop" style={styles.modal} onClick={onClose} role="presentation">
      {/* .modal-box: at ≤768px index.css turns every modal into a full-screen
          sheet (full width/height, no radius, flex column) so forms, the
          on-screen keyboard, and the close button all behave on phones */}
      <div
        ref={modalRef}
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{ ...styles.modalBox, maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={hasHeaderTitle ? titleId : undefined}
        aria-label={!hasHeaderTitle && title ? title : undefined}
        tabIndex={-1}
      >
        <ModalTitleContext.Provider value={titleContextValue}>
          {children}
        </ModalTitleContext.Provider>
      </div>
    </div>
  );
});

// ============================================================================
// Modal Header
// ============================================================================
export const ModalHeader = memo(function ModalHeader({ title, onClose }) {
  const titleContext = useContext(ModalTitleContext);
  const registerTitle = titleContext?.registerTitle;

  // Tell the enclosing Modal a real title exists so its aria-labelledby
  // points here (most callers pass the title to ModalHeader, not Modal)
  useEffect(() => {
    if (registerTitle) registerTitle();
  }, [registerTitle]);

  return (
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
        id={titleContext?.titleId}
        style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}
      >
        {title}
      </h3>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: colors.textMuted,
          cursor: 'pointer',
          // 40px touch target (negative margin keeps the header visually tight)
          minWidth: 40,
          minHeight: 40,
          margin: -6,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
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
    <div
      style={{
        padding: spacing[4],
        borderTop: `1px solid ${colors.borderLight}`,
        display: 'flex',
        gap: spacing[3],
        justifyContent: 'flex-end',
      }}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Modal Body - Scrollable content area
// ============================================================================
export const ModalBody = memo(function ModalBody({ children, noPadding = false }) {
  return (
    <div
      className="modal-body"
      style={{
        padding: noPadding ? 0 : spacing[4],
        maxHeight: '70vh',
        overflowY: 'auto',
      }}
    >
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
