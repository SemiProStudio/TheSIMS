// =============================================================================
// Field Mapping — Edge Case Tests
// Additional coverage for fromDb/toDb with complex scenarios
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  INVENTORY_FIELD_MAP,
  RESERVATION_FIELD_MAP,
  MAINTENANCE_FIELD_MAP,
  CHECKOUT_HISTORY_FIELD_MAP,
  REMINDER_FIELD_MAP,
  fromDb,
  toDb,
} from '../lib/fieldMap.js';

// =============================================================================
// fromDb edge cases
// =============================================================================

describe('fromDb — edge cases', () => {
  it('should handle completely empty DB row', () => {
    const result = fromDb({}, INVENTORY_FIELD_MAP);
    expect(result).toEqual({});
  });

  it('should handle null DB row', () => {
    const result = fromDb(null, INVENTORY_FIELD_MAP);
    expect(result).toBeNull();
  });

  it('should handle undefined DB row', () => {
    const result = fromDb(undefined, INVENTORY_FIELD_MAP);
    expect(result).toBeNull();
  });

  it('should preserve unmapped fields from DB', () => {
    const dbRow = {
      id: 'CAM-001',
      name: 'Test Camera',
      custom_field_not_in_map: 'preserved_value',
    };
    const result = fromDb(dbRow, INVENTORY_FIELD_MAP);
    // id and name are pass-through
    expect(result.id).toBe('CAM-001');
    expect(result.name).toBe('Test Camera');
  });

  it('should map all INVENTORY_FIELD_MAP entries correctly', () => {
    const dbRow = {
      category_name: 'Cameras',
      purchase_date: '2025-01-01',
      purchase_price: 2499,
      current_value: 2000,
      serial_number: 'SN-123',
      reorder_point: 5,
      checked_out_to_name: 'John',
      checked_out_to_user_id: 'user-1',
      checked_out_date: '2025-02-01',
      due_back: '2025-02-15',
      checkout_project: 'Film',
      checkout_client_id: 'client-1',
      is_kit: true,
      kit_type: 'camera-kit',
      kit_contents: ['item1', 'item2'],
      view_count: 10,
      checkout_count: 3,
      location_display: 'Shelf A',
      location_id: 'loc-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-02-01T00:00:00Z',
    };
    const result = fromDb(dbRow, INVENTORY_FIELD_MAP);
    expect(result.category).toBe('Cameras');
    expect(result.purchaseDate).toBe('2025-01-01');
    expect(result.purchasePrice).toBe(2499);
    expect(result.currentValue).toBe(2000);
    expect(result.serialNumber).toBe('SN-123');
    expect(result.reorderPoint).toBe(5);
    expect(result.checkedOutTo).toBe('John');
    expect(result.checkedOutToUserId).toBe('user-1');
    expect(result.checkedOutDate).toBe('2025-02-01');
    expect(result.dueBack).toBe('2025-02-15');
    expect(result.checkoutProject).toBe('Film');
    expect(result.checkoutClientId).toBe('client-1');
    expect(result.isKit).toBe(true);
    expect(result.kitType).toBe('camera-kit');
    expect(result.kitItems).toEqual(['item1', 'item2']);
    expect(result.viewCount).toBe(10);
    expect(result.checkoutCount).toBe(3);
    expect(result.location).toBe('Shelf A');
    expect(result.locationId).toBe('loc-1');
    expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
    expect(result.updatedAt).toBe('2025-02-01T00:00:00Z');
  });

  it('should map all RESERVATION_FIELD_MAP entries', () => {
    const dbRow = {
      start_date: '2025-03-01',
      end_date: '2025-03-05',
      contact_name: 'Jane',
      contact_phone: '555-1234',
      contact_email: 'jane@test.com',
      item_id: 'item-1',
      client_id: 'client-1',
      created_by_id: 'user-1',
      created_by_name: 'Admin',
      project_type: 'Commercial',
    };
    const result = fromDb(dbRow, RESERVATION_FIELD_MAP);
    expect(result.start).toBe('2025-03-01');
    expect(result.end).toBe('2025-03-05');
    expect(result.contactName).toBe('Jane');
    expect(result.contactPhone).toBe('555-1234');
    expect(result.contactEmail).toBe('jane@test.com');
    expect(result.itemId).toBe('item-1');
    expect(result.clientId).toBe('client-1');
    expect(result.createdById).toBe('user-1');
    expect(result.createdByName).toBe('Admin');
    expect(result.projectType).toBe('Commercial');
  });

  it('should map MAINTENANCE_FIELD_MAP entries', () => {
    const dbRow = {
      item_id: 'item-1',
      scheduled_date: '2025-04-01',
      completed_date: '2025-04-05',
      created_by_name: 'Tech',
      vendor_contact: 'vendor@test.com',
      warranty_work: true,
    };
    const result = fromDb(dbRow, MAINTENANCE_FIELD_MAP);
    expect(result.itemId).toBe('item-1');
    expect(result.scheduledDate).toBe('2025-04-01');
    expect(result.completedDate).toBe('2025-04-05');
    expect(result.createdByName).toBe('Tech');
    expect(result.vendorContact).toBe('vendor@test.com');
    expect(result.warrantyWork).toBe(true);
  });

  it('should map CHECKOUT_HISTORY_FIELD_MAP entries', () => {
    const dbRow = {
      item_id: 'item-1',
      user_id: 'user-1',
      user_name: 'John',
      client_id: 'client-1',
      client_name: 'ACME',
      checked_out_date: '2025-01-01',
      due_back: '2025-01-15',
      returned_date: '2025-01-10',
      condition_at_checkout: 'excellent',
      condition_at_return: 'good',
    };
    const result = fromDb(dbRow, CHECKOUT_HISTORY_FIELD_MAP);
    expect(result.itemId).toBe('item-1');
    expect(result.userId).toBe('user-1');
    expect(result.userName).toBe('John');
    expect(result.clientId).toBe('client-1');
    expect(result.clientName).toBe('ACME');
  });

  it('should handle DB rows with null values', () => {
    const dbRow = {
      purchase_price: null,
      serial_number: null,
      is_kit: null,
      kit_contents: null,
    };
    const result = fromDb(dbRow, INVENTORY_FIELD_MAP);
    expect(result.purchasePrice).toBeNull();
    expect(result.serialNumber).toBeNull();
    expect(result.isKit).toBeNull();
    expect(result.kitItems).toBeNull();
  });
});

// =============================================================================
// toDb edge cases
// =============================================================================

describe('toDb — edge cases', () => {
  it('should handle null input', () => {
    const result = toDb(null, INVENTORY_FIELD_MAP);
    expect(result).toBeNull();
  });

  it('should handle undefined input', () => {
    const result = toDb(undefined, INVENTORY_FIELD_MAP);
    expect(result).toBeNull();
  });

  it('should handle empty object', () => {
    const result = toDb({}, INVENTORY_FIELD_MAP);
    expect(result).toEqual({});
  });

  it('should convert camelCase inventory fields to snake_case', () => {
    const frontendObj = {
      category: 'Cameras',
      purchaseDate: '2025-01-01',
      purchasePrice: 2499,
      serialNumber: 'SN-123',
      isKit: false,
      kitItems: [],
      viewCount: 0,
    };
    const result = toDb(frontendObj, INVENTORY_FIELD_MAP);
    expect(result.category_name).toBe('Cameras');
    expect(result.purchase_date).toBe('2025-01-01');
    expect(result.purchase_price).toBe(2499);
    expect(result.serial_number).toBe('SN-123');
    expect(result.is_kit).toBe(false);
    expect(result.kit_contents).toEqual([]);
    expect(result.view_count).toBe(0);
  });

  it('should handle partial updates (only some fields)', () => {
    const partialUpdate = {
      purchasePrice: 1999,
      condition: 'good',
    };
    const result = toDb(partialUpdate, INVENTORY_FIELD_MAP, { partial: true });
    expect(result.purchase_price).toBe(1999);
    expect(result.condition).toBe('good');
    // Should not include fields that weren't provided
    expect(result).not.toHaveProperty('category_name');
    expect(result).not.toHaveProperty('serial_number');
  });

  it('should handle numeric coercion for inventory fields', () => {
    const frontendObj = {
      purchasePrice: '2499.99',
      currentValue: '2000',
      reorderPoint: '5',
    };
    const result = toDb(frontendObj, INVENTORY_FIELD_MAP, {
      numericFields: { purchasePrice: 0, currentValue: 0, reorderPoint: 0 },
    });
    expect(typeof result.purchase_price).toBe('number');
    expect(result.purchase_price).toBe(2499.99);
    expect(result.current_value).toBe(2000);
    expect(result.reorder_point).toBe(5);
  });

  it('should default numeric fields to specified defaults when empty or null', () => {
    const frontendObj = {
      purchasePrice: '',
      currentValue: null,
    };
    const result = toDb(frontendObj, INVENTORY_FIELD_MAP, {
      numericFields: { purchasePrice: 0, currentValue: 0 },
    });
    // Number('') is 0, Number(null) is 0 — both falsy, so default (0) is used
    expect(result.purchase_price).toBe(0);
    expect(result.current_value).toBe(0);
  });

  it('should skip fields that are undefined in the input object', () => {
    const frontendObj = {
      purchasePrice: 100,
      // reorderPoint is not set at all (undefined)
    };
    const result = toDb(frontendObj, INVENTORY_FIELD_MAP, {
      numericFields: { purchasePrice: 0, reorderPoint: 0 },
    });
    expect(result.purchase_price).toBe(100);
    // reorderPoint was undefined in input, so toDb skips it entirely
    expect(result).not.toHaveProperty('reorder_point');
  });

  it('should convert reservation fields', () => {
    const frontendObj = {
      start: '2025-03-01',
      end: '2025-03-05',
      contactName: 'Jane',
      contactPhone: '555-1234',
      contactEmail: 'jane@test.com',
      clientId: 'client-1',
      projectType: 'Commercial',
    };
    const result = toDb(frontendObj, RESERVATION_FIELD_MAP);
    expect(result.start_date).toBe('2025-03-01');
    expect(result.end_date).toBe('2025-03-05');
    expect(result.contact_name).toBe('Jane');
    expect(result.contact_phone).toBe('555-1234');
    expect(result.contact_email).toBe('jane@test.com');
    expect(result.client_id).toBe('client-1');
    expect(result.project_type).toBe('Commercial');
  });

  it('should handle MAINTENANCE_FIELD_MAP toDb', () => {
    const frontendObj = {
      itemId: 'item-1',
      scheduledDate: '2025-04-01',
      completedDate: null,
      createdByName: 'Technician',
      vendorContact: 'vendor@test.com',
      warrantyWork: true,
    };
    const result = toDb(frontendObj, MAINTENANCE_FIELD_MAP);
    expect(result.item_id).toBe('item-1');
    expect(result.scheduled_date).toBe('2025-04-01');
    expect(result.completed_date).toBeNull();
    expect(result.created_by_name).toBe('Technician');
    expect(result.vendor_contact).toBe('vendor@test.com');
    expect(result.warranty_work).toBe(true);
  });
});

// =============================================================================
// Bidirectional consistency: toDb -> fromDb roundtrip
// =============================================================================

describe('fromDb ↔ toDb roundtrip', () => {
  it('should roundtrip inventory fields (toDb → fromDb)', () => {
    const original = {
      category: 'Cameras',
      purchasePrice: 2499,
      serialNumber: 'SN-123',
      isKit: true,
      kitItems: ['a', 'b'],
      location: 'Shelf A',
      locationId: 'loc-1',
    };
    const dbForm = toDb(original, INVENTORY_FIELD_MAP);
    const roundtripped = fromDb(dbForm, INVENTORY_FIELD_MAP);

    expect(roundtripped.category).toBe(original.category);
    expect(roundtripped.purchasePrice).toBe(original.purchasePrice);
    expect(roundtripped.serialNumber).toBe(original.serialNumber);
    expect(roundtripped.isKit).toBe(original.isKit);
    expect(roundtripped.kitItems).toEqual(original.kitItems);
    expect(roundtripped.location).toBe(original.location);
    expect(roundtripped.locationId).toBe(original.locationId);
  });

  it('should roundtrip reservation fields (toDb → fromDb)', () => {
    const original = {
      start: '2025-03-01',
      end: '2025-03-05',
      contactName: 'Jane',
      contactPhone: '555-1234',
      contactEmail: 'jane@test.com',
      clientId: 'client-1',
      projectType: 'Film',
    };
    const dbForm = toDb(original, RESERVATION_FIELD_MAP);
    const roundtripped = fromDb(dbForm, RESERVATION_FIELD_MAP);

    expect(roundtripped.contactName).toBe(original.contactName);
    expect(roundtripped.contactPhone).toBe(original.contactPhone);
    expect(roundtripped.contactEmail).toBe(original.contactEmail);
    expect(roundtripped.clientId).toBe(original.clientId);
    expect(roundtripped.projectType).toBe(original.projectType);
  });

  it('should roundtrip maintenance fields (toDb → fromDb)', () => {
    const original = {
      itemId: 'item-1',
      scheduledDate: '2025-04-01',
      completedDate: '2025-04-05',
      createdByName: 'Tech',
      vendorContact: 'vendor@co.com',
      warrantyWork: true,
    };
    const dbForm = toDb(original, MAINTENANCE_FIELD_MAP);
    const roundtripped = fromDb(dbForm, MAINTENANCE_FIELD_MAP);

    expect(roundtripped.itemId).toBe(original.itemId);
    expect(roundtripped.scheduledDate).toBe(original.scheduledDate);
    expect(roundtripped.completedDate).toBe(original.completedDate);
    expect(roundtripped.createdByName).toBe(original.createdByName);
    expect(roundtripped.vendorContact).toBe(original.vendorContact);
    expect(roundtripped.warrantyWork).toBe(original.warrantyWork);
  });
});

// =============================================================================
// Field map completeness: verify every map has consistent keys
// =============================================================================

describe('Field map completeness', () => {
  it('INVENTORY_FIELD_MAP should have kitItems → kit_contents mapping', () => {
    expect(INVENTORY_FIELD_MAP.kitItems).toBe('kit_contents');
  });

  it('INVENTORY_FIELD_MAP should have location → location_display', () => {
    expect(INVENTORY_FIELD_MAP.location).toBe('location_display');
  });

  it('MAINTENANCE_FIELD_MAP should have vendorContact → vendor_contact', () => {
    expect(MAINTENANCE_FIELD_MAP.vendorContact).toBe('vendor_contact');
  });

  it('MAINTENANCE_FIELD_MAP should have warrantyWork → warranty_work', () => {
    expect(MAINTENANCE_FIELD_MAP.warrantyWork).toBe('warranty_work');
  });

  it('MAINTENANCE_FIELD_MAP should have createdByName → created_by_name', () => {
    expect(MAINTENANCE_FIELD_MAP.createdByName).toBe('created_by_name');
  });

  it('CHECKOUT_HISTORY_FIELD_MAP should exist and have key mappings', () => {
    expect(CHECKOUT_HISTORY_FIELD_MAP).toBeDefined();
    expect(CHECKOUT_HISTORY_FIELD_MAP.itemId).toBe('item_id');
    expect(CHECKOUT_HISTORY_FIELD_MAP.userId).toBe('user_id');
  });

  it('REMINDER_FIELD_MAP should exist and have key mappings', () => {
    expect(REMINDER_FIELD_MAP).toBeDefined();
    expect(REMINDER_FIELD_MAP.itemId).toBe('item_id');
    expect(REMINDER_FIELD_MAP.dueDate).toBe('due_date');
  });
});
