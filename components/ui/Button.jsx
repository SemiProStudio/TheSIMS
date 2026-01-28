// ============================================================================
// Button - Primary action button component
// Uses CSS Modules for styling with CSS variable support
// ============================================================================

import React, { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import styles from '../../styles/Button.module.css';

// Utility to join class names (lightweight alternative to clsx)
const cx = (...classes) => classes.filter(Boolean).join(' ');

export const Button = memo(forwardRef(function Button(
  { 
    children, 
    variant = 'primary', 
    size = 'md',
    disabled = false,
    loading = false,
    danger = false,
    fullWidth = false,
    icon: Icon,
    iconPosition = 'left',
    iconOnly = false,
    'aria-label': ariaLabel,
    onClick,
    className,
    type = 'button',
    ...props 
  },
  ref
) {
  // Build CSS class list from module
  const buttonClasses = cx(
    styles.button,
    styles[variant],
    size === 'sm' && styles.small,
    size === 'lg' && styles.large,
    danger && styles.danger,
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    Icon && styles.withIcon,
    iconPosition === 'right' && styles.iconRight,
    className
  );

  // Icon-only buttons must have aria-label
  const isIconOnly = iconOnly || (Icon && !children);
  const accessibleLabel = ariaLabel || (isIconOnly ? 'Button' : undefined);

  return (
    <button
      ref={ref}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      aria-label={accessibleLabel}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} aria-hidden="true" />
      )}
      {!loading && children}
      {Icon && iconPosition === 'right' && (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} aria-hidden="true" />
      )}
    </button>
  );
}));

Button.propTypes = {
  /** Button content */
  children: PropTypes.node,
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger', 'success', 'warning']),
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Whether button is disabled */
  disabled: PropTypes.bool,
  /** Whether button shows loading state */
  loading: PropTypes.bool,
  /** Danger styling (red) */
  danger: PropTypes.bool,
  /** Whether button takes full width */
  fullWidth: PropTypes.bool,
  /** Icon component to display */
  icon: PropTypes.elementType,
  /** Position of icon relative to text */
  iconPosition: PropTypes.oneOf(['left', 'right']),
  /** Whether button only shows icon (requires aria-label) */
  iconOnly: PropTypes.bool,
  /** Accessible label for icon-only buttons */
  'aria-label': PropTypes.string,
  /** Click handler */
  onClick: PropTypes.func,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Button type attribute */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

// Icon Button variant
export const IconButton = memo(forwardRef(function IconButton(
  { icon: Icon, size = 'md', variant = 'ghost', 'aria-label': ariaLabel, ...props },
  ref
) {
  return (
    <Button
      ref={ref}
      icon={Icon}
      iconOnly
      variant={variant}
      size={size}
      aria-label={ariaLabel}
      className={styles.iconButton}
      {...props}
    />
  );
}));

IconButton.propTypes = {
  /** Icon component to display */
  icon: PropTypes.elementType.isRequired,
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
  /** Required accessible label */
  'aria-label': PropTypes.string.isRequired,
  /** Click handler */
  onClick: PropTypes.func,
};

export default Button;
