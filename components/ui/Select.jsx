// ============================================================================
// Select - Dropdown select input
// ============================================================================

import React, { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';

export const Select = memo(forwardRef(function Select(
  { label, options, style: customStyle, className: customClassName, ...props },
  ref
) {
  const selectClassNames = [
    'select',
    customClassName,
  ].filter(Boolean).join(' ');

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

Select.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  style: PropTypes.object,
  className: PropTypes.string,
};

export default Select;
