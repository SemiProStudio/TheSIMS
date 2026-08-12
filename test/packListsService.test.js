// =============================================================================
// packListsService — freshness watermark + created-by mapping
// get_data_freshness watermarks MAX(pack_lists.updated_at), which only moves
// when the PARENT row is written. These tests pin that child-only writes
// (packed toggles, children-only syncs) touch the parent row, and that the
// touch failing never fails the primary write.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

const { packListsService } = await import('../lib/services.js');

// Recording mock: every from(table) call is logged with the first chained
// method and its args; the chain resolves to the table's configured result.
function makeRecordingClient(results = {}) {
  const calls = [];
  const client = {
    from: vi.fn((table) => {
      const entry = { table, method: null, args: null };
      calls.push(entry);
      const result = results[table] || { data: {}, error: null };
      const handler = {
        get(_, prop) {
          if (prop === 'then') {
            const p = Promise.resolve(result);
            return p.then.bind(p);
          }
          if (prop === 'single') return () => Promise.resolve(result);
          return (...args) => {
            if (!entry.method) {
              entry.method = prop;
              entry.args = args;
            }
            return new Proxy({}, handler);
          };
        },
      };
      return new Proxy({}, handler);
    }),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };
  return { client, calls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toggleItemPacked', () => {
  it('updates the child row AND touches the parent updated_at', async () => {
    const { client, calls } = makeRecordingClient({
      pack_list_items: { data: { item_id: 'CAM1', is_packed: true }, error: null },
    });
    getSupabase.mockResolvedValue(client);

    const result = await packListsService.toggleItemPacked('PL1', 'CAM1', true);

    expect(result).toEqual({ item_id: 'CAM1', is_packed: true });
    const itemCall = calls.find((c) => c.table === 'pack_list_items');
    expect(itemCall.method).toBe('update');
    expect(itemCall.args[0]).toEqual({ is_packed: true });

    const touchCall = calls.find((c) => c.table === 'pack_lists');
    expect(touchCall).toBeTruthy();
    expect(touchCall.method).toBe('update');
    expect(touchCall.args[0]).toHaveProperty('updated_at');
  });

  it('still resolves when the watermark touch fails (non-fatal)', async () => {
    const { client } = makeRecordingClient({
      pack_list_items: { data: { item_id: 'CAM1', is_packed: true }, error: null },
      pack_lists: { data: null, error: { message: 'rls denied' } },
    });
    getSupabase.mockResolvedValue(client);

    await expect(packListsService.toggleItemPacked('PL1', 'CAM1', true)).resolves.toEqual({
      item_id: 'CAM1',
      is_packed: true,
    });
  });

  it('throws when the child update itself fails', async () => {
    const { client } = makeRecordingClient({
      pack_list_items: { data: null, error: { message: 'nope' } },
    });
    getSupabase.mockResolvedValue(client);

    await expect(packListsService.toggleItemPacked('PL1', 'CAM1', true)).rejects.toBeTruthy();
  });
});

describe('update', () => {
  it('children-only updates touch the parent so the watermark moves', async () => {
    const { client, calls } = makeRecordingClient();
    getSupabase.mockResolvedValue(client);

    await packListsService.update('PL1', {
      items: [{ id: 'CAM1', quantity: 1 }],
      packages: [],
      packedItems: [],
    });

    expect(client.rpc).toHaveBeenCalledWith(
      'sync_pack_list_children',
      expect.objectContaining({ p_pack_list_id: 'PL1' }),
    );
    const touch = calls.find((c) => c.table === 'pack_lists');
    expect(touch).toBeTruthy();
    expect(touch.method).toBe('update');
    expect(touch.args[0]).toHaveProperty('updated_at');
  });

  it('does not double-touch when the parent row was already updated', async () => {
    const { client, calls } = makeRecordingClient();
    getSupabase.mockResolvedValue(client);

    await packListsService.update('PL1', {
      name: 'Renamed',
      items: [{ id: 'CAM1', quantity: 1 }],
      packages: [],
      packedItems: [],
    });

    const parentWrites = calls.filter((c) => c.table === 'pack_lists');
    expect(parentWrites).toHaveLength(1);
    expect(parentWrites[0].args[0]).toEqual({ name: 'Renamed' });
  });
});

describe('created-by mapping', () => {
  it('create passes created_by_* through and maps createdByName back', async () => {
    const inserted = {
      id: 'PL9',
      name: 'New',
      created_at: '2026-08-12T00:00:00Z',
      created_by_id: 'u1',
      created_by_name: 'Pat',
    };
    const { client, calls } = makeRecordingClient({
      pack_lists: { data: inserted, error: null },
    });
    getSupabase.mockResolvedValue(client);

    const result = await packListsService.create({
      name: 'New',
      created_by_id: 'u1',
      created_by_name: 'Pat',
      createdByName: 'Pat', // camel duplicate must be stripped before insert
      items: [],
      packages: [],
    });

    const insertCall = calls.find((c) => c.table === 'pack_lists');
    expect(insertCall.method).toBe('insert');
    expect(insertCall.args[0]).not.toHaveProperty('createdByName');
    expect(insertCall.args[0]).toMatchObject({ created_by_id: 'u1', created_by_name: 'Pat' });
    expect(result.createdByName).toBe('Pat');
  });
});
