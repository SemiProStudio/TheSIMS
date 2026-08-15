// =============================================================================
// Shared inventory CSV column definition (deferred-hardening round, PIPE-4)
// Three exporters used to carry hand-rolled column sets that drifted (three
// id-header spellings, value vs currentValue, missing reorderPoint). This
// pins the consolidation contract: every exporter derives from
// INVENTORY_COLUMNS, and every header spelling an exporter can emit — the
// display label AND the camelCase id — round-trips through the importer.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { INVENTORY_COLUMNS, inventoryColumnById } from '../lib/inventoryCsv.js';
import { canonicalizeHeaders } from '../lib/importItems.js';
import { csvForInventory } from '../lib/reportData.js';

describe('INVENTORY_COLUMNS', () => {
  it('every id and every label is recognized by the importer', () => {
    const ids = INVENTORY_COLUMNS.map((c) => c.id);
    const labels = INVENTORY_COLUMNS.map((c) => c.label);

    const idResult = canonicalizeHeaders(ids);
    expect(idResult.unknown).toEqual([]);
    expect(idResult.fields).toEqual(ids);

    const labelResult = canonicalizeHeaders(labels);
    expect(labelResult.unknown).toEqual([]);
    // Labels canonicalize back to the column's own id — the round-trip
    expect(labelResult.fields).toEqual(ids);
  });

  it('value getters read camelCase items with honest defaults', () => {
    const item = { id: 'CAM001', name: 'Camera' };
    expect(inventoryColumnById.currentValue.value({ currentValue: 1200 })).toBe(1200);
    expect(inventoryColumnById.currentValue.value(item)).toBe('');
    expect(inventoryColumnById.quantity.value(item)).toBe(1); // DB default
    expect(inventoryColumnById.reorderPoint.value(item)).toBe('');
  });

  it('dbValue getters read raw snake_case rows', () => {
    const row = {
      id: 'CAM001',
      category_name: 'Cameras',
      location_display: 'Shelf A',
      purchase_date: '2026-01-02',
      purchase_price: 100,
      current_value: 80,
      serial_number: 'SN1',
      reorder_point: 2,
    };
    expect(inventoryColumnById.category.dbValue(row)).toBe('Cameras');
    expect(inventoryColumnById.location.dbValue(row)).toBe('Shelf A');
    expect(inventoryColumnById.currentValue.dbValue(row)).toBe(80);
    expect(inventoryColumnById.reorderPoint.dbValue(row)).toBe(2);
  });
});

describe('csvForInventory derives from the shared definition', () => {
  it('headers are the shared labels and rows include reorderPoint', () => {
    const { headers, rows } = csvForInventory([
      { id: 'CAM001', name: 'Camera', quantity: 3, reorderPoint: 1, currentValue: 500 },
    ]);
    expect(headers).toEqual(INVENTORY_COLUMNS.map((c) => c.label));
    expect(headers).toContain('Reorder Point');
    const row = rows[0];
    expect(row[headers.indexOf('ID')]).toBe('CAM001');
    expect(row[headers.indexOf('Quantity')]).toBe(3);
    expect(row[headers.indexOf('Reorder Point')]).toBe(1);
    expect(row[headers.indexOf('Current Value')]).toBe(500);
  });
});
