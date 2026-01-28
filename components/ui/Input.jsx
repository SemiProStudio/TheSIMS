// ============================================================================
// Input - Text input with label and error state
// ============================================================================

import React, { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from './shared.js';

export const Input = memo(forwardRef(function Input(
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

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  icon: PropTypes.elementType,
  style: PropTypes.object,
  containerStyle: PropTypes.object,
  className: PropTypes.string,
};

export default Input;
