// ============================================================================
// SIMS UI Component Library
// Reusable, composable UI components
// ============================================================================

import React, { memo, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, GripVertical } from 'lucide-react';
import { colors, styles, borderRadius, spacing, typography, withOpacity } from '../theme';

// ============================================================================
// BackButton - Consistent back navigation
// ============================================================================

interface BackButtonProps {
  onClick: (...args: any[]) => any;
  children?: React.ReactNode;
}

export const BackButton = memo<BackButtonProps>(function BackButton({ onClick, children = 'Back' }) {
  return (
    <button 
      onClick={onClick} 
      type="button"
      aria-label={`Go back: ${children}`}
      style={{
        ...styles.btnSec,
        ...styles.flexCenter,
        marginBottom: spacing[4],
        border: 'none',
        background: 'none',
        padding: 0,
        color: colors.textSecondary,
        gap: spacing[2],
        cursor: 'pointer',
      }}
    >
      <ArrowLeft size={18} aria-hidden="true" /> {children}
    </button>
  );
});

// ============================================================================
// PageHeader - Consistent page title with optional subtitle and actions
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  backButton?: boolean;
  onBack?: (...args: any[]) => any;
  backLabel?: string;
}

export const PageHeader = memo<PageHeaderProps>(function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  onBack,
  backLabel = 'Back',
}) {
  return (
    <>
      {(backButton || onBack) && (
        <BackButton onClick={onBack}>{backLabel}</BackButton>
      )}
      <div style={{
        ...styles.flexBetween,
        marginBottom: spacing[5],
      }}>
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>{title}</h2>
          {subtitle && (
            <p style={{
              ...styles.textSmMuted,
              margin: `${spacing[1]}px 0 0`,
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </>
  );
});

// ============================================================================
// DraggableList - Reusable drag-to-reorder list
// ============================================================================

export function useDragReorder(items, onReorder) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragNodeRef = useRef(null);

  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
    setTimeout(() => {
      if (dragNodeRef.current) {
        dragNodeRef.current.style.opacity = '0.5';
      }
    }, 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);
    onReorder(newItems);
    setDragOverIndex(null);
  }, [draggedIndex, items, onReorder]);

  const getDragProps = useCallback((index, canDrag = true) => {
    if (!canDrag) return {};
    return {
      draggable: true,
      onDragStart: (e) => handleDragStart(e, index),
      onDragEnd: handleDragEnd,
      onDragOver: (e) => handleDragOver(e, index),
      onDragLeave: handleDragLeave,
      onDrop: (e) => handleDrop(e, index),
    };
  }, [handleDragStart, handleDragEnd, handleDragOver, handleDragLeave, handleDrop]);

  const getDragStyle = useCallback((index, canDrag = true) => ({
    background: dragOverIndex === index ? `${withOpacity(colors.primary, 20)}` : undefined,
    borderTop: dragOverIndex === index ? `2px solid ${colors.primary}` : '2px solid transparent',
    cursor: canDrag ? 'grab' : 'default',
    userSelect: 'none',
    transition: 'background 150ms ease',
  }), [dragOverIndex]);

  return {
    draggedIndex,
    dragOverIndex,
    getDragProps,
    getDragStyle,
  };
}

interface DragHandleProps {
  canDrag?: boolean;
  size?: number;
}

export const DragHandle = memo<DragHandleProps>(function DragHandle({ canDrag = true, size = 16 }) {
  return (
    <div style={{
      ...styles.flexCenter,
      color: canDrag ? colors.textMuted : colors.borderLight,
      cursor: canDrag ? 'grab' : 'default',
    }}>
      <GripVertical size={size} />
    </div>
  );
});

// ============================================================================
// Badge - Status/category indicator
// ============================================================================

interface BadgeProps {
  text?: string;
  children?: React.ReactNode;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const Badge = memo<BadgeProps>(function Badge({ text, children, color = colors.primary, size = 'sm' }) {
  const sizes = {
    xs: { padding: '2px 5px', fontSize: '9px' },
    sm: { padding: '3px 8px', fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '11px' },
  };

  const content = text || children;
  
  // Don't render if no content
  if (!content) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: withOpacity(color, 25),
        color: color,
        borderRadius: borderRadius.full,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        ...sizes[size],
      }}
    >
      {content}
    </span>
  );
});

// ============================================================================
// Button - Primary and secondary buttons
// ============================================================================

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: string;
  disabled?: boolean;
  danger?: boolean;
  fullWidth?: boolean;
  icon?: React.ElementType;
  iconOnly?: boolean;
  'aria-label'?: string;
  onClick?: (...args: any[]) => any;
  style?: Record<string, any>;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  small?: boolean;
  [key: string]: any;
}

export const Button = memo(forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    danger = false,
    fullWidth = false,
    icon: Icon,
    iconOnly = false,
    'aria-label': ariaLabel,
    onClick,
    style: customStyle,
    className: customClassName,
    type = 'button',
    ...props
  },
  ref
) {
  // Build CSS class list
  const classNames = [
    variant === 'primary' ? 'btn' : 'btn-secondary',
    danger && 'btn-danger',
    size === 'sm' && 'btn-sm',
    fullWidth && 'btn-full',
    customClassName,
  ].filter(Boolean).join(' ');

  // Icon-only buttons must have aria-label
  const isIconOnly = iconOnly || (Icon && !children);
  const accessibleLabel = ariaLabel || (isIconOnly ? 'Button' : undefined);

  return (
    <button
      ref={ref}
      className={classNames}
      style={customStyle}
      disabled={disabled}
      onClick={onClick}
      type={type}
      aria-label={accessibleLabel}
      aria-disabled={disabled || undefined}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
}));

// ============================================================================
// Card - Container component
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  padding?: boolean;
  onClick?: (...args: any[]) => any;
  style?: Record<string, any>;
  className?: string;
  [key: string]: any;
}

export const Card = memo<CardProps>(function Card({
  children,
  padding = true,
  onClick,
  style: customStyle,
  className: customClassName,
  ...props
}) {
  const isClickable = !!onClick;
  const classNames = [
    'card', 
    isClickable && 'card-clickable',
    customClassName
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={classNames}
      style={{
        ...(padding && { padding: spacing[4] }),
        ...(isClickable && { cursor: 'pointer' }),
        ...customStyle,
      }}
      onClick={onClick}
      // Make clickable cards keyboard accessible
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

// ============================================================================
// CardHeader - Card header with title
// ============================================================================

interface CardHeaderProps {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const CardHeader = memo<CardHeaderProps>(function CardHeader({
  title,
  icon: Icon,
  action,
  children
}) {
  return (
    <div
      style={{
        ...styles.flexCenter,
        ...styles.sectionDivider,
        padding: `${spacing[4]}px`,
        gap: spacing[2],
      }}
    >
      {Icon && <Icon size={16} color={colors.primary} />}
      <strong style={{ color: colors.textPrimary, flex: 1 }}>{title}</strong>
      {action}
      {children}
    </div>
  );
});

// ============================================================================
// CollapsibleSection - Card with collapsible content (click header to toggle)
// ============================================================================

// Helper to apply opacity to a color (supports hex, CSS variables, and rgb/rgba)
// Uses CSS color-mix() for CSS variables, converts hex to rgba for hex colors
const withAlpha = (color, alpha) => {
  if (!color) return color;
  
  // Already has alpha
  if (color.startsWith('rgba') || color.startsWith('rgb')) return color;
  
  // CSS variable - use color-mix()
  if (color.startsWith('var(')) {
    const percent = Math.round(alpha * 100);
    return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
  }
  
  // Hex color - convert to rgba
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const expandedHex = color.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(expandedHex);
  if (!result) return color;
  return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
};

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  badgeColor?: string;
  collapsed?: boolean;
  onToggleCollapse?: (...args: any[]) => any;
  action?: React.ReactNode;
  children?: React.ReactNode;
  padding?: boolean;
  style?: Record<string, any>;
  headerColor?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  badgeColor,
  collapsed,
  onToggleCollapse,
  action,
  children,
  padding = true,
  style,
  headerColor,
}: CollapsibleSectionProps) {
  const accentColor = headerColor || colors.primary;

  return (
    <div style={{
      background: withAlpha(accentColor, 0.18),
      borderRadius: borderRadius.lg,
      border: `1px solid ${withAlpha(accentColor, 0.35)}`,
      overflow: 'hidden',
      ...style,
    }}>
      {/* Header - clickable to toggle, hover handled by CSS */}
      <div
        className="collapsible-header"
        onClick={onToggleCollapse}
        style={{
          ...styles.flexCenter,
          '--section-accent-color': accentColor,
          padding: `${spacing[3]}px ${spacing[4]}px`,
          gap: spacing[2],
          cursor: 'pointer',
          userSelect: 'none',
          background: collapsed ? withAlpha(accentColor, 0.30) : withAlpha(accentColor, 0.38),
          borderBottom: collapsed ? 'none' : `1px solid ${withAlpha(accentColor, 0.4)}`,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {Icon && <Icon size={16} color={accentColor} />}
        <strong style={{ color: colors.textPrimary, flex: 1 }}>
          {title}
        </strong>
        {badge !== undefined && badge !== null && (
          <span style={{
            background: withAlpha(accentColor, 0.5),
            color: colors.textPrimary,
            padding: '2px 8px',
            borderRadius: borderRadius.full,
            fontSize: typography.fontSize.xs,
            fontWeight: typography.fontWeight.medium,
          }}>
            {badge}
          </span>
        )}
        {action && (
          <div onClick={e => e.stopPropagation()}>
            {action}
          </div>
        )}
      </div>
      
      {/* Content - shown when not collapsed */}
      {!collapsed && (
        <div style={{ 
          padding: padding ? spacing[4] : 0,
          background: withAlpha(accentColor, 0.30),
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Input - Form input field
// ============================================================================

interface InputProps {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  style?: Record<string, any>;
  containerStyle?: Record<string, any>;
  className?: string;
  helper?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (...args: any[]) => any;
  disabled?: boolean;
  [key: string]: any;
}

export const Input = memo(forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    icon: Icon,
    style: customStyle,
    containerStyle,
    className: customClassName,
    ...props
  },
  ref
) {
  const inputClassNames = [
    'input',
    error && 'input-error',
    customClassName,
  ].filter(Boolean).join(' ');

  return (
    <div style={containerStyle}>
      {label && <label className={error ? 'label label-error' : 'label'}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div
            style={{
              position: 'absolute',
              left: spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.textMuted,
            }}
          >
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          className={inputClassNames}
          style={{
            ...(Icon && { paddingLeft: spacing[10] }),
            ...customStyle,
          }}
          {...props}
        />
      </div>
      {error && (
        <span style={{ color: colors.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
          {error}
        </span>
      )}
    </div>
  );
}));

// ============================================================================
// SelectInput - Basic dropdown select (legacy - prefer components/Select.jsx)
// ============================================================================

interface SelectInputProps {
  label?: string;
  options: { value: string; label: string }[];
  style?: Record<string, any>;
  className?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onChange?: (...args: any[]) => any;
  disabled?: boolean;
  children?: React.ReactNode;
  [key: string]: any;
}

export const SelectInput = memo(forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, options, style: customStyle, className: customClassName, ...props },
  ref
) {
  const selectClassNames = ['select', customClassName].filter(Boolean).join(' ');
  
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <select
        ref={ref}
        className={selectClassNames}
        style={customStyle}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}));

// ============================================================================
// StatCard - Dashboard statistic card
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color?: string;
  onClick?: (...args: any[]) => any;
  trend?: 'up' | 'down';
  trendValue?: string;
}

export const StatCard = memo<StatCardProps>(function StatCard({
  icon: Icon,
  value,
  label,
  color = colors.primary,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: spacing[5],
        textAlign: 'center',
        borderRadius: borderRadius.xl,
        border: `1px solid ${colors.border}`,
        background: colors.bgLight,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        ...(onClick && { cursor: 'pointer' }),
      }}
    >
      <div
        style={{
          ...styles.flexColCenter,
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          background: colors.bgMedium,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.xl,
        }}
      >
        <Icon size={24} color={color} />
      </div>
      <div
        style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: color,
          marginBottom: spacing[1],
        }}
      >
        {value}
      </div>
      <div
        style={{
          ...styles.textXsMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </div>
    </div>
  );
});

// ============================================================================
// ItemImage - Image with placeholder
// ============================================================================

interface ItemImageProps {
  src?: string;
  alt?: string;
  size?: number;
  borderRadius?: string | number;
  showPlaceholder?: boolean;
  onClick?: (...args: any[]) => any;
  clickable?: boolean;
}

export const ItemImage = memo<ItemImageProps>(function ItemImage({
  src,
  alt = '',
  size = 56,
  borderRadius: radius = borderRadius.md,
  showPlaceholder = true,
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
        }}
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div
      style={{
        ...styles.flexColCenter,
        width: size,
        height: size,
        borderRadius: radius,
        background: `${withOpacity(colors.primary, 15)}`,
        color: colors.textMuted,
      }}
    >
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      {size >= 48 && (
        <span style={{ fontSize: Math.max(8, size * 0.15), marginTop: 2 }}>No Image</span>
      )}
    </div>
  );
});

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
              ...styles.sectionDivider,
              padding: spacing[4],
            }}
          >
            <h3 id="modal-title" style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              className="modal-close"
              aria-label="Close modal"
              type="button"
              style={{
                ...styles.flexColCenter,
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

// ============================================================================
// EmptyState - No data placeholder
// ============================================================================

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = memo<EmptyStateProps>(function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <Card style={{ padding: spacing[12], textAlign: 'center' }}>
      {Icon && (
        <div
          style={{
            ...styles.flexColCenter,
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            background: `${withOpacity(colors.primary, 20)}`,
            borderRadius: borderRadius['2xl'],
          }}
        >
          <Icon size={32} color={colors.primary} />
        </div>
      )}
      <h3
        style={{
          margin: '0 0 8px',
          fontSize: typography.fontSize.lg,
          color: colors.textPrimary,
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ color: colors.textMuted, marginBottom: spacing[5] }}>
          {description}
        </p>
      )}
      {action}
    </Card>
  );
});

// ============================================================================
// ConfirmDialog - Styled confirmation modal
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (...args: any[]) => any;
  onCancel: (...args: any[]) => any;
  danger?: boolean;
}

export const ConfirmDialog = memo<ConfirmDialogProps>(function ConfirmDialog({
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
        ...styles.flexColCenter,
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
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
          ...styles.flexCenter,
          padding: spacing[4],
          borderTop: `1px solid ${colors.borderLight}`,
          gap: spacing[3],
          justifyContent: 'flex-end',
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

// ============================================================================
// SearchInput - Search input with icon
// ============================================================================

const searchInnerInputStyle = {
  background: 'none',
  border: 'none',
  color: colors.textPrimary,
  flex: 1,
  outline: 'none',
  fontSize: typography.fontSize.base,
  padding: 0,
  margin: 0,
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  appearance: 'none',
  boxShadow: 'none',
} as const;

interface SearchInputProps {
  value: string;
  onChange: (...args: any[]) => any;
  placeholder?: string;
  onClear?: (...args: any[]) => any;
  'aria-label'?: string;
  id?: string;
  style?: Record<string, any>;
  debounceMs?: number;
  onFocus?: (...args: any[]) => any;
  onBlur?: (...args: any[]) => any;
  [key: string]: any;
}

export const SearchInput = memo<SearchInputProps>(function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  'aria-label': ariaLabel = 'Search',
  id,
  style: customStyle = {},
  ...props
}) {
  const inputId = id || `search-input-${Math.random().toString(36).substr(2, 9)}`;
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div
      role="search"
      style={{
        ...styles.flexCenter,
        ...styles.input,
        gap: spacing[2],
        padding: '12px 16px',
        ...(isFocused && {
          borderColor: colors.primary,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${colors.primary} 20%, transparent)`,
        }),
        ...customStyle,
      }}
    >
      <svg 
        width={18} 
        height={18} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={colors.textMuted} 
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={searchInnerInputStyle}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          type="button"
          aria-label="Clear search"
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: 2,
          }}
        >
          <svg 
            width={14} 
            height={14} 
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
      )}
    </div>
  );
});

// ============================================================================
// Avatar - User avatar
// ============================================================================

interface AvatarProps {
  name?: string;
  src?: string;
  size?: number;
  style?: Record<string, any>;
  color?: string;
}

export const Avatar = memo<AvatarProps>(function Avatar({
  name,
  src,
  size = 40,
  style: customStyle,
}) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: borderRadius.md,
          objectFit: 'cover',
          ...customStyle,
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...styles.flexColCenter,
        width: size,
        height: size,
        borderRadius: borderRadius.md,
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        fontSize: size * 0.4,
        ...customStyle,
      }}
    >
      {initial}
    </div>
  );
});

// ============================================================================
// Divider - Horizontal line
// ============================================================================

interface DividerProps {
  spacing?: number;
}

export const Divider = memo<DividerProps>(function Divider({ spacing: sp = 4 }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.borderLight}`,
        margin: `${spacing[sp]}px 0`,
      }}
    />
  );
});

// ============================================================================
// Grid - Responsive grid layout
// ============================================================================

interface GridProps {
  children: React.ReactNode;
  columns?: string;
  minWidth?: number;
  gap?: number;
  style?: Record<string, any>;
}

export const Grid = memo<GridProps>(function Grid({
  children,
  columns = 'auto-fill',
  minWidth = 180,
  gap = 4,
  style: customStyle,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(${minWidth}px, 1fr))`,
        gap: spacing[gap],
        ...customStyle,
      }}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Flex - Flexbox container
// ============================================================================

interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: number;
  wrap?: boolean;
  style?: Record<string, any>;
  [key: string]: any;
}

export const Flex = memo<FlexProps>(function Flex({
  children,
  direction = 'row',
  align = 'center',
  justify = 'flex-start',
  gap = 2,
  wrap = false,
  style: customStyle,
  ...props
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap: spacing[gap],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Pagination - Page navigation component
// ============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (...args: any[]) => any;
  showItemCount?: boolean;
  itemsPerPageOptions?: number[];
  itemsPerPage?: number;
  onItemsPerPageChange?: (...args: any[]) => any;
}

export const Pagination = memo<PaginationProps>(function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  showItemCount = true,
}) {
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate middle pages
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      
      // Adjust if at beginning
      if (page <= 3) {
        end = 4;
      }
      // Adjust if at end
      if (page >= totalPages - 2) {
        start = totalPages - 3;
      }
      
      // Add ellipsis before middle pages if needed
      if (start > 2) pages.push('...');
      
      // Add middle pages
      for (let i = start; i <= end; i++) pages.push(i);
      
      // Add ellipsis after middle pages if needed
      if (end < totalPages - 1) pages.push('...');
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageButtonStyle = (isActive) => ({
    ...styles.btnSec,
    minWidth: 36,
    height: 36,
    padding: 0,
    justifyContent: 'center',
    background: isActive ? colors.primary : 'transparent',
    color: isActive ? '#fff' : colors.textPrimary,
    border: isActive ? 'none' : `1px solid ${colors.border}`,
    fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
  });

  return (
    <div style={{
      ...styles.flexBetween,
      marginTop: spacing[5],
      paddingTop: spacing[4],
      borderTop: `1px solid ${colors.borderLight}`,
    }}>
      {/* Item count */}
      {showItemCount && (
        <div style={styles.textSmMuted}>
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}

      {/* Page navigation */}
      <div style={{ ...styles.flexCenter, gap: spacing[1] }}>
        {/* Previous button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          style={{
            ...pageButtonStyle(false),
            opacity: page === 1 ? 0.5 : 1,
            cursor: page === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ‹
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((pageNum, idx) => (
          pageNum === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ 
              padding: `0 ${spacing[2]}px`, 
              color: colors.textMuted 
            }}>
              …
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              style={pageButtonStyle(pageNum === page)}
            >
              {pageNum}
            </button>
          )
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          style={{
            ...pageButtonStyle(false),
            opacity: page === totalPages ? 0.5 : 1,
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// LoadingSpinner - Loading indicator
// ============================================================================

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: Record<string, any>;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(function LoadingSpinner({
  size = 24,
  color = colors.primary,
  style: customStyle
}) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${withOpacity(color, 30)}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      ...customStyle,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

// ============================================================================
// LoadingOverlay - Full-screen or container loading state
// ============================================================================

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  text?: string;
  inline?: boolean;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(function LoadingOverlay({
  message = 'Loading...',
  fullScreen = false,
}) {
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  } : {
    position: 'absolute',
    inset: 0,
    background: `${colors.bgDark}cc`,
  };

  return (
    <div style={{
      ...containerStyle,
      ...styles.flexColCenter,
      gap: spacing[3],
    }}>
      <LoadingSpinner size={32} />
      <span style={styles.textSmMuted}>
        {message}
      </span>
    </div>
  );
});

// ============================================================================
// Accessibility Helpers
// ============================================================================

const visuallyHiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

// VisuallyHidden - Hide content visually but keep it accessible to screen readers
interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const VisuallyHidden = memo<VisuallyHiddenProps>(function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component
      style={visuallyHiddenStyle}
    >
      {children}
    </Component>
  );
});

// LiveRegion - Announce dynamic content to screen readers
interface LiveRegionProps {
  children?: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  message?: string;
  clearAfter?: number;
}

export const LiveRegion = memo<LiveRegionProps>(function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      style={visuallyHiddenStyle}
    >
      {children}
    </div>
  );
});

// SkipLink - Allow keyboard users to skip to main content
interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipLink = memo<SkipLinkProps>(function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={`#${targetId}`}
      style={{
        position: 'absolute',
        left: -9999,
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
        zIndex: 9999,
        padding: `${spacing[2]}px ${spacing[4]}px`,
        background: colors.primary,
        color: '#fff',
        textDecoration: 'none',
        borderRadius: borderRadius.md,
      }}
      onFocus={(e) => {
        e.target.style.left = spacing[4] + 'px';
        e.target.style.top = spacing[4] + 'px';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
      }}
      onBlur={(e) => {
        e.target.style.left = '-9999px';
        e.target.style.width = '1px';
        e.target.style.height = '1px';
      }}
    >
      {children}
    </a>
  );
});

// FocusTrap - Trap focus within a container (useful for modals)
export function useFocusTrap(containerRef, isActive = true) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, isActive]);
}

