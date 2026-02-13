import { useState, memo } from 'react';
import PropTypes from 'prop-types';

import { colors, styles, spacing, typography } from '../../theme.js';

// ============================================================================
// SearchInput - Search input with icon
// ============================================================================

export const SearchInput = memo(function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...',
  onClear,
  'aria-label': ariaLabel = 'Search',
  id,
  style: customStyle = {},
  ...props 
}) {
  const inputId = id || `search-input-${Math.random().toString(36).substr(2, 9)}`;
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div
      role="search"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        ...styles.input,
        padding: '12px 16px',
        ...(isFocused && {
          borderColor: colors.primary,
          boxShadow: `0 0 0 2px color-mix(in srgb, ${colors.primary} 20%, transparent)`,
        }),
        ...customStyle,
      }}
    >
      <svg 
        width={18} 
        height={18} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={colors.textMuted} 
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          background: 'none',
          border: 'none',
          color: colors.textPrimary,
          flex: 1,
          outline: 'none',
          fontSize: typography.fontSize.base,
          padding: 0,
          margin: 0,
          // Hide any native styling
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          appearance: 'none',
          boxShadow: 'none',
        }}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          type="button"
          aria-label="Clear search"
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: 2,
          }}
        >
          <svg 
            width={14} 
            height={14} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});

SearchInput.propTypes = {
  /** Search value */
  value: PropTypes.string.isRequired,
  /** Change handler */
  onChange: PropTypes.func.isRequired,
  /** Placeholder text */
  placeholder: PropTypes.string,
  /** Debounce delay in ms */
  debounceMs: PropTypes.number,
  /** Focus handler */
  onFocus: PropTypes.func,
  /** Blur handler */
  onBlur: PropTypes.func,
};
