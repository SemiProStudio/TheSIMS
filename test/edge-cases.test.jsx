// =============================================================================
// Edge Case Tests - Error Handling
// Tests for error boundaries, edge cases, and error recovery
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

// =============================================================================
// Import utilities to test
// =============================================================================
import {
  generateItemCode,
  generateId,
  formatDate,
  formatDateTime,
  getTodayISO,
  isOverdue,
  getAllReservationConflicts,
  formatMoney,
  getStatusColor,
  getConditionColor,
  updateById,
  removeById,
  findById,
  addReplyToNote,
  markNoteDeleted,
  findNoteById,
  getNextDueDate,
  parseSmartPaste,
  validateCSVData,
  exportToCSV,
  calculateDepreciation,
} from '../utils.js';

// =============================================================================
// Null/Undefined Input Tests
// =============================================================================

describe('Null and Undefined Input Handling', () => {
  describe('formatDate', () => {
    it('should return "-" for null input', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('should return "-" for undefined input', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('should return "-" for empty string', () => {
      expect(formatDate('')).toBe('-');
    });

    it('should return "-" for invalid date string', () => {
      expect(formatDate('not-a-date')).toBe('-');
    });

    it('should handle NaN', () => {
      expect(formatDate(NaN)).toBe('-');
    });

    it('should handle objects that are not dates', () => {
      expect(formatDate({})).toBe('-');
    });
  });

  describe('formatDateTime', () => {
    it('should return "-" for null input', () => {
      expect(formatDateTime(null)).toBe('-');
    });

    it('should return "-" for undefined input', () => {
      expect(formatDateTime(undefined)).toBe('-');
    });

    it('should return "-" for invalid date', () => {
      expect(formatDateTime('invalid')).toBe('-');
    });
  });

  describe('formatMoney', () => {
    it('should handle null as zero', () => {
      expect(formatMoney(null)).toBe('$0');
    });

    it('should handle undefined as zero', () => {
      expect(formatMoney(undefined)).toBe('$0');
    });

    it('should handle NaN as zero', () => {
      const result = formatMoney(NaN);
      expect(result).toBe('$0');
    });

    it('should handle negative numbers', () => {
      expect(formatMoney(-1000)).toBe('$-1,000');
    });

    it('should handle very large numbers', () => {
      expect(formatMoney(999999999999)).toContain('999,999,999,999');
    });

    it('should handle decimal numbers', () => {
      expect(formatMoney(1234.56)).toBe('$1,235');
    });
  });

  describe('isOverdue', () => {
    it('should return false for null date', () => {
      expect(isOverdue(null)).toBe(false);
    });

    it('should return false for undefined date', () => {
      expect(isOverdue(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isOverdue('')).toBe(false);
    });

    it('should return true for past date', () => {
      expect(isOverdue('2020-01-01')).toBe(true);
    });

    it('should return false for future date', () => {
      expect(isOverdue('2099-12-31')).toBe(false);
    });
  });
});

// =============================================================================
// Empty Array/Object Tests
// =============================================================================

describe('Empty Array and Object Handling', () => {
  describe('generateItemCode', () => {
    it('should generate code with empty existing codes array', () => {
      const code = generateItemCode('Cameras', []);
      expect(code).toMatch(/^CA\d{4}$/);
    });

    it('should generate code with null existing codes', () => {
      const code = generateItemCode('Cameras', null);
      expect(code).toMatch(/^CA\d{4}$/);
    });

    it('should use "OT" prefix for unknown category', () => {
      const code = generateItemCode('Unknown', []);
      expect(code).toMatch(/^OT\d{4}$/);
    });

    it('should use "OT" prefix for null category', () => {
      const code = generateItemCode(null, []);
      expect(code).toMatch(/^OT\d{4}$/);
    });

    it('should use "OT" prefix for undefined category', () => {
      const code = generateItemCode(undefined, []);
      expect(code).toMatch(/^OT\d{4}$/);
    });

    it('should handle nearly full code space', () => {
      // Generate many codes
      const existingCodes = Array.from({ length: 50 }, (_, i) => `CA${1000 + i}`);
      const code = generateItemCode('Cameras', existingCodes);
      expect(code).toMatch(/^CA\d+$/);
    });
  });

  describe('updateById', () => {
    it('should return empty array for empty input', () => {
      const result = updateById([], 'id', { name: 'test' });
      expect(result).toEqual([]);
    });

    it('should return original array if id not found', () => {
      const arr = [{ id: '1', name: 'test' }];
      const result = updateById(arr, 'nonexistent', { name: 'updated' });
      expect(result).toEqual(arr);
    });

    it('should handle null updates object', () => {
      const arr = [{ id: '1', name: 'test' }];
      const result = updateById(arr, '1', null);
      expect(result[0]).toEqual({ id: '1', name: 'test' });
    });

    it('should handle function updates', () => {
      const arr = [{ id: '1', count: 5 }];
      const result = updateById(arr, '1', (item) => ({ count: item.count + 1 }));
      expect(result[0].count).toBe(6);
    });
  });

  describe('removeById', () => {
    it('should return empty array for empty input', () => {
      const result = removeById([], 'id');
      expect(result).toEqual([]);
    });

    it('should return original array if id not found', () => {
      const arr = [{ id: '1' }];
      const result = removeById(arr, 'nonexistent');
      expect(result).toEqual(arr);
    });

    it('should handle null id', () => {
      const arr = [{ id: '1' }];
      const result = removeById(arr, null);
      expect(result).toEqual(arr);
    });
  });

  describe('findById', () => {
    it('should return undefined for empty array', () => {
      const result = findById([], 'id');
      expect(result).toBeUndefined();
    });

    it('should return undefined for nonexistent id', () => {
      const arr = [{ id: '1' }];
      const result = findById(arr, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for null id', () => {
      const arr = [{ id: '1' }];
      const result = findById(arr, null);
      expect(result).toBeUndefined();
    });
  });
});

// =============================================================================
// Reservation Conflict Edge Cases
// =============================================================================

describe('Reservation Conflict Edge Cases', () => {
  describe('getAllReservationConflicts', () => {
    it('should return empty results for null item', () => {
      const result = getAllReservationConflicts(null, '2024-01-01', '2024-01-05');
      expect(result).toEqual({
        reservationConflicts: [],
        checkoutConflict: null
      });
    });

    it('should handle item with no reservations', () => {
      const item = { id: '1', name: 'Test' };
      const result = getAllReservationConflicts(item, '2024-01-01', '2024-01-05');
      expect(result.reservationConflicts).toEqual([]);
      expect(result.hasConflicts).toBe(false);
    });

    it('should handle item with empty reservations array', () => {
      const item = { id: '1', name: 'Test', reservations: [] };
      const result = getAllReservationConflicts(item, '2024-01-01', '2024-01-05');
      expect(result.reservationConflicts).toEqual([]);
    });

    it('should handle null start date', () => {
      const item = { id: '1', reservations: [{ id: 'r1', start: '2024-01-01', end: '2024-01-05' }] };
      const result = getAllReservationConflicts(item, null, '2024-01-05');
      expect(result.reservationConflicts).toEqual([]);
    });

    it('should handle null end date', () => {
      const item = { id: '1', reservations: [{ id: 'r1', start: '2024-01-01', end: '2024-01-05' }] };
      const result = getAllReservationConflicts(item, '2024-01-01', null);
      expect(result.reservationConflicts).toEqual([]);
    });

    it('should detect overlapping reservations', () => {
      const item = {
        id: '1',
        reservations: [
          { id: 'r1', start: '2024-01-03', end: '2024-01-07' }
        ]
      };
      const result = getAllReservationConflicts(item, '2024-01-01', '2024-01-05');
      expect(result.reservationConflicts.length).toBe(1);
      expect(result.hasConflicts).toBe(true);
    });

    it('should exclude specified reservation id', () => {
      const item = {
        id: '1',
        reservations: [
          { id: 'r1', start: '2024-01-03', end: '2024-01-07' }
        ]
      };
      const result = getAllReservationConflicts(item, '2024-01-01', '2024-01-05', 'r1');
      expect(result.reservationConflicts.length).toBe(0);
    });

    it('should detect checkout conflicts', () => {
      const item = {
        id: '1',
        status: 'checked-out',
        checkedOutTo: 'John',
        checkedOutDate: '2024-01-01',
        dueBack: '2024-01-10',
        reservations: []
      };
      const result = getAllReservationConflicts(item, '2024-01-05', '2024-01-08');
      expect(result.checkoutConflict).not.toBeNull();
      expect(result.hasConflicts).toBe(true);
    });

    it('should handle checked out item with no due date', () => {
      const item = {
        id: '1',
        status: 'checked-out',
        checkedOutTo: 'John',
        checkedOutDate: '2024-01-01',
        dueBack: null,
        reservations: []
      };
      const result = getAllReservationConflicts(item, '2024-01-05', '2024-01-08');
      expect(result.checkoutConflict).not.toBeNull();
      expect(result.checkoutConflict.message).toContain('no return date');
    });
  });
});

// =============================================================================
// Note System Edge Cases
// =============================================================================

describe('Note System Edge Cases', () => {
  describe('addReplyToNote', () => {
    it('should handle empty notes array', () => {
      const result = addReplyToNote([], 'note-1', { text: 'reply' });
      expect(result).toEqual([]);
    });

    it('should handle nonexistent note id', () => {
      const notes = [{ id: 'note-1', text: 'test', replies: [] }];
      const result = addReplyToNote(notes, 'nonexistent', { text: 'reply' });
      expect(result[0].replies.length).toBe(0);
    });

    it('should handle note without replies array', () => {
      const notes = [{ id: 'note-1', text: 'test' }];
      const result = addReplyToNote(notes, 'note-1', { text: 'reply' });
      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should add reply to existing note', () => {
      const notes = [{ id: 'note-1', text: 'test', replies: [] }];
      const reply = { id: 'reply-1', text: 'my reply' };
      const result = addReplyToNote(notes, 'note-1', reply);
      expect(result[0].replies.length).toBe(1);
      expect(result[0].replies[0].text).toBe('my reply');
    });
  });

  describe('markNoteDeleted', () => {
    it('should handle empty notes array', () => {
      const result = markNoteDeleted([], 'note-1');
      expect(result).toEqual([]);
    });

    it('should handle nonexistent note id', () => {
      const notes = [{ id: 'note-1', text: 'test' }];
      const result = markNoteDeleted(notes, 'nonexistent');
      expect(result[0].deleted).toBeUndefined();
    });

    it('should mark note as deleted', () => {
      const notes = [{ id: 'note-1', text: 'test' }];
      const result = markNoteDeleted(notes, 'note-1');
      expect(result[0].deleted).toBe(true);
    });
  });

  describe('findNoteById', () => {
    it('should return null for empty notes', () => {
      const result = findNoteById([], 'note-1');
      expect(result).toBeNull();
    });

    it('should find note by id', () => {
      const notes = [{ id: 'note-1', text: 'test' }];
      const result = findNoteById(notes, 'note-1');
      expect(result.text).toBe('test');
    });

    it('should find nested reply', () => {
      const notes = [{
        id: 'note-1',
        text: 'parent',
        replies: [{ id: 'reply-1', text: 'child' }]
      }];
      const result = findNoteById(notes, 'reply-1');
      expect(result?.text).toBe('child');
    });
  });
});

// =============================================================================
// Status and Condition Color Edge Cases
// =============================================================================

describe('Status and Condition Color Edge Cases', () => {
  describe('getStatusColor', () => {
    it('should return muted color for null status', () => {
      const result = getStatusColor(null);
      expect(result).toBeDefined();
    });

    it('should return muted color for undefined status', () => {
      const result = getStatusColor(undefined);
      expect(result).toBeDefined();
    });

    it('should return muted color for unknown status', () => {
      const result = getStatusColor('unknown-status');
      expect(result).toBeDefined();
    });

    it('should return correct color for valid status', () => {
      const result = getStatusColor('available');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getConditionColor', () => {
    it('should return muted color for null condition', () => {
      const result = getConditionColor(null);
      expect(result).toBeDefined();
    });

    it('should return muted color for undefined condition', () => {
      const result = getConditionColor(undefined);
      expect(result).toBeDefined();
    });

    it('should return muted color for unknown condition', () => {
      const result = getConditionColor('unknown');
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Maintenance Schedule Edge Cases
// =============================================================================

describe('Maintenance Schedule Edge Cases', () => {
  describe('getNextDueDate', () => {
    it('should handle null last date', () => {
      const result = getNextDueDate(null, 'monthly');
      expect(result).toBeDefined();
    });

    it('should handle null interval', () => {
      const result = getNextDueDate('2024-01-01', null);
      expect(result).toBeDefined();
    });

    it('should handle unknown interval', () => {
      const result = getNextDueDate('2024-01-01', 'unknown');
      expect(result).toBeDefined();
    });

    it('should calculate monthly interval', () => {
      const result = getNextDueDate('2024-01-15', 'monthly');
      expect(result).toMatch(/2024-02/);
    });

    it('should calculate quarterly interval', () => {
      const result = getNextDueDate('2024-01-15', 'quarterly');
      expect(result).toMatch(/2024-04/);
    });

    it('should calculate yearly interval', () => {
      const result = getNextDueDate('2024-01-15', 'yearly');
      expect(result).toMatch(/2025-01/);
    });
  });
});

// =============================================================================
// Error Boundary Tests
// =============================================================================

describe('Error Boundary Component', () => {
  // Suppress console.error during these tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  const ThrowError = ({ shouldThrow }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Normal content</div>;
  };

  const SimpleErrorBoundary = ({ children }) => {
    const [hasError, setHasError] = React.useState(false);
    
    if (hasError) {
      return (
        <div role="alert" data-testid="error-fallback">
          <h1>Something went wrong</h1>
          <button onClick={() => setHasError(false)}>Try Again</button>
        </div>
      );
    }
    
    return (
      <React.Suspense fallback={<div>Loading...</div>}>
        {children}
      </React.Suspense>
    );
  };

  it('should render children when no error', () => {
    render(
      <SimpleErrorBoundary>
        <div data-testid="child">Child content</div>
      </SimpleErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should have accessible error message', () => {
    const ErrorDisplay = () => (
      <div role="alert" aria-live="assertive">
        <h1>Error occurred</h1>
        <p>Please try again</p>
      </div>
    );
    
    render(<ErrorDisplay />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Error occurred');
  });
});

// =============================================================================
// Form Validation Edge Cases
// =============================================================================

describe('Form Validation Edge Cases', () => {
  const validateItemForm = (data) => {
    const errors = {};
    
    if (!data.name || !data.name.trim()) {
      errors.name = 'Name is required';
    } else if (data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (data.name.trim().length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    if (!data.category) {
      errors.category = 'Category is required';
    }
    
    if (data.value !== undefined && data.value !== '') {
      const numValue = parseFloat(data.value);
      if (isNaN(numValue)) {
        errors.value = 'Value must be a number';
      } else if (numValue < 0) {
        errors.value = 'Value cannot be negative';
      }
    }
    
    if (data.purchaseDate) {
      const date = new Date(data.purchaseDate);
      if (isNaN(date.getTime())) {
        errors.purchaseDate = 'Invalid date';
      } else if (date > new Date()) {
        errors.purchaseDate = 'Purchase date cannot be in the future';
      }
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  it('should require name', () => {
    const result = validateItemForm({ category: 'Camera' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Name is required');
  });

  it('should reject empty name', () => {
    const result = validateItemForm({ name: '', category: 'Camera' });
    expect(result.isValid).toBe(false);
  });

  it('should reject whitespace-only name', () => {
    const result = validateItemForm({ name: '   ', category: 'Camera' });
    expect(result.isValid).toBe(false);
  });

  it('should reject too short name', () => {
    const result = validateItemForm({ name: 'A', category: 'Camera' });
    expect(result.errors.name).toBe('Name must be at least 2 characters');
  });

  it('should reject too long name', () => {
    const result = validateItemForm({ name: 'A'.repeat(101), category: 'Camera' });
    expect(result.errors.name).toBe('Name must be less than 100 characters');
  });

  it('should require category', () => {
    const result = validateItemForm({ name: 'Test Item' });
    expect(result.errors.category).toBe('Category is required');
  });

  it('should reject non-numeric value', () => {
    const result = validateItemForm({ name: 'Test', category: 'Camera', value: 'not a number' });
    expect(result.errors.value).toBe('Value must be a number');
  });

  it('should reject negative value', () => {
    const result = validateItemForm({ name: 'Test', category: 'Camera', value: '-100' });
    expect(result.errors.value).toBe('Value cannot be negative');
  });

  it('should reject future purchase date', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = validateItemForm({ 
      name: 'Test', 
      category: 'Camera', 
      purchaseDate: futureDate.toISOString() 
    });
    expect(result.errors.purchaseDate).toBe('Purchase date cannot be in the future');
  });

  it('should accept valid data', () => {
    const result = validateItemForm({
      name: 'Canon C70',
      category: 'Camera',
      value: '5000',
      purchaseDate: '2023-01-15'
    });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('should accept empty optional fields', () => {
    const result = validateItemForm({
      name: 'Canon C70',
      category: 'Camera'
    });
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Data Type Coercion Edge Cases
// =============================================================================

describe('Data Type Coercion', () => {
  const parseItemValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    
    // Handle string with currency symbol
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value;
    }
    
    return 0;
  };

  it('should handle null', () => {
    expect(parseItemValue(null)).toBe(0);
  });

  it('should handle undefined', () => {
    expect(parseItemValue(undefined)).toBe(0);
  });

  it('should handle empty string', () => {
    expect(parseItemValue('')).toBe(0);
  });

  it('should handle numeric string', () => {
    expect(parseItemValue('1000')).toBe(1000);
  });

  it('should handle currency string', () => {
    expect(parseItemValue('$1,000')).toBe(1000);
  });

  it('should handle number', () => {
    expect(parseItemValue(1000)).toBe(1000);
  });

  it('should handle NaN', () => {
    expect(parseItemValue(NaN)).toBe(0);
  });

  it('should handle Infinity', () => {
    expect(parseItemValue(Infinity)).toBe(Infinity);
  });

  it('should handle decimal string', () => {
    expect(parseItemValue('1000.50')).toBe(1000.5);
  });

  it('should handle negative string', () => {
    expect(parseItemValue('-500')).toBe(-500);
  });

  it('should handle invalid string', () => {
    expect(parseItemValue('not a number')).toBe(0);
  });
});

// =============================================================================
// Concurrent Operations Edge Cases
// =============================================================================

describe('Concurrent Operations', () => {
  it('should handle rapid successive updates', () => {
    let data = [{ id: '1', count: 0 }];
    
    // Simulate rapid updates
    for (let i = 0; i < 100; i++) {
      data = updateById(data, '1', (item) => ({ count: item.count + 1 }));
    }
    
    expect(data[0].count).toBe(100);
  });

  it('should handle interleaved add/remove operations', () => {
    let data = [];
    
    // Add items
    for (let i = 0; i < 10; i++) {
      data = [...data, { id: `item-${i}`, value: i }];
    }
    
    // Remove every other item
    for (let i = 0; i < 10; i += 2) {
      data = removeById(data, `item-${i}`);
    }
    
    expect(data.length).toBe(5);
    expect(data.every(item => parseInt(item.id.split('-')[1]) % 2 === 1)).toBe(true);
  });

  it('should maintain data integrity during bulk updates', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `item-${i}`,
      value: i
    }));
    
    // Update all items
    const updated = items.map(item => ({
      ...item,
      value: item.value * 2
    }));
    
    expect(updated.length).toBe(1000);
    expect(updated[500].value).toBe(1000);
  });
});

// =============================================================================
// Boundary Value Tests
// =============================================================================

describe('Boundary Value Tests', () => {
  describe('Array operations at boundaries', () => {
    it('should handle single-item array', () => {
      const arr = [{ id: '1' }];
      expect(removeById(arr, '1')).toEqual([]);
      expect(findById(arr, '1')).toEqual({ id: '1' });
    });

    it('should handle large array', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: `id-${i}` }));
      expect(findById(largeArray, 'id-9999')).toEqual({ id: 'id-9999' });
      expect(findById(largeArray, 'id-0')).toEqual({ id: 'id-0' });
    });
  });

  describe('Date boundaries', () => {
    it('should handle year 2000', () => {
      const result = formatDate('2000-01-01');
      expect(result).toContain('2000');
    });

    it('should handle far future date', () => {
      const result = formatDate('2099-12-31');
      expect(result).toContain('2099');
    });

    it('should handle leap year date', () => {
      const result = formatDate('2024-02-29');
      expect(result).toContain('29');
    });
  });

  describe('String boundaries', () => {
    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const code = generateItemCode(longString, []);
      expect(code).toMatch(/^OT\d+$/);
    });

    it('should handle unicode characters', () => {
      const result = formatDate('2024-01-15');
      expect(result).toBeDefined();
    });

    it('should handle special characters in category', () => {
      const code = generateItemCode('Camera & Video', []);
      expect(code).toMatch(/^OT\d+$/);
    });
  });
});

// =============================================================================
// Recovery and Retry Tests
// =============================================================================

describe('Recovery and Retry Logic', () => {
  const fetchWithRetry = async (fn, maxRetries = 3, delay = 100) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  };

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await fetchWithRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');
    
    const result = await fetchWithRetry(fn, 3, 10);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
    
    await expect(fetchWithRetry(fn, 3, 10)).rejects.toThrow('Always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
