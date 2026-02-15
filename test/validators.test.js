// =============================================================================
// Validators Tests (extended coverage)
// Additional tests for uncovered branches in lib/validators.js
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  isNonEmptyString,
  isValidLength,
  sanitizeString,
  isValidNumber,
  parseNumber,
  parseCurrency,
  isValidDate,
  isValidDateRange,
  isFutureDate,
  isPastDate,
  isValidStatus,
  isValidCondition,
  isValidCategory,
  isValidEmail,
  datesOverlap,
  validateItem,
  validateReservation,
  validateClient,
  validateMaintenanceRecord,
  validateItems,
} from '../lib/validators.js';

// =============================================================================
// String Validators
// =============================================================================

describe('isNonEmptyString', () => {
  it('should return true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString(' x ')).toBe(true);
  });

  it('should return false for empty or whitespace-only strings', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isNonEmptyString(null)).toBe(false);
    expect(isNonEmptyString(undefined)).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(true)).toBe(false);
  });
});

describe('isValidLength', () => {
  it('should validate string length within bounds', () => {
    expect(isValidLength('abc', 2, 5)).toBe(true);
    expect(isValidLength('ab', 2, 5)).toBe(true);
    expect(isValidLength('abcde', 2, 5)).toBe(true);
  });

  it('should reject strings outside bounds', () => {
    expect(isValidLength('a', 2, 5)).toBe(false);
    expect(isValidLength('abcdef', 2, 5)).toBe(false);
  });

  it('should trim before checking length', () => {
    expect(isValidLength('  ab  ', 2, 5)).toBe(true);
  });

  it('should return false for non-strings', () => {
    expect(isValidLength(null, 0, 10)).toBe(false);
    expect(isValidLength(123, 0, 10)).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('should trim strings', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('should return empty string for non-string values', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(42)).toBe('');
    expect(sanitizeString(false)).toBe('');
  });
});

// =============================================================================
// Number Validators
// =============================================================================

describe('isValidNumber', () => {
  it('should accept valid numbers', () => {
    expect(isValidNumber(5, 0, 10)).toBe(true);
    expect(isValidNumber('3.14', 0, 10)).toBe(true);
    expect(isValidNumber(0, 0, 10)).toBe(true);
    expect(isValidNumber(10, 0, 10)).toBe(true);
  });

  it('should reject numbers outside range', () => {
    expect(isValidNumber(-1, 0, 10)).toBe(false);
    expect(isValidNumber(11, 0, 10)).toBe(false);
  });

  it('should reject non-numeric values', () => {
    expect(isValidNumber('abc')).toBe(false);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber('')).toBe(false);
  });

  it('should work with defaults (no min/max)', () => {
    expect(isValidNumber(999999)).toBe(true);
    expect(isValidNumber(-999999)).toBe(true);
  });
});

describe('parseNumber', () => {
  it('should parse valid numbers', () => {
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber(3.14)).toBe(3.14);
  });

  it('should return default for invalid values', () => {
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber('abc', 99)).toBe(99);
    expect(parseNumber(NaN, -1)).toBe(-1);
  });
});

describe('parseCurrency', () => {
  it('should parse dollar amounts', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
    expect(parseCurrency('$ 99.99')).toBe(99.99);
  });

  it('should handle numeric inputs', () => {
    expect(parseCurrency(42)).toBe(42);
    expect(parseCurrency(0)).toBe(0);
  });

  it('should return 0 for non-parseable values', () => {
    expect(parseCurrency('')).toBe(0);
    expect(parseCurrency('abc')).toBe(0);
    expect(parseCurrency(null)).toBe(0);
    expect(parseCurrency(undefined)).toBe(0);
    expect(parseCurrency(true)).toBe(0);
  });
});

// =============================================================================
// Date Validators
// =============================================================================

describe('isValidDate', () => {
  it('should accept valid date strings', () => {
    expect(isValidDate('2024-01-15')).toBe(true);
    expect(isValidDate('2024-12-31')).toBe(true);
  });

  it('should accept Date objects', () => {
    expect(isValidDate(new Date())).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
  });
});

describe('isValidDateRange', () => {
  it('should accept valid ranges', () => {
    expect(isValidDateRange('2024-01-01', '2024-12-31')).toBe(true);
  });

  it('should accept same-day ranges', () => {
    expect(isValidDateRange('2024-06-15', '2024-06-15')).toBe(true);
  });

  it('should reject reversed ranges', () => {
    expect(isValidDateRange('2024-12-31', '2024-01-01')).toBe(false);
  });

  it('should reject invalid dates', () => {
    expect(isValidDateRange('bad', '2024-01-01')).toBe(false);
    expect(isValidDateRange('2024-01-01', 'bad')).toBe(false);
  });
});

describe('isFutureDate', () => {
  it('should accept future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isFutureDate(future.toISOString())).toBe(true);
  });

  it('should accept today', () => {
    const today = new Date();
    // Set to noon to avoid edge case
    today.setHours(12, 0, 0, 0);
    expect(isFutureDate(today.toISOString())).toBe(true);
  });

  it('should reject past dates', () => {
    expect(isFutureDate('2020-01-01')).toBe(false);
  });

  it('should reject invalid dates', () => {
    expect(isFutureDate('not-a-date')).toBe(false);
    expect(isFutureDate(null)).toBe(false);
  });
});

describe('isPastDate', () => {
  it('should accept past dates', () => {
    expect(isPastDate('2020-01-01')).toBe(true);
  });

  it('should accept today', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    expect(isPastDate(today.toISOString())).toBe(true);
  });

  it('should reject far future dates', () => {
    expect(isPastDate('2099-12-31')).toBe(false);
  });

  it('should reject invalid dates', () => {
    expect(isPastDate('not-a-date')).toBe(false);
    expect(isPastDate(null)).toBe(false);
  });
});

// =============================================================================
// Enum Validators
// =============================================================================

describe('isValidStatus', () => {
  it('should accept valid statuses', () => {
    expect(isValidStatus('available')).toBe(true);
    expect(isValidStatus('checked-out')).toBe(true);
  });

  it('should reject invalid statuses', () => {
    expect(isValidStatus('nonexistent')).toBe(false);
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus(null)).toBe(false);
  });
});

describe('isValidCondition', () => {
  it('should accept valid conditions', () => {
    expect(isValidCondition('excellent')).toBe(true);
    expect(isValidCondition('good')).toBe(true);
  });

  it('should reject invalid conditions', () => {
    expect(isValidCondition('broken')).toBe(false);
    expect(isValidCondition('')).toBe(false);
  });
});

describe('isValidCategory', () => {
  it('should accept built-in categories', () => {
    expect(isValidCategory('Cameras')).toBe(true);
    expect(isValidCategory('Lenses')).toBe(true);
  });

  it('should accept custom categories', () => {
    expect(isValidCategory('Custom Cat', ['Custom Cat'])).toBe(true);
  });

  it('should reject unknown categories', () => {
    expect(isValidCategory('Nonexistent')).toBe(false);
  });
});

// =============================================================================
// isValidEmail
// =============================================================================

describe('isValidEmail', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b@c.d')).toBe(true);
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail('missing-at')).toBe(false);
    expect(isValidEmail('@no-local.com')).toBe(false);
    expect(isValidEmail('no-domain@')).toBe(false);
  });
});

// =============================================================================
// datesOverlap
// =============================================================================

describe('datesOverlap', () => {
  it('should detect overlapping ranges', () => {
    expect(datesOverlap('2024-01-01', '2024-01-10', '2024-01-05', '2024-01-15')).toBe(true);
  });

  it('should detect contained ranges', () => {
    expect(datesOverlap('2024-01-01', '2024-01-31', '2024-01-10', '2024-01-20')).toBe(true);
  });

  it('should detect adjacent ranges (same end/start day)', () => {
    expect(datesOverlap('2024-01-01', '2024-01-10', '2024-01-10', '2024-01-20')).toBe(true);
  });

  it('should detect non-overlapping ranges', () => {
    expect(datesOverlap('2024-01-01', '2024-01-10', '2024-01-15', '2024-01-25')).toBe(false);
  });

  it('should detect same-day ranges', () => {
    expect(datesOverlap('2024-01-05', '2024-01-05', '2024-01-05', '2024-01-05')).toBe(true);
  });
});

// =============================================================================
// validateItem (extended)
// =============================================================================

describe('validateItem (extended)', () => {
  const validItem = { name: 'Canon R5', category: 'Cameras' };

  it('should reject name over 100 characters', () => {
    const result = validateItem({ ...validItem, name: 'X'.repeat(101) });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('should reject invalid status', () => {
    const result = validateItem({ ...validItem, status: 'nonexistent' });
    expect(result.isValid).toBe(false);
    expect(result.errors.status).toBeTruthy();
  });

  it('should reject invalid condition', () => {
    const result = validateItem({ ...validItem, condition: 'destroyed' });
    expect(result.isValid).toBe(false);
    expect(result.errors.condition).toBeTruthy();
  });

  it('should reject value exceeding maximum', () => {
    const result = validateItem({ ...validItem, value: 20000000 });
    expect(result.isValid).toBe(false);
    expect(result.errors.value).toBeTruthy();
  });

  it('should accept valid value as currency string', () => {
    const result = validateItem({ ...validItem, value: '$1,500.00' });
    expect(result.isValid).toBe(true);
    expect(result.data.value).toBe(1500);
  });

  it('should accept valid purchase price as currency string', () => {
    const result = validateItem({ ...validItem, purchasePrice: '$2,000' });
    expect(result.isValid).toBe(true);
    expect(result.data.purchasePrice).toBe(2000);
  });

  it('should reject code shorter than 2 chars', () => {
    const result = validateItem({ ...validItem, code: 'X' });
    expect(result.isValid).toBe(false);
    expect(result.errors.code).toBeTruthy();
  });

  it('should reject code longer than 20 chars', () => {
    const result = validateItem({ ...validItem, code: 'X'.repeat(21) });
    expect(result.isValid).toBe(false);
    expect(result.errors.code).toBeTruthy();
  });

  it('should reject serial number over 50 chars', () => {
    const result = validateItem({ ...validItem, serialNumber: 'X'.repeat(51) });
    expect(result.isValid).toBe(false);
    expect(result.errors.serialNumber).toBeTruthy();
  });

  it('should reject invalid purchase date', () => {
    const result = validateItem({ ...validItem, purchaseDate: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.purchaseDate).toBeTruthy();
  });

  it('should reject invalid warranty expiration', () => {
    const result = validateItem({ ...validItem, warrantyExpires: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.warrantyExpires).toBeTruthy();
  });

  it('should accept valid warranty date', () => {
    const result = validateItem({ ...validItem, warrantyExpires: '2026-12-31' });
    expect(result.isValid).toBe(true);
  });

  it('should accept custom categories', () => {
    const result = validateItem(
      { name: 'Widget', category: 'Custom' },
      { customCategories: ['Custom'] }
    );
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid category', () => {
    const result = validateItem({ name: 'Widget', category: 'NonExistent' });
    expect(result.isValid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  it('should skip undefined/null/empty value fields', () => {
    const result = validateItem({ ...validItem, value: undefined });
    expect(result.isValid).toBe(true);

    const result2 = validateItem({ ...validItem, value: '' });
    expect(result2.isValid).toBe(true);

    const result3 = validateItem({ ...validItem, value: null });
    expect(result3.isValid).toBe(true);
  });

  it('should skip undefined/null/empty purchasePrice fields', () => {
    const result = validateItem({ ...validItem, purchasePrice: undefined });
    expect(result.isValid).toBe(true);

    const result2 = validateItem({ ...validItem, purchasePrice: '' });
    expect(result2.isValid).toBe(true);

    const result3 = validateItem({ ...validItem, purchasePrice: null });
    expect(result3.isValid).toBe(true);
  });

  it('should sanitize code and serialNumber in output', () => {
    const result = validateItem({
      ...validItem,
      code: '  CAM-001  ',
      serialNumber: '  SN123  ',
    });
    expect(result.isValid).toBe(true);
    expect(result.data.code).toBe('CAM-001');
    expect(result.data.serialNumber).toBe('SN123');
  });

  it('should return null data on validation failure', () => {
    const result = validateItem({ name: '', category: '' });
    expect(result.isValid).toBe(false);
    expect(result.data).toBeNull();
  });
});

// =============================================================================
// validateReservation (extended)
// =============================================================================

describe('validateReservation (extended)', () => {
  const valid = {
    start: '2025-07-01',
    end: '2025-07-05',
    project: 'Wedding Shoot',
    user: 'Jane Doe',
  };

  it('should reject invalid start date', () => {
    const result = validateReservation({ ...valid, start: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.start).toBeTruthy();
  });

  it('should reject invalid end date', () => {
    const result = validateReservation({ ...valid, end: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.end).toBeTruthy();
  });

  it('should reject project shorter than 2 chars', () => {
    const result = validateReservation({ ...valid, project: 'X' });
    expect(result.isValid).toBe(false);
    expect(result.errors.project).toBeTruthy();
  });

  it('should reject project longer than 200 chars', () => {
    const result = validateReservation({ ...valid, project: 'X'.repeat(201) });
    expect(result.isValid).toBe(false);
    expect(result.errors.project).toBeTruthy();
  });

  it('should accept valid contact email', () => {
    const result = validateReservation({ ...valid, contactEmail: 'jane@test.com' });
    expect(result.isValid).toBe(true);
    expect(result.data.contactEmail).toBe('jane@test.com');
  });

  it('should accept valid contact phone', () => {
    const result = validateReservation({ ...valid, contactPhone: '555-1234' });
    expect(result.isValid).toBe(true);
    expect(result.data.contactPhone).toBe('555-1234');
  });

  it('should reject contact phone longer than 20 chars', () => {
    const result = validateReservation({ ...valid, contactPhone: '1'.repeat(21) });
    expect(result.isValid).toBe(false);
    expect(result.errors.contactPhone).toBeTruthy();
  });

  it('should sanitize project and user fields', () => {
    const result = validateReservation({
      ...valid,
      project: '  Wedding Shoot  ',
      user: '  Jane  ',
    });
    expect(result.isValid).toBe(true);
    expect(result.data.project).toBe('Wedding Shoot');
    expect(result.data.user).toBe('Jane');
  });

  it('should return null data on failure', () => {
    const result = validateReservation({});
    expect(result.isValid).toBe(false);
    expect(result.data).toBeNull();
  });

  it('should skip date overlap check when no existing reservations', () => {
    const result = validateReservation(valid, { existingReservations: [] });
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// validateClient (extended)
// =============================================================================

describe('validateClient (extended)', () => {
  it('should reject name shorter than 2 chars', () => {
    const result = validateClient({ name: 'X' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('should reject name longer than 100 chars', () => {
    const result = validateClient({ name: 'X'.repeat(101) });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('should reject phone longer than 20 chars', () => {
    const result = validateClient({ name: 'Acme Studios', phone: '1'.repeat(21) });
    expect(result.isValid).toBe(false);
    expect(result.errors.phone).toBeTruthy();
  });

  it('should sanitize fields', () => {
    // Note: email is validated before sanitization, so spaces cause rejection.
    // Only test fields that don't have pre-sanitization validation.
    const result = validateClient({
      name: '  Acme Studios  ',
      email: 'acme@test.com',
      phone: '555-1234',
    });
    expect(result.isValid).toBe(true);
    expect(result.data.name).toBe('Acme Studios');
    expect(result.data.email).toBe('acme@test.com');
    expect(result.data.phone).toBe('555-1234');
  });

  it('should return null data on failure', () => {
    const result = validateClient({});
    expect(result.isValid).toBe(false);
    expect(result.data).toBeNull();
  });
});

// =============================================================================
// validateMaintenanceRecord (extended)
// =============================================================================

describe('validateMaintenanceRecord (extended)', () => {
  const valid = { type: 'cleaning', description: 'Sensor cleaning service' };

  it('should reject description longer than 1000 chars', () => {
    const result = validateMaintenanceRecord({ ...valid, description: 'X'.repeat(1001) });
    expect(result.isValid).toBe(false);
    expect(result.errors.description).toBeTruthy();
  });

  it('should accept valid scheduled date', () => {
    const result = validateMaintenanceRecord({ ...valid, scheduledDate: '2025-06-01' });
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid scheduled date', () => {
    const result = validateMaintenanceRecord({ ...valid, scheduledDate: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.scheduledDate).toBeTruthy();
  });

  it('should accept valid completed date', () => {
    const result = validateMaintenanceRecord({ ...valid, completedDate: '2025-06-15' });
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid completed date', () => {
    const result = validateMaintenanceRecord({ ...valid, completedDate: 'not-a-date' });
    expect(result.isValid).toBe(false);
    expect(result.errors.completedDate).toBeTruthy();
  });

  it('should accept cost as currency string', () => {
    const result = validateMaintenanceRecord({ ...valid, cost: '$150.00' });
    expect(result.isValid).toBe(true);
    expect(result.data.cost).toBe(150);
  });

  it('should skip empty/null/undefined cost', () => {
    expect(validateMaintenanceRecord({ ...valid, cost: '' }).isValid).toBe(true);
    expect(validateMaintenanceRecord({ ...valid, cost: null }).isValid).toBe(true);
    expect(validateMaintenanceRecord({ ...valid, cost: undefined }).isValid).toBe(true);
  });

  it('should sanitize vendor in output', () => {
    const result = validateMaintenanceRecord({ ...valid, vendor: '  Lens Pro  ' });
    expect(result.isValid).toBe(true);
    expect(result.data.vendor).toBe('Lens Pro');
  });

  it('should return null data on failure', () => {
    const result = validateMaintenanceRecord({});
    expect(result.isValid).toBe(false);
    expect(result.data).toBeNull();
  });
});

// =============================================================================
// validateItems (extended)
// =============================================================================

describe('validateItems (extended)', () => {
  it('should pass all valid items', () => {
    const items = [
      { name: 'Canon R5', category: 'Cameras' },
      { name: 'Sony A7', category: 'Cameras' },
    ];
    const result = validateItems(items);
    expect(result.isValid).toBe(true);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(0);
    expect(result.totalCount).toBe(2);
  });

  it('should handle empty array', () => {
    const result = validateItems([]);
    expect(result.isValid).toBe(true);
    expect(result.totalCount).toBe(0);
  });

  it('should handle all invalid items', () => {
    const items = [
      { name: '', category: '' },
      { name: '', category: '' },
    ];
    const result = validateItems(items);
    expect(result.isValid).toBe(false);
    expect(result.invalidCount).toBe(2);
    expect(result.validCount).toBe(0);
  });

  it('should pass through options', () => {
    const items = [
      { name: 'Widget', category: 'Custom' },
    ];
    const result = validateItems(items, { customCategories: ['Custom'] });
    expect(result.isValid).toBe(true);
  });
});
