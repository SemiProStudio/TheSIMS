import { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from '../../theme.js';

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
