import React, { memo, forwardRef } from 'react';
import { colors, spacing, typography } from '../../theme';

// ============================================================================
// Input - Form input field
// ============================================================================

interface InputProps {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (...args: any[]) => any;
  disabled?: boolean;
  icon?: React.ElementType;
  style?: Record<string, any>;
  containerStyle?: Record<string, any>;
  className?: string;
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

