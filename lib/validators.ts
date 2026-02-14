// =============================================================================
// Data Validators
// Centralized validation functions for data integrity
// =============================================================================

import { STATUS, CONDITION, CATEGORIES } from '../constants';

// =============================================================================
// Validation Result Type
// =============================================================================

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Object} errors - Field-level error messages
 * @property {Object} data - Sanitized/transformed data (if valid)
 */

// =============================================================================
// String Validators
// =============================================================================

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidLength(value, min, max) {
  if (typeof value !== 'string') return false;
  const len = value.trim().length;
  return len >= min && len <= max;
}

export function sanitizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

// =============================================================================
// Number Validators
// =============================================================================

export function isValidNumber(value, min = -Infinity, max = Infinity) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

export function parseNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
}

export function parseCurrency(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// =============================================================================
// Date Validators
// =============================================================================

export function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

export function isValidDateRange(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) return false;
  return new Date(startDate) <= new Date(endDate);
}

export function isFutureDate(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

export function isPastDate(value) {
  if (!isValidDate(value)) return false;
  const date = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date <= today;
}

// =============================================================================
// Enum Validators
// =============================================================================

export function isValidStatus(value) {
  return Object.values(STATUS).includes(value);
}

export function isValidCondition(value) {
  return Object.values(CONDITION).includes(value);
}

export function isValidCategory(value, customCategories = []) {
  const allCategories = [...Object.values(CATEGORIES), ...customCategories];
  return allCategories.includes(value);
}

// =============================================================================
// Item Validator
// =============================================================================

/**
 * Validate an inventory item
 * @param {Object} data - Item data to validate
 * @param {Object} options - Validation options
 * @param {Array} options.existingCodes - Existing item codes (for uniqueness check)
 * @param {string} options.editingId - ID of item being edited (to exclude from uniqueness check)
 * @param {Array} options.customCategories - Additional valid categories
 * @returns {ValidationResult}
 */
export function validateItem(data, options = {}) {
  const { existingCodes = [], editingId = null, customCategories = [] } = options;
  const errors = {};
  
  // Name validation
  if (!data.name || !isNonEmptyString(data.name)) {
    errors.name = 'Name is required';
  } else if (!isValidLength(data.name, 2, 100)) {
    errors.name = 'Name must be between 2 and 100 characters';
  }
  
  // Category validation
  if (!data.category) {
    errors.category = 'Category is required';
  } else if (!isValidCategory(data.category, customCategories)) {
    errors.category = 'Invalid category';
  }
  
  // Code validation (optional but must be unique if provided)
  if (data.code) {
    if (!isValidLength(data.code, 2, 20)) {
      errors.code = 'Code must be between 2 and 20 characters';
    } else if (existingCodes.includes(data.code) && data.id !== editingId) {
      errors.code = 'This code is already in use';
    }
  }
  
  // Status validation
  if (data.status && !isValidStatus(data.status)) {
    errors.status = 'Invalid status';
  }
  
  // Condition validation
  if (data.condition && !isValidCondition(data.condition)) {
    errors.condition = 'Invalid condition';
  }
  
  // Value validation
  if (data.value !== undefined && data.value !== '' && data.value !== null) {
    const numValue = parseCurrency(data.value);
    if (numValue < 0) {
      errors.value = 'Value cannot be negative';
    } else if (numValue > 10000000) {
      errors.value = 'Value exceeds maximum allowed';
    }
  }
  
  // Purchase price validation
  if (data.purchasePrice !== undefined && data.purchasePrice !== '' && data.purchasePrice !== null) {
    const numPrice = parseCurrency(data.purchasePrice);
    if (numPrice < 0) {
      errors.purchasePrice = 'Purchase price cannot be negative';
    }
  }
  
  // Serial number validation
  if (data.serialNumber && !isValidLength(data.serialNumber, 0, 50)) {
    errors.serialNumber = 'Serial number must be 50 characters or less';
  }
  
  // Purchase date validation
  if (data.purchaseDate && !isValidDate(data.purchaseDate)) {
    errors.purchaseDate = 'Invalid purchase date';
  }
  
  // Warranty expiration validation
  if (data.warrantyExpires && !isValidDate(data.warrantyExpires)) {
    errors.warrantyExpires = 'Invalid warranty expiration date';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  // Sanitize data if valid
  const sanitizedData = isValid ? {
    ...data,
    name: sanitizeString(data.name),
    code: data.code ? sanitizeString(data.code) : undefined,
    serialNumber: data.serialNumber ? sanitizeString(data.serialNumber) : undefined,
    value: data.value !== undefined && data.value !== '' ? parseCurrency(data.value) : undefined,
    purchasePrice: data.purchasePrice !== undefined && data.purchasePrice !== '' ? parseCurrency(data.purchasePrice) : undefined,
  } : null;
  
  return { isValid, errors, data: sanitizedData };
}

// =============================================================================
// Reservation Validator
// =============================================================================

/**
 * Validate a reservation
 * @param {Object} data - Reservation data
 * @param {Object} options - Validation options
 * @param {Array} options.existingReservations - Existing reservations for conflict check
 * @param {string} options.editingId - ID of reservation being edited
 * @returns {ValidationResult}
 */
export function validateReservation(data, options = {}) {
  const { existingReservations = [], editingId = null } = options;
  const errors = {};
  
  // Start date validation
  if (!data.start) {
    errors.start = 'Start date is required';
  } else if (!isValidDate(data.start)) {
    errors.start = 'Invalid start date';
  }
  
  // End date validation
  if (!data.end) {
    errors.end = 'End date is required';
  } else if (!isValidDate(data.end)) {
    errors.end = 'Invalid end date';
  }
  
  // Date range validation
  if (data.start && data.end && !isValidDateRange(data.start, data.end)) {
    errors.end = 'End date must be after start date';
  }
  
  // Project name validation
  if (!data.project || !isNonEmptyString(data.project)) {
    errors.project = 'Project name is required';
  } else if (!isValidLength(data.project, 2, 200)) {
    errors.project = 'Project name must be between 2 and 200 characters';
  }
  
  // User validation
  if (!data.user || !isNonEmptyString(data.user)) {
    errors.user = 'Borrower name is required';
  }
  
  // Contact email validation
  if (data.contactEmail && !isValidEmail(data.contactEmail)) {
    errors.contactEmail = 'Invalid email address';
  }
  
  // Contact phone validation
  if (data.contactPhone && !isValidLength(data.contactPhone, 0, 20)) {
    errors.contactPhone = 'Phone number too long';
  }
  
  // Conflict check
  if (data.start && data.end && existingReservations.length > 0) {
    const hasConflict = existingReservations.some(r => {
      if (r.id === editingId) return false;
      return datesOverlap(data.start, data.end, r.start, r.end);
    });
    
    if (hasConflict) {
      errors.dateRange = 'This item is already reserved during the selected dates';
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    data: isValid ? {
      ...data,
      project: sanitizeString(data.project),
      user: sanitizeString(data.user),
      contactEmail: data.contactEmail ? sanitizeString(data.contactEmail) : undefined,
      contactPhone: data.contactPhone ? sanitizeString(data.contactPhone) : undefined,
    } : null,
  };
}

// =============================================================================
// Client Validator
// =============================================================================

export function validateClient(data) {
  const errors = {};
  
  if (!data.name || !isNonEmptyString(data.name)) {
    errors.name = 'Client name is required';
  } else if (!isValidLength(data.name, 2, 100)) {
    errors.name = 'Name must be between 2 and 100 characters';
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Invalid email address';
  }
  
  if (data.phone && !isValidLength(data.phone, 0, 20)) {
    errors.phone = 'Phone number too long';
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    data: isValid ? {
      ...data,
      name: sanitizeString(data.name),
      email: data.email ? sanitizeString(data.email) : undefined,
      phone: data.phone ? sanitizeString(data.phone) : undefined,
    } : null,
  };
}

// =============================================================================
// Maintenance Record Validator
// =============================================================================

export function validateMaintenanceRecord(data) {
  const errors = {};
  
  if (!data.type || !isNonEmptyString(data.type)) {
    errors.type = 'Maintenance type is required';
  }
  
  if (!data.description || !isNonEmptyString(data.description)) {
    errors.description = 'Description is required';
  } else if (!isValidLength(data.description, 5, 1000)) {
    errors.description = 'Description must be between 5 and 1000 characters';
  }
  
  if (data.scheduledDate && !isValidDate(data.scheduledDate)) {
    errors.scheduledDate = 'Invalid scheduled date';
  }
  
  if (data.completedDate && !isValidDate(data.completedDate)) {
    errors.completedDate = 'Invalid completed date';
  }
  
  if (data.cost !== undefined && data.cost !== '' && data.cost !== null) {
    const numCost = parseCurrency(data.cost);
    if (numCost < 0) {
      errors.cost = 'Cost cannot be negative';
    }
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors,
    data: isValid ? {
      ...data,
      type: sanitizeString(data.type),
      description: sanitizeString(data.description),
      vendor: data.vendor ? sanitizeString(data.vendor) : undefined,
      cost: data.cost !== undefined && data.cost !== '' ? parseCurrency(data.cost) : undefined,
    } : null,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function isValidEmail(email) {
  if (!email) return false;
  // Simple email validation - not perfect but catches most issues
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function datesOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();
  
  return s1 <= e2 && e1 >= s2;
}

// =============================================================================
// Bulk Validation
// =============================================================================

/**
 * Validate multiple items at once
 * @param {Array} items - Array of items to validate
 * @param {Object} options - Validation options
 * @returns {Object} Results with valid items, invalid items, and errors
 */
export function validateItems(items, options = {}) {
  const existingCodes = items.map(i => i.code).filter(Boolean);
  const validItems = [];
  const invalidItems = [];
  
  for (const item of items) {
    const result = validateItem(item, { ...options, existingCodes });
    if (result.isValid) {
      validItems.push(result.data);
    } else {
      invalidItems.push({ item, errors: result.errors });
    }
  }
  
  return {
    isValid: invalidItems.length === 0,
    validItems,
    invalidItems,
    totalCount: items.length,
    validCount: validItems.length,
    invalidCount: invalidItems.length,
  };
}

export default {
  validateItem,
  validateReservation,
  validateClient,
  validateMaintenanceRecord,
  validateItems,
  isValidEmail,
  isValidDate,
  isValidDateRange,
  parseCurrency,
  sanitizeString,
};
