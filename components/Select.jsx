// ============================================================================
// Custom Select Component
// Styled dropdown that works consistently across browsers
// Uses React Portal to escape stacking context issues (e.g., backdrop-filter)
// Follows MultiSelectDropdown's listbox pattern: the popup takes focus and
// exposes options via aria-activedescendant, so arrow-key highlight is
// announced (activedescendant only works on the focused element).
// ============================================================================

import { useState, useRef, useEffect, useCallback, useId, memo } from 'react';
import { createPortal } from 'react-dom';
import { colors, typography, borderRadius, withOpacity } from '../theme.js';
import { ChevronDown } from 'lucide-react';

export const Select = memo(function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  style = {},
  disabled = false,
  compact = false,
  'aria-label': ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    direction: 'down',
  });
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);

  // Option ids must be unique per instance — several Selects can be open in
  // one document (option-${index} collided across them)
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index) => `${baseId}-opt-${index}`;

  // Find the selected option
  const selectedOption = options.find(
    (opt) => (typeof opt === 'object' ? opt.value : opt) === value,
  );

  const displayValue = selectedOption
    ? typeof selectedOption === 'object'
      ? selectedOption.label
      : selectedOption
    : placeholder;

  // Calculate dropdown position relative to viewport
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 36 + 8, 200);

    // Open upward if not enough space below but enough above
    const direction = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight ? 'up' : 'down';

    setDropdownPosition({
      top: direction === 'down' ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
      direction,
    });
  }, [options.length]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Also check if click is in the portal dropdown
        if (listRef.current && listRef.current.contains(e.target)) {
          return;
        }
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update position and move focus into the listbox when open
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      listRef.current?.focus();

      const handleScrollOrResize = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Scroll highlighted option into view (only for keyboard navigation)
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current && isKeyboardNav) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      // Optional call: jsdom elements have no scrollIntoView
      highlightedEl?.scrollIntoView?.({ block: 'nearest' });
      setIsKeyboardNav(false);
    }
  }, [highlightedIndex, isOpen, isKeyboardNav]);

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(
        (opt) => (typeof opt === 'object' ? opt.value : opt) === value,
      );
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, options, value]);

  const handleSelect = useCallback(
    (opt) => {
      const val = typeof opt === 'object' ? opt.value : opt;
      onChange({ target: { value: val } });
      setIsOpen(false);
      // Focus lives in the portaled listbox while open — closing unmounts
      // it, so hand focus back to the trigger or it drops to <body>
      triggerRef.current?.focus();
    },
    [onChange],
  );

  // While open, focus (and therefore keyboard input) is on the listbox —
  // the trigger only ever opens or closes
  const handleTriggerKeyDown = useCallback(
    (e) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) setIsOpen(true);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [disabled, isOpen],
  );

  const handleListKeyDown = useCallback(
    (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setIsKeyboardNav(true);
          setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setIsKeyboardNav(true);
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (highlightedIndex >= 0 && options[highlightedIndex] !== undefined) {
            handleSelect(options[highlightedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'Tab':
          // Let focus move on naturally, but don't leave the popup orphaned
          setIsOpen(false);
          break;
      }
    },
    [options, highlightedIndex, handleSelect],
  );

  // Render dropdown via portal to escape stacking context
  const dropdown =
    isOpen &&
    createPortal(
      <ul
        ref={listRef}
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel || placeholder}
        aria-activedescendant={highlightedIndex >= 0 ? optionId(highlightedIndex) : undefined}
        tabIndex={-1}
        onKeyDown={handleListKeyDown}
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          padding: 4,
          background: colors.bgMedium,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 99999,
          maxHeight: 200,
          overflowY: 'auto',
          listStyle: 'none',
          margin: 0,
          outline: 'none',
          fontFamily: typography.fontFamily,
        }}
      >
        {options.map((opt, index) => {
          const optValue = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const isSelected = optValue === value;
          const isHighlighted = index === highlightedIndex;

          return (
            <li
              key={optValue}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onClick={() => handleSelect(opt)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '10px 16px',
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                color: colors.textPrimary,
                fontSize: typography.fontSize.base,
                fontFamily: 'inherit',
                background: isHighlighted
                  ? withOpacity(colors.primary, 20)
                  : isSelected
                    ? withOpacity(colors.primary, 10)
                    : 'transparent',
                fontWeight: isSelected ? 600 : 400,
                transition: 'background 0.15s ease',
              }}
            >
              {optLabel}
            </li>
          );
        })}
      </ul>,
      document.body,
    );

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: compact ? '6px 12px' : '12px 16px',
          paddingRight: compact ? 32 : 40,
          background: 'var(--input-bg, rgba(106, 154, 184, 0.1))',
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          color: selectedOption ? colors.textPrimary : colors.textMuted,
          fontSize: compact ? typography.fontSize.sm : typography.fontSize.base,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          outline: 'none',
          // Always-present longhand — conditionally REMOVING borderColor
          // while the border shorthand stays makes React warn on rerender
          borderColor: isOpen ? colors.primary : colors.border,
          ...(isOpen && {
            boxShadow: `0 0 0 2px ${withOpacity(colors.primary, 20)}`,
          }),
        }}
      >
        {displayValue}
        <ChevronDown
          size={16}
          style={{
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textMuted,
            transition: 'transform 0.2s ease',
            ...(isOpen && { transform: 'translateY(-50%) rotate(180deg)' }),
          }}
        />
      </button>

      {/* Dropdown rendered via portal */}
      {dropdown}
    </div>
  );
});
