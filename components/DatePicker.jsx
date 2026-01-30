// =============================================================================
// DatePicker Component
// Custom themed date picker with calendar popup
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import PropTypes from 'prop-types';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';

// =============================================================================
// Helper Functions
// =============================================================================

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDisplayDate(dateString) {
  if (!dateString) return '';
  const date = parseDate(dateString);
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

// =============================================================================
// Styles
// =============================================================================

const styles = {
  container: {
    position: 'relative',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: `${spacing[3]}px ${spacing[4]}px`,
    paddingRight: '44px',
    background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    minHeight: '46px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  inputFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px color-mix(in srgb, ${colors.primary} 20%, transparent)`,
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  icon: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
    color: colors.textMuted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 150ms ease',
  },
  iconActive: {
    color: colors.primary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  // Calendar popup styles
  popup: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    zIndex: 1000,
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
    padding: spacing[3],
    minWidth: '280px',
    animation: 'fadeIn 150ms ease',
  },
  popupAbove: {
    top: 'auto',
    bottom: 'calc(100% + 4px)',
  },
  popupLeft: {
    left: 'auto',
    right: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
    paddingBottom: spacing[2],
    borderBottom: `1px solid ${colors.border}`,
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.textSecondary,
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease',
  },
  navButtonHover: {
    background: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
    color: colors.primary,
  },
  weekDays: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
    marginBottom: spacing[2],
  },
  weekDay: {
    textAlign: 'center',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
    padding: `${spacing[1]}px 0`,
  },
  days: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '2px',
  },
  day: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'background 150ms ease, color 150ms ease, transform 100ms ease',
  },
  dayHover: {
    background: `color-mix(in srgb, ${colors.primary} 15%, transparent)`,
  },
  daySelected: {
    background: colors.primary,
    color: '#ffffff',
    fontWeight: typography.fontWeight.semibold,
  },
  dayToday: {
    border: `2px solid ${colors.primary}`,
    fontWeight: typography.fontWeight.semibold,
  },
  dayOtherMonth: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  dayDisabled: {
    color: colors.textMuted,
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTop: `1px solid ${colors.border}`,
  },
  todayButton: {
    padding: `${spacing[1]}px ${spacing[3]}px`,
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'background 150ms ease',
  },
  clearButton: {
    padding: `${spacing[1]}px ${spacing[3]}px`,
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    transition: 'color 150ms ease',
  },
};

// =============================================================================
// DatePicker Component
// =============================================================================

const DatePicker = memo(function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  error = false,
  placeholder = 'Select date',
  clearable = true,
  showTodayButton = true,
  className = '',
  style = {},
  'aria-label': ariaLabel,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const date = value ? parseDate(value) : new Date();
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [hoveredNav, setHoveredNav] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);

  const selectedDate = value ? parseDate(value) : null;

  // Check if popup should open above or to the left
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.left;
      
      setOpenAbove(spaceBelow < 350 && spaceAbove > spaceBelow);
      // Popup is ~300px wide, check if it would overflow
      setOpenLeft(spaceRight < 320);
    }
  }, [isOpen]);

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
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Update view date when value changes
  useEffect(() => {
    if (value) {
      const date = parseDate(value);
      if (date && !isNaN(date.getTime())) {
        setViewDate({ year: date.getFullYear(), month: date.getMonth() });
      }
    }
  }, [value]);

  const handleInputClick = useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => {
      if (prev.month === 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => {
      if (prev.month === 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }, []);

  const handleSelectDay = useCallback((day, isCurrentMonth) => {
    let year = viewDate.year;
    let month = viewDate.month;
    
    if (!isCurrentMonth) {
      if (day > 15) {
        // Previous month
        month--;
        if (month < 0) {
          month = 11;
          year--;
        }
      } else {
        // Next month
        month++;
        if (month > 11) {
          month = 0;
          year++;
        }
      }
    }
    
    const date = new Date(year, month, day);
    const dateString = formatDate(date);
    
    // Check min/max constraints
    if (min && dateString < min) return;
    if (max && dateString > max) return;
    
    onChange({ target: { value: dateString } });
    setIsOpen(false); // Auto-close on selection
  }, [viewDate, onChange, min, max]);

  const handleToday = useCallback(() => {
    const today = new Date();
    const dateString = formatDate(today);
    
    // Check min/max constraints
    if (min && dateString < min) return;
    if (max && dateString > max) return;
    
    onChange({ target: { value: dateString } });
    setIsOpen(false);
  }, [onChange, min, max]);

  const handleClear = useCallback(() => {
    onChange({ target: { value: '' } });
    setIsOpen(false);
  }, [onChange]);

  // Generate calendar days
  const renderDays = () => {
    const { year, month } = viewDate;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);
    
    const days = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({ day, isCurrentMonth: false, isPrev: true });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ day, isCurrentMonth: false, isNext: true });
    }
    
    return days.map((d, index) => {
      let dayYear = year;
      let dayMonth = month;
      
      if (d.isPrev) {
        dayMonth--;
        if (dayMonth < 0) { dayMonth = 11; dayYear--; }
      } else if (d.isNext) {
        dayMonth++;
        if (dayMonth > 11) { dayMonth = 0; dayYear++; }
      }
      
      const date = new Date(dayYear, dayMonth, d.day);
      const dateString = formatDate(date);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isTodayDate = isToday(date);
      const isDisabled = (min && dateString < min) || (max && dateString > max);
      const isHovered = hoveredDay === index;
      
      const dayStyle = {
        ...styles.day,
        ...(d.isCurrentMonth ? {} : styles.dayOtherMonth),
        ...(isDisabled ? styles.dayDisabled : {}),
        ...(isHovered && !isDisabled && !isSelected ? styles.dayHover : {}),
        ...(isTodayDate && !isSelected ? styles.dayToday : {}),
        ...(isSelected ? styles.daySelected : {}),
      };
      
      return (
        <button
          key={index}
          type="button"
          style={dayStyle}
          onClick={() => !isDisabled && handleSelectDay(d.day, d.isCurrentMonth)}
          onMouseEnter={() => setHoveredDay(index)}
          onMouseLeave={() => setHoveredDay(null)}
          disabled={isDisabled}
          tabIndex={isOpen ? 0 : -1}
          aria-label={date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          aria-selected={isSelected}
          aria-current={isTodayDate ? 'date' : undefined}
        >
          {d.day}
        </button>
      );
    });
  };

  const inputStyle = {
    ...styles.input,
    ...(isFocused || isOpen ? styles.inputFocused : {}),
    ...(error ? styles.inputError : {}),
    ...(disabled ? styles.inputDisabled : {}),
    ...style,
  };

  const displayValue = formatDisplayDate(value);

  return (
    <div ref={containerRef} style={{ ...styles.container, ...style }} className={className}>
      <div style={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          value={displayValue}
          placeholder={placeholder}
          onClick={handleInputClick}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          readOnly
          disabled={disabled}
          style={inputStyle}
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        />
        <div style={{ ...styles.icon, ...(isOpen ? styles.iconActive : {}) }}>
          <Calendar size={18} />
        </div>
      </div>

      {isOpen && (
        <div 
          ref={popupRef}
          style={{ ...styles.popup, ...(openAbove ? styles.popupAbove : {}), ...(openLeft ? styles.popupLeft : {}) }}
          role="dialog"
          aria-label="Choose date"
        >
          {/* Header */}
          <div style={styles.header}>
            <button
              type="button"
              style={{
                ...styles.navButton,
                ...(hoveredNav === 'prev' ? styles.navButtonHover : {}),
              }}
              onClick={handlePrevMonth}
              onMouseEnter={() => setHoveredNav('prev')}
              onMouseLeave={() => setHoveredNav(null)}
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={styles.headerTitle}>
              {MONTH_NAMES[viewDate.month]} {viewDate.year}
            </span>
            <button
              type="button"
              style={{
                ...styles.navButton,
                ...(hoveredNav === 'next' ? styles.navButtonHover : {}),
              }}
              onClick={handleNextMonth}
              onMouseEnter={() => setHoveredNav('next')}
              onMouseLeave={() => setHoveredNav(null)}
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Week days header */}
          <div style={styles.weekDays}>
            {DAY_NAMES.map(day => (
              <div key={day} style={styles.weekDay}>{day}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={styles.days}>
            {renderDays()}
          </div>

          {/* Footer */}
          {(showTodayButton || clearable) && (
            <div style={styles.footer}>
              {clearable && value ? (
                <button
                  type="button"
                  style={styles.clearButton}
                  onClick={handleClear}
                  onMouseEnter={(e) => e.target.style.color = colors.danger}
                  onMouseLeave={(e) => e.target.style.color = colors.textMuted}
                >
                  Clear
                </button>
              ) : <span />}
              {showTodayButton && (
                <button
                  type="button"
                  style={styles.todayButton}
                  onClick={handleToday}
                  onMouseEnter={(e) => e.target.style.background = `color-mix(in srgb, ${colors.primary} 15%, transparent)`}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                >
                  Today
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

DatePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.string,
  max: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  placeholder: PropTypes.string,
  clearable: PropTypes.bool,
  showTodayButton: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  'aria-label': PropTypes.string,
  id: PropTypes.string,
};

export { DatePicker };
export default DatePicker;
