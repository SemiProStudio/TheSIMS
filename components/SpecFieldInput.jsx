// ============================================================================
// SpecFieldInput — renders one spec value input according to its typed
// definition (Phase 1 taxonomy): number (unit suffix, soft validation),
// boolean (Yes/No), enum (options + free-text escape), text.
// Legacy values that predate typing (e.g. "1.54 lb / 695 g" in a number
// field) must stay visible and editable — validation warns, never blocks.
// ============================================================================

import { useState } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, spacing, typography } from '../theme.js';
import { Select } from './Select.jsx';

const OTHER = '__other__';

export function SpecFieldInput({ spec, value, onChange, invalid = false }) {
  const type = spec.type || 'text';
  const current = value || '';

  // Enum: free-text escape stays active once chosen (or when the stored
  // value isn't one of the options)
  const inOptions =
    type === 'enum' && Array.isArray(spec.options) ? spec.options.includes(current) : false;
  const [otherMode, setOtherMode] = useState(type === 'enum' && !!current && !inOptions);

  const inputStyle = {
    ...styles.input,
    borderColor: invalid ? colors.danger : colors.border,
  };

  if (type === 'boolean') {
    return (
      <Select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: '', label: '—' },
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ]}
        compact
        aria-label={spec.name}
      />
    );
  }

  if (type === 'enum' && Array.isArray(spec.options) && spec.options.length > 0 && !otherMode) {
    return (
      <Select
        value={inOptions ? current : ''}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOtherMode(true);
          } else {
            onChange(e.target.value);
          }
        }}
        options={[
          { value: '', label: '—' },
          ...spec.options.map((opt) => ({ value: opt, label: opt })),
          { value: OTHER, label: 'Other…' },
        ]}
        compact
        aria-label={spec.name}
      />
    );
  }

  if (type === 'number') {
    const isNumeric = current === '' || /^-?\d+(\.\d+)?$/.test(current.trim());
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
          <input
            value={current}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            aria-label={spec.unit ? `${spec.name} (${spec.unit})` : spec.name}
          />
          {spec.unit && (
            <span
              style={{
                fontSize: typography.fontSize.xs,
                color: colors.textMuted,
                flexShrink: 0,
              }}
            >
              {spec.unit}
            </span>
          )}
        </div>
        {!isNumeric && (
          <span
            style={{
              fontSize: typography.fontSize.xs,
              color: colors.warning || colors.textMuted,
              display: 'block',
              marginTop: 2,
            }}
          >
            Expected a number{spec.unit ? ` in ${spec.unit}` : ''}
          </span>
        )}
      </div>
    );
  }

  // text (and enum in free-text mode)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
      <input
        value={current}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        aria-label={spec.name}
      />
      {type === 'enum' && otherMode && (
        <button
          type="button"
          onClick={() => {
            setOtherMode(false);
            if (!inOptions) onChange('');
          }}
          title="Back to list"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textMuted,
            fontSize: typography.fontSize.xs,
            padding: 0,
            flexShrink: 0,
          }}
        >
          list
        </button>
      )}
    </div>
  );
}

SpecFieldInput.propTypes = {
  spec: PropTypes.shape({
    name: PropTypes.string.isRequired,
    required: PropTypes.bool,
    type: PropTypes.string,
    unit: PropTypes.string,
    options: PropTypes.array,
  }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  invalid: PropTypes.bool,
};
