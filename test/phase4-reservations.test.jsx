// =============================================================================
// Phase 4 — reservation flow tests (DataContext.createReservation)
//
// This is the seam that shipped the Phase-2 production bug: the frontend-shape
// validator ran against the DB-shaped row and rejected every insert. These
// tests pin the contract from the other side — validation happens on the
// frontend shape, then the row is mapped to the DB shape exactly once.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { DataProvider } from '../contexts/DataContext.jsx';
import { useData } from '../contexts/DataContext.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: true,
  getSupabase: vi.fn(),
  supabase: null,
}));

vi.mock('../lib/storage.js', () => ({
  storageService: { deleteItemImages: vi.fn(() => Promise.resolve()) },
}));

vi.mock('../lib/services.js', () => ({
  freshnessService: {
    check: vi.fn(() => Promise.resolve({ server_time: '2026-08-10T12:00:00.000Z' })),
  },
  inventoryService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    checkOut: vi.fn(),
    checkIn: vi.fn(),
    getSince: vi.fn(() => Promise.resolve([])),
    getIds: vi.fn(() => Promise.resolve(new Set())),
    getByIdWithDetails: vi.fn(() => Promise.resolve(null)),
  },
  packagesService: { getAll: vi.fn(() => Promise.resolve([])) },
  packListsService: { getAll: vi.fn(() => Promise.resolve([])) },
  clientsService: { getAll: vi.fn(() => Promise.resolve([])) },
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
    create: vi.fn((row) => Promise.resolve({ id: 'res-db-1', ...row })),
    update: vi.fn(() => Promise.resolve({})),
    delete: vi.fn(() => Promise.resolve({})),
  },
  maintenanceService: { getAll: vi.fn(() => Promise.resolve([])) },
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

import { reservationsService } from '../lib/services.js';

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
  ctx = undefined;
});

const validForm = {
  project: 'Commercial Shoot',
  projectType: 'Commercial',
  start: '2026-09-01',
  end: '2026-09-03',
  user: 'Client A',
  clientId: 'client-42',
  contactPhone: '555-1234',
  contactEmail: 'a@example.com',
  location: 'Studio B',
};

describe('DataContext.createReservation', () => {
  it('maps the frontend shape to the exact DB row (snake_case dates and contact)', async () => {
    await renderProvider();

    await ctx.createReservation('CAM001', validForm);

    expect(reservationsService.create).toHaveBeenCalledWith({
      item_id: 'CAM001',
      client_id: 'client-42',
      project: 'Commercial Shoot',
      project_type: 'Commercial',
      start_date: '2026-09-01',
      end_date: '2026-09-03',
      status: 'confirmed',
      contact_name: 'Client A',
      contact_phone: '555-1234',
      contact_email: 'a@example.com',
      location: 'Studio B',
      notes: [],
    });
  });

  it('validates the FRONTEND shape before mapping — missing dates reject without a DB call', async () => {
    await renderProvider();

    await expect(
      ctx.createReservation('CAM001', { project: 'Shoot', user: 'Client A' }),
    ).rejects.toThrow(/Validation failed.*Start date is required/);
    expect(reservationsService.create).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start date', async () => {
    await renderProvider();

    await expect(
      ctx.createReservation('CAM001', { ...validForm, start: '2026-09-05', end: '2026-09-01' }),
    ).rejects.toThrow(/End date must be after start date/);
    expect(reservationsService.create).not.toHaveBeenCalled();
  });

  it('propagates service failures to the caller (no silent success)', async () => {
    await renderProvider();
    reservationsService.create.mockRejectedValueOnce(new Error('conflict'));

    await expect(ctx.createReservation('CAM001', validForm)).rejects.toThrow('conflict');
  });

  it('defaults optional fields (client, contact info, status) safely', async () => {
    await renderProvider();

    await ctx.createReservation('CAM001', {
      project: 'Shoot',
      start: '2026-09-01',
      end: '2026-09-03',
      user: 'Client A',
    });

    const row = reservationsService.create.mock.calls[0][0];
    expect(row.client_id).toBeNull();
    expect(row.project_type).toBe('Other');
    expect(row.status).toBe('confirmed');
    expect(row.contact_phone).toBe('');
    expect(row.notes).toEqual([]);
  });
});
