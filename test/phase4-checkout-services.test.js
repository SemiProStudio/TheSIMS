// =============================================================================
// Phase 4 — checkout/checkin service tests (previously ZERO service-level
// coverage of status transitions and history writes)
//
// Real inventoryService functions against a controllable fake Supabase —
// wrong tables, wrong payloads, and unchecked errors fail loudly here.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Controllable fake Supabase client -------------------------------------------

const state = {
  updates: [], // [table, payload, idFilter]
  updateError: null,
  selectRows: {}, // table -> { data, error } for select().eq().single()
  inserts: [], // [table, row]
  insertError: null,
  rpcCalls: [], // [name, args]
};

function makeFakeSupabase() {
  return {
    rpc: vi.fn((name, args) => {
      state.rpcCalls.push([name, args]);
      return Promise.resolve({ data: null, error: null });
    }),
    from: vi.fn((table) => ({
      update: (payload) => ({
        eq: (_col, val) => ({
          select: () => ({
            single: () => {
              state.updates.push([table, payload, val]);
              if (state.updateError) {
                return Promise.resolve({ data: null, error: state.updateError });
              }
              return Promise.resolve({ data: { id: val, ...payload }, error: null });
            },
          }),
        }),
      }),
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(state.selectRows[table] || { data: null, error: null }),
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
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
    })),
  };
}

vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(() => Promise.resolve(makeFakeSupabase())),
  supabase: null,
}));

const { inventoryService } = await import('../lib/services.js');

// Let the fire-and-forget history/RPC promises settle
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  state.updates = [];
  state.updateError = null;
  state.selectRows = {};
  state.inserts = [];
  state.insertError = null;
  state.rpcCalls = [];
});

const checkoutArgs = {
  userId: 'u1',
  userName: 'Patrick',
  clientId: 'client-42',
  clientName: 'Acme Films',
  project: 'Commercial Shoot',
  dueBack: '2026-09-01',
};

// -----------------------------------------------------------------------------
// checkOut
// -----------------------------------------------------------------------------
describe('inventoryService.checkOut', () => {
  it('sets checked-out status and all checkout fields on the inventory row', async () => {
    const result = await inventoryService.checkOut('CAM001', checkoutArgs);

    const [table, payload, id] = state.updates[0];
    expect(table).toBe('inventory');
    expect(id).toBe('CAM001');
    expect(payload).toMatchObject({
      status: 'checked-out',
      checked_out_to_user_id: 'u1',
      checked_out_to_name: 'Patrick',
      checkout_client_id: 'client-42',
      due_back: '2026-09-01',
      checkout_project: 'Commercial Shoot',
    });
    expect(payload.checked_out_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Returned as { item, historyEvent } — the transformed row plus the real
    // history row for the caller's activity cache
    expect(result.item.status).toBe('checked-out');
    expect(result.historyEvent).toMatchObject({ itemId: 'CAM001', action: 'checkout' });
  });

  it('writes a checkout history row with the user and client names', async () => {
    await inventoryService.checkOut('CAM001', checkoutArgs);
    await flush();

    const history = state.inserts.find(([table]) => table === 'checkout_history');
    expect(history).toBeDefined();
    expect(history[1]).toMatchObject({
      item_id: 'CAM001',
      user_id: 'u1',
      user_name: 'Patrick',
      client_id: 'client-42',
      client_name: 'Acme Films',
      action: 'checkout',
      project: 'Commercial Shoot',
    });
    expect(history[1].timestamp).toBeTruthy();
  });

  it('fires the increment_checkout_count RPC', async () => {
    await inventoryService.checkOut('CAM001', checkoutArgs);
    await flush();

    expect(state.rpcCalls).toContainEqual(['increment_checkout_count', { item_id: 'CAM001' }]);
  });

  it('throws on update failure and writes NO history row', async () => {
    state.updateError = new Error('RLS denied');

    await expect(inventoryService.checkOut('CAM001', checkoutArgs)).rejects.toThrow('RLS denied');
    await flush();
    expect(state.inserts).toHaveLength(0);
  });

  it('still succeeds when the history insert fails (history is non-blocking)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    state.insertError = new Error('history table gone');

    const result = await inventoryService.checkOut('CAM001', checkoutArgs);
    await flush();

    expect(result.item.status).toBe('checked-out');
    // No phantom event when the insert failed — the cache must stay honest
    expect(result.historyEvent).toBeNull();
    warnSpy.mockRestore();
  });
});

// -----------------------------------------------------------------------------
// checkIn
// -----------------------------------------------------------------------------
describe('inventoryService.checkIn', () => {
  beforeEach(() => {
    // The item currently checked out, as getById reads it (DB shape)
    state.selectRows.inventory = {
      data: {
        id: 'CAM001',
        name: 'Camera',
        status: 'checked-out',
        checkout_client_id: 'client-42',
      },
      error: null,
    };
  });

  it('clears every checkout field and returns the item to available', async () => {
    const result = await inventoryService.checkIn('CAM001', {
      userId: 'u1',
      userName: 'Patrick',
    });

    const [table, payload] = state.updates[0];
    expect(table).toBe('inventory');
    expect(payload).toEqual({
      status: 'available',
      checked_out_to_user_id: null,
      checked_out_to_name: null,
      checkout_client_id: null,
      checked_out_date: null,
      due_back: null,
      checkout_project: null,
    });
    expect(result.item.status).toBe('available');
    expect(result.historyEvent).toMatchObject({ itemId: 'CAM001', action: 'checkin' });
  });

  it('sets needs-attention when damage is reported', async () => {
    await inventoryService.checkIn('CAM001', {
      userId: 'u1',
      userName: 'Patrick',
      damageReported: true,
    });

    expect(state.updates[0][1].status).toBe('needs-attention');
  });

  it('includes condition only when provided', async () => {
    await inventoryService.checkIn('CAM001', {
      userId: 'u1',
      userName: 'Patrick',
      condition: 'fair',
    });
    expect(state.updates[0][1].condition).toBe('fair');

    state.updates = [];
    await inventoryService.checkIn('CAM001', { userId: 'u1', userName: 'Patrick' });
    expect(state.updates[0][1]).not.toHaveProperty('condition');
  });

  // Regression: this used to read item.checkout_client_id off the TRANSFORMED
  // (camelCase) item, so check-in history never recorded which client had it.
  it('records the outgoing client on the check-in history row', async () => {
    await inventoryService.checkIn('CAM001', {
      userId: 'u1',
      userName: 'Patrick',
      notes: 'all good',
      condition: 'good',
    });
    await flush();

    const history = state.inserts.find(([table]) => table === 'checkout_history');
    expect(history).toBeDefined();
    expect(history[1]).toMatchObject({
      item_id: 'CAM001',
      user_id: 'u1',
      action: 'checkin',
      client_id: 'client-42',
      notes: 'all good',
      condition_at_action: 'good',
    });
  });

  it('throws on update failure and writes NO history row', async () => {
    state.updateError = new Error('constraint violation');

    await expect(
      inventoryService.checkIn('CAM001', { userId: 'u1', userName: 'Patrick' }),
    ).rejects.toThrow('constraint violation');
    await flush();
    expect(state.inserts).toHaveLength(0);
  });
});
