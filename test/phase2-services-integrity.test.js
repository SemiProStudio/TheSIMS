// =============================================================================
// Phase 2 regression tests — service-layer data integrity (H9, H10)
//
// These exercise the REAL service functions against a hand-built Supabase fake
// with controllable failures — no universal Proxy that lets wrong table names
// or unchecked errors pass silently.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Controllable fake Supabase client -------------------------------------------

const state = {
  rpcResults: {}, // name -> { data, error }
  rpcCalls: [], // [name, args]
  inserts: [], // [table, row]
  deletes: [], // [table, filterColumn, filterValue]
  insertError: null,
};

function makeFakeSupabase() {
  return {
    rpc: vi.fn((name, args) => {
      state.rpcCalls.push([name, args]);
      const result = state.rpcResults[name] || { data: null, error: null };
      return Promise.resolve(result);
    }),
    from: vi.fn((table) => ({
      insert: (row) => ({
        select: () => ({
          single: () => {
            state.inserts.push([table, row]);
            if (state.insertError) {
              return Promise.resolve({ data: null, error: state.insertError });
            }
            return Promise.resolve({ data: { ...row }, error: null });
          },
        }),
      }),
      update: (row) => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { ...row }, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: (column, value) => {
          state.deletes.push([table, column, value]);
          return Promise.resolve({ error: null });
        },
      }),
    })),
  };
}

vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(() => Promise.resolve(makeFakeSupabase())),
  isDemoMode: false,
  supabase: null,
}));

const { packagesService, packListsService, specsService, reservationsService } = await import(
  '../lib/services.js'
);

beforeEach(() => {
  state.rpcResults = {};
  state.rpcCalls = [];
  state.inserts = [];
  state.deletes = [];
  state.insertError = null;
});

// -----------------------------------------------------------------------------
// H9 — package IDs come from the race-safe server RPC
// -----------------------------------------------------------------------------
describe('packagesService.create — server-side ID generation', () => {
  it('gets the ID from generate_package_id instead of client-side max()', async () => {
    state.rpcResults.generate_package_id = { data: 'PKG-1000', error: null };
    state.rpcResults.sync_package_items = { error: null };

    const result = await packagesService.create({ name: 'Kit', items: ['CAM1'] });

    expect(state.rpcCalls.map(([n]) => n)).toContain('generate_package_id');
    expect(result.id).toBe('PKG-1000');
  });

  it('throws when ID generation fails instead of inserting a bad row', async () => {
    state.rpcResults.generate_package_id = { data: null, error: new Error('RPC down') };

    await expect(packagesService.create({ name: 'Kit' })).rejects.toThrow('RPC down');
    expect(state.inserts).toHaveLength(0);
  });
});

// -----------------------------------------------------------------------------
// H10 — child-row syncs are transactional and checked
// -----------------------------------------------------------------------------
describe('packagesService — transactional item sync', () => {
  it('create syncs items through sync_package_items with ordered ids', async () => {
    state.rpcResults.generate_package_id = { data: 'PKG-001', error: null };
    state.rpcResults.sync_package_items = { error: null };

    await packagesService.create({ name: 'Kit', items: ['CAM1', 'LENS2'] });

    const syncCall = state.rpcCalls.find(([n]) => n === 'sync_package_items');
    expect(syncCall[1]).toEqual({ p_package_id: 'PKG-001', p_item_ids: ['CAM1', 'LENS2'] });
  });

  it('create deletes the package row and throws when the item sync fails', async () => {
    state.rpcResults.generate_package_id = { data: 'PKG-002', error: null };
    state.rpcResults.sync_package_items = { error: new Error('constraint violation') };

    await expect(packagesService.create({ name: 'Kit', items: ['CAM1'] })).rejects.toThrow(
      'constraint violation',
    );

    // Compensating delete — no half-created package left behind
    expect(state.deletes).toContainEqual(['packages', 'id', 'PKG-002']);
  });

  it('update throws when the item sync fails instead of reporting success', async () => {
    state.rpcResults.sync_package_items = { error: new Error('sync failed') };

    await expect(packagesService.update('PKG-001', { items: ['CAM1'] })).rejects.toThrow(
      'sync failed',
    );
  });
});

describe('packListsService — transactional child sync', () => {
  it('update sends items with packed state through sync_pack_list_children', async () => {
    state.rpcResults.sync_pack_list_children = { error: null };

    await packListsService.update('list-1', {
      items: [{ id: 'CAM1', quantity: 2 }, { id: 'LENS2' }],
      packages: ['PKG-001'],
      packedItems: ['CAM1'],
    });

    const syncCall = state.rpcCalls.find(([n]) => n === 'sync_pack_list_children');
    expect(syncCall[1]).toEqual({
      p_pack_list_id: 'list-1',
      p_items: [
        { id: 'CAM1', quantity: 2, is_packed: true },
        { id: 'LENS2', quantity: 1, is_packed: false },
      ],
      p_package_ids: ['PKG-001'],
    });
  });

  it('update passes null for sides that were not provided (leave untouched)', async () => {
    state.rpcResults.sync_pack_list_children = { error: null };

    await packListsService.update('list-1', { packages: ['PKG-001'] });

    const syncCall = state.rpcCalls.find(([n]) => n === 'sync_pack_list_children');
    expect(syncCall[1].p_items).toBeNull();
    expect(syncCall[1].p_package_ids).toEqual(['PKG-001']);
  });

  it('update throws when the sync fails instead of silently emptying the list', async () => {
    state.rpcResults.sync_pack_list_children = { error: new Error('insert failed') };

    await expect(packListsService.update('list-1', { items: [{ id: 'CAM1' }] })).rejects.toThrow(
      'insert failed',
    );
  });

  it('create deletes the pack list row and throws when the child sync fails', async () => {
    state.rpcResults.sync_pack_list_children = { error: new Error('boom') };

    await expect(
      packListsService.create({ id: 'list-9', name: 'Shoot', items: [{ id: 'CAM1' }] }),
    ).rejects.toThrow('boom');

    expect(state.deletes).toContainEqual(['pack_lists', 'id', 'list-9']);
  });
});

// -----------------------------------------------------------------------------
// Regression: reservationsService.create receives the DB-shaped row
// (start_date/end_date/contact_name). It used to re-validate that object with
// the FRONTEND-shape validator (start/end/user), so every insert failed with
// "Start date is required, End date is required, Borrower name is required" —
// swallowed upstream, ghost-injected locally, and lost on reload.
// -----------------------------------------------------------------------------
describe('reservationsService.create — accepts DB-shaped rows', () => {
  it('inserts a DB-shaped reservation without frontend-shape validation errors', async () => {
    const dbRow = {
      item_id: 'CAM001',
      project: 'Shoot',
      project_type: 'Other',
      start_date: '2099-01-01',
      end_date: '2099-01-03',
      status: 'confirmed',
      contact_name: 'Client A',
      notes: [],
    };

    const result = await reservationsService.create(dbRow);

    expect(state.inserts).toContainEqual(['reservations', dbRow]);
    expect(result.project).toBe('Shoot');
  });
});

describe('specsService.upsert — transactional replace', () => {
  it('replaces specs through the replace_specs RPC', async () => {
    state.rpcResults.replace_specs = { error: null };

    await specsService.upsert('Cameras', [{ name: 'Sensor', required: true }, { name: 'Mount' }]);

    const call = state.rpcCalls.find(([n]) => n === 'replace_specs');
    expect(call[1]).toEqual({
      p_category: 'Cameras',
      p_specs: [
        { name: 'Sensor', required: true },
        { name: 'Mount', required: false },
      ],
    });
  });

  it('throws when the replace fails instead of leaving specs deleted', async () => {
    state.rpcResults.replace_specs = { error: new Error('nope') };

    await expect(specsService.upsert('Cameras', [{ name: 'Sensor' }])).rejects.toThrow('nope');
  });
});
