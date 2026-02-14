import React, { memo, forwardRef } from 'react';

// ============================================================================
// SelectInput - Basic dropdown select (legacy - prefer components/Select.jsx)
// ============================================================================

interface SelectInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (...args: any[]) => any;
  disabled?: boolean;
  style?: Record<string, any>;
  className?: string;
  [key: string]: any;
}

export const SelectInput = memo(forwardRef<HTMLSelectElement, SelectInputProps>(function SelectInput(
  { label, options, style: customStyle, className: customClassName, ...props },
  ref
) {
  const selectClassNames = ['select', customClassName].filter(Boolean).join(' ');
  
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

