import { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { styles } from '../../theme.js';

// ============================================================================
// Button - Primary and secondary buttons
// ============================================================================

export const Button = memo(forwardRef(function Button(
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
