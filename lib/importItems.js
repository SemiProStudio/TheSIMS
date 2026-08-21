// =============================================================================
// CSV import assembly + execution
// Pure assembly (buildImportItems) turns parsed CSV records into validated
// item payloads with row-level errors and non-blocking warnings; runImport
// persists them SEQUENTIALLY through the real create path — the old handler
// patched local React state and imported items vanished on reload.
// =============================================================================

import { parseMoney, stripFormulaGuard } from './csv.js';

// Storable stored-status values — 'overdue' and 'low-stock' are derived
// states and must never be written into inventory.status
const STORABLE_STATUSES = ['available', 'checked-out', 'reserved', 'needs-attention', 'missing'];
const CONDITIONS = ['excellent', 'good', 'fair', 'poor'];

// Canonical import fields ← every header spelling our own exporters produce
// (camelCase template/database CSV AND the labeled inventory export), so any
// SIMS export round-trips through the importer.
const HEADER_ALIASES = {
  id: 'id',
  name: 'name',
  brand: 'brand',
  category: 'category',
  status: 'status',
  condition: 'condition',
  location: 'location',
  notes: 'notes',
  quantity: 'quantity',
  purchasedate: 'purchaseDate',
  'purchase date': 'purchaseDate',
  purchaseprice: 'purchasePrice',
  'purchase price': 'purchasePrice',
  'purchase $': 'purchasePrice',
  currentvalue: 'currentValue',
  'current value': 'currentValue',
  value: 'currentValue',
  serialnumber: 'serialNumber',
  'serial number': 'serialNumber',
  'serial #': 'serialNumber',
  serial: 'serialNumber',
  // Report exporters label the id column "Item ID"
  'item id': 'id',
  reorderpoint: 'reorderPoint',
  'reorder point': 'reorderPoint',
  lowstockalert: 'lowStockAlert',
  'low stock alert': 'lowStockAlert',
  'low stock reminder': 'lowStockAlert',
};

/**
 * Map raw CSV headers to canonical field names.
 * Returns {fields, unknown}: fields[i] is the canonical name, a
 * 'spec:<Name>' passthrough, or null for unrecognized columns.
 */
export function canonicalizeHeaders(headers) {
  const unknown = [];
  const fields = headers.map((raw) => {
    const header = String(raw).trim();
    if (header.toLowerCase().startsWith('spec:')) {
      return `spec:${header.slice(5).trim()}`;
    }
    const canonical = HEADER_ALIASES[header.toLowerCase().replace(/\s+/g, ' ')];
    if (!canonical) {
      unknown.push(header);
      return null;
    }
    return canonical;
  });
  return { fields, unknown };
}

const normalizeToken = (value) => value.trim().toLowerCase().replace(/[\s_]+/g, '-');

/**
 * Build validated item payloads from parsed CSV records.
 *
 * Errors BLOCK the import (wrong category, invalid status — importing them
 * would corrupt filters); warnings don't (normalized dates, unparseable
 * prices, duplicate serials, ignored columns).
 *
 * @returns {{ items, errors, warnings }}
 */
export function buildImportItems(
  { headers, rows },
  { categories = [], existingSerials = [] } = {},
) {
  const { fields, unknown } = canonicalizeHeaders(headers);
  const errors = [];
  const warnings = [];
  if (unknown.length > 0) {
    warnings.push(`Ignored unrecognized column${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}`);
  }
  if (!fields.includes('name') || !fields.includes('category')) {
    const missing = ['name', 'category'].filter((f) => !fields.includes(f));
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  // The id column is intentionally ignored: imported items always get
  // fresh ids, so re-importing a backup CSV DUPLICATES rows rather than
  // restoring them — say so instead of silently dropping the column
  if (fields.includes('id')) {
    warnings.push('Ignored id column — imported items are created with new ids');
  }

  const categoryMap = Object.fromEntries(categories.map((cat) => [cat.toLowerCase(), cat]));
  const seenSerials = new Set(
    existingSerials.filter(Boolean).map((s) => String(s).trim().toLowerCase()),
  );

  const items = [];
  rows.forEach((values, rowIdx) => {
    const rowNum = rowIdx + 2; // 1-based + header row
    const row = {};
    fields.forEach((field, i) => {
      if (field) row[field] = stripFormulaGuard(values[i] ?? '');
    });

    const name = (row.name || '').trim();
    if (!name) {
      errors.push(`Row ${rowNum}: Missing name`);
      return;
    }
    // Mirror the persist-time rule (validateItem): a row that passes preflight
    // but throws mid-batch strands a partial import behind it
    if (name.length < 2 || name.length > 100) {
      errors.push(`Row ${rowNum}: Name must be between 2 and 100 characters`);
      return;
    }
    const rawCategory = (row.category || '').trim();
    if (!rawCategory) {
      errors.push(`Row ${rowNum}: Missing category`);
      return;
    }
    const category = categoryMap[rawCategory.toLowerCase()];
    if (!category) {
      errors.push(`Row ${rowNum}: Unknown category "${rawCategory}"`);
      return;
    }

    // Status/condition: normalize case and separators, reject the invalid
    // rather than silently storing values no filter will ever match
    let status = 'available';
    if ((row.status || '').trim()) {
      status = normalizeToken(row.status);
      if (!STORABLE_STATUSES.includes(status)) {
        errors.push(`Row ${rowNum}: Invalid status "${row.status.trim()}"`);
        return;
      }
    }
    let condition = 'excellent';
    if ((row.condition || '').trim()) {
      condition = normalizeToken(row.condition);
      if (!CONDITIONS.includes(condition)) {
        errors.push(`Row ${rowNum}: Invalid condition "${row.condition.trim()}"`);
        return;
      }
    }

    // Dates: pass ISO through; normalize parseable formats; drop garbage.
    // Format from LOCAL components — new Date('6/15/2023') is local midnight,
    // and toISOString() would shift it to the previous day anywhere east of
    // UTC (the exact bug parseLocalDate/getTodayISO exist to prevent).
    let purchaseDate = (row.purchaseDate || '').trim();
    if (purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
      const parsed = new Date(purchaseDate);
      if (Number.isNaN(parsed.getTime())) {
        warnings.push(`Row ${rowNum}: Ignored unreadable purchase date "${purchaseDate}"`);
        purchaseDate = '';
      } else {
        const normalized = [
          parsed.getFullYear(),
          String(parsed.getMonth() + 1).padStart(2, '0'),
          String(parsed.getDate()).padStart(2, '0'),
        ].join('-');
        warnings.push(`Row ${rowNum}: Purchase date "${purchaseDate}" read as ${normalized}`);
        purchaseDate = normalized;
      }
    }

    const price = parseMoney(row.purchasePrice);
    if (!price.ok) warnings.push(`Row ${rowNum}: Unreadable purchase price "${row.purchasePrice}"`);
    // Negative money is a persist-time rejection (validateItem) — block it
    // here so it can't strand a partial batch
    if (price.ok && price.value < 0) {
      errors.push(`Row ${rowNum}: Purchase price cannot be negative`);
      return;
    }
    const value = parseMoney(row.currentValue);
    if (!value.ok) warnings.push(`Row ${rowNum}: Unreadable current value "${row.currentValue}"`);
    if (value.ok && (value.value < 0 || value.value > 10000000)) {
      errors.push(
        `Row ${rowNum}: Current value ${value.value < 0 ? 'cannot be negative' : 'exceeds maximum allowed'}`,
      );
      return;
    }

    let reorderPoint = 0;
    if ((row.reorderPoint || '').trim()) {
      const parsedRp = parseInt(row.reorderPoint, 10);
      if (Number.isNaN(parsedRp) || parsedRp < 0) {
        warnings.push(`Row ${rowNum}: Ignored invalid reorder point "${row.reorderPoint.trim()}"`);
      } else {
        reorderPoint = parsedRp;
      }
    }

    let quantity = 1;
    if ((row.quantity || '').trim()) {
      const parsedQty = parseInt(row.quantity, 10);
      if (Number.isNaN(parsedQty) || parsedQty < 1) {
        warnings.push(`Row ${rowNum}: Ignored invalid quantity "${row.quantity.trim()}"`);
      } else {
        quantity = parsedQty;
      }
    }

    // Per-item low-stock reminder — off unless the cell says so
    const lowStockAlert = /^(yes|y|true|1|on)$/i.test((row.lowStockAlert || '').trim());

    const serialNumber = (row.serialNumber || '').trim();
    if (serialNumber) {
      const key = serialNumber.toLowerCase();
      if (seenSerials.has(key)) {
        warnings.push(`Row ${rowNum}: Duplicate serial number "${serialNumber}"`);
      }
      seenSerials.add(key);
    }

    const specs = {};
    fields.forEach((field) => {
      if (field?.startsWith('spec:')) {
        const specValue = (row[field] || '').trim();
        if (specValue) specs[field.slice(5)] = specValue;
      }
    });

    items.push({
      name,
      brand: (row.brand || '').trim(),
      category,
      status,
      condition,
      location: (row.location || '').trim(),
      purchaseDate,
      purchasePrice: price.value,
      currentValue: value.value,
      serialNumber,
      quantity,
      reorderPoint,
      lowStockAlert,
      specs,
      reservations: [],
      reminders: [],
      viewCount: 0,
      checkoutCount: 0,
      // Consumed by runImport (written to item_notes AFTER the item exists —
      // notes live in their own table, not on the inventory row)
      importNote: (row.notes || '').trim(),
    });
  });

  return { items, errors, warnings };
}

/**
 * Persist built items through the REAL create path, sequentially.
 * - ids accumulate across the batch, so two rows can't collide the way the
 *   old handler's shared pre-import snapshot allowed
 * - per-row failures are collected, not thrown — the summary is honest
 * - notes are written via addNote after each create
 *
 * @param {Object} deps
 * @param {Array}  deps.items - Output of buildImportItems
 * @param {string[]} deps.existingIds - Current inventory ids
 * @param {Function} deps.createItem - async (item) => created row (throws on failure)
 * @param {Function} deps.addNote - async (itemId, {user, text}) => row | null
 * @param {Function} deps.generateCode - (category, usedIds) => new id
 * @param {Function} [deps.onProgress] - (done, total) => void
 * @returns {{created: Array, failed: Array<{name, error}>, noteFailures: number}}
 */
export async function runImport({
  items,
  existingIds,
  createItem,
  addNote,
  generateCode,
  onProgress,
}) {
  const usedIds = [...existingIds];
  const created = [];
  const failed = [];
  let noteFailures = 0;

  for (let i = 0; i < items.length; i++) {
    const { importNote, ...item } = items[i];
    const id = generateCode(item.category, usedIds);
    usedIds.push(id);
    try {
      const row = await createItem({ ...item, id, image: null });
      created.push(row);
      if (importNote) {
        const note = await addNote(row.id, { user: 'Import', text: importNote });
        if (!note) noteFailures++;
      }
    } catch (err) {
      failed.push({ name: item.name, error: err?.message || 'Create failed' });
    }
    onProgress?.(i + 1, items.length);
  }

  return { created, failed, noteFailures };
}
