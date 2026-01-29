// ============================================================================
// Custom Select Component
// Styled dropdown that works consistently across browsers
// Uses React Portal to escape stacking context issues (e.g., backdrop-filter)
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { ChevronDown } from 'lucide-react';

export function Select({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...',
  style = {},
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, direction: 'down' });
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Find the selected option
  const selectedOption = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === value
  );
  
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;

  // Calculate dropdown position relative to viewport
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = Math.min(options.length * 36 + 8, 200);
    
    // Open upward if not enough space below but enough above
    const direction = (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) ? 'up' : 'down';
    
    setDropdownPosition({
      top: direction === 'down' ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: rect.left,
      width: rect.width,
      direction
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

  // Update position when opening and on scroll/resize
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

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          const opt = options[highlightedIndex];
          const val = typeof opt === 'object' ? opt.value : opt;
          onChange({ target: { value: val } });
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setIsKeyboardNav(true);
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setIsKeyboardNav(true);
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : options.length - 1
          );
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, options, onChange, disabled]);

  // Scroll highlighted option into view (only for keyboard navigation)
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current && isKeyboardNav) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
      setIsKeyboardNav(false);
    }
  }, [highlightedIndex, isOpen, isKeyboardNav]);

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(opt => 
        (typeof opt === 'object' ? opt.value : opt) === value
      );
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, options, value]);

  const handleSelect = (opt) => {
    const val = typeof opt === 'object' ? opt.value : opt;
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  // Render dropdown via portal to escape stacking context
  const dropdown = isOpen && createPortal(
    <ul
      ref={listRef}
      role="listbox"
      aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        padding: spacing[1],
        background: colors.bgMedium,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 99999,
        maxHeight: 200,
        overflowY: 'auto',
        listStyle: 'none',
        margin: 0,
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
            id={`option-${index}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => handleSelect(opt)}
            onMouseEnter={() => setHighlightedIndex(index)}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderRadius: borderRadius.md,
              cursor: 'pointer',
              color: colors.textPrimary,
              fontSize: typography.fontSize.sm,
              background: isHighlighted 
                ? `rgba(106, 154, 184, 0.2)` 
                : isSelected 
                  ? `rgba(106, 154, 184, 0.1)` 
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
    document.body
  );

  return (
    <div 
      ref={containerRef}
      style={{ position: 'relative', ...style }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        style={{
          width: '100%',
          padding: `${spacing[2]}px ${spacing[3]}px`,
          paddingRight: spacing[8],
          background: `rgba(106, 154, 184, 0.1)`,
          border: `1px solid ${colors.border}`,
          borderRadius: borderRadius.lg,
          color: selectedOption ? colors.textPrimary : colors.textMuted,
          fontSize: typography.fontSize.sm,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          position: 'relative',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {displayValue}
        <ChevronDown 
          size={14} 
          style={{ 
            position: 'absolute', 
            right: spacing[3], 
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
}

export default Select;
