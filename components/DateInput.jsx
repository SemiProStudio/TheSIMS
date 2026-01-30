// =============================================================================
// DateInput Component
// Styled date input that matches the app theme
// =============================================================================

import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { Calendar } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';

const DateInput = forwardRef(function DateInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  error = false,
  placeholder = 'Select date',
  style = {},
  className = '',
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  ...props
}, ref) {
  
  const baseStyles = {
    container: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      width: '100%',
    },
    input: {
      width: '100%',
      padding: `${spacing[3]}px ${spacing[4]}px`,
      paddingRight: '44px',
      background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
      border: `1px solid ${error ? colors.danger : colors.border}`,
      borderRadius: borderRadius.lg,
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      minHeight: '44px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      colorScheme: 'dark',
      ...style,
    },
    icon: {
      position: 'absolute',
      right: '12px',
      pointerEvents: 'none',
      color: colors.textMuted,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = error ? colors.danger : colors.primary;
    e.target.style.boxShadow = `0 0 0 2px color-mix(in srgb, ${error ? colors.danger : colors.primary} 20%, transparent)`;
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = error ? colors.danger : colors.border;
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={baseStyles.container} className={className}>
      <input
        ref={ref}
        type="date"
        value={value || ''}
        onChange={onChange}
        min={min}
        max={max}
        disabled={disabled}
        placeholder={placeholder}
        style={baseStyles.input}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid || error}
        {...props}
      />
      <div style={baseStyles.icon}>
        <Calendar size={18} />
      </div>
    </div>
  );
});

DateInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.string,
  max: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  className: PropTypes.string,
  'aria-label': PropTypes.string,
  'aria-invalid': PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
};

export { DateInput };
export default DateInput;
