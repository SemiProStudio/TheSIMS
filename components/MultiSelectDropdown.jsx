// =============================================================================
// MultiSelectDropdown Component
// Dropdown with multiple checkbox selections
// =============================================================================

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { ChevronDown, Check, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(options.length * 40 + 8, 280);
    
    const direction = spaceBelow < dropdownHeight ? 'up' : 'down';
    
    setDropdownPosition({
      top: direction === 'down' ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
    });
  }, [options.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
          return;
        }
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

  // Update position when open
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      
      const handleScrollOrResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updateDropdownPosition]);

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
      padding: '12px 16px',
      paddingRight: 40,
      background: 'var(--input-bg, rgba(106, 154, 184, 0.1))',
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.lg,
      color: selectedValues.length > 0 ? colors.textPrimary : colors.textMuted,
      fontSize: typography.fontSize.base,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      cursor: 'pointer',
      textAlign: 'left',
      position: 'relative',
      boxSizing: 'border-box',
      transition: 'border-color 150ms ease, box-shadow 150ms ease',
      outline: 'none',
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
      position: 'absolute',
      right: 36,
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 1,
    },
    chevronWrapper: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}`,
      transition: 'transform 150ms ease',
      pointerEvents: 'none',
      color: colors.textMuted,
    },
    dropdown: {
      position: 'fixed',
      top: dropdownPosition.top,
      left: dropdownPosition.left,
      width: dropdownPosition.width,
      padding: 4,
      background: colors.bgMedium,
      border: `1px solid ${colors.border}`,
      borderRadius: borderRadius.lg,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      maxHeight: '280px',
      overflowY: 'auto',
      zIndex: 99999,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
    checkbox: {
      width: '18px',
      height: '18px',
      borderRadius: borderRadius.sm,
      border: '2px solid',
      borderColor: colors.border,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'background 150ms ease, border-color 150ms ease',
      background: 'transparent',
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

  // Render dropdown via portal to escape stacking context
  const dropdown = isOpen && createPortal(
    <div ref={dropdownRef} style={styles.dropdown}>
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
    </div>,
    document.body
  );

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
            onMouseEnter={(e) => e.currentTarget.style.color = colors.danger}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.textMuted}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}
        <span style={styles.chevronWrapper}>
          <ChevronDown size={16} />
        </span>
      </button>

      {dropdown}
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
export default memo(MultiSelectDropdown);
