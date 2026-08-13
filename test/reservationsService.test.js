// =============================================================================
// reservationsService — group operations, cancelled exclusions, check-in status
// Pins the schedule hardening round at the service layer:
// - updateMany/cancelMany hit every id in ONE statement (.in), so a group
//   edit/cancel is all-or-nothing
// - cancelled rows are excluded from getByItemId/getSince/getIds, making a
//   soft-cancel propagate exactly like a deletion (getIds pruning)
// - create() no longer flips item status as a side effect (it used to set
//   'reserved' even on checked-out items)
// - inventoryService.checkIn honors returnStatus (reserved-aware check-in)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

const { reservationsService, inventoryService } = await import('../lib/services.js');

// Recording mock: logs every from(table) call with each chained method+args;
// the chain resolves to the table's configured result.
function makeRecordingClient(results = {}) {
  const calls = [];
  const client = {
    from: vi.fn((table) => {
      const entry = { table, ops: [] };
      calls.push(entry);
      const result = results[table] || { data: [], error: null };
      const handler = {
        get(_, prop) {
          if (prop === 'then') {
            const p = Promise.resolve(result);
            return p.then.bind(p);
          }
          if (prop === 'single')
            return () =>
              Promise.resolve(
                Array.isArray(result.data)
                  ? { data: result.data[0] ?? {}, error: result.error }
                  : result,
              );
          return (...args) => {
            entry.ops.push({ method: prop, args });
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

const opsOf = (calls, table) => calls.find((c) => c.table === table)?.ops || [];
const hasOp = (ops, method, matcher) =>
  ops.some((op) => op.method === method && (!matcher || matcher(op.args)));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('group operations', () => {
  it('updateMany updates all ids in one .in statement', async () => {
    const { client, calls } = makeRecordingClient({
      reservations: { data: [], error: null },
    });
    getSupabase.mockResolvedValue(client);

    await reservationsService.updateMany(['r1', 'r2'], { project: 'Renamed' });

    expect(client.from).toHaveBeenCalledTimes(1);
    const ops = opsOf(calls, 'reservations');
    expect(hasOp(ops, 'update', (a) => a[0].project === 'Renamed')).toBe(true);
    expect(hasOp(ops, 'in', (a) => a[0] === 'id' && a[1].join() === 'r1,r2')).toBe(true);
  });

  it('cancelMany sets status cancelled on all ids in one .in statement', async () => {
    const { client, calls } = makeRecordingClient({
      reservations: { data: [], error: null },
    });
    getSupabase.mockResolvedValue(client);

    await reservationsService.cancelMany(['r1', 'r2', 'r3']);

    expect(client.from).toHaveBeenCalledTimes(1);
    const ops = opsOf(calls, 'reservations');
    expect(hasOp(ops, 'update', (a) => a[0].status === 'cancelled')).toBe(true);
    expect(hasOp(ops, 'in', (a) => a[1].length === 3)).toBe(true);
  });

  it('updateMany surfaces DB errors', async () => {
    const { client } = makeRecordingClient({
      reservations: { data: null, error: { message: 'rls denied' } },
    });
    getSupabase.mockResolvedValue(client);

    await expect(reservationsService.updateMany(['r1'], { project: 'X' })).rejects.toBeTruthy();
  });
});

describe('cancelled exclusions', () => {
  it.each([
    ['getByItemId', () => reservationsService.getByItemId('CAM1')],
    ['getSince', () => reservationsService.getSince('2026-01-01T00:00:00Z')],
    ['getIds', () => reservationsService.getIds()],
  ])('%s excludes cancelled rows', async (_name, run) => {
    const { client, calls } = makeRecordingClient({
      reservations: { data: [], error: null },
    });
    getSupabase.mockResolvedValue(client);

    await run();

    const ops = opsOf(calls, 'reservations');
    expect(hasOp(ops, 'neq', (a) => a[0] === 'status' && a[1] === 'cancelled')).toBe(true);
  });
});

describe('create', () => {
  it('no longer flips item status as a side effect', async () => {
    const inserted = {
      id: 'res-1',
      item_id: 'CAM1',
      start_date: '2020-01-01', // long past — old code would set 'reserved'
      end_date: '2020-01-02',
      notes: [],
    };
    const { client, calls } = makeRecordingClient({
      reservations: { data: [inserted], error: null },
    });
    getSupabase.mockResolvedValue(client);

    await reservationsService.create(inserted);

    expect(calls.some((c) => c.table === 'inventory')).toBe(false);
  });
});

describe('inventoryService.checkIn returnStatus', () => {
  async function runCheckIn(extra) {
    const { client, calls } = makeRecordingClient({
      inventory: { data: [{ id: 'CAM1', status: 'checked-out', notes: [] }], error: null },
      checkout_history: { data: [], error: null },
    });
    getSupabase.mockResolvedValue(client);
    await inventoryService.checkIn('CAM1', {
      userName: 'Pat',
      damageReported: false,
      ...extra,
    });
    return calls;
  }

  it('returns the item to reserved when returnStatus says so', async () => {
    const calls = await runCheckIn({ returnStatus: 'reserved' });
    const invUpdate = calls.find((c) => c.table === 'inventory' && hasOp(c.ops, 'update'));
    const updateArgs = invUpdate.ops.find((op) => op.method === 'update').args[0];
    expect(updateArgs.status).toBe('reserved');
  });

  it('defaults to available without returnStatus', async () => {
    const calls = await runCheckIn({});
    const invUpdate = calls.find((c) => c.table === 'inventory' && hasOp(c.ops, 'update'));
    const updateArgs = invUpdate.ops.find((op) => op.method === 'update').args[0];
    expect(updateArgs.status).toBe('available');
  });

  it('damage always wins over returnStatus', async () => {
    const calls = await runCheckIn({ returnStatus: 'reserved', damageReported: true });
    const invUpdate = calls.find((c) => c.table === 'inventory' && hasOp(c.ops, 'update'));
    const updateArgs = invUpdate.ops.find((op) => op.method === 'update').args[0];
    expect(updateArgs.status).toBe('needs-attention');
  });
});
