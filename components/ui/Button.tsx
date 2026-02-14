import React, { memo, forwardRef } from 'react';


// ============================================================================
// Button - Primary and secondary buttons
// ============================================================================

interface ButtonProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
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

