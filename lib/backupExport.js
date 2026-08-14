// =============================================================================
// Database backup assembly
// Sections map export checkboxes to the COMPLETE set of tables behind them,
// fetched from the server at export time. The old backup serialized React
// memory: lazy tables exported empty, item notes and checkout history never
// exported at all, and the audit log stopped at the 100 rows the UI loads.
// Rows are raw table records (snake_case), version 3.0 — a faithful,
// restore-ready snapshot rather than a UI-state dump.
// =============================================================================

export const BACKUP_SECTIONS = [
  {
    key: 'inventory',
    label: 'Inventory + item history',
    tables: ['inventory', 'item_notes', 'item_reminders', 'maintenance_records', 'checkout_history'],
  },
  { key: 'packages', label: 'Kits & Packages', tables: ['packages', 'package_items', 'package_notes'] },
  { key: 'categories', label: 'Categories & Locations', tables: ['categories', 'locations'] },
  { key: 'specs', label: 'Specifications', tables: ['specs'] },
  {
    key: 'packLists',
    label: 'Pack Lists',
    tables: ['pack_lists', 'pack_list_items', 'pack_list_packages'],
  },
  { key: 'clients', label: 'Clients', tables: ['clients', 'client_notes'] },
  { key: 'reservations', label: 'Reservations (incl. cancelled)', tables: ['reservations'] },
  { key: 'users', label: 'Users & Roles', tables: ['users', 'roles'] },
  { key: 'auditLog', label: 'Audit Log', tables: ['audit_log'] },
];

export const DEFAULT_BACKUP_INCLUDE = Object.fromEntries(
  BACKUP_SECTIONS.map((s) => [s.key, s.key !== 'users' && s.key !== 'auditLog']),
);

/** Tables behind the currently-enabled sections, in section order. */
export const tablesForInclude = (include) =>
  BACKUP_SECTIONS.filter((s) => include[s.key]).flatMap((s) => s.tables);

/**
 * Fetch and assemble the backup object.
 *
 * @param {Object} include - {sectionKey: boolean}
 * @param {Function} fetchAllRows - async (table) => rows (backupService.fetchAllRows)
 * @param {Object} [opts]
 * @param {Function} [opts.onProgress] - (table, done, total) called before each fetch
 * @param {Date} [opts.now] - injectable clock
 */
export async function assembleBackup(include, fetchAllRows, { onProgress, now = new Date() } = {}) {
  const tables = tablesForInclude(include);
  const data = {
    version: '3.0',
    format: 'tables',
    exportedAt: now.toISOString(),
    tables: {},
    counts: {},
  };

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    onProgress?.(table, i, tables.length);
    let rows = await fetchAllRows(table);
    if (table === 'users') {
      // Never let credential-shaped fields ride along, whatever the schema
      rows = rows.map((row) => {
        const cleaned = { ...row };
        delete cleaned.password;
        delete cleaned.password_hash;
        return cleaned;
      });
    }
    data.tables[table] = rows;
    data.counts[table] = rows.length;
  }

  return data;
}
