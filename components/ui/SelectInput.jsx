import { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';

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

SelectInput.propTypes = {
  /** Label text */
  label: PropTypes.string,
  /** Error message */
  error: PropTypes.string,
  /** Whether field is required */
  required: PropTypes.bool,
  /** Option elements */
  children: PropTypes.node.isRequired,
  /** Current value */
  value: PropTypes.string,
  /** Change handler */
  onChange: PropTypes.func,
  /** Disabled state */
  disabled: PropTypes.bool,
};
