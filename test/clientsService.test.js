// =============================================================================
// clientsService — payload sanitization + DB-generated ids
// Pins the clients hardening round at the service layer. The old service
// inserted/updated the raw object; the form layer stamped camelCase
// createdAt/updatedAt (and local state carries clientNotes/reservations),
// which PostgREST rejects with PGRST204 — silently breaking every UI create
// and update.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

const { clientsService } = await import('../lib/services.js');

function makeRecordingClient(results = {}) {
  const calls = [];
  const client = {
    from: vi.fn((table) => {
      const entry = { table, ops: [] };
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
            entry.ops.push({ method: prop, args });
            return new Proxy({}, handler);
          };
        },
      };
      return new Proxy({}, handler);
    }),
    rpc: vi.fn().mockResolvedValue({ data: 'CL042', error: null }),
  };
  return { client, calls };
}

const opArgs = (calls, table, method) =>
  calls
    .find((c) => c.table === table && c.ops.some((op) => op.method === method))
    ?.ops.find((op) => op.method === method)?.args;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('create', () => {
  const dirtyClient = {
    name: 'New Client',
    type: 'Individual',
    email: 'x@example.com',
    // Everything below must be stripped before the insert
    createdAt: '2026-08-13T00:00:00Z',
    updatedAt: '2026-08-13T00:00:00Z',
    clientNotes: [{ id: 'n1' }],
    reservations: [],
  };

  it('inserts only real DB columns', async () => {
    const { client, calls } = makeRecordingClient({
      clients: { data: { id: 'CL042', name: 'New Client' }, error: null },
    });
    getSupabase.mockResolvedValue(client);

    await clientsService.create({ ...dirtyClient });

    const [inserted] = opArgs(calls, 'clients', 'insert');
    expect(inserted).not.toHaveProperty('createdAt');
    expect(inserted).not.toHaveProperty('updatedAt');
    expect(inserted).not.toHaveProperty('clientNotes');
    expect(inserted).not.toHaveProperty('reservations');
    expect(inserted).toMatchObject({ name: 'New Client', type: 'Individual' });
  });

  it('gets its id from generate_client_id when none is provided', async () => {
    const { client, calls } = makeRecordingClient({
      clients: { data: { id: 'CL042' }, error: null },
    });
    getSupabase.mockResolvedValue(client);

    await clientsService.create({ name: 'New Client' });

    expect(client.rpc).toHaveBeenCalledWith('generate_client_id');
    const [inserted] = opArgs(calls, 'clients', 'insert');
    expect(inserted.id).toBe('CL042');
  });

  it('keeps an explicitly provided id without calling the generator', async () => {
    const { client, calls } = makeRecordingClient({
      clients: { data: { id: 'CL777' }, error: null },
    });
    getSupabase.mockResolvedValue(client);

    await clientsService.create({ id: 'CL777', name: 'New Client' });

    expect(client.rpc).not.toHaveBeenCalled();
    const [inserted] = opArgs(calls, 'clients', 'insert');
    expect(inserted.id).toBe('CL777');
  });

  it('rejects invalid clients before touching the DB (1-char name)', async () => {
    const { client } = makeRecordingClient();
    getSupabase.mockResolvedValue(client);

    await expect(clientsService.create({ name: 'A' })).rejects.toThrow(/between 2 and 100/);
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe('update', () => {
  it('updates only real DB columns and never the primary key', async () => {
    const { client, calls } = makeRecordingClient({
      clients: { data: { id: 'CL001' }, error: null },
    });
    getSupabase.mockResolvedValue(client);

    await clientsService.update('CL001', {
      id: 'CL001',
      name: 'Renamed',
      favorite: true,
      createdAt: 'nope',
      updatedAt: 'nope',
      clientNotes: [],
      created_at: '2026-01-01T00:00:00Z',
    });

    const [updated] = opArgs(calls, 'clients', 'update');
    expect(updated).toEqual({ name: 'Renamed', favorite: true });
  });
});
