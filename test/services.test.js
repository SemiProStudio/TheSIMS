// =============================================================================
// Services Layer Tests
// Tests for Supabase service functions with mock client
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

// Mock the Supabase client before importing services
vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

// Import services after mocking
import {
  notificationPreferencesService,
  emailService,
  inventoryService,
  itemNotesService,
  clientsService,
  packagesService,
  packListsService,
  reservationsService,
  maintenanceService,
  categoriesService,
  locationsService,
  usersService,
  checkoutHistoryService,
} from '../lib/services.js';

// =============================================================================
// Mock Supabase Response Helpers
// =============================================================================

// Builds a chainable mock that resolves to { data, error } when awaited.
// Every method returns the same thenable chain, so any Supabase pattern works:
// .from().select().eq().order(), .from().select().eq().neq().order(), etc.
function createChain(responseData, error) {
  const result = Promise.resolve({ data: responseData, error });
  const chain = () => {
    const handler = {
      get(_, prop) {
        // Terminal methods that return a plain promise
        if (prop === 'single') return () => Promise.resolve({ data: responseData, error });
        // Promise protocol — makes the chain itself awaitable
        if (prop === 'then') return result.then.bind(result);
        if (prop === 'catch') return result.catch.bind(result);
        // Everything else returns the same chainable proxy
        return (..._args) => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  };
  return chain();
}

const createMockSupabaseClient = (responseData = null, error = null) => ({
  from: vi.fn(() => createChain(responseData, error)),
  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: responseData, error })),
  },
  rpc: vi.fn(() => Promise.resolve({ data: responseData, error })),
});

// =============================================================================
// Database Connection Tests
// =============================================================================

describe('Database Connection', () => {
  it('should throw when Supabase is unavailable', async () => {
    getSupabase.mockResolvedValueOnce(null);
    await expect(inventoryService.getAll()).rejects.toThrow('Database connection unavailable');
  });

  it('should throw when Supabase returns undefined', async () => {
    getSupabase.mockResolvedValueOnce(undefined);
    await expect(inventoryService.getAll()).rejects.toThrow('Database connection unavailable');
  });
});

// =============================================================================
// Notification Preferences Service Tests
// =============================================================================

describe('notificationPreferencesService', () => {
  describe('getByUserId', () => {
    it('should return preferences when found', async () => {
      const prefs = { user_id: 'user-123', email_enabled: true };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(prefs));
      const result = await notificationPreferencesService.getByUserId('user-123');
      expect(result).toEqual(prefs);
    });

    it('should return null when not found', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await notificationPreferencesService.getByUserId('user-123');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should return upserted preferences', async () => {
      const prefs = { email_enabled: true, due_date_reminders: true };
      const returnData = { user_id: 'user-123', ...prefs };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(returnData));
      const result = await notificationPreferencesService.upsert('user-123', prefs);
      expect(result).toEqual(returnData);
    });
  });

  describe('update', () => {
    it('should return updated preferences', async () => {
      const updates = { email_enabled: false };
      const returnData = { user_id: 'user-123', ...updates };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(returnData));
      const result = await notificationPreferencesService.update('user-123', updates);
      expect(result).toEqual(returnData);
    });
  });
});

// =============================================================================
// Notification Log Service Tests
// =============================================================================

// =============================================================================
// Email Service Tests
// =============================================================================

describe('emailService', () => {
  describe('send', () => {
    it('should send email via edge function', async () => {
      const responseData = { success: true };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(responseData));
      const result = await emailService.send({
        to: 'test@example.com',
        templateKey: 'checkout_confirmation',
        templateData: { borrower_name: 'Test User' },
      });
      expect(result).toBeDefined();
    });

    it('should handle send errors gracefully', async () => {
      getSupabase.mockResolvedValueOnce(
        createMockSupabaseClient(null, { message: 'Edge Function not deployed' }),
      );
      // emailService.send catches errors internally and returns fallback
      const result = await emailService.send({
        to: 'test@example.com',
        templateKey: 'checkout_confirmation',
        templateData: {},
      });
      expect(result).toBeDefined();
    });
  });

  describe('sendCheckoutConfirmation', () => {
    it('should call send with correct template', async () => {
      const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

      await emailService.sendCheckoutConfirmation({
        borrowerEmail: 'test@example.com',
        borrowerName: 'Test User',
        item: { id: 'CAM001', name: 'Camera', brand: 'Canon' },
        checkoutDate: '2024-01-15',
        dueDate: '2024-01-22',
        project: 'Film Shoot',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          templateKey: 'checkout_confirmation',
          templateData: expect.objectContaining({
            borrower_name: 'Test User',
            item_name: 'Camera',
          }),
        }),
      );

      sendSpy.mockRestore();
    });

    it('should handle missing item properties', async () => {
      const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

      await emailService.sendCheckoutConfirmation({
        borrowerEmail: 'test@example.com',
        borrowerName: 'Test',
        item: { id: 'CAM001', name: 'Camera' },
        checkoutDate: '2024-01-15',
        dueDate: '2024-01-22',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            item_brand: '',
          }),
        }),
      );

      sendSpy.mockRestore();
    });
  });

  describe('sendCheckinConfirmation', () => {
    it('should call send with correct template', async () => {
      const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

      await emailService.sendCheckinConfirmation({
        borrowerEmail: 'test@example.com',
        borrowerName: 'Test User',
        item: { id: 'CAM001', name: 'Camera', brand: 'Canon' },
        returnDate: '2024-01-20',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: 'checkin_confirmation',
        }),
      );

      sendSpy.mockRestore();
    });
  });

  describe('sendReservationConfirmation', () => {
    it('should call send with correct template', async () => {
      const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

      await emailService.sendReservationConfirmation({
        userEmail: 'test@example.com',
        userName: 'Test User',
        item: { id: 'CAM001', name: 'Camera', brand: 'Canon' },
        reservation: { project: 'Film Shoot', start: '2024-02-01', end: '2024-02-05' },
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: 'reservation_confirmation',
        }),
      );

      sendSpy.mockRestore();
    });
  });

});

// =============================================================================
// Inventory Service Tests
// =============================================================================

describe('inventoryService', () => {
  describe('getAll', () => {
    it('should return transformed inventory items', async () => {
      const dbItems = [{ id: 'CAM001', name: 'Camera', category_name: 'Cameras' }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbItems));
      const result = await inventoryService.getAll();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a single item', async () => {
      const dbItem = { id: 'CAM001', name: 'Camera', category_name: 'Cameras' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbItem));
      const result = await inventoryService.getById('CAM001');
      expect(result).toBeDefined();
      expect(result.id).toBe('CAM001');
    });
  });

  describe('delete', () => {
    it('should delete and return the id', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient({ id: 'CAM001' }));
      const result = await inventoryService.delete('CAM001');
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Clients Service Tests
// =============================================================================

describe('clientsService', () => {
  describe('getAll', () => {
    it('should return clients array', async () => {
      const clients = [{ id: 'client-1', name: 'Test Client' }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(clients));
      const result = await clientsService.getAll();
      expect(result).toEqual(clients);
    });
  });
});

// =============================================================================
// Packages Service Tests
// =============================================================================

describe('packagesService', () => {
  describe('getAll', () => {
    it('should return packages array', async () => {
      const pkgs = [{ id: 'pkg-1', name: 'Interview Kit', package_items: [] }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(pkgs));
      const result = await packagesService.getAll();
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Pack Lists Service Tests
// =============================================================================

describe('packListsService', () => {
  describe('getAll', () => {
    it('should return pack lists array', async () => {
      const lists = [
        {
          id: 'pl-1',
          name: 'Corporate Shoot',
          created_at: '2024-01-01',
          pack_list_items: [],
          pack_list_packages: [],
        },
      ];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(lists));
      const result = await packListsService.getAll();
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Service Error Handling Tests
// =============================================================================

describe('Service Error Handling', () => {
  it('should throw when Supabase returns an error', async () => {
    getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null, { message: 'DB error' }));
    await expect(inventoryService.getAll()).rejects.toThrow();
  });

  it('should throw on error for any service', async () => {
    getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null, { message: 'Not found' }));
    await expect(clientsService.getAll()).rejects.toThrow();
  });

  it('emailService helper methods should handle missing item properties', async () => {
    const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

    await emailService.sendCheckoutConfirmation({
      borrowerEmail: 'test@example.com',
      borrowerName: 'Test',
      item: { id: 'CAM001', name: 'Camera' },
      checkoutDate: '2024-01-15',
      dueDate: '2024-01-22',
    });

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        templateData: expect.objectContaining({
          item_brand: '',
        }),
      }),
    );

    sendSpy.mockRestore();
  });
});

// =============================================================================
// Reservations Service Tests
// =============================================================================

describe('reservationsService', () => {
  describe('getAll', () => {
    it('should return transformed reservations', async () => {
      const dbData = [
        {
          id: 'res-1',
          item_id: 'CAM001',
          client_id: 'client-1',
          start_date: '2024-02-01',
          end_date: '2024-02-05',
          status: 'confirmed',
          project: 'Film Shoot',
          notes: 'Handle with care',
          item: {
            id: 'CAM001',
            name: 'Camera',
            category_name: 'Cameras',
            brand: 'Canon',
            status: 'available',
          },
          client: {
            id: 'client-1',
            name: 'Test Client',
            type: 'company',
            email: 'a@b.com',
            phone: '555',
          },
        },
      ];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbData));
      const result = await reservationsService.getAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'res-1');
    });

    it('should return empty array when no reservations', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient([]));
      const result = await reservationsService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should reject invalid reservations', async () => {
      // Missing required fields — validator should reject
      await expect(reservationsService.create({})).rejects.toThrow();
    });

    it('should create a valid reservation', async () => {
      const reservation = {
        item_id: 'CAM001',
        client_id: 'client-1',
        start: '2025-06-01',
        end: '2025-06-05',
        start_date: '2025-06-01',
        end_date: '2025-06-05',
        status: 'confirmed',
        project: 'Film Shoot',
        user: 'Test User',
      };
      const dbResponse = { id: 'res-new', ...reservation };
      getSupabase.mockResolvedValue(createMockSupabaseClient(dbResponse));
      const result = await reservationsService.create(reservation);
      expect(result).toBeDefined();
      expect(result.id).toBe('res-new');
    });
  });

  describe('delete', () => {
    it('should return deleted id', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await reservationsService.delete('res-1');
      expect(result).toEqual({ id: 'res-1' });
    });
  });
});

// =============================================================================
// Maintenance Service Tests
// =============================================================================

describe('maintenanceService', () => {
  describe('getAll', () => {
    it('should return transformed maintenance records', async () => {
      const dbData = [
        {
          id: 'maint-1',
          item_id: 'CAM001',
          maintenance_type: 'repair',
          status: 'scheduled',
          scheduled_date: '2024-03-01',
          description: 'Sensor cleaning',
          cost: 150,
          item: { id: 'CAM001', name: 'Camera', category_name: 'Cameras', brand: 'Canon' },
        },
      ];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbData));
      const result = await maintenanceService.getAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'maint-1');
    });
  });

  describe('create', () => {
    it('propagates DB refusal (validation happens at the DataContext boundary, in camelCase)', async () => {
      // The service used to re-run the camelCase validator against its
      // snake_case row — type/description lined up by accident, the date
      // fields never matched (B12). The redundant pass is gone; the insert
      // error path is what the service owns.
      getSupabase.mockResolvedValueOnce(
        createMockSupabaseClient(null, new Error('null value in column "type"')),
      );
      await expect(maintenanceService.create({})).rejects.toThrow();
    });

    it('should create a valid maintenance record', async () => {
      const record = {
        item_id: 'CAM001',
        type: 'repair',
        description: 'Sensor cleaning',
        maintenance_type: 'repair',
        status: 'scheduled',
        scheduled_date: '2025-06-01',
      };
      const dbResponse = { id: 'maint-new', ...record };
      getSupabase.mockResolvedValue(createMockSupabaseClient(dbResponse));
      const result = await maintenanceService.create(record);
      expect(result).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should return deleted id', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await maintenanceService.delete('maint-1');
      expect(result).toEqual({ id: 'maint-1' });
    });
  });

  describe('inventory delete honesty', () => {
    // RLS-filtered deletes "succeed" with zero rows — the DELETE policy is
    // admin-only, so a non-admin bulk delete looked successful in the UI
    // while every item came back on reload
    it('throws when RLS silently filters the delete to zero rows', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient([]));
      await expect(inventoryService.delete('CAM001')).rejects.toThrow(/administrator access/);
    });

    it('succeeds when the row was actually deleted', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient([{ id: 'CAM001' }]));
      await expect(inventoryService.delete('CAM001')).resolves.toEqual({ id: 'CAM001' });
    });
  });

  describe('update', () => {
    // The edit modal hands back its full camelCase form record with join
    // artifacts. PostgREST rejects unknown columns (PGRST204), so the service
    // must map to snake_case and whitelist to real columns — the old
    // passthrough made EVERY maintenance edit fail at the database.
    it('maps camelCase form records to real columns and strips junk', async () => {
      let capturedPayload = null;
      const chain = {
        update: vi.fn((payload) => {
          capturedPayload = payload;
          return chain;
        }),
        eq: vi.fn(() => chain),
        select: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: { id: 'maint-1' }, error: null })),
      };
      getSupabase.mockResolvedValueOnce({ from: vi.fn(() => chain) });

      await maintenanceService.update('maint-1', {
        id: 'maint-1',
        itemId: 'CAM001',
        type: 'Repair',
        description: 'Shutter replacement',
        vendor: 'CamFix',
        vendorContact: 'fix@camfix.com',
        cost: 250,
        scheduledDate: '2026-08-01',
        completedDate: '', // empty date input → null, not ''
        status: 'in-progress',
        notes: 'awaiting part',
        warrantyWork: true,
        item: { id: 'CAM001', name: 'Camera' }, // joined row from getAll
        user: 'UI alias', // transform-added alias
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z', // trigger-managed
      });

      expect(capturedPayload).toEqual({
        item_id: 'CAM001',
        type: 'Repair',
        description: 'Shutter replacement',
        vendor: 'CamFix',
        vendor_contact: 'fix@camfix.com',
        cost: 250,
        scheduled_date: '2026-08-01',
        completed_date: null,
        status: 'in-progress',
        notes: 'awaiting part',
        warranty_work: true,
      });
    });

    it('passes hand-built snake_case payloads through unchanged', async () => {
      let capturedPayload = null;
      const chain = {
        update: vi.fn((payload) => {
          capturedPayload = payload;
          return chain;
        }),
        eq: vi.fn(() => chain),
        select: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: { id: 'maint-1' }, error: null })),
      };
      getSupabase.mockResolvedValueOnce({ from: vi.fn(() => chain) });

      // updateMaintenanceStatus builds this shape directly
      await maintenanceService.update('maint-1', {
        status: 'completed',
        completed_date: '2026-08-14',
        notes: 'done',
      });

      expect(capturedPayload).toEqual({
        status: 'completed',
        completed_date: '2026-08-14',
        notes: 'done',
      });
    });
  });
});

// =============================================================================
// Categories Service Tests
// =============================================================================

describe('categoriesService', () => {
  describe('getAll', () => {
    it('should return categories array', async () => {
      const cats = [
        { id: 1, name: 'Cameras' },
        { id: 2, name: 'Lenses' },
      ];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(cats));
      const result = await categoriesService.getAll();
      expect(result).toEqual(cats);
    });
  });

  describe('create', () => {
    it('should create a category', async () => {
      const cat = { id: 3, name: 'Audio' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(cat));
      const result = await categoriesService.create({ name: 'Audio' });
      expect(result).toEqual(cat);
    });
  });

  describe('delete', () => {
    it('should delete a category by name', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await categoriesService.delete('Audio');
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Locations Service Tests
// =============================================================================

describe('locationsService', () => {
  describe('getAll', () => {
    it('should return locations array', async () => {
      const locs = [{ id: 'loc-1', name: 'Studio A', parent_id: null }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(locs));
      const result = await locationsService.getAll();
      expect(result).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a location', async () => {
      const loc = { id: 'loc-new', name: 'Studio B' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(loc));
      const result = await locationsService.create({ name: 'Studio B' });
      expect(result).toEqual(loc);
    });
  });

  describe('delete', () => {
    it('should delete a location', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await locationsService.delete('loc-1');
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Users Service Tests
// =============================================================================

describe('usersService', () => {
  describe('getAll', () => {
    it('should return users array', async () => {
      const users = [{ id: 'user-1', email: 'a@b.com', display_name: 'Test' }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(users));
      const result = await usersService.getAll();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

// =============================================================================
// Checkout History Service Tests
// =============================================================================

describe('checkoutHistoryService', () => {
  describe('create', () => {
    it('should create a checkout record', async () => {
      const record = {
        item_id: 'CAM001',
        borrower_name: 'Test User',
        checked_out_at: '2024-01-15',
        status: 'checked_out',
      };
      const dbResponse = { id: 'co-1', ...record };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbResponse));
      const result = await checkoutHistoryService.create(record);
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Inventory Service Extended Tests
// =============================================================================

describe('inventoryService (extended)', () => {
  describe('create', () => {
    it('should create and return a transformed item', async () => {
      const dbItem = {
        id: 'CAM002',
        name: 'New Camera',
        category_name: 'Cameras',
        status: 'available',
      };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbItem));
      const result = await inventoryService.create({
        name: 'New Camera',
        category: 'Cameras',
        category_name: 'Cameras',
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('CAM002');
    });
  });

  describe('update', () => {
    it('should update and return transformed item', async () => {
      const dbItem = { id: 'CAM001', name: 'Updated Camera', category_name: 'Cameras' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbItem));
      const result = await inventoryService.update('CAM001', { name: 'Updated Camera' });
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Camera');
    });
  });

  describe('getByIdWithDetails', () => {
    it('should return null when item not found', async () => {
      // getById returns null when .single() returns null data
      getSupabase.mockResolvedValue(createMockSupabaseClient(null));
      const result = await inventoryService.getByIdWithDetails('NONEXISTENT');
      expect(result).toBeNull();
      getSupabase.mockReset();
    });
  });
});

// =============================================================================
// Clients Service Extended Tests
// =============================================================================

describe('clientsService (extended)', () => {
  describe('create', () => {
    it('should create a client', async () => {
      const client = { id: 'client-new', name: 'New Client', type: 'individual' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(client));
      const result = await clientsService.create({ name: 'New Client', type: 'individual' });
      expect(result).toEqual(client);
    });

    it('should reject invalid clients', async () => {
      // clientsService.create validates via validateClient
      await expect(clientsService.create({})).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('should return a single client', async () => {
      const client = { id: 'client-1', name: 'Test Client' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(client));
      const result = await clientsService.getById('client-1');
      expect(result).toEqual(client);
    });
  });

  describe('delete', () => {
    it('should delete a client', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null));
      const result = await clientsService.delete('client-1');
      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Audit phase-2 regressions (2026-08-24): B5, B6, B7
// =============================================================================

describe('locationsService.syncAll delete honesty (B5)', () => {
  it('throws when the delete is refused instead of silently resurrecting the branch', async () => {
    // The old per-row loop ignored every delete result — an RLS or network
    // refusal left the branch "deleted" in the UI until the next fetch
    // brought it back
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      // 1st: select existing ids; 2nd: the delete (refused)
      if (call === 1) return createChain([{ id: 'L1' }, { id: 'L2' }], null);
      return createChain(null, new Error('RLS refused'));
    });
    getSupabase.mockResolvedValue({ from });
    await expect(
      locationsService.syncAll([{ id: 'L1', name: 'Keep', type: 'room' }]),
    ).rejects.toThrow('RLS refused');
  });

  it('completes when delete and upsert both succeed', async () => {
    let call = 0;
    const from = vi.fn(() => {
      call += 1;
      if (call === 1) return createChain([{ id: 'L1' }, { id: 'GONE' }], null);
      return createChain(null, null);
    });
    getSupabase.mockResolvedValue({ from });
    await expect(
      locationsService.syncAll([{ id: 'L1', name: 'Keep', type: 'room' }]),
    ).resolves.toBeUndefined();
    // select + delete + upsert
    expect(from).toHaveBeenCalledTimes(3);
  });
});

// =============================================================================
// syncAll ↔ CRUD consolidation (audit §5.8): both go through shared statement
// builders, so the QUERY SHAPES are pinned here with a recording mock — the
// generic chain above can't see which methods were chained.
// =============================================================================

// Records every from() chain as {table, ops: [[method, args], ...]};
// respond(entry, callIndex) supplies {data, error} per call (default nulls)
function createRecordingClient(respond = () => null) {
  const calls = [];
  const from = vi.fn((table) => {
    const entry = { table, ops: [] };
    calls.push(entry);
    const result = () =>
      Promise.resolve(respond(entry, calls.length) || { data: null, error: null });
    const handler = {
      get(_, prop) {
        if (prop === 'then') return (...args) => result().then(...args);
        if (prop === 'catch') return (...args) => result().catch(...args);
        return (...chainArgs) => {
          entry.ops.push([prop, chainArgs]);
          if (prop === 'single') return result();
          return new Proxy({}, handler);
        };
      },
    };
    return new Proxy({}, handler);
  });
  return { from, calls };
}

describe('categoriesService.syncAll shares the CRUD statements (§5.8)', () => {
  const existing = [
    { id: 1, name: 'Cameras', prefix: 'CA', sort_order: 0 },
    { id: 2, name: 'Lenses', prefix: 'LE', sort_order: 1 },
  ];

  it('fetch → delete → update → insert, with the exact statement shapes', async () => {
    const client = createRecordingClient((entry) =>
      entry.ops.some(([m]) => m === 'select') ? { data: existing, error: null } : null,
    );
    getSupabase.mockResolvedValue(client);

    await categoriesService.syncAll(['Cameras', 'Audio'], { Audio: { trackQuantity: true } });

    // 1: fetch current state
    expect(client.calls[0]).toMatchObject({ table: 'categories' });
    expect(client.calls[0].ops).toEqual([
      ['select', ['*']],
      ['order', ['sort_order']],
    ]);
    // 2: category delete — same .delete().eq('name') statement delete() issues
    expect(client.calls[1].table).toBe('categories');
    expect(client.calls[1].ops).toEqual([
      ['delete', []],
      ['eq', ['name', 'Lenses']],
    ]);
    // 3: the removed category's specs
    expect(client.calls[2].table).toBe('specs');
    expect(client.calls[2].ops).toEqual([
      ['delete', []],
      ['eq', ['category_name', 'Lenses']],
    ]);
    // 4: update by id — bare statement, no select/single tacked on
    expect(client.calls[3].table).toBe('categories');
    expect(client.calls[3].ops).toEqual([
      ['update', [{ track_quantity: false, track_serial_numbers: true, sort_order: 0 }]],
      ['eq', ['id', 1]],
    ]);
    // 5: insert with a generated unique prefix — bare statement
    expect(client.calls[4].table).toBe('categories');
    expect(client.calls[4].ops).toEqual([
      [
        'insert',
        [
          {
            name: 'Audio',
            prefix: 'AU',
            track_quantity: true,
            track_serial_numbers: true,
            sort_order: 1,
          },
        ],
      ],
    ]);
    expect(client.calls).toHaveLength(5);
    getSupabase.mockReset();
  });

  it('applies renames as row UPDATEs before diffing (id and specs survive)', async () => {
    const client = createRecordingClient((entry) =>
      entry.ops.some(([m]) => m === 'select')
        ? { data: [{ id: 1, name: 'Video', prefix: 'CA', sort_order: 0 }], error: null }
        : null,
    );
    getSupabase.mockResolvedValue(client);

    await categoriesService.syncAll(['Video'], {}, { Cameras: 'Video' });

    expect(client.calls[0].table).toBe('categories');
    expect(client.calls[0].ops).toEqual([
      ['update', [{ name: 'Video' }]],
      ['eq', ['name', 'Cameras']],
    ]);
    expect(client.calls[1].table).toBe('specs');
    expect(client.calls[1].ops).toEqual([
      ['update', [{ category_name: 'Video' }]],
      ['eq', ['category_name', 'Cameras']],
    ]);
    getSupabase.mockReset();
  });

  it('wraps a refused delete with the category name', async () => {
    const client = createRecordingClient((entry) => {
      if (entry.ops.some(([m]) => m === 'select')) return { data: existing, error: null };
      if (entry.ops.some(([m]) => m === 'delete'))
        return { data: null, error: new Error('RLS refused') };
      return null;
    });
    getSupabase.mockResolvedValue(client);

    await expect(categoriesService.syncAll(['Cameras'])).rejects.toThrow(
      'Failed to delete category "Lenses": RLS refused',
    );
    getSupabase.mockReset();
  });

  it('CRUD create/delete issue the same statements plus .select().single()', async () => {
    // categoriesService.update was deleted in the dead-code round (test-only
    // caller); syncAll still exercises updateCategoryById via its own path.
    const client = createRecordingClient(() => ({ data: { id: 7 }, error: null }));
    getSupabase.mockResolvedValue(client);

    await categoriesService.create({ name: 'Audio', prefix: 'AU' });
    await categoriesService.delete('Audio');

    expect(client.calls[0].ops).toEqual([
      ['insert', [{ name: 'Audio', prefix: 'AU' }]],
      ['select', []],
      ['single', []],
    ]);
    expect(client.calls[1].ops).toEqual([
      ['delete', []],
      ['eq', ['name', 'Audio']],
    ]);
    getSupabase.mockReset();
  });
});

describe('locationsService delete consolidation (§5.8)', () => {
  it('syncAll deletes every removed id in ONE .in statement and upserts the rest', async () => {
    const client = createRecordingClient((entry) =>
      entry.ops.some(([m]) => m === 'select')
        ? { data: [{ id: 'L1' }, { id: 'GONE1' }, { id: 'GONE2' }], error: null }
        : null,
    );
    getSupabase.mockResolvedValue(client);

    await locationsService.syncAll([{ id: 'L1', name: 'Keep', type: 'room' }]);

    expect(client.calls[1].table).toBe('locations');
    expect(client.calls[1].ops).toEqual([
      ['delete', []],
      ['in', ['id', ['GONE1', 'GONE2']]],
    ]);
    expect(client.calls[2].ops).toEqual([
      [
        'upsert',
        [
          [
            {
              id: 'L1',
              name: 'Keep',
              type: 'room',
              parent_id: null,
              path: 'Keep',
              depth: 0,
              sort_order: 0,
            },
          ],
          { onConflict: 'id' },
        ],
      ],
    ]);
    expect(client.calls).toHaveLength(3);
    getSupabase.mockReset();
  });

  it('delete(id) routes through the same batch statement', async () => {
    const client = createRecordingClient();
    getSupabase.mockResolvedValue(client);

    const result = await locationsService.delete('loc-9');

    expect(result).toEqual({ id: 'loc-9' });
    expect(client.calls[0].table).toBe('locations');
    expect(client.calls[0].ops).toEqual([
      ['delete', []],
      ['in', ['id', ['loc-9']]],
    ]);
    getSupabase.mockReset();
  });
});

describe('threaded notes orphan handling (B6)', () => {
  it('surfaces a reply whose parent is missing at the root instead of dropping it', async () => {
    const rows = [
      { id: 'n1', note: 'root note', parent_id: null, created_at: '2026-08-01T00:00:00Z' },
      { id: 'n2', note: 'reply to a deleted parent', parent_id: 'GONE', created_at: '2026-08-02T00:00:00Z' },
      { id: 'n3', note: 'reply to n1', parent_id: 'n1', created_at: '2026-08-03T00:00:00Z' },
    ];
    getSupabase.mockResolvedValueOnce(createMockSupabaseClient(rows));
    const threaded = await itemNotesService.getByItemId('ITEM1');
    expect(threaded.map((n) => n.id).sort()).toEqual(['n1', 'n2']);
    expect(threaded.find((n) => n.id === 'n1').replies.map((r) => r.id)).toEqual(['n3']);
  });
});

describe('emailService.sendDamageReport recipient guard (B7)', () => {
  it('fails loudly when there is nobody to email ([].every() used to report success)', async () => {
    const mock = createMockSupabaseClient({});
    getSupabase.mockResolvedValue(mock);
    const result = await emailService.sendDamageReport({
      admins: [],
      item: { id: 'X', name: 'Camera' },
      reportedBy: 'Tech',
      description: 'cracked',
    });
    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.error).toMatch(/no admin/i);
    expect(mock.functions.invoke).not.toHaveBeenCalled();
  });

  it('treats admins without an email address as absent', async () => {
    const mock = createMockSupabaseClient({});
    getSupabase.mockResolvedValue(mock);
    const result = await emailService.sendDamageReport({
      admins: [{ id: 'a1', email: null }, { id: 'a2' }],
      item: { id: 'X', name: 'Camera' },
      reportedBy: 'Tech',
      description: 'cracked',
    });
    expect(result.success).toBe(false);
    expect(mock.functions.invoke).not.toHaveBeenCalled();
  });
});
