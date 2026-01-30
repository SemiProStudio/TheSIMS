// =============================================================================
// MultiSelectDropdown Component
// Dropdown with multiple checkbox selections
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography, zIndex } from '../theme.js';

const MultiSelectDropdown = memo(function MultiSelectDropdown({
  label,
  options = [],
  selectedValues = [],
  onChange,
  placeholder = 'Select...',
  renderOption,
  className = '',
  style = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleOption = useCallback((value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  }, [selectedValues, onChange]);

  const clearAll = useCallback((e) => {
    e.stopPropagation();
    onChange([]);
  }, [onChange]);

  const displayText = selectedValues.length === 0 
    ? placeholder 
    : selectedValues.length === 1
      ? options.find(o => o.value === selectedValues[0])?.label || selectedValues[0]
      : `${selectedValues.length} selected`;

  const styles = {
    container: {
      position: 'relative',
      ...style,
    },
    trigger: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing[2],
      width: '100%',
      padding: `${spacing[2]}px ${spacing[3]}px`,
      background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.lg,
      color: selectedValues.length > 0 ? colors.textPrimary : colors.textMuted,
      fontSize: typography.fontSize.sm,
      cursor: 'pointer',
      minHeight: '40px',
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
    },
    triggerOpen: {
      borderColor: colors.primary,
      boxShadow: `0 0 0 2px color-mix(in srgb, ${colors.primary} 20%, transparent)`,
    },
    triggerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      flex: 1,
      overflow: 'hidden',
    },
    clearButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing[1],
      background: 'transparent',
      border: 'none',
      borderRadius: borderRadius.sm,
      color: colors.textMuted,
      cursor: 'pointer',
      transition: 'color 150ms ease',
    },
    chevron: {
      transition: 'transform 150ms ease',
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      flexShrink: 0,
    },
    dropdown: {
      position: 'absolute',
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      zIndex: zIndex.dropdown,
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.lg,
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
      maxHeight: '280px',
      overflowY: 'auto',
      padding: spacing[1],
    },
    option: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[2]}px ${spacing[3]}px`,
      borderRadius: borderRadius.md,
      cursor: 'pointer',
      transition: 'background 150ms ease',
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
    },
    optionHover: {
      background: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
    },
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: borderRadius.sm,
      border: `2px solid ${colors.border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 150ms ease',
    },
    checkboxChecked: {
      background: colors.primary,
      borderColor: colors.primary,
    },
    label: {
      display: 'block',
      marginBottom: spacing[1],
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.textSecondary,
    },
  };

  return (
    <div ref={containerRef} style={styles.container} className={className}>
      {label && <label style={styles.label}>{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{ ...styles.trigger, ...(isOpen ? styles.triggerOpen : {}) }}
      >
        <span style={styles.triggerContent}>
          {displayText}
        </span>
        {selectedValues.length > 0 && (
          <button
            type="button"
            style={styles.clearButton}
            onClick={clearAll}
            onMouseEnter={(e) => e.target.style.color = colors.danger}
            onMouseLeave={(e) => e.target.style.color = colors.textMuted}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}
        <ChevronDown size={16} style={styles.chevron} />
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => toggleOption(option.value)}
                style={styles.option}
                onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, ${colors.primary} 15%, transparent)`}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ ...styles.checkbox, ...(isSelected ? styles.checkboxChecked : {}) }}>
                  {isSelected && <Check size={12} color="#fff" />}
                </div>
                {renderOption ? renderOption(option) : (
                  <span>{option.label}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

MultiSelectDropdown.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  renderOption: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export { MultiSelectDropdown };
export default MultiSelectDropdown;
