// ============================================================================
// Custom Select Component
// Styled dropdown that works consistently across browsers
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Find the selected option
  const selectedOption = options.find(opt => 
    (typeof opt === 'object' ? opt.value : opt) === value
  );
  
  const displayValue = selectedOption 
    ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption)
    : placeholder;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
          setHighlightedIndex(prev => 
            prev < options.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
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

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex];
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

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
          minHeight: 42,
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

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `option-${highlightedIndex}` : undefined}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: spacing[1],
            padding: spacing[1],
            background: colors.bgMedium,
            border: `1px solid ${colors.border}`,
            borderRadius: borderRadius.lg,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: 200,
            overflowY: 'auto',
            listStyle: 'none',
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
        </ul>
      )}
    </div>
  );
}

export default Select;
