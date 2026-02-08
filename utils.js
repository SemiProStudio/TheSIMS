// ============================================================================
// SIMS Utility Functions
// Pure functions with no side effects for data transformation and formatting
// ============================================================================

import { CATEGORY_PREFIXES, STATUS, CONDITION } from './constants.js';
import { colors } from './theme.js';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique item code based on category
 * @param {string} category - The item category
 * @param {string[]} existingCodes - Array of existing codes to avoid duplicates
 * @returns {string} A unique item code like "CA1234"
 */
export const generateItemCode = (category, existingCodes = []) => {
  const prefix = CATEGORY_PREFIXES[category] || 'OT';
  let code;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    code = prefix + Math.floor(1000 + Math.random() * 9000);
    attempts++;
  } while (existingCodes.includes(code) && attempts < maxAttempts);
  
  if (attempts >= maxAttempts) {
    // Fallback to timestamp-based code if random generation fails
    code = prefix + Date.now().toString().slice(-4);
  }
  
  return code;
};

/**
 * Generate a unique ID for internal use
 * @returns {string} A unique ID
 */
export const generateId = () => {
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date string to a readable format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date like "Jan 15, 2025"
 */
export const formatDate = (date) => {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

/**
 * Format a date string to include time
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted datetime like "Jan 15, 2025, 3:30 PM"
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * @returns {string}
 */
export const getTodayISO = () => new Date().toISOString().split('T')[0];

/**
 * Check if a date is before today
 * @param {string} date - Date to check
 * @returns {boolean}
 */
export const isOverdue = (date) => {
  if (!date) return false;
  return date < getTodayISO();
};

// ============================================================================
// Reservation Conflict Detection
// ============================================================================

// Helper: Check if two date ranges overlap (used internally by conflict detection)
const doDateRangesOverlap = (start1, end1, start2, end2) => {
  if (!start1 || !end1 || !start2 || !end2) return false;
  // Ranges overlap if one starts before the other ends
  return start1 <= end2 && start2 <= end1;
};

// Helper: Find conflicting reservations for a given date range
const findConflictingReservations = (existingReservations, startDate, endDate, excludeReservationId = null) => {
  if (!existingReservations || !startDate || !endDate) return [];
  
  return existingReservations.filter(reservation => {
    // Skip the reservation being edited
    if (excludeReservationId && reservation.id === excludeReservationId) return false;
    
    // Check for date overlap
    return doDateRangesOverlap(startDate, endDate, reservation.start, reservation.end);
  });
};

// Helper: Check if an item is currently checked out during a date range
const checkCheckoutConflict = (item, startDate, endDate) => {
  if (!item || item.status !== 'checked-out' || !item.checkedOutDate) return null;
  
  // If item is checked out and no due date, it conflicts with everything
  if (!item.dueBack) {
    return {
      type: 'checked-out',
      borrower: item.checkedOutTo,
      checkedOutDate: item.checkedOutDate,
      dueBack: null,
      message: `Currently checked out to ${item.checkedOutTo} (no return date set)`
    };
  }
  
  // Check if the checkout period overlaps with the requested dates
  if (doDateRangesOverlap(startDate, endDate, item.checkedOutDate, item.dueBack)) {
    return {
      type: 'checked-out',
      borrower: item.checkedOutTo,
      checkedOutDate: item.checkedOutDate,
      dueBack: item.dueBack,
      message: `Checked out to ${item.checkedOutTo} until ${item.dueBack}`
    };
  }
  
  return null;
};

/**
 * Get all conflicts for a proposed reservation
 * @param {Object} item - The inventory item
 * @param {string} startDate - Proposed start date
 * @param {string} endDate - Proposed end date
 * @param {string} excludeReservationId - Optional reservation ID to exclude
 * @returns {Object} Object with reservationConflicts array and checkoutConflict
 */
export const getAllReservationConflicts = (item, startDate, endDate, excludeReservationId = null) => {
  if (!item) return { reservationConflicts: [], checkoutConflict: null };
  
  const reservationConflicts = findConflictingReservations(
    item.reservations || [],
    startDate,
    endDate,
    excludeReservationId
  );
  
  const checkoutConflict = checkCheckoutConflict(item, startDate, endDate);
  
  return {
    reservationConflicts,
    checkoutConflict,
    hasConflicts: reservationConflicts.length > 0 || checkoutConflict !== null
  };
};

// ============================================================================
// Money Formatting
// ============================================================================

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency like "$1,234"
 */
export const formatMoney = (amount) => {
  return '$' + (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Get the color for a given status
 * @param {string} status - The item status
 * @returns {string} The color code
 */
export const getStatusColor = (status) => {
  const statusColors = {
    [STATUS.AVAILABLE]: colors.available,
    [STATUS.CHECKED_OUT]: colors.checkedOut,
    [STATUS.RESERVED]: colors.reserved,
    [STATUS.NEEDS_ATTENTION]: colors.needsAttention,
    [STATUS.MISSING]: colors.missing,
  };
  return statusColors[status] || colors.textMuted;
};

/**
 * Get the color for a given condition
 * @param {string} condition - The item condition
 * @returns {string} The color code
 */
export const getConditionColor = (condition) => {
  const conditionColors = {
    [CONDITION.EXCELLENT]: colors.excellent,
    [CONDITION.GOOD]: colors.good,
    [CONDITION.FAIR]: colors.fair,
    [CONDITION.POOR]: colors.poor,
  };
  return conditionColors[condition] || colors.textMuted;
};

// ============================================================================
// Array/Object Utilities
// ============================================================================

/**
 * Update an item in an array by ID
 * @param {Array} array - The array to update
 * @param {string} id - The ID of the item to update
 * @param {Object|Function} updates - Object with updates or function that receives item
 * @returns {Array} New array with updated item
 */
export const updateById = (array, id, updates) => {
  return array.map(item => {
    if (item.id !== id) return item;
    if (typeof updates === 'function') {
      return { ...item, ...updates(item) };
    }
    return { ...item, ...updates };
  });
};

/**
 * Remove an item from an array by ID
 * @param {Array} array - The array to filter
 * @param {string} id - The ID of the item to remove
 * @returns {Array} New array without the item
 */
export const removeById = (array, id) => {
  return array.filter(item => item.id !== id);
};

/**
 * Find an item in an array by ID
 * @param {Array} array - The array to search
 * @param {string} id - The ID to find
 * @returns {Object|undefined} The found item or undefined
 */
export const findById = (array, id) => {
  return array.find(item => item.id === id);
};

// ============================================================================
// Search/Filter Utilities
// ============================================================================

/**
 * Filter items by search query
 * @param {Array} items - Items to filter
 * @param {string} query - Search query
 * @param {string[]} fields - Fields to search in
 * @returns {Array} Filtered items
 */
export const filterBySearch = (items, query, fields = ['name', 'brand', 'id']) => {
  if (!query?.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter(item =>
    fields.some(field => 
      item[field]?.toString().toLowerCase().includes(q)
    )
  );
};

/**
 * Filter items by category
 * @param {Array} items - Items to filter
 * @param {string|string[]} categories - Category or categories to filter by
 * @returns {Array} Filtered items
 */
export const filterByCategory = (items, categories) => {
  if (!categories || categories === 'all') return items;
  const cats = Array.isArray(categories) ? categories : [categories];
  if (cats.length === 0) return items;
  return items.filter(item => cats.includes(item.category));
};

/**
 * Filter items by status
 * @param {Array} items - Items to filter
 * @param {string|string[]} statuses - Status or statuses to filter by
 * @returns {Array} Filtered items
 */
export const filterByStatus = (items, statuses) => {
  if (!statuses || statuses === 'all') return items;
  const stats = Array.isArray(statuses) ? statuses : [statuses];
  if (stats.length === 0) return items;
  
  // Handle OVERDUE status specially - it's a computed state, not stored status
  if (stats.includes('overdue')) {
    const today = getTodayISO();
    return items.filter(item => 
      item.status === 'checked-out' && item.dueBack && item.dueBack < today
    );
  }
  
  return items.filter(item => stats.includes(item.status));
};

// ============================================================================
// Note Utilities (recursive tree operations)
// ============================================================================

/**
 * Add a reply to a note in a nested structure
 * @param {Array} notes - Array of notes
 * @param {string} parentId - ID of parent note
 * @param {Object} reply - Reply object to add
 * @returns {Array} Updated notes array
 */
export const addReplyToNote = (notes, parentId, reply) => {
  return notes.map(note => {
    if (note.id === parentId) {
      return { ...note, replies: [...(note.replies || []), reply] };
    }
    if (note.replies?.length > 0) {
      return { ...note, replies: addReplyToNote(note.replies, parentId, reply) };
    }
    return note;
  });
};

/**
 * Mark a note as deleted in a nested structure
 * @param {Array} notes - Array of notes
 * @param {string} noteId - ID of note to mark deleted
 * @returns {Array} Updated notes array
 */
export const markNoteDeleted = (notes, noteId) => {
  return notes.map(note => {
    if (note.id === noteId) {
      return { ...note, deleted: true };
    }
    if (note.replies?.length > 0) {
      return { ...note, replies: markNoteDeleted(note.replies, noteId) };
    }
    return note;
  });
};

/**
 * Find a note by ID in a nested structure
 * @param {Array} notes - Array of notes
 * @param {string} noteId - ID of note to find
 * @returns {Object|null} Found note or null
 */
export const findNoteById = (notes, noteId) => {
  for (const note of notes) {
    if (note.id === noteId) return note;
    if (note.replies?.length > 0) {
      const found = findNoteById(note.replies, noteId);
      if (found) return found;
    }
  }
  return null;
};

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Check if required fields are filled
 * @param {Object} obj - Object to validate
 * @param {string[]} requiredFields - Array of required field names
// ============================================================================
// Location Utilities
// ============================================================================

/**
 * Flatten a hierarchical location tree into a flat array
 * @param {Array} locations - Array of location objects with optional children
 * @param {string} parentPath - Current path prefix
 * @returns {Array} Flat array of locations with fullPath
 */
export const flattenLocations = (locations, parentPath = '') => {
  const result = [];
  locations.forEach(loc => {
    const fullPath = parentPath ? `${parentPath} > ${loc.name}` : loc.name;
    result.push({ 
      id: loc.id, 
      name: loc.name, 
      fullPath, 
      type: loc.type,
      depth: parentPath.split('>').length - 1 + (parentPath ? 1 : 0),
    });
    if (loc.children && loc.children.length > 0) {
      result.push(...flattenLocations(loc.children, fullPath));
    }
  });
  return result;
};

// ============================================================================
// Reminder Utilities
// ============================================================================

/**
 * Get next due date based on recurrence pattern
 * @param {string} currentDueDate - Current due date (ISO string)
 * @param {string} recurrence - Recurrence type (weekly, monthly, etc.)
 * @returns {string|null} Next due date or null if no recurrence
 */
export const getNextDueDate = (currentDueDate, recurrence) => {
  const date = new Date(currentDueDate);
  
  switch (recurrence) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'biannual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return date.toISOString().split('T')[0];
};

/**
 * Check if a reminder is due (today or past)
 * @param {Object} reminder - Reminder object with dueDate and completed fields
 * @returns {boolean} True if reminder is due
 */
export const isReminderDue = (reminder) => {
  if (!reminder || reminder.completed) return false;
  const today = getTodayISO();
  return reminder.dueDate <= today;
};

// ============================================================================
// Depreciation Utilities
// ============================================================================

/**
 * Depreciation calculation methods
 */
export const DEPRECIATION_METHODS = {
  STRAIGHT_LINE: 'straight-line',
  DECLINING_BALANCE: 'declining-balance',
  DOUBLE_DECLINING: 'double-declining',
};

/**
 * Default useful life by category (in years)
 */
export const DEFAULT_USEFUL_LIFE = {
  Cameras: 5,
  Lenses: 7,
  Lighting: 7,
  Audio: 6,
  Support: 10,
  Accessories: 3,
  Storage: 3,
  Grip: 10,
  Monitors: 5,
  Power: 4,
};

/**
 * Calculate depreciation for an asset
 * @param {number} purchasePrice - Original purchase price
 * @param {string} purchaseDate - Purchase date (ISO string)
 * @param {number} usefulLife - Useful life in years
 * @param {number} salvageValue - Salvage value at end of life
 * @param {string} method - Depreciation method
 * @returns {Object} Depreciation details including currentValue, schedule, etc.
 */
export const calculateDepreciation = (purchasePrice, purchaseDate, usefulLife, salvageValue, method) => {
  if (!purchaseDate) {
    return {
      currentValue: purchasePrice,
      totalDepreciation: 0,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      ageInMonths: 0,
      percentDepreciated: 0,
      schedule: [],
    };
  }
  const purchase = new Date(purchaseDate);
  const today = new Date();
  const ageInYears = (today - purchase) / (365.25 * 24 * 60 * 60 * 1000);
  const ageInMonths = Math.floor(ageInYears * 12);
  
  const depreciableAmount = purchasePrice - salvageValue;
  
  let currentValue, annualDepreciation, monthlyDepreciation, totalDepreciation;
  let schedule = [];
  
  switch (method) {
    case DEPRECIATION_METHODS.STRAIGHT_LINE:
      // Straight-line: Equal depreciation each year
      annualDepreciation = depreciableAmount / usefulLife;
      monthlyDepreciation = annualDepreciation / 12;
      totalDepreciation = Math.min(ageInYears * annualDepreciation, depreciableAmount);
      currentValue = Math.max(purchasePrice - totalDepreciation, salvageValue);
      
      // Build schedule
      for (let year = 1; year <= usefulLife; year++) {
        const yearEnd = new Date(purchase);
        yearEnd.setFullYear(yearEnd.getFullYear() + year);
        const startValue = purchasePrice - (annualDepreciation * (year - 1));
        const endValue = Math.max(startValue - annualDepreciation, salvageValue);
        schedule.push({
          year,
          date: yearEnd.toISOString().split('T')[0],
          startValue,
          depreciation: startValue - endValue,
          endValue,
          accumulated: purchasePrice - endValue,
        });
      }
      break;
      
    case DEPRECIATION_METHODS.DECLINING_BALANCE: {
      // Declining balance: Fixed percentage of remaining value (150% of straight-line rate)
      const dbRate = (1 / usefulLife) * 1.5;
      let remainingValue = purchasePrice;
      totalDepreciation = 0;
      
      for (let year = 1; year <= usefulLife; year++) {
        const yearEnd = new Date(purchase);
        yearEnd.setFullYear(yearEnd.getFullYear() + year);
        const startValue = remainingValue;
        let yearDepreciation = startValue * dbRate;
        
        // Don't depreciate below salvage value
        if (remainingValue - yearDepreciation < salvageValue) {
          yearDepreciation = remainingValue - salvageValue;
        }
        
        remainingValue = startValue - yearDepreciation;
        
        // Track total depreciation up to current age
        if (year <= Math.ceil(ageInYears)) {
          if (year < Math.ceil(ageInYears)) {
            totalDepreciation += yearDepreciation;
          } else {
            // Partial year
            totalDepreciation += yearDepreciation * (ageInYears - Math.floor(ageInYears));
          }
        }
        
        schedule.push({
          year,
          date: yearEnd.toISOString().split('T')[0],
          startValue,
          depreciation: yearDepreciation,
          endValue: remainingValue,
          accumulated: purchasePrice - remainingValue,
        });
      }
      
      currentValue = Math.max(purchasePrice - totalDepreciation, salvageValue);
      annualDepreciation = schedule[0]?.depreciation || 0;
      monthlyDepreciation = annualDepreciation / 12;
      break;
    }
      
    case DEPRECIATION_METHODS.DOUBLE_DECLINING: {
      // Double declining balance: 200% of straight-line rate
      const ddbRate = (1 / usefulLife) * 2;
      let ddbRemainingValue = purchasePrice;
      totalDepreciation = 0;
      
      for (let year = 1; year <= usefulLife; year++) {
        const yearEnd = new Date(purchase);
        yearEnd.setFullYear(yearEnd.getFullYear() + year);
        const startValue = ddbRemainingValue;
        let yearDepreciation = startValue * ddbRate;
        
        // Switch to straight-line if it gives higher depreciation
        const straightLineRemaining = (ddbRemainingValue - salvageValue) / (usefulLife - year + 1);
        if (straightLineRemaining > yearDepreciation) {
          yearDepreciation = straightLineRemaining;
        }
        
        // Don't depreciate below salvage value
        if (ddbRemainingValue - yearDepreciation < salvageValue) {
          yearDepreciation = ddbRemainingValue - salvageValue;
        }
        
        ddbRemainingValue = startValue - yearDepreciation;
        
        // Track total depreciation up to current age
        if (year <= Math.ceil(ageInYears)) {
          if (year < Math.ceil(ageInYears)) {
            totalDepreciation += yearDepreciation;
          } else {
            totalDepreciation += yearDepreciation * (ageInYears - Math.floor(ageInYears));
          }
        }
        
        schedule.push({
          year,
          date: yearEnd.toISOString().split('T')[0],
          startValue,
          depreciation: yearDepreciation,
          endValue: ddbRemainingValue,
          accumulated: purchasePrice - ddbRemainingValue,
        });
      }
      
      currentValue = Math.max(purchasePrice - totalDepreciation, salvageValue);
      annualDepreciation = schedule[0]?.depreciation || 0;
      monthlyDepreciation = annualDepreciation / 12;
      break;
    }
      
    default:
      currentValue = purchasePrice;
      annualDepreciation = 0;
      monthlyDepreciation = 0;
      totalDepreciation = 0;
  }
  
  return {
    currentValue,
    totalDepreciation,
    annualDepreciation,
    monthlyDepreciation,
    ageInYears,
    ageInMonths,
    schedule,
    percentDepreciated: (totalDepreciation / depreciableAmount) * 100,
  };
};
