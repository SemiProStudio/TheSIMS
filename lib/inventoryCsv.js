// ============================================================================
// Inventory CSV columns — the single source for every inventory exporter:
// the Export Data modal + App.exportData, DatabaseExportModal's CSV flavor,
// and reportData.csvForInventory. These three used to hand-roll their own
// column sets, which drifted: quantity/reorderPoint coverage differed per
// exporter, the current-value column shipped as both `value` and
// `currentValue`, and the id column had three header spellings.
//
// Per column:
//   id      — canonical importer field name (camelCase). DatabaseExportModal
//             uses these as headers so its CSV round-trips exactly.
//   label   — human display header (Export Data / report CSVs). Every label
//             AND every id is recognized by HEADER_ALIASES in importItems.js,
//             so all SIMS exports re-import cleanly.
//   value   — getter from a camelCase item object (app state).
//   dbValue — getter from a raw snake_case inventory row (backup fetches).
// ============================================================================

export const INVENTORY_COLUMNS = [
  { id: 'id', label: 'ID', value: (i) => i.id, dbValue: (r) => r.id },
  { id: 'name', label: 'Name', value: (i) => i.name, dbValue: (r) => r.name },
  { id: 'brand', label: 'Brand', value: (i) => i.brand ?? '', dbValue: (r) => r.brand },
  {
    id: 'category',
    label: 'Category',
    value: (i) => i.category ?? '',
    dbValue: (r) => r.category_name,
  },
  { id: 'status', label: 'Status', value: (i) => i.status ?? '', dbValue: (r) => r.status },
  {
    id: 'condition',
    label: 'Condition',
    value: (i) => i.condition ?? '',
    dbValue: (r) => r.condition,
  },
  {
    id: 'location',
    label: 'Location',
    value: (i) => i.location ?? '',
    dbValue: (r) => r.location_display,
  },
  {
    id: 'purchaseDate',
    label: 'Purchase Date',
    value: (i) => i.purchaseDate ?? '',
    dbValue: (r) => r.purchase_date,
  },
  {
    id: 'purchasePrice',
    label: 'Purchase Price',
    value: (i) => i.purchasePrice ?? '',
    dbValue: (r) => r.purchase_price,
  },
  {
    id: 'currentValue',
    label: 'Current Value',
    value: (i) => i.currentValue ?? '',
    dbValue: (r) => r.current_value,
  },
  {
    id: 'serialNumber',
    label: 'Serial #',
    value: (i) => i.serialNumber ?? '',
    dbValue: (r) => r.serial_number,
  },
  // Without these two, an export-then-reimport reset every quantity-tracked
  // item to 1 and dropped reorder points entirely
  { id: 'quantity', label: 'Quantity', value: (i) => i.quantity ?? 1, dbValue: (r) => r.quantity },
  {
    id: 'reorderPoint',
    label: 'Reorder Point',
    value: (i) => i.reorderPoint ?? '',
    dbValue: (r) => r.reorder_point,
  },
];

export const inventoryColumnById = Object.fromEntries(INVENTORY_COLUMNS.map((c) => [c.id, c]));
