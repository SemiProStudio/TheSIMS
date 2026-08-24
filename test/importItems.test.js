// =============================================================================
// CSV import assembly + execution
// - header aliases: every SIMS export flavor round-trips (labeled headers
//   included — "Serial #" used to be silently dropped)
// - status/condition are validated and normalized, not stored verbatim
// - runImport persists sequentially with ACCUMULATED ids (no batch
//   collisions) and reports failures honestly
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { canonicalizeHeaders, buildImportItems, runImport } from '../lib/importItems.js';

const CATEGORIES = ['Cameras', 'Lenses', 'Lighting'];

const build = (headers, rows, opts = {}) =>
  buildImportItems({ headers, rows }, { categories: CATEGORIES, ...opts });

describe('canonicalizeHeaders', () => {
  it('recognizes camelCase, spaced, and labeled spellings', () => {
    const { fields, unknown } = canonicalizeHeaders([
      'Name',
      'Serial #',
      'Purchase Price',
      'Current Value',
      'purchaseDate',
      'value',
      'spec:Sensor Size',
      'Mystery Column',
    ]);
    expect(fields).toEqual([
      'name',
      'serialNumber',
      'purchasePrice',
      'currentValue',
      'purchaseDate',
      'currentValue',
      'spec:Sensor Size',
      null,
    ]);
    expect(unknown).toEqual(['Mystery Column']);
  });

  it('keeps the legacy "Item ID" alias alongside the canonical "ID"', () => {
    // Report exports now emit "ID" (shared INVENTORY_COLUMNS label), but
    // files exported before the §5.10 consolidation say "Item ID"
    const { fields, unknown } = canonicalizeHeaders(['Item ID', 'ID', 'id']);
    expect(fields).toEqual(['id', 'id', 'id']);
    expect(unknown).toEqual([]);
  });
});

describe('buildImportItems', () => {
  it('builds items with defaults and warns about ignored columns', () => {
    const { items, errors, warnings } = build(
      ['name', 'category', 'bogus'],
      [['Cam', 'Cameras', 'x']],
    );
    expect(errors).toEqual([]);
    expect(warnings).toEqual(['Ignored unrecognized column: bogus']);
    expect(items[0]).toMatchObject({
      name: 'Cam',
      category: 'Cameras',
      status: 'available',
      condition: 'excellent',
      quantity: 1,
    });
  });

  it('matches categories case-insensitively and rejects unknown ones', () => {
    const { items, errors } = build(
      ['name', 'category'],
      [
        ['Item A', 'cameras'],
        ['Item B', 'Snacks'],
      ],
    );
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('Cameras');
    expect(errors).toEqual(['Row 3: Unknown category "Snacks"']);
  });

  it('normalizes status/condition case and separators, rejects invalid values', () => {
    const { items, errors } = build(
      ['name', 'category', 'status', 'condition'],
      [
        ['Item A', 'Cameras', 'Available', 'Good'],
        ['Item B', 'Cameras', 'Checked Out', 'EXCELLENT'],
        ['Item C', 'Cameras', 'broken', ''],
        ['Item D', 'Cameras', '', 'mint'],
      ],
    );
    expect(items.map((i) => i.status)).toEqual(['available', 'checked-out']);
    expect(items[1].condition).toBe('excellent');
    expect(errors).toEqual([
      'Row 4: Invalid status "broken"',
      'Row 5: Invalid condition "mint"',
    ]);
  });

  it('never stores derived statuses', () => {
    const { errors } = build(['name', 'category', 'status'], [['Item A', 'Cameras', 'overdue']]);
    expect(errors).toEqual(['Row 2: Invalid status "overdue"']);
  });

  it('normalizes parseable dates with a warning and drops garbage', () => {
    const { items, warnings } = build(
      ['name', 'category', 'purchaseDate'],
      [
        ['Item A', 'Cameras', '2023-06-15'],
        ['Item B', 'Cameras', 'June 15, 2023'],
        ['Item C', 'Cameras', 'not a date'],
      ],
    );
    expect(items[0].purchaseDate).toBe('2023-06-15');
    expect(items[1].purchaseDate).toBe('2023-06-15');
    expect(items[2].purchaseDate).toBe('');
    expect(warnings.some((w) => w.includes('read as 2023-06-15'))).toBe(true);
    expect(warnings.some((w) => w.includes('unreadable purchase date'))).toBe(true);
  });

  it('parses currency-formatted prices and warns on garbage', () => {
    const { items, warnings } = build(
      ['name', 'category', 'Purchase Price', 'Current Value'],
      [['Item A', 'Cameras', '$3,498', 'lots']],
    );
    expect(items[0].purchasePrice).toBe(3498);
    expect(items[0].currentValue).toBe(0);
    expect(warnings.some((w) => w.includes('Unreadable current value'))).toBe(true);
  });

  // Preflight must mirror validateItem's blocking rules — a row that passes
  // preflight but throws at persist time strands a partial batch behind it
  it('blocks names outside the 2-100 character persist rule', () => {
    const { items, errors } = build(
      ['name', 'category'],
      [
        ['X', 'Cameras'],
        ['A'.repeat(101), 'Cameras'],
        ['OK Camera', 'Cameras'],
      ],
    );
    expect(errors).toEqual([
      'Row 2: Name must be between 2 and 100 characters',
      'Row 3: Name must be between 2 and 100 characters',
    ]);
    expect(items).toHaveLength(1);
  });

  it('blocks negative prices and out-of-range current values', () => {
    const { items, errors } = build(
      ['name', 'category', 'purchasePrice', 'currentValue'],
      [
        ['Cam A', 'Cameras', '-500', '100'],
        ['Cam B', 'Cameras', '500', '-100'],
        ['Cam C', 'Cameras', '500', '99999999'],
        ['Cam D', 'Cameras', '500', '400'],
      ],
    );
    expect(errors).toEqual([
      'Row 2: Purchase price cannot be negative',
      'Row 3: Current value cannot be negative',
      'Row 4: Current value exceeds maximum allowed',
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Cam D');
  });

  it('normalizes non-ISO dates from LOCAL components — no UTC day shift', () => {
    const prevTZ = process.env.TZ;
    // UTC+14: local midnight is the previous day in UTC, the worst case for
    // the old toISOString() normalization
    process.env.TZ = 'Pacific/Kiritimati';
    try {
      const probe = new Date('6/15/2023');
      if (probe.getTimezoneOffset() !== -840) {
        // Runtime ignored the mid-process TZ change — the shift can't be
        // exercised here; the darwin/linux runners we use do honor it.
        return;
      }
      const { items, warnings } = build(
        ['name', 'category', 'purchaseDate'],
        [['Cam', 'Cameras', '6/15/2023']],
      );
      expect(items[0].purchaseDate).toBe('2023-06-15');
      expect(warnings).toContain('Row 2: Purchase date "6/15/2023" read as 2023-06-15');
    } finally {
      if (prevTZ === undefined) delete process.env.TZ;
      else process.env.TZ = prevTZ;
    }
  });

  it('strips the export formula guard from values', () => {
    const { items } = build(['name', 'category', 'notes'], [["'=A1", 'Cameras', "'-note"]]);
    expect(items[0].name).toBe('=A1');
    expect(items[0].importNote).toBe('-note');
  });

  it('warns on duplicate serials within the batch and against inventory', () => {
    const { warnings } = build(
      ['name', 'category', 'serialNumber'],
      [
        ['Item A', 'Cameras', 'SN-1'],
        ['Item B', 'Cameras', 'sn-1'],
        ['Item C', 'Cameras', 'SN-EXISTING'],
      ],
      { existingSerials: ['SN-existing'] },
    );
    expect(warnings.filter((w) => w.includes('Duplicate serial'))).toHaveLength(2);
  });

  it('collects specs columns and the note text', () => {
    const { items } = build(
      ['name', 'category', 'spec:Mount', 'notes'],
      [['Item A', 'Lenses', 'RF', 'imported note']],
    );
    expect(items[0].specs).toEqual({ Mount: 'RF' });
    expect(items[0].importNote).toBe('imported note');
  });

  it('throws when name or category columns are missing entirely', () => {
    expect(() => build(['brand'], [['Sony']])).toThrow(/Missing required columns: name, category/);
  });
});

describe('runImport', () => {
  const baseItems = [
    { name: 'A', category: 'Cameras', importNote: '' },
    { name: 'B', category: 'Cameras', importNote: 'hello' },
    { name: 'C', category: 'Cameras', importNote: '' },
  ];

  it('accumulates generated ids across the batch — no shared-snapshot collisions', async () => {
    const seenIdLists = [];
    const generateCode = vi.fn((category, usedIds) => {
      seenIdLists.push([...usedIds]);
      return `CA${1000 + usedIds.length}`;
    });
    const createItem = vi.fn(async (item) => item);

    const result = await runImport({
      items: baseItems,
      existingIds: ['CA1000'],
      createItem,
      addNote: vi.fn(async () => ({ id: 'n1' })),
      generateCode,
    });

    expect(result.created.map((i) => i.id)).toEqual(['CA1001', 'CA1002', 'CA1003']);
    // Each call saw the ids generated before it
    expect(seenIdLists[1]).toContain('CA1001');
    expect(seenIdLists[2]).toContain('CA1002');
  });

  it('collects per-row failures without aborting the batch', async () => {
    const createItem = vi.fn(async (item) => {
      if (item.name === 'B') throw new Error('rls denied');
      return item;
    });
    const result = await runImport({
      items: baseItems,
      existingIds: [],
      createItem,
      addNote: vi.fn(async () => ({ id: 'n1' })),
      generateCode: (c, used) => `CA${used.length}`,
    });
    expect(result.created.map((i) => i.name)).toEqual(['A', 'C']);
    expect(result.failed).toEqual([{ name: 'B', error: 'rls denied' }]);
  });

  it('writes notes through addNote after create and counts note failures', async () => {
    const addNote = vi.fn(async () => null); // note write fails
    const result = await runImport({
      items: baseItems,
      existingIds: [],
      createItem: vi.fn(async (item) => item),
      addNote,
      generateCode: (c, used) => `CA${used.length}`,
    });
    expect(addNote).toHaveBeenCalledTimes(1); // only item B has a note
    expect(addNote).toHaveBeenCalledWith('CA1', { user: 'Import', text: 'hello' });
    expect(result.noteFailures).toBe(1);
  });

  it('strips importNote from the created item payload and reports progress', async () => {
    const createItem = vi.fn(async (item) => item);
    const onProgress = vi.fn();
    await runImport({
      items: baseItems,
      existingIds: [],
      createItem,
      addNote: vi.fn(async () => ({})),
      generateCode: (c, used) => `CA${used.length}`,
      onProgress,
    });
    expect(createItem.mock.calls[0][0]).not.toHaveProperty('importNote');
    expect(createItem.mock.calls[0][0]).toMatchObject({ image: null });
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenLastCalledWith(3, 3);
  });
});
