// =============================================================================
// Database backup assembly — complete tables, fetched at export time
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  BACKUP_SECTIONS,
  DEFAULT_BACKUP_INCLUDE,
  tablesForInclude,
  assembleBackup,
} from '../lib/backupExport.js';

describe('sections', () => {
  it('inventory section carries the item-history tables the old backup lost', () => {
    const inventory = BACKUP_SECTIONS.find((s) => s.key === 'inventory');
    expect(inventory.tables).toEqual(
      expect.arrayContaining(['item_notes', 'maintenance_records', 'checkout_history']),
    );
  });

  it('defaults include data sections but not users/audit/email log', () => {
    expect(DEFAULT_BACKUP_INCLUDE.inventory).toBe(true);
    expect(DEFAULT_BACKUP_INCLUDE.clients).toBe(true);
    expect(DEFAULT_BACKUP_INCLUDE.notifications).toBe(true);
    expect(DEFAULT_BACKUP_INCLUDE.users).toBe(false);
    expect(DEFAULT_BACKUP_INCLUDE.auditLog).toBe(false);
    expect(DEFAULT_BACKUP_INCLUDE.emailLog).toBe(false);
  });

  it('specs section carries the Smart Paste learning data (2026-08-24 audit §3.5)', () => {
    const specs = BACKUP_SECTIONS.find((s) => s.key === 'specs');
    expect(specs.tables).toEqual(['specs', 'smart_paste_aliases']);
    const notifications = BACKUP_SECTIONS.find((s) => s.key === 'notifications');
    expect(notifications.tables).toEqual(['email_templates']);
  });

  it('tablesForInclude flattens only enabled sections', () => {
    expect(tablesForInclude({ specs: true, clients: true })).toEqual([
      'specs',
      'smart_paste_aliases',
      'clients',
      'client_notes',
    ]);
  });
});

describe('assembleBackup', () => {
  const fixtures = {
    specs: [{ id: 's1' }],
    clients: [{ id: 'CL001', name: 'Acme' }],
    client_notes: [{ id: 'n1' }, { id: 'n2' }],
    users: [{ id: 'u1', email: 'a@b.c', password: 'nope', password_hash: 'nope' }],
    roles: [{ id: 'role_admin' }],
  };
  const fetchAllRows = vi.fn(async (table) => fixtures[table] || []);

  it('fetches every table behind the enabled sections and counts rows', async () => {
    const data = await assembleBackup({ specs: true, clients: true }, fetchAllRows, {
      now: new Date(Date.UTC(2026, 7, 14, 12)),
    });
    expect(data.version).toBe('3.0');
    expect(data.format).toBe('tables');
    expect(data.exportedAt).toBe('2026-08-14T12:00:00.000Z');
    expect(Object.keys(data.tables)).toEqual([
      'specs',
      'smart_paste_aliases',
      'clients',
      'client_notes',
    ]);
    expect(data.counts).toEqual({ specs: 1, smart_paste_aliases: 0, clients: 1, client_notes: 2 });
  });

  it('strips credential-shaped fields from users no matter the schema', async () => {
    const data = await assembleBackup({ users: true }, fetchAllRows);
    expect(data.tables.users[0]).toEqual({ id: 'u1', email: 'a@b.c' });
    expect(data.tables.roles).toEqual([{ id: 'role_admin' }]);
  });

  it('reports per-table progress', async () => {
    const onProgress = vi.fn();
    await assembleBackup({ clients: true }, fetchAllRows, { onProgress });
    expect(onProgress).toHaveBeenCalledWith('clients', 0, 2);
    expect(onProgress).toHaveBeenCalledWith('client_notes', 1, 2);
  });

  it('propagates fetch failures instead of downloading a partial file', async () => {
    const failing = vi.fn(async () => {
      throw new Error('network down');
    });
    await expect(assembleBackup({ specs: true }, failing)).rejects.toThrow('network down');
  });
});
