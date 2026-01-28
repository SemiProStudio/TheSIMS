// ============================================================================
// SearchInput - Search input with icon and clear button
// ============================================================================

import React, { memo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Search, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from './shared.js';

export const SearchInput = memo(function SearchInput({ 
  value, 
  onChange, 
  onClear,
  placeholder = 'Search...',
  autoFocus = false,
  onKeyDown,
  fullWidth = true,
  size = 'md',
}) {
  const inputRef = useRef(null);
  const isSmall = size === 'sm';

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
    inputRef.current?.focus();
  };

  return (
    <div 
      role="search"
      style={{ 
        position: 'relative', 
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: spacing[3],
          top: '50%',
          transform: 'translateY(-50%)',
          color: colors.textMuted,
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
        aria-hidden="true"
      >
        <Search size={isSmall ? 14 : 16} />
      </div>
      <input
        ref={inputRef}
        type="search"
        role="searchbox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        style={{
          width: '100%',
          padding: isSmall 
            ? `${spacing[2]}px ${spacing[8]}px ${spacing[2]}px ${spacing[8]}px`
            : `${spacing[3]}px ${spacing[10]}px ${spacing[3]}px ${spacing[10]}px`,
          background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          color: colors.textPrimary,
          fontSize: isSmall ? typography.fontSize.xs : typography.fontSize.sm,
          outline: 'none',
        }}
      />
      {value && onClear && (
        <button
          onClick={handleClear}
          type="button"
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: spacing[2],
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: spacing[1],
            display: 'flex',
            alignItems: 'center',
            borderRadius: borderRadius.sm,
          }}
        >
          <X size={isSmall ? 12 : 14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  autoFocus: PropTypes.bool,
  onKeyDown: PropTypes.func,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md']),
};

export default SearchInput;
