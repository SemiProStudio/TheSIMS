// =============================================================================
// MultiSelectDropdown Component
// Dropdown with multiple checkbox selections.
// Follows the listbox pattern: the popup takes focus and exposes options via
// aria-activedescendant, so the whole control works from the keyboard
// (arrows, Home/End, Enter/Space to toggle, Escape to close).
// =============================================================================

import { useState, useRef, useEffect, useCallback, useId, memo } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const baseId = useId();
  const triggerId = `${baseId}-trigger`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index) => `${baseId}-opt-${index}`;

  // Calculate dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = Math.min(options.length * 40 + 8, 280);

    const direction = spaceBelow < dropdownHeight ? 'up' : 'down';

    setDropdownPosition({
      top: direction === 'down' ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
    });
  }, [options.length]);

  const openDropdown = useCallback(() => {
    // Start on the first selected option so arrowing continues from the
    // current selection instead of the top
    const firstSelected = options.findIndex((o) => selectedValues.includes(o.value));
    setActiveIndex(firstSelected >= 0 ? firstSelected : 0);
    setIsOpen(true);
  }, [options, selectedValues]);

  const closeDropdown = useCallback((refocusTrigger = false) => {
    setIsOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  }, []);

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

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Update position and move focus into the listbox when open
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      dropdownRef.current?.focus();

      const handleScrollOrResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Keep the active option in view while arrowing
  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeIndex]);

  const toggleOption = useCallback(
    (value) => {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    },
    [selectedValues, onChange],
  );

  const clearAll = useCallback(
    (e) => {
      e.stopPropagation();
      onChange([]);
    },
    [onChange],
  );

  const handleTriggerKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) openDropdown();
      } else if (e.key === 'Escape' && isOpen) {
        closeDropdown(true);
      }
    },
    [isOpen, openDropdown, closeDropdown],
  );

  const handleListboxKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, options.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(options.length - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (options[activeIndex]) toggleOption(options[activeIndex].value);
          break;
        case 'Escape':
          e.preventDefault();
          closeDropdown(true);
          break;
        case 'Tab':
          // Let focus move on naturally, but don't leave the popup orphaned
          setIsOpen(false);
          break;
        default:
          break;
      }
    },
    [options, activeIndex, toggleOption, closeDropdown],
  );

  const displayText =
    selectedValues.length === 0
      ? placeholder
      : selectedValues.length === 1
        ? options.find((o) => o.value === selectedValues[0])?.label || selectedValues[0]
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
      // Longhand border properties: triggerOpen overrides borderColor, and
      // React warns when a longhand replaces part of a shorthand mid-rerender
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: colors.border,
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
    // Sibling of the trigger, never nested inside it — a button may not
    // contain another button
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
      outline: 'none',
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
    optionActive: {
      background: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
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
  const dropdown =
    isOpen &&
    createPortal(
      <div
        ref={dropdownRef}
        id={listboxId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={label || placeholder}
        aria-activedescendant={options.length > 0 ? optionId(activeIndex) : undefined}
        tabIndex={-1}
        onKeyDown={handleListboxKeyDown}
        style={styles.dropdown}
      >
        {options.map((option, index) => {
          const isSelected = selectedValues.includes(option.value);
          const isActive = index === activeIndex;
          return (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onClick={() => toggleOption(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
              style={{ ...styles.option, ...(isActive ? styles.optionActive : {}) }}
            >
              <div
                aria-hidden="true"
                style={{ ...styles.checkbox, ...(isSelected ? styles.checkboxChecked : {}) }}
              >
                {isSelected && <Check size={12} color={colors.onPrimary} />}
              </div>
              {renderOption ? renderOption(option) : <span>{option.label}</span>}
            </div>
          );
        })}
      </div>,
      document.body,
    );

  return (
    <div ref={containerRef} style={styles.container} className={className}>
      {label && (
        <label htmlFor={triggerId} style={styles.label}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          onKeyDown={handleTriggerKeyDown}
          style={{ ...styles.trigger, ...(isOpen ? styles.triggerOpen : {}) }}
        >
          <span style={styles.triggerContent}>{displayText}</span>
          <span style={styles.chevronWrapper}>
            <ChevronDown size={16} />
          </span>
        </button>
        {selectedValues.length > 0 && (
          <button
            type="button"
            style={styles.clearButton}
            onClick={clearAll}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.danger)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textMuted)}
            aria-label={`Clear ${label || 'selection'}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {dropdown}
    </div>
  );
});

MultiSelectDropdown.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
  selectedValues: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  renderOption: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export { MultiSelectDropdown };
export default memo(MultiSelectDropdown);
