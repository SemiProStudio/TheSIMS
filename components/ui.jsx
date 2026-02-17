// ============================================================================
// SIMS UI Component Library
// Reusable, composable UI components
// ============================================================================

import { memo, forwardRef, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, GripVertical } from 'lucide-react';
import { colors, styles, borderRadius, spacing, typography, withOpacity } from '../theme.js';

// ============================================================================
// BackButton - Consistent back navigation
// ============================================================================

export const BackButton = memo(function BackButton({ onClick, children = 'Back' }) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={`Go back: ${children}`}
      style={{
        ...styles.btnSec,
        marginBottom: spacing[4],
        border: 'none',
        background: 'none',
        padding: 0,
        color: colors.textSecondary,
        display: 'flex',
        alignItems: 'center',
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

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  onBack,
  backLabel = 'Back',
}) {
  return (
    <>
      {(backButton || onBack) && <BackButton onClick={onBack}>{backLabel}</BackButton>}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[5],
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>{title}</h2>
          {subtitle && (
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
            >
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
// DragHandle - Visual grip handle for draggable items
// ============================================================================

export const DragHandle = memo(function DragHandle({ canDrag = true, size = 16 }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        color: canDrag ? colors.textMuted : colors.borderLight,
        cursor: canDrag ? 'grab' : 'default',
      }}
    >
      <GripVertical size={size} />
    </div>
  );
});

// ============================================================================
// Badge - Status/category indicator
// ============================================================================

export const Badge = memo(function Badge({ text, children, color = colors.primary, size = 'sm' }) {
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

export const Button = memo(
  forwardRef(function Button(
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
    ref,
  ) {
    // Build CSS class list
    const classNames = [
      variant === 'primary' ? 'btn' : 'btn-secondary',
      danger && 'btn-danger',
      size === 'sm' && 'btn-sm',
      fullWidth && 'btn-full',
      customClassName,
    ]
      .filter(Boolean)
      .join(' ');

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
  }),
);

// ============================================================================
// Card - Container component
// ============================================================================

export const Card = memo(function Card({
  children,
  padding = true,
  onClick,
  style: customStyle,
  className: customClassName,
  ...props
}) {
  const isClickable = !!onClick;
  const classNames = ['card', isClickable && 'card-clickable', customClassName]
    .filter(Boolean)
    .join(' ');

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
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e);
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
});

// ============================================================================
// CardHeader - Card header with title
// ============================================================================

export const CardHeader = memo(function CardHeader({ title, icon: Icon, action, children }) {
  return (
    <div
      style={{
        padding: `${spacing[4]}px`,
        borderBottom: `1px solid ${colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
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

export const CollapsibleSection = memo(function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  collapsed,
  onToggleCollapse,
  action,
  children,
  padding = true,
  style,
  headerColor,
}) {
  const accentColor = headerColor || colors.primary;

  return (
    <div
      style={{
        background: withAlpha(accentColor, 0.18),
        borderRadius: borderRadius.lg,
        border: `1px solid ${withAlpha(accentColor, 0.35)}`,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Header - clickable to toggle, hover handled by CSS */}
      <div
        className="collapsible-header"
        onClick={onToggleCollapse}
        style={{
          '--section-accent-color': accentColor,
          padding: `${spacing[3]}px ${spacing[4]}px`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          cursor: 'pointer',
          userSelect: 'none',
          background: collapsed ? withAlpha(accentColor, 0.3) : withAlpha(accentColor, 0.38),
          borderBottom: collapsed ? 'none' : `1px solid ${withAlpha(accentColor, 0.4)}`,
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        {Icon && <Icon size={16} color={accentColor} />}
        <strong style={{ color: colors.textPrimary, flex: 1 }}>{title}</strong>
        {badge !== undefined && badge !== null && (
          <span
            style={{
              background: withAlpha(accentColor, 0.5),
              color: colors.textPrimary,
              padding: '2px 8px',
              borderRadius: borderRadius.full,
              fontSize: typography.fontSize.xs,
              fontWeight: typography.fontWeight.medium,
            }}
          >
            {badge}
          </span>
        )}
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </div>

      {/* Content - shown when not collapsed */}
      {!collapsed && (
        <div
          style={{
            padding: padding ? spacing[4] : 0,
            background: withAlpha(accentColor, 0.3),
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Input - Form input field
// ============================================================================

export const Input = memo(
  forwardRef(function Input(
    {
      label,
      error,
      icon: Icon,
      style: customStyle,
      containerStyle,
      className: customClassName,
      ...props
    },
    ref,
  ) {
    const inputClassNames = ['input', error && 'input-error', customClassName]
      .filter(Boolean)
      .join(' ');

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
          <span
            style={{
              color: colors.danger,
              fontSize: typography.fontSize.xs,
              marginTop: spacing[1],
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }),
);

// ============================================================================
// SelectInput - Basic dropdown select (legacy - prefer components/Select.jsx)
// ============================================================================

export const SelectInput = memo(
  forwardRef(function SelectInput(
    { label, options, style: customStyle, className: customClassName, ...props },
    ref,
  ) {
    const selectClassNames = ['select', customClassName].filter(Boolean).join(' ');

    return (
      <div>
        {label && <label className="label">{label}</label>}
        <select ref={ref} className={selectClassNames} style={customStyle} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }),
);

// ============================================================================
// StatCard - Dashboard statistic card
// ============================================================================

export const StatCard = memo(function StatCard({
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
          width: 48,
          height: 48,
          margin: '0 auto 12px',
          background: colors.bgMedium,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.xl,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
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
          fontSize: typography.fontSize.xs,
          color: colors.textMuted,
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

export const ItemImage = memo(function ItemImage({
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
        width: size,
        height: size,
        borderRadius: radius,
        background: `${withOpacity(colors.primary, 15)}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
      }}
    >
      <svg
        width={size * 0.4}
        height={size * 0.4}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
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

// ============================================================================
// EmptyState - No data placeholder
// ============================================================================

export const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <Card style={{ padding: spacing[12], textAlign: 'center' }}>
      {Icon && (
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 16px',
            background: `${withOpacity(colors.primary, 20)}`,
            borderRadius: borderRadius['2xl'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
        <p style={{ color: colors.textMuted, marginBottom: spacing[5] }}>{description}</p>
      )}
      {action}
    </Card>
  );
});

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
  danger = true,
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

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

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
        zIndex: 1000,
      }}
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
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
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ padding: spacing[5] }}>
          <h3
            id="confirm-dialog-title"
            style={{
              margin: `0 0 ${spacing[3]}px`,
              fontSize: typography.fontSize.lg,
              color: colors.textPrimary,
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
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>
        <div
          style={{
            padding: spacing[4],
            borderTop: `1px solid ${colors.borderLight}`,
            display: 'flex',
            gap: spacing[3],
            justifyContent: 'flex-end',
          }}
        >
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            type="button"
            style={{
              ...styles.btnSec,
              padding: `${spacing[2]}px ${spacing[4]}px`,
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
              background: danger ? colors.danger : colors.primary,
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

export const SearchInput = memo(
  forwardRef(function SearchInput(
    {
      value,
      onChange,
      placeholder = 'Search...',
      onClear,
      'aria-label': ariaLabel = 'Search',
      id,
      style: customStyle = {},
      ...props
    },
    ref,
  ) {
    const stableIdRef = useRef(id || `search-input-${Math.random().toString(36).substr(2, 9)}`);
    const inputId = id || stableIdRef.current;
    const internalRef = useRef(null);
    const inputRef = ref || internalRef;
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div
        role="search"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          ...styles.input,
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
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textPrimary,
            flex: 1,
            outline: 'none',
            fontSize: typography.fontSize.base,
            padding: 0,
            margin: 0,
            // Hide any native styling
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            appearance: 'none',
            boxShadow: 'none',
          }}
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
  }),
);

// ============================================================================
// Avatar - User avatar
// ============================================================================

export const Avatar = memo(function Avatar({ name, src, size = 40, style: customStyle }) {
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
        width: size,
        height: size,
        borderRadius: borderRadius.md,
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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

export const Divider = memo(function Divider({ spacing: sp = 4 }) {
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

export const Grid = memo(function Grid({
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

export const Flex = memo(function Flex({
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

export const Pagination = memo(function Pagination({
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing[5],
        paddingTop: spacing[4],
        borderTop: `1px solid ${colors.borderLight}`,
      }}
    >
      {/* Item count */}
      {showItemCount && (
        <div
          style={{
            fontSize: typography.fontSize.sm,
            color: colors.textMuted,
          }}
        >
          Showing {startItem}-{endItem} of {totalItems} items
        </div>
      )}

      {/* Page navigation */}
      <div style={{ display: 'flex', gap: spacing[1], alignItems: 'center' }}>
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
        {getPageNumbers().map((pageNum, idx) =>
          pageNum === '...' ? (
            <span
              key={`ellipsis-${idx}`}
              style={{
                padding: `0 ${spacing[2]}px`,
                color: colors.textMuted,
              }}
            >
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
          ),
        )}

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

export const LoadingSpinner = memo(function LoadingSpinner({
  size = 24,
  color = colors.primary,
  style: customStyle,
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${withOpacity(color, 30)}`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        ...customStyle,
      }}
    >
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

export const LoadingOverlay = memo(function LoadingOverlay({
  message = 'Loading...',
  fullScreen = false,
}) {
  const containerStyle = fullScreen
    ? {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
      }
    : {
        position: 'absolute',
        inset: 0,
        background: `${colors.bgDark}cc`,
      };

  return (
    <div
      style={{
        ...containerStyle,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[3],
      }}
    >
      <LoadingSpinner size={32} />
      <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>{message}</span>
    </div>
  );
});

// ============================================================================
// Accessibility Helpers
// ============================================================================

// VisuallyHidden - Hide content visually but keep it accessible to screen readers
export const VisuallyHidden = memo(function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </Component>
  );
});

// LiveRegion - Announce dynamic content to screen readers
export const LiveRegion = memo(function LiveRegion({
  children,
  politeness = 'polite', // 'polite' or 'assertive'
  atomic = true,
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </div>
  );
});

// SkipLink - Allow keyboard users to skip to main content
export const SkipLink = memo(function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
}) {
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

// ============================================================================
// PropTypes Definitions
// ============================================================================

BackButton.propTypes = {
  /** Click handler */
  onClick: PropTypes.func.isRequired,
  /** Button text */
  children: PropTypes.node,
};

PageHeader.propTypes = {
  /** Page title */
  title: PropTypes.string.isRequired,
  /** Optional subtitle */
  subtitle: PropTypes.string,
  /** Action button(s) to render on the right */
  action: PropTypes.node,
  /** Whether to show back button (deprecated, use onBack) */
  backButton: PropTypes.bool,
  /** Callback for back button click */
  onBack: PropTypes.func,
  /** Label for back button */
  backLabel: PropTypes.string,
};

DragHandle.propTypes = {
  /** Whether dragging is enabled */
  canDrag: PropTypes.bool,
  /** Icon size */
  size: PropTypes.number,
};

Badge.propTypes = {
  /** Badge text (deprecated, use children) */
  text: PropTypes.string,
  /** Badge content */
  children: PropTypes.node,
  /** Badge color */
  color: PropTypes.string,
  /** Badge size: 'xs', 'sm', 'md' */
  size: PropTypes.oneOf(['xs', 'sm', 'md']),
};

Button.propTypes = {
  /** Button content */
  children: PropTypes.node,
  /** Button variant */
  variant: PropTypes.oneOf(['primary', 'secondary']),
  /** Danger styling */
  danger: PropTypes.bool,
  /** Full width button */
  fullWidth: PropTypes.bool,
  /** Small size button */
  small: PropTypes.bool,
  /** Lucide icon component */
  icon: PropTypes.elementType,
  /** Disabled state */
  disabled: PropTypes.bool,
  /** Click handler */
  onClick: PropTypes.func,
  /** Button type */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  /** Additional styles */
  style: PropTypes.object,
};

Card.propTypes = {
  /** Card content */
  children: PropTypes.node.isRequired,
  /** Whether to include padding */
  padding: PropTypes.bool,
  /** Click handler */
  onClick: PropTypes.func,
  /** Custom class name */
  className: PropTypes.string,
  /** Additional styles */
  style: PropTypes.object,
};

CardHeader.propTypes = {
  /** Header title */
  title: PropTypes.string.isRequired,
  /** Lucide icon component */
  icon: PropTypes.elementType,
  /** Action element(s) to render on the right */
  action: PropTypes.node,
};

Input.propTypes = {
  /** Label text */
  label: PropTypes.string,
  /** Error message */
  error: PropTypes.string,
  /** Helper text */
  helper: PropTypes.string,
  /** Whether field is required */
  required: PropTypes.bool,
  /** Input type */
  type: PropTypes.string,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Current value */
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /** Change handler */
  onChange: PropTypes.func,
  /** Disabled state */
  disabled: PropTypes.bool,
};

SelectInput.propTypes = {
  /** Label text */
  label: PropTypes.string,
  /** Array of { value, label } options */
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  /** Current value */
  value: PropTypes.string,
  /** Change handler */
  onChange: PropTypes.func,
  /** Disabled state */
  disabled: PropTypes.bool,
};

StatCard.propTypes = {
  /** Lucide icon component */
  icon: PropTypes.elementType.isRequired,
  /** Stat label */
  label: PropTypes.string.isRequired,
  /** Stat value */
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  /** Icon and accent color */
  color: PropTypes.string,
  /** Click handler */
  onClick: PropTypes.func,
  /** Trend indicator: 'up' or 'down' */
  trend: PropTypes.oneOf(['up', 'down']),
  /** Trend percentage value */
  trendValue: PropTypes.string,
};

ItemImage.propTypes = {
  /** Image source URL */
  src: PropTypes.string,
  /** Alt text */
  alt: PropTypes.string,
  /** Image size in pixels */
  size: PropTypes.number,
  /** Click handler */
  onClick: PropTypes.func,
  /** Show clickable indicator */
  clickable: PropTypes.bool,
};

Modal.propTypes = {
  /** Whether the modal is open */
  isOpen: PropTypes.bool.isRequired,
  /** Close handler */
  onClose: PropTypes.func.isRequired,
  /** Modal title */
  title: PropTypes.string,
  /** Maximum width in pixels */
  maxWidth: PropTypes.number,
  /** Modal content */
  children: PropTypes.node.isRequired,
};

EmptyState.propTypes = {
  /** Lucide icon component */
  icon: PropTypes.elementType.isRequired,
  /** Title text */
  title: PropTypes.string.isRequired,
  /** Description text */
  description: PropTypes.string,
  /** Action button element */
  action: PropTypes.node,
};

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

SearchInput.propTypes = {
  /** Search value */
  value: PropTypes.string.isRequired,
  /** Change handler */
  onChange: PropTypes.func.isRequired,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Debounce delay in ms */
  debounceMs: PropTypes.number,
  /** Focus handler */
  onFocus: PropTypes.func,
  /** Blur handler */
  onBlur: PropTypes.func,
};

Avatar.propTypes = {
  /** User name for initials */
  name: PropTypes.string,
  /** Image source URL */
  src: PropTypes.string,
  /** Avatar size in pixels */
  size: PropTypes.number,
  /** Custom background color */
  color: PropTypes.string,
};

Divider.propTypes = {
  /** Vertical spacing (theme spacing key) */
  spacing: PropTypes.number,
};

Grid.propTypes = {
  /** Grid content */
  children: PropTypes.node.isRequired,
  /** Minimum column width */
  minWidth: PropTypes.number,
  /** Gap between items */
  gap: PropTypes.number,
};

Flex.propTypes = {
  /** Flex content */
  children: PropTypes.node.isRequired,
  /** Flex direction */
  direction: PropTypes.oneOf(['row', 'column']),
  /** Align items */
  align: PropTypes.oneOf(['start', 'center', 'end', 'stretch']),
  /** Justify content */
  justify: PropTypes.oneOf(['start', 'center', 'end', 'between', 'around']),
  /** Gap between items */
  gap: PropTypes.number,
  /** Allow wrapping */
  wrap: PropTypes.bool,
};

Pagination.propTypes = {
  /** Current page (1-indexed) */
  page: PropTypes.number.isRequired,
  /** Total number of pages */
  totalPages: PropTypes.number.isRequired,
  /** Page change handler */
  onPageChange: PropTypes.func.isRequired,
  /** Total items count */
  totalItems: PropTypes.number,
  /** Items per page */
  pageSize: PropTypes.number,
  /** Whether to show item count text */
  showItemCount: PropTypes.bool,
};

LoadingSpinner.propTypes = {
  /** Spinner size in pixels */
  size: PropTypes.number,
  /** Spinner color */
  color: PropTypes.string,
};

LoadingOverlay.propTypes = {
  /** Loading message text */
  message: PropTypes.string,
  /** Whether to display as full-screen overlay */
  fullScreen: PropTypes.bool,
};

VisuallyHidden.propTypes = {
  /** Content to hide visually */
  children: PropTypes.node.isRequired,
  /** HTML element to render */
  as: PropTypes.elementType,
};

LiveRegion.propTypes = {
  /** Message to announce */
  message: PropTypes.string,
  /** ARIA politeness level */
  politeness: PropTypes.oneOf(['polite', 'assertive']),
  /** Clear message after delay */
  clearAfter: PropTypes.number,
};

SkipLink.propTypes = {
  /** ID of target element */
  targetId: PropTypes.string,
  /** Link text */
  children: PropTypes.node,
};
