// =============================================================================
// Field Mapping & Validator Tests
// Tests the canonical camelCase↔snake_case transforms and data validators
// =============================================================================

import { describe, it, expect } from 'vitest';

import {
  INVENTORY_FIELD_MAP,
  RESERVATION_FIELD_MAP,
  REMINDER_FIELD_MAP,
  MAINTENANCE_FIELD_MAP,
  CHECKOUT_HISTORY_FIELD_MAP,
  fromDb,
  toDb,
} from '../lib/fieldMap.js';

import {
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
  datesOverlap,
} from '../lib/validators.js';

// =============================================================================
// Field Mapping: fromDb (snake_case → camelCase)
// =============================================================================

describe('fromDb', () => {
  it('maps inventory snake_case fields to camelCase', () => {
    const dbRow = {
      id: 'CAM-001',
      name: 'Canon R5',
      category_name: 'Camera',
      purchase_date: '2024-01-15',
      purchase_price: 3899,
      current_value: 3200,
      serial_number: 'SN123',
      is_kit: false,
      kit_contents: [],
      view_count: 5,
      checkout_count: 3,
      location_display: 'Shelf A',
      location_id: 'loc-1',
      checked_out_to_name: 'John',
      checked_out_to_user_id: 'user-1',
      checked_out_date: '2024-06-01',
      due_back: '2024-06-15',
      checkout_project: 'Wedding',
      checkout_client_id: 'client-1',
    };

    const result = fromDb(dbRow, INVENTORY_FIELD_MAP);

    expect(result.category).toBe('Camera');
    expect(result.purchaseDate).toBe('2024-01-15');
    expect(result.purchasePrice).toBe(3899);
    expect(result.currentValue).toBe(3200);
    expect(result.serialNumber).toBe('SN123');
    expect(result.isKit).toBe(false);
    expect(result.kitItems).toEqual([]);
    expect(result.viewCount).toBe(5);
    expect(result.checkoutCount).toBe(3);
    expect(result.location).toBe('Shelf A');
    expect(result.locationId).toBe('loc-1');
    expect(result.checkedOutTo).toBe('John');
    expect(result.checkedOutToUserId).toBe('user-1');
    expect(result.checkedOutDate).toBe('2024-06-01');
    expect(result.dueBack).toBe('2024-06-15');
    expect(result.checkoutProject).toBe('Wedding');
    expect(result.checkoutClientId).toBe('client-1');
    // Original keys should still be present
    expect(result.id).toBe('CAM-001');
    expect(result.name).toBe('Canon R5');
  });

  it('applies defaults for missing fields', () => {
    const dbRow = { id: 'CAM-001', name: 'Test' };
    const defaults = { isKit: false, kitItems: [], viewCount: 0 };
    const result = fromDb(dbRow, INVENTORY_FIELD_MAP, defaults);

    expect(result.isKit).toBe(false);
    expect(result.kitItems).toEqual([]);
    expect(result.viewCount).toBe(0);
  });

  it('returns null for null input', () => {
    expect(fromDb(null, INVENTORY_FIELD_MAP)).toBeNull();
  });

  it('handles already-camelCase input (pass-through)', () => {
    const row = { id: 'X', purchaseDate: '2024-01-01' };
    const result = fromDb(row, INVENTORY_FIELD_MAP);
    expect(result.purchaseDate).toBe('2024-01-01');
  });

  it('maps reservation fields', () => {
    const dbRow = {
      id: 'res-1',
      item_id: 'CAM-001',
      client_id: 'client-1',
      start_date: '2024-07-01',
      end_date: '2024-07-05',
      contact_name: 'Jane',
      contact_email: 'jane@test.com',
      project_type: 'Wedding',
    };

    const result = fromDb(dbRow, RESERVATION_FIELD_MAP);
    expect(result.itemId).toBe('CAM-001');
    expect(result.clientId).toBe('client-1');
    // After field map reorder, 'start'/'end' are the canonical keys from fromDb
    expect(result.start).toBe('2024-07-01');
    expect(result.end).toBe('2024-07-05');
    expect(result.contactName).toBe('Jane');
    expect(result.contactEmail).toBe('jane@test.com');
    expect(result.projectType).toBe('Wedding');
    // Original DB columns are also preserved via spread
    expect(result.start_date).toBe('2024-07-01');
    expect(result.end_date).toBe('2024-07-05');
  });
});

// =============================================================================
// Field Mapping: toDb (camelCase → snake_case)
// =============================================================================

describe('toDb', () => {
  it('maps inventory camelCase fields to snake_case', () => {
    const item = {
      id: 'CAM-001',
      name: 'Canon R5',
      category: 'Camera',
      purchaseDate: '2024-01-15',
      purchasePrice: 3899,
      currentValue: 3200,
      serialNumber: 'SN123',
      isKit: false,
      locationId: 'loc-1',
    };

    const result = toDb(item, INVENTORY_FIELD_MAP, {
      passThroughFields: ['id', 'name', 'status', 'condition', 'image', 'specs', 'quantity'],
    });

    expect(result.category_name).toBe('Camera');
    expect(result.purchase_date).toBe('2024-01-15');
    expect(result.purchase_price).toBe(3899);
    expect(result.current_value).toBe(3200);
    expect(result.serial_number).toBe('SN123');
    expect(result.is_kit).toBe(false);
    expect(result.location_id).toBe('loc-1');
    expect(result.id).toBe('CAM-001');
    expect(result.name).toBe('Canon R5');
  });

  it('handles partial updates (only includes present fields)', () => {
    const updates = { purchasePrice: 4000, status: 'checked-out' };
    const result = toDb(updates, INVENTORY_FIELD_MAP, { partial: true });

    expect(result.purchase_price).toBe(4000);
    expect(result.status).toBe('checked-out');
    // Should NOT include keys that weren't in updates
    expect(result.category_name).toBeUndefined();
    expect(result.serial_number).toBeUndefined();
  });

  it('coerces numeric fields', () => {
    const item = { purchasePrice: '1234.56', currentValue: '999' };
    const result = toDb(item, INVENTORY_FIELD_MAP, {
      numericFields: { purchasePrice: 0, currentValue: 0 },
    });

    expect(result.purchase_price).toBe(1234.56);
    expect(result.current_value).toBe(999);
  });

  it('returns null for null input', () => {
    expect(toDb(null, INVENTORY_FIELD_MAP)).toBeNull();
  });
});

// =============================================================================
// Field Map Completeness
// =============================================================================

describe('Field map completeness', () => {
  it('INVENTORY_FIELD_MAP has no duplicate db columns', () => {
    const dbValues = Object.values(INVENTORY_FIELD_MAP);
    const unique = new Set(dbValues);
    expect(unique.size).toBe(dbValues.length);
  });

  it('RESERVATION_FIELD_MAP has correct key mappings', () => {
    expect(RESERVATION_FIELD_MAP.itemId).toBe('item_id');
    expect(RESERVATION_FIELD_MAP.clientId).toBe('client_id');
    expect(RESERVATION_FIELD_MAP.startDate).toBe('start_date');
    expect(RESERVATION_FIELD_MAP.endDate).toBe('end_date');
    expect(RESERVATION_FIELD_MAP.contactName).toBe('contact_name');
    expect(RESERVATION_FIELD_MAP.projectType).toBe('project_type');
  });

  it('MAINTENANCE_FIELD_MAP has correct key mappings', () => {
    expect(MAINTENANCE_FIELD_MAP.itemId).toBe('item_id');
    expect(MAINTENANCE_FIELD_MAP.scheduledDate).toBe('scheduled_date');
    expect(MAINTENANCE_FIELD_MAP.completedDate).toBe('completed_date');
    expect(MAINTENANCE_FIELD_MAP.warrantyWork).toBe('warranty_work');
    expect(MAINTENANCE_FIELD_MAP.vendorContact).toBe('vendor_contact');
  });

  it('CHECKOUT_HISTORY_FIELD_MAP has correct key mappings', () => {
    expect(CHECKOUT_HISTORY_FIELD_MAP.itemId).toBe('item_id');
    expect(CHECKOUT_HISTORY_FIELD_MAP.userId).toBe('user_id');
    expect(CHECKOUT_HISTORY_FIELD_MAP.userName).toBe('user_name');
    expect(CHECKOUT_HISTORY_FIELD_MAP.conditionAtAction).toBe('condition_at_action');
  });
});

// =============================================================================
// Roundtrip Tests (fromDb → toDb should preserve data)
// =============================================================================

describe('Roundtrip mapping', () => {
  it('inventory item survives fromDb → toDb roundtrip', () => {
    const dbRow = {
      id: 'CAM-001',
      name: 'Canon R5',
      category_name: 'Camera',
      purchase_date: '2024-01-15',
      purchase_price: 3899,
      is_kit: false,
      kit_contents: [],
      location_id: 'loc-1',
    };

    const frontend = fromDb(dbRow, INVENTORY_FIELD_MAP);
    const backToDb = toDb(frontend, INVENTORY_FIELD_MAP, {
      passThroughFields: ['id', 'name'],
    });

    expect(backToDb.category_name).toBe('Camera');
    expect(backToDb.purchase_date).toBe('2024-01-15');
    expect(backToDb.purchase_price).toBe(3899);
    expect(backToDb.is_kit).toBe(false);
    expect(backToDb.location_id).toBe('loc-1');
  });
});

// =============================================================================
// Validators: validateItem
// =============================================================================

describe('validateItem', () => {
  const validItem = {
    name: 'Canon R5',
    category: 'Cameras',
    status: 'available',
    condition: 'excellent',
  };

  it('passes for valid item', () => {
    const result = validateItem(validItem);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
    expect(result.data).toBeTruthy();
  });

  it('fails when name is missing', () => {
    const result = validateItem({ ...validItem, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('fails when name is too short', () => {
    const result = validateItem({ ...validItem, name: 'X' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('fails when category is missing', () => {
    const result = validateItem({ ...validItem, category: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.category).toBeTruthy();
  });

  it('rejects negative purchase price', () => {
    const result = validateItem({ ...validItem, purchasePrice: -100 });
    expect(result.isValid).toBe(false);
    expect(result.errors.purchasePrice).toBeTruthy();
  });

  it('rejects negative value', () => {
    const result = validateItem({ ...validItem, value: -50 });
    expect(result.isValid).toBe(false);
    expect(result.errors.value).toBeTruthy();
  });

  it('allows valid purchase price', () => {
    const result = validateItem({ ...validItem, purchasePrice: 1500 });
    expect(result.isValid).toBe(true);
  });

  it('sanitizes output data', () => {
    const result = validateItem({ ...validItem, name: '  Canon R5  ' });
    expect(result.isValid).toBe(true);
    expect(result.data.name).toBe('Canon R5');
  });

  it('detects duplicate codes', () => {
    const result = validateItem(
      { ...validItem, code: 'CAM-001' },
      { existingCodes: ['CAM-001'] }
    );
    expect(result.isValid).toBe(false);
    expect(result.errors.code).toBeTruthy();
  });

  it('allows same code when editing that item', () => {
    const result = validateItem(
      { ...validItem, id: 'item-1', code: 'CAM-001' },
      { existingCodes: ['CAM-001'], editingId: 'item-1' }
    );
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Validators: validateReservation
// =============================================================================

describe('validateReservation', () => {
  const validReservation = {
    start: '2025-07-01',
    end: '2025-07-05',
    project: 'Smith Wedding',
    user: 'Jane Doe',
  };

  it('passes for valid reservation', () => {
    const result = validateReservation(validReservation);
    expect(result.isValid).toBe(true);
  });

  it('fails when start date is missing', () => {
    const result = validateReservation({ ...validReservation, start: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.start).toBeTruthy();
  });

  it('fails when end date is before start', () => {
    const result = validateReservation({ ...validReservation, end: '2025-06-28' });
    expect(result.isValid).toBe(false);
    expect(result.errors.end).toBeTruthy();
  });

  it('fails when project is missing', () => {
    const result = validateReservation({ ...validReservation, project: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.project).toBeTruthy();
  });

  it('fails when user is missing', () => {
    const result = validateReservation({ ...validReservation, user: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.user).toBeTruthy();
  });

  it('validates contact email if provided', () => {
    const result = validateReservation({ ...validReservation, contactEmail: 'not-email' });
    expect(result.isValid).toBe(false);
    expect(result.errors.contactEmail).toBeTruthy();
  });

  it('detects date conflicts', () => {
    const existing = [{ id: 'res-1', start: '2025-07-03', end: '2025-07-08' }];
    const result = validateReservation(validReservation, { existingReservations: existing });
    expect(result.isValid).toBe(false);
    expect(result.errors.dateRange).toBeTruthy();
  });

  it('ignores self when checking conflicts during edit', () => {
    const existing = [{ id: 'res-1', start: '2025-07-03', end: '2025-07-08' }];
    const result = validateReservation(validReservation, {
      existingReservations: existing,
      editingId: 'res-1',
    });
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Validators: validateClient
// =============================================================================

describe('validateClient', () => {
  it('passes for valid client', () => {
    const result = validateClient({ name: 'Acme Studios', email: 'acme@test.com' });
    expect(result.isValid).toBe(true);
  });

  it('fails when name is missing', () => {
    const result = validateClient({ name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it('fails with invalid email', () => {
    const result = validateClient({ name: 'Acme', email: 'bad-email' });
    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
  });

  it('allows missing email', () => {
    const result = validateClient({ name: 'Acme Studios' });
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// Validators: validateMaintenanceRecord
// =============================================================================

describe('validateMaintenanceRecord', () => {
  const validRecord = {
    type: 'cleaning',
    description: 'Sensor cleaning service',
  };

  it('passes for valid record', () => {
    const result = validateMaintenanceRecord(validRecord);
    expect(result.isValid).toBe(true);
  });

  it('fails when type is missing', () => {
    const result = validateMaintenanceRecord({ ...validRecord, type: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.type).toBeTruthy();
  });

  it('fails when description is too short', () => {
    const result = validateMaintenanceRecord({ ...validRecord, description: 'Hi' });
    expect(result.isValid).toBe(false);
    expect(result.errors.description).toBeTruthy();
  });

  it('rejects negative cost', () => {
    const result = validateMaintenanceRecord({ ...validRecord, cost: -50 });
    expect(result.isValid).toBe(false);
    expect(result.errors.cost).toBeTruthy();
  });
});

// =============================================================================
// Validators: Bulk
// =============================================================================

describe('validateItems (bulk)', () => {
  it('returns valid and invalid items', () => {
    const items = [
      { name: 'Canon R5', category: 'Cameras' },
      { name: '', category: 'Lenses' },
      { name: 'Sony A7', category: 'Cameras' },
    ];
    const result = validateItems(items);
    expect(result.validCount).toBe(2);
    expect(result.invalidCount).toBe(1);
    expect(result.invalidItems[0].errors.name).toBeTruthy();
  });
});

// =============================================================================
// Helper Validators
// =============================================================================

describe('Helper validators', () => {
  describe('isValidEmail', () => {
    it('accepts valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('@missing.user')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('accepts valid dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
    });

    it('rejects invalid dates', () => {
      expect(isValidDate('')).toBe(false);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('isValidDateRange', () => {
    it('accepts valid ranges', () => {
      expect(isValidDateRange('2024-01-01', '2024-01-31')).toBe(true);
      expect(isValidDateRange('2024-01-01', '2024-01-01')).toBe(true); // same day
    });

    it('rejects end before start', () => {
      expect(isValidDateRange('2024-01-31', '2024-01-01')).toBe(false);
    });
  });

  describe('parseCurrency', () => {
    it('parses various formats', () => {
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('1234.56')).toBe(1234.56);
      expect(parseCurrency(1234)).toBe(1234);
      expect(parseCurrency('')).toBe(0);
      expect(parseCurrency('abc')).toBe(0);
    });
  });

  describe('sanitizeString', () => {
    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('handles non-strings', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(123)).toBe('');
    });
  });

  describe('datesOverlap', () => {
    it('detects overlapping dates', () => {
      expect(datesOverlap('2024-01-01', '2024-01-10', '2024-01-05', '2024-01-15')).toBe(true);
    });

    it('detects contained dates', () => {
      expect(datesOverlap('2024-01-01', '2024-01-31', '2024-01-10', '2024-01-20')).toBe(true);
    });

    it('detects non-overlapping dates', () => {
      expect(datesOverlap('2024-01-01', '2024-01-10', '2024-01-15', '2024-01-25')).toBe(false);
    });
  });
});
