// =============================================================================
// Phase 2 regression tests — DataContext data integrity (H8, H10, H11)
//
// - Maintenance operations rethrow so callers' rollback paths can actually
//   fire (previously errors were swallowed and rollback was dead code)
// - deleteItem deletes the DB record BEFORE destroying storage images
// - Lazy loaders retry after a failed load instead of latching an empty list
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { DataProvider } from '../contexts/DataContext.jsx';
import { useData } from '../contexts/DataContext.js';

const callOrder = [];

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: true,
  getSupabase: vi.fn(),
  supabase: null,
}));

vi.mock('../lib/storage.js', () => ({
  storageService: {
    deleteItemImages: vi.fn(() => {
      callOrder.push('storage-delete');
      return Promise.resolve();
    }),
  },
}));

vi.mock('../lib/services.js', () => ({
  freshnessService: {
    check: vi.fn(() => Promise.resolve({ server_time: '2026-08-10T12:00:00.000Z' })),
  },
  inventoryService: {
    getAll: vi.fn(() =>
      Promise.resolve([{ id: 'CAM001', name: 'Test Camera', status: 'available' }]),
    ),
    create: vi.fn((item) => Promise.resolve(item)),
    update: vi.fn((id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn(() => {
      callOrder.push('db-delete');
      return Promise.resolve({});
    }),
    checkOut: vi.fn(() => Promise.resolve({})),
    checkIn: vi.fn(() => Promise.resolve({})),
    getSince: vi.fn(() => Promise.resolve([])),
    getIds: vi.fn(() => Promise.resolve(new Set(['CAM001']))),
    getByIdWithDetails: vi.fn(() => Promise.resolve(null)),
  },
  packagesService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  packListsService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleItemPacked: vi.fn(() => Promise.resolve({})),
  },
  clientsService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 'client-1', name: 'Test Client' }])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  usersService: { getAll: vi.fn(() => Promise.resolve([])) },
  rolesService: { getAll: vi.fn(() => Promise.resolve([])) },
  locationsService: { getAll: vi.fn(() => Promise.resolve([])) },
  categoriesService: { getAll: vi.fn(() => Promise.resolve([])), syncAll: vi.fn() },
  specsService: { getAll: vi.fn(() => Promise.resolve({})), upsert: vi.fn() },
  auditLogService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({})),
  },
  reservationsService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getSince: vi.fn(() => Promise.resolve([])),
    getIds: vi.fn(() => Promise.resolve(new Set())),
  },
  maintenanceService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 'm-db-1' })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
  itemNotesService: { create: vi.fn(), softDelete: vi.fn() },
  itemRemindersService: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  notificationPreferencesService: { getByUserId: vi.fn(), upsert: vi.fn() },
  emailService: {
    send: vi.fn(),
    sendCheckoutConfirmation: vi.fn(),
    sendCheckinConfirmation: vi.fn(),
    sendReservationConfirmation: vi.fn(),
  },
}));

import {
  maintenanceService,
  clientsService,
  inventoryService,
} from '../lib/services.js';
import { storageService } from '../lib/storage.js';

let ctx;
function Capture() {
  ctx = useData();
  return null;
}

async function renderProvider() {
  render(
    <DataProvider>
      <Capture />
    </DataProvider>,
  );
  await waitFor(() => expect(ctx.dataLoaded).toBe(true));
}

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;
  ctx = undefined;
});

// -----------------------------------------------------------------------------
// H8 — maintenance operations rethrow so rollback can fire
// -----------------------------------------------------------------------------
describe('maintenance error contract', () => {
  it('updateMaintenance rejects when the service fails', async () => {
    await renderProvider();
    maintenanceService.update.mockRejectedValueOnce(new Error('RLS denied'));

    await expect(ctx.updateMaintenance('m1', { status: 'completed' })).rejects.toThrow(
      'RLS denied',
    );
  });

  it('addMaintenance rejects when the service fails (was: returned null)', async () => {
    await renderProvider();
    maintenanceService.create.mockRejectedValueOnce(new Error('insert failed'));

    await expect(
      ctx.addMaintenance('CAM001', {
        type: 'repair',
        description: 'Replace shutter',
        date: '2026-08-10',
      }),
    ).rejects.toThrow('insert failed');
  });

  it('deleteMaintenance rejects when the service fails', async () => {
    await renderProvider();
    maintenanceService.delete.mockRejectedValueOnce(new Error('delete failed'));

    await expect(ctx.deleteMaintenance('m1')).rejects.toThrow('delete failed');
  });
});

// -----------------------------------------------------------------------------
// H10 — deleteItem: DB record first, storage images after
// -----------------------------------------------------------------------------
describe('deleteItem ordering', () => {
  it('deletes the DB record before touching storage images', async () => {
    await renderProvider();

    await act(async () => {
      await ctx.deleteItem('CAM001');
    });

    expect(callOrder).toEqual(['db-delete', 'storage-delete']);
  });

  it('leaves storage images alone when the DB delete fails', async () => {
    await renderProvider();
    inventoryService.delete.mockRejectedValueOnce(new Error('FK constraint'));

    await expect(ctx.deleteItem('CAM001')).rejects.toThrow('FK constraint');
    expect(storageService.deleteItemImages).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// H11 — lazy loaders retry after failure instead of caching an empty list
// -----------------------------------------------------------------------------
describe('lazy loader error latch', () => {
  it('a failed ensureClients load retries on the next call and succeeds', async () => {
    await renderProvider();
    clientsService.getAll.mockRejectedValueOnce(new Error('network down'));

    await act(async () => {
      await ctx.ensureClients();
    });
    expect(ctx.clients).toEqual([]);

    // Second access retries (previously loaded=true was latched on error,
    // permanently caching the empty list until full reload)
    await act(async () => {
      await ctx.ensureClients();
    });
    await waitFor(() => expect(ctx.clients).toEqual([{ id: 'client-1', name: 'Test Client' }]));
    expect(clientsService.getAll).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent ensureClients calls into one fetch', async () => {
    await renderProvider();

    await act(async () => {
      await Promise.all([ctx.ensureClients(), ctx.ensureClients(), ctx.ensureClients()]);
    });

    expect(clientsService.getAll).toHaveBeenCalledTimes(1);
  });
});
