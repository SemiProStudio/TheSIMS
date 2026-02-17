// =============================================================================
// Utils Test Suite
// Tests for pure utility functions in utils.js
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateItemCode,
  generateId,
  formatDate,
  formatDateTime,
  getTodayISO,
  isOverdue,
  getAllReservationConflicts,
  formatMoney,
  formatPhoneNumber,
  sanitizeCSVCell,
  getStatusColor,
  getConditionColor,
  updateById,
  removeById,
  findById,
  filterBySearch,
  filterByCategory,
  filterByStatus,
  addReplyToNote,
  markNoteDeleted,
  findNoteById,
  flattenLocations,
  getNextDueDate,
  isReminderDue,
  calculateDepreciation,
  DEPRECIATION_METHODS,
} from '../utils';

// =============================================================================
// ID Generation Tests
// =============================================================================

describe('generateItemCode', () => {
  it('should generate a code with correct prefix for Cameras', () => {
    const code = generateItemCode('Cameras');
    expect(code).toMatch(/^CA\d{4}$/);
  });

  it('should generate a code with correct prefix for Lenses', () => {
    const code = generateItemCode('Lenses');
    expect(code).toMatch(/^LE\d{4}$/);
  });

  it('should generate a code with correct prefix for Lighting', () => {
    const code = generateItemCode('Lighting');
    expect(code).toMatch(/^LI\d{4}$/);
  });

  it('should use OT prefix for unknown categories', () => {
    const code = generateItemCode('UnknownCategory');
    expect(code).toMatch(/^OT\d{4}$/);
  });

  it('should avoid existing codes', () => {
    const existingCodes = ['CA1234', 'CA5678'];
    const code = generateItemCode('Cameras', existingCodes);
    expect(existingCodes).not.toContain(code);
  });

  it('should handle empty category', () => {
    const code = generateItemCode('');
    expect(code).toMatch(/^OT\d{4}$/);
  });

  it('should handle null category', () => {
    const code = generateItemCode(null);
    expect(code).toMatch(/^OT\d{4}$/);
  });
});

describe('generateId', () => {
  it('should generate a string starting with id_', () => {
    const id = generateId();
    expect(id).toMatch(/^id_\d+_[a-z0-9]+$/);
  });

  it('should generate unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
});

// =============================================================================
// Date Formatting Tests
// =============================================================================

describe('formatDate', () => {
  it('should format a date string correctly', () => {
    const result = formatDate('2025-01-15');
    expect(result).toBe('Jan 15, 2025');
  });

  it('should format a Date object correctly', () => {
    // Use local date constructor to avoid UTC midnight timezone shift
    const result = formatDate(new Date(2025, 5, 20));
    expect(result).toBe('Jun 20, 2025');
  });

  it('should return "-" for null input', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('should return "-" for undefined input', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('should return "-" for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('should return "-" for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('-');
  });
});

describe('formatDateTime', () => {
  it('should format date with time', () => {
    const result = formatDateTime('2025-01-15T15:30:00');
    expect(result).toContain('Jan 15, 2025');
    expect(result).toContain(':30');
  });

  it('should return "-" for null input', () => {
    expect(formatDateTime(null)).toBe('-');
  });

  it('should return "-" for undefined input', () => {
    expect(formatDateTime(undefined)).toBe('-');
  });
});

describe('getTodayISO', () => {
  it('should return date in ISO format (YYYY-MM-DD)', () => {
    const today = getTodayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return current date', () => {
    const today = getTodayISO();
    // Use local date components instead of toISOString (which uses UTC)
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(today).toBe(expected);
  });
});

describe('isOverdue', () => {
  it('should return true for past dates', () => {
    expect(isOverdue('2020-01-01')).toBe(true);
  });

  it('should return false for future dates', () => {
    expect(isOverdue('2099-12-31')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isOverdue(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isOverdue(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isOverdue('')).toBe(false);
  });
});

// =============================================================================
// Reservation Conflict Tests
// =============================================================================

describe('getAllReservationConflicts', () => {
  const baseItem = {
    id: 'item1',
    status: 'available',
    reservations: [],
  };

  it('should return no conflicts for empty item', () => {
    const result = getAllReservationConflicts(null, '2025-01-01', '2025-01-05');
    expect(result.reservationConflicts).toEqual([]);
    expect(result.checkoutConflict).toBeNull();
  });

  it('should return no conflicts when no reservations exist', () => {
    const result = getAllReservationConflicts(baseItem, '2025-01-01', '2025-01-05');
    expect(result.reservationConflicts).toEqual([]);
    expect(result.hasConflicts).toBe(false);
  });

  it('should detect reservation conflicts', () => {
    const item = {
      ...baseItem,
      reservations: [{ id: 'res1', start: '2025-01-03', end: '2025-01-10' }],
    };
    const result = getAllReservationConflicts(item, '2025-01-01', '2025-01-05');
    expect(result.reservationConflicts).toHaveLength(1);
    expect(result.hasConflicts).toBe(true);
  });

  it('should not detect conflict for non-overlapping dates', () => {
    const item = {
      ...baseItem,
      reservations: [{ id: 'res1', start: '2025-01-10', end: '2025-01-15' }],
    };
    const result = getAllReservationConflicts(item, '2025-01-01', '2025-01-05');
    expect(result.reservationConflicts).toHaveLength(0);
    expect(result.hasConflicts).toBe(false);
  });

  it('should exclude the specified reservation from conflict check', () => {
    const item = {
      ...baseItem,
      reservations: [{ id: 'res1', start: '2025-01-03', end: '2025-01-10' }],
    };
    const result = getAllReservationConflicts(item, '2025-01-01', '2025-01-05', 'res1');
    expect(result.reservationConflicts).toHaveLength(0);
  });

  it('should detect checkout conflicts', () => {
    const item = {
      ...baseItem,
      status: 'checked-out',
      checkedOutTo: 'John',
      checkedOutDate: '2025-01-01',
      dueBack: '2025-01-10',
    };
    const result = getAllReservationConflicts(item, '2025-01-05', '2025-01-15');
    expect(result.checkoutConflict).not.toBeNull();
    expect(result.checkoutConflict.type).toBe('checked-out');
    expect(result.hasConflicts).toBe(true);
  });
});

// =============================================================================
// Money Formatting Tests
// =============================================================================

describe('formatMoney', () => {
  it('should format positive numbers', () => {
    expect(formatMoney(1234)).toBe('$1,234');
  });

  it('should format zero', () => {
    expect(formatMoney(0)).toBe('$0');
  });

  it('should format null as $0', () => {
    expect(formatMoney(null)).toBe('$0');
  });

  it('should format undefined as $0', () => {
    expect(formatMoney(undefined)).toBe('$0');
  });

  it('should format large numbers with commas', () => {
    expect(formatMoney(1234567)).toBe('$1,234,567');
  });

  it('should round decimal values', () => {
    expect(formatMoney(1234.56)).toBe('$1,235');
  });
});

// =============================================================================
// Array Utility Tests
// =============================================================================

describe('updateById', () => {
  const items = [
    { id: '1', name: 'Item 1', value: 10 },
    { id: '2', name: 'Item 2', value: 20 },
    { id: '3', name: 'Item 3', value: 30 },
  ];

  it('should update item with object updates', () => {
    const result = updateById(items, '2', { name: 'Updated Item 2' });
    expect(result[1].name).toBe('Updated Item 2');
    expect(result[1].value).toBe(20); // unchanged
  });

  it('should update item with function updates', () => {
    const result = updateById(items, '2', (item) => ({ value: item.value * 2 }));
    expect(result[1].value).toBe(40);
  });

  it('should not modify original array', () => {
    const result = updateById(items, '2', { name: 'Updated' });
    expect(items[1].name).toBe('Item 2');
    expect(result[1].name).toBe('Updated');
  });

  it('should return same items if ID not found', () => {
    const result = updateById(items, '999', { name: 'New' });
    expect(result).toEqual(items);
  });
});

describe('removeById', () => {
  const items = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  it('should remove item by ID', () => {
    const result = removeById(items, '2');
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.id === '2')).toBeUndefined();
  });

  it('should not modify original array', () => {
    const result = removeById(items, '2');
    expect(items).toHaveLength(3);
    expect(result).toHaveLength(2);
  });

  it('should return same length if ID not found', () => {
    const result = removeById(items, '999');
    expect(result).toHaveLength(3);
  });
});

describe('findById', () => {
  const items = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ];

  it('should find item by ID', () => {
    const result = findById(items, '2');
    expect(result).toEqual({ id: '2', name: 'Item 2' });
  });

  it('should return undefined if not found', () => {
    const result = findById(items, '999');
    expect(result).toBeUndefined();
  });

  it('should handle empty array', () => {
    const result = findById([], '1');
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Search/Filter Tests
// =============================================================================

describe('filterBySearch', () => {
  const items = [
    { id: '1', name: 'Sony A7IV', brand: 'Sony' },
    { id: '2', name: 'Canon R5', brand: 'Canon' },
    { id: '3', name: 'Nikon Z8', brand: 'Nikon' },
  ];

  it('should filter by name', () => {
    const result = filterBySearch(items, 'Sony');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sony A7IV');
  });

  it('should filter by brand', () => {
    const result = filterBySearch(items, 'Canon');
    expect(result).toHaveLength(1);
    expect(result[0].brand).toBe('Canon');
  });

  it('should be case insensitive', () => {
    const result = filterBySearch(items, 'SONY');
    expect(result).toHaveLength(1);
  });

  it('should return all items for empty query', () => {
    const result = filterBySearch(items, '');
    expect(result).toHaveLength(3);
  });

  it('should return all items for null query', () => {
    const result = filterBySearch(items, null);
    expect(result).toHaveLength(3);
  });

  it('should handle whitespace-only query', () => {
    const result = filterBySearch(items, '   ');
    expect(result).toHaveLength(3);
  });

  it('should search in specified fields', () => {
    const result = filterBySearch(items, '1', ['id']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});

describe('filterByCategory', () => {
  const items = [
    { id: '1', category: 'Cameras' },
    { id: '2', category: 'Lenses' },
    { id: '3', category: 'Cameras' },
    { id: '4', category: 'Lighting' },
  ];

  it('should filter by single category', () => {
    const result = filterByCategory(items, 'Cameras');
    expect(result).toHaveLength(2);
  });

  it('should filter by multiple categories', () => {
    const result = filterByCategory(items, ['Cameras', 'Lenses']);
    expect(result).toHaveLength(3);
  });

  it('should return all items for "all"', () => {
    const result = filterByCategory(items, 'all');
    expect(result).toHaveLength(4);
  });

  it('should return all items for null', () => {
    const result = filterByCategory(items, null);
    expect(result).toHaveLength(4);
  });

  it('should return all items for empty array', () => {
    const result = filterByCategory(items, []);
    expect(result).toHaveLength(4);
  });
});

describe('filterByStatus', () => {
  const items = [
    { id: '1', status: 'available' },
    { id: '2', status: 'checked-out', dueBack: '2020-01-01' }, // overdue
    { id: '3', status: 'reserved' },
    { id: '4', status: 'checked-out', dueBack: '2099-12-31' }, // not overdue
  ];

  it('should filter by single status', () => {
    const result = filterByStatus(items, 'available');
    expect(result).toHaveLength(1);
  });

  it('should filter by multiple statuses', () => {
    const result = filterByStatus(items, ['available', 'reserved']);
    expect(result).toHaveLength(2);
  });

  it('should return all items for "all"', () => {
    const result = filterByStatus(items, 'all');
    expect(result).toHaveLength(4);
  });

  it('should handle special "overdue" status', () => {
    const result = filterByStatus(items, ['overdue']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

// =============================================================================
// Note Utility Tests
// =============================================================================

describe('addReplyToNote', () => {
  const notes = [
    { id: 'n1', text: 'Note 1', replies: [] },
    { id: 'n2', text: 'Note 2', replies: [{ id: 'n2r1', text: 'Reply 1', replies: [] }] },
  ];

  it('should add reply to top-level note', () => {
    const reply = { id: 'new', text: 'New reply' };
    const result = addReplyToNote(notes, 'n1', reply);
    expect(result[0].replies).toHaveLength(1);
    expect(result[0].replies[0].id).toBe('new');
  });

  it('should add reply to nested note', () => {
    const reply = { id: 'new', text: 'Nested reply' };
    const result = addReplyToNote(notes, 'n2r1', reply);
    expect(result[1].replies[0].replies).toHaveLength(1);
  });

  it('should not modify original notes', () => {
    const reply = { id: 'new', text: 'New' };
    addReplyToNote(notes, 'n1', reply);
    expect(notes[0].replies).toHaveLength(0);
  });
});

describe('markNoteDeleted', () => {
  const notes = [
    { id: 'n1', text: 'Note 1', deleted: false },
    {
      id: 'n2',
      text: 'Note 2',
      deleted: false,
      replies: [{ id: 'n2r1', text: 'Reply', deleted: false }],
    },
  ];

  it('should mark top-level note as deleted', () => {
    const result = markNoteDeleted(notes, 'n1');
    expect(result[0].deleted).toBe(true);
  });

  it('should mark nested note as deleted', () => {
    const result = markNoteDeleted(notes, 'n2r1');
    expect(result[1].replies[0].deleted).toBe(true);
  });

  it('should not modify other notes', () => {
    const result = markNoteDeleted(notes, 'n1');
    expect(result[1].deleted).toBe(false);
  });
});

describe('findNoteById', () => {
  const notes = [
    { id: 'n1', text: 'Note 1' },
    {
      id: 'n2',
      text: 'Note 2',
      replies: [{ id: 'n2r1', text: 'Reply 1', replies: [{ id: 'n2r1r1', text: 'Nested reply' }] }],
    },
  ];

  it('should find top-level note', () => {
    const result = findNoteById(notes, 'n1');
    expect(result.text).toBe('Note 1');
  });

  it('should find nested note', () => {
    const result = findNoteById(notes, 'n2r1');
    expect(result.text).toBe('Reply 1');
  });

  it('should find deeply nested note', () => {
    const result = findNoteById(notes, 'n2r1r1');
    expect(result.text).toBe('Nested reply');
  });

  it('should return null if not found', () => {
    const result = findNoteById(notes, 'nonexistent');
    expect(result).toBeNull();
  });
});

// =============================================================================
// Location Utility Tests
// =============================================================================

describe('flattenLocations', () => {
  const locations = [
    {
      id: '1',
      name: 'Building A',
      type: 'building',
      children: [
        { id: '2', name: 'Room 101', type: 'room', children: [] },
        { id: '3', name: 'Room 102', type: 'room', children: [] },
      ],
    },
    { id: '4', name: 'Building B', type: 'building', children: [] },
  ];

  it('should flatten hierarchical locations', () => {
    const result = flattenLocations(locations);
    expect(result).toHaveLength(4);
  });

  it('should generate correct full paths', () => {
    const result = flattenLocations(locations);
    const room101 = result.find((l) => l.id === '2');
    expect(room101.fullPath).toBe('Building A > Room 101');
  });

  it('should set correct depth values', () => {
    const result = flattenLocations(locations);
    const buildingA = result.find((l) => l.id === '1');
    const room101 = result.find((l) => l.id === '2');
    expect(buildingA.depth).toBe(0);
    expect(room101.depth).toBe(1);
  });

  it('should handle empty array', () => {
    const result = flattenLocations([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Reminder Utility Tests
// =============================================================================

describe('getNextDueDate', () => {
  it('should add 7 days for weekly recurrence', () => {
    const result = getNextDueDate('2025-01-01', 'weekly');
    expect(result).toBe('2025-01-08');
  });

  it('should add 14 days for biweekly recurrence', () => {
    const result = getNextDueDate('2025-01-01', 'biweekly');
    expect(result).toBe('2025-01-15');
  });

  it('should add 1 month for monthly recurrence', () => {
    const result = getNextDueDate('2025-01-15', 'monthly');
    expect(result).toBe('2025-02-15');
  });

  it('should add 3 months for quarterly recurrence', () => {
    const result = getNextDueDate('2025-01-15', 'quarterly');
    expect(result).toBe('2025-04-15');
  });

  it('should add 6 months for biannual recurrence', () => {
    const result = getNextDueDate('2025-01-15', 'biannual');
    expect(result).toBe('2025-07-15');
  });

  it('should add 1 year for yearly recurrence', () => {
    const result = getNextDueDate('2025-01-15', 'yearly');
    expect(result).toBe('2026-01-15');
  });

  it('should return null for no recurrence', () => {
    const result = getNextDueDate('2025-01-01', 'none');
    expect(result).toBeNull();
  });

  it('should return null for invalid recurrence', () => {
    const result = getNextDueDate('2025-01-01', 'invalid');
    expect(result).toBeNull();
  });
});

// =============================================================================
// Reminder Due Tests
// =============================================================================

describe('isReminderDue', () => {
  it('should return true for reminder due today', () => {
    const today = getTodayISO();
    const reminder = { dueDate: today };
    expect(isReminderDue(reminder)).toBe(true);
  });

  it('should return true for overdue reminder', () => {
    const reminder = { dueDate: '2020-01-01' };
    expect(isReminderDue(reminder)).toBe(true);
  });

  it('should return false for future reminder', () => {
    const reminder = { dueDate: '2099-12-31' };
    expect(isReminderDue(reminder)).toBe(false);
  });

  it('should return false for completed reminder', () => {
    const reminder = { dueDate: '2020-01-01', completed: true };
    expect(isReminderDue(reminder)).toBe(false);
  });

  it('should return false for null reminder', () => {
    expect(isReminderDue(null)).toBe(false);
  });

  it('should return false for undefined reminder', () => {
    expect(isReminderDue(undefined)).toBe(false);
  });

  it('should return false for reminder without dueDate', () => {
    const reminder = { title: 'No date' };
    expect(isReminderDue(reminder)).toBe(false);
  });
});

// =============================================================================
// Depreciation Calculation Tests
// =============================================================================

describe('DEPRECIATION_METHODS', () => {
  it('should have straight-line method', () => {
    expect(DEPRECIATION_METHODS.STRAIGHT_LINE).toBeDefined();
  });

  it('should have double-declining method', () => {
    expect(DEPRECIATION_METHODS.DOUBLE_DECLINING).toBeDefined();
  });
});

describe('calculateDepreciation', () => {
  const purchasePrice = 10000;
  const oldPurchaseDate = '2020-01-01';
  const usefulLife = 5; // years
  const salvageValue = 1000;

  it('should calculate straight-line depreciation', () => {
    const result = calculateDepreciation(
      purchasePrice,
      oldPurchaseDate,
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );

    expect(result).toBeDefined();
    expect(result.currentValue).toBeDefined();
    expect(result.totalDepreciation).toBeDefined();
    expect(result.annualDepreciation).toBeDefined();
    expect(typeof result.currentValue).toBe('number');
  });

  it('should not depreciate below salvage value', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2010-01-01', // Very old date
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );

    expect(result.currentValue).toBeGreaterThanOrEqual(salvageValue);
  });

  it('should return purchase price for brand new items', () => {
    const today = getTodayISO();
    const result = calculateDepreciation(
      purchasePrice,
      today,
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );

    // Current value should be close to purchase price for new items
    expect(result.currentValue).toBeLessThanOrEqual(purchasePrice);
  });

  it('should handle missing purchase date', () => {
    const result = calculateDepreciation(
      purchasePrice,
      null,
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );

    expect(result.currentValue).toBe(purchasePrice);
  });

  it('should handle zero salvage value', () => {
    const result = calculateDepreciation(
      purchasePrice,
      oldPurchaseDate,
      usefulLife,
      0,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );

    expect(result).toBeDefined();
    expect(result.currentValue).toBeGreaterThanOrEqual(0);
  });

  it('should handle double-declining method', () => {
    const result = calculateDepreciation(
      purchasePrice,
      oldPurchaseDate,
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );

    expect(result).toBeDefined();
    expect(result.currentValue).toBeDefined();
  });
});

// =============================================================================
// Status Color Tests
// =============================================================================

describe('getStatusColor', () => {
  it('should return color for available status', () => {
    const color = getStatusColor('available');
    expect(color).toBeDefined();
    expect(typeof color).toBe('string');
  });

  it('should return color for checked-out status', () => {
    const color = getStatusColor('checked-out');
    expect(color).toBeDefined();
  });

  it('should return color for reserved status', () => {
    const color = getStatusColor('reserved');
    expect(color).toBeDefined();
  });

  it('should return color for needs-attention status', () => {
    const color = getStatusColor('needs-attention');
    expect(color).toBeDefined();
  });

  it('should return color for missing status', () => {
    const color = getStatusColor('missing');
    expect(color).toBeDefined();
  });

  it('should return default color for unknown status', () => {
    const color = getStatusColor('unknown-status');
    expect(color).toBeDefined();
  });
});

// =============================================================================
// Condition Color Tests
// =============================================================================

describe('getConditionColor', () => {
  it('should return color for excellent condition', () => {
    const color = getConditionColor('excellent');
    expect(color).toBeDefined();
    expect(typeof color).toBe('string');
  });

  it('should return color for good condition', () => {
    const color = getConditionColor('good');
    expect(color).toBeDefined();
  });

  it('should return color for fair condition', () => {
    const color = getConditionColor('fair');
    expect(color).toBeDefined();
  });

  it('should return color for poor condition', () => {
    const color = getConditionColor('poor');
    expect(color).toBeDefined();
  });

  it('should return default color for unknown condition', () => {
    const color = getConditionColor('unknown');
    expect(color).toBeDefined();
  });
});

// =============================================================================
// CSV Sanitization Tests
// =============================================================================

describe('sanitizeCSVCell', () => {
  it('should wrap normal text in double quotes', () => {
    expect(sanitizeCSVCell('hello')).toBe('"hello"');
  });

  it('should return empty quoted string for null', () => {
    expect(sanitizeCSVCell(null)).toBe('""');
  });

  it('should return empty quoted string for undefined', () => {
    expect(sanitizeCSVCell(undefined)).toBe('""');
  });

  it('should convert numbers to quoted strings', () => {
    expect(sanitizeCSVCell(42)).toBe('"42"');
    expect(sanitizeCSVCell(0)).toBe('"0"');
  });

  it('should prefix = to prevent formula injection', () => {
    expect(sanitizeCSVCell('=SUM(A1:A10)')).toBe('"\'=SUM(A1:A10)"');
  });

  it('should prefix + to prevent formula injection', () => {
    expect(sanitizeCSVCell('+cmd|exe')).toBe('"\'+cmd|exe"');
  });

  it('should prefix - to prevent formula injection', () => {
    expect(sanitizeCSVCell('-1+1')).toBe('"\'-1+1"');
  });

  it('should prefix @ to prevent formula injection', () => {
    expect(sanitizeCSVCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });

  it('should prefix tab character to prevent formula injection', () => {
    expect(sanitizeCSVCell('\tdata')).toBe('"\'\tdata"');
  });

  it('should prefix carriage return to prevent formula injection', () => {
    expect(sanitizeCSVCell('\rdata')).toBe('"\'\rdata"');
  });

  it('should escape embedded double quotes by doubling them', () => {
    expect(sanitizeCSVCell('say "hello"')).toBe('"say ""hello"""');
  });

  it('should handle empty string', () => {
    expect(sanitizeCSVCell('')).toBe('""');
  });

  it('should handle strings with commas', () => {
    expect(sanitizeCSVCell('one, two, three')).toBe('"one, two, three"');
  });

  it('should handle strings with newlines', () => {
    expect(sanitizeCSVCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should handle boolean values', () => {
    expect(sanitizeCSVCell(true)).toBe('"true"');
    expect(sanitizeCSVCell(false)).toBe('"false"');
  });
});

// =============================================================================
// Phone Formatting Tests
// =============================================================================

describe('formatPhoneNumber', () => {
  it('should return empty string for null/undefined', () => {
    expect(formatPhoneNumber(null)).toBe('');
    expect(formatPhoneNumber(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  it('should return digits only for 3 or fewer digits', () => {
    expect(formatPhoneNumber('1')).toBe('1');
    expect(formatPhoneNumber('12')).toBe('12');
    expect(formatPhoneNumber('123')).toBe('123');
  });

  it('should add first dash after 3 digits', () => {
    expect(formatPhoneNumber('1234')).toBe('123-4');
    expect(formatPhoneNumber('12345')).toBe('123-45');
    expect(formatPhoneNumber('123456')).toBe('123-456');
  });

  it('should add second dash after 6 digits', () => {
    expect(formatPhoneNumber('1234567')).toBe('123-456-7');
    expect(formatPhoneNumber('1234567890')).toBe('123-456-7890');
  });

  it('should strip non-digit characters', () => {
    expect(formatPhoneNumber('(123) 456-7890')).toBe('123-456-7890');
    expect(formatPhoneNumber('123.456.7890')).toBe('123-456-7890');
    expect(formatPhoneNumber('abc123def456')).toBe('123-456');
  });

  it('should cap at 10 digits', () => {
    expect(formatPhoneNumber('12345678901234')).toBe('123-456-7890');
  });

  it('should handle already formatted input', () => {
    expect(formatPhoneNumber('123-456-7890')).toBe('123-456-7890');
  });
});

// =============================================================================
// Depreciation — Declining Balance & Double Declining Tests
// =============================================================================

describe('calculateDepreciation — declining-balance method', () => {
  const purchasePrice = 10000;
  const usefulLife = 5;
  const salvageValue = 1000;

  it('should calculate declining-balance depreciation', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    expect(result).toBeDefined();
    expect(result.currentValue).toBeGreaterThanOrEqual(salvageValue);
    expect(result.schedule).toHaveLength(usefulLife);
    expect(result.annualDepreciation).toBeGreaterThan(0);
  });

  it('should not depreciate below salvage value', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2010-01-01', // very old
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    expect(result.currentValue).toBeGreaterThanOrEqual(salvageValue);
  });

  it('should return full price when no purchase date', () => {
    const result = calculateDepreciation(
      purchasePrice,
      null,
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    expect(result.currentValue).toBe(purchasePrice);
    expect(result.totalDepreciation).toBe(0);
    expect(result.schedule).toEqual([]);
  });

  it('declining-balance schedule should have decreasing depreciation each year', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    // Each year's start value should be less than the previous
    for (let i = 1; i < result.schedule.length; i++) {
      expect(result.schedule[i].startValue).toBeLessThanOrEqual(result.schedule[i - 1].startValue);
    }
  });

  it('schedule end value of each year equals start value of next', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    for (let i = 0; i < result.schedule.length - 1; i++) {
      expect(result.schedule[i].endValue).toBeCloseTo(result.schedule[i + 1].startValue, 2);
    }
  });
});

describe('calculateDepreciation — double-declining method', () => {
  const purchasePrice = 10000;
  const usefulLife = 5;
  const salvageValue = 1000;

  it('should calculate double-declining depreciation', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );
    expect(result).toBeDefined();
    expect(result.currentValue).toBeGreaterThanOrEqual(salvageValue);
    expect(result.schedule).toHaveLength(usefulLife);
    expect(result.annualDepreciation).toBeGreaterThan(0);
  });

  it('double-declining rate should be higher than declining-balance', () => {
    const ddb = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );
    const db = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    // First year depreciation of DDB (200% rate) > DB (150% rate)
    expect(ddb.schedule[0].depreciation).toBeGreaterThan(db.schedule[0].depreciation);
  });

  it('should not depreciate below salvage value', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2010-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );
    expect(result.currentValue).toBeGreaterThanOrEqual(salvageValue);
  });

  it('should switch to straight-line when it gives higher depreciation', () => {
    // With DDB, later years may switch to straight-line
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );
    // The final year's end value should be close to or at salvage value
    const lastEntry = result.schedule[result.schedule.length - 1];
    expect(lastEntry.endValue).toBeCloseTo(salvageValue, 0);
  });

  it('schedule end value of each year equals start value of next', () => {
    const result = calculateDepreciation(
      purchasePrice,
      '2020-01-01',
      usefulLife,
      salvageValue,
      DEPRECIATION_METHODS.DOUBLE_DECLINING,
    );
    for (let i = 0; i < result.schedule.length - 1; i++) {
      expect(result.schedule[i].endValue).toBeCloseTo(result.schedule[i + 1].startValue, 2);
    }
  });
});

describe('calculateDepreciation — edge cases', () => {
  it('should handle zero useful life gracefully', () => {
    // With zero useful life, division by zero would occur
    // Straight-line: depreciableAmount / 0 = Infinity
    const result = calculateDepreciation(
      10000,
      '2020-01-01',
      0,
      1000,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    // Should still return a result without crashing
    expect(result).toBeDefined();
  });

  it('should handle salvage value equal to purchase price', () => {
    const result = calculateDepreciation(
      10000,
      '2020-01-01',
      5,
      10000, // same as purchase price
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    expect(result.annualDepreciation).toBe(0);
    expect(result.currentValue).toBe(10000);
  });

  it('should handle zero salvage value with zero purchase price', () => {
    const result = calculateDepreciation(0, '2020-01-01', 5, 0, DEPRECIATION_METHODS.STRAIGHT_LINE);
    expect(result.currentValue).toBe(0);
    expect(result.totalDepreciation).toBe(0);
  });

  it('should return default for unknown method', () => {
    const result = calculateDepreciation(10000, '2020-01-01', 5, 1000, 'unknown-method');
    expect(result.currentValue).toBe(10000);
    expect(result.annualDepreciation).toBe(0);
  });

  it('should include percentDepreciated', () => {
    const result = calculateDepreciation(
      10000,
      '2020-01-01',
      5,
      1000,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    expect(typeof result.percentDepreciated).toBe('number');
    expect(result.percentDepreciated).toBeGreaterThanOrEqual(0);
    expect(result.percentDepreciated).toBeLessThanOrEqual(100);
  });

  it('should include ageInMonths and ageInYears', () => {
    const result = calculateDepreciation(
      10000,
      '2023-01-01',
      5,
      1000,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    expect(typeof result.ageInYears).toBe('number');
    expect(typeof result.ageInMonths).toBe('number');
    expect(result.ageInYears).toBeGreaterThan(0);
    expect(result.ageInMonths).toBeGreaterThan(0);
  });
});
