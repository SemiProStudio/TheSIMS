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
  notificationLogService,
  emailService,
  inventoryService,
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
      }
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

describe('notificationLogService', () => {
  describe('getByUserId', () => {
    it('should return notifications array', async () => {
      const logs = [{ id: 'log-1', user_id: 'user-123' }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(logs));
      const result = await notificationLogService.getByUserId('user-123');
      expect(result).toEqual(logs);
    });

    it('should accept limit parameter', async () => {
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient([]));
      const result = await notificationLogService.getByUserId('user-123', 10);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return created notification', async () => {
      const notification = {
        user_id: 'user-123',
        email: 'test@example.com',
        notification_type: 'checkout_confirmation',
        subject: 'Test Subject',
      };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(notification));
      const result = await notificationLogService.create(notification);
      expect(result).toEqual(notification);
    });
  });

  describe('updateStatus', () => {
    it('should return updated status', async () => {
      const returnData = { id: 'log-123', status: 'sent' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(returnData));
      const result = await notificationLogService.updateStatus('log-123', 'sent');
      expect(result).toEqual(returnData);
    });

    it('should handle error message parameter', async () => {
      const returnData = { id: 'log-123', status: 'failed' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(returnData));
      const result = await notificationLogService.updateStatus('log-123', 'failed', 'Network error');
      expect(result).toEqual(returnData);
    });
  });
});

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
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(null, { message: 'Edge Function not deployed' }));
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
        })
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
        })
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
        })
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
        })
      );

      sendSpy.mockRestore();
    });
  });

  describe('sendDueDateReminder', () => {
    it('should call send with correct template', async () => {
      const sendSpy = vi.spyOn(emailService, 'send').mockResolvedValue({ success: true });

      await emailService.sendDueDateReminder({
        borrowerEmail: 'test@example.com',
        borrowerName: 'Test User',
        item: { id: 'CAM001', name: 'Camera', brand: 'Canon' },
        dueDate: '2024-01-22',
        checkoutDate: '2024-01-15',
      });

      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: 'due_date_reminder',
        })
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
      const lists = [{ id: 'pl-1', name: 'Corporate Shoot', created_at: '2024-01-01', pack_list_items: [], pack_list_packages: [] }];
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
      })
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
      const dbData = [{
        id: 'res-1',
        item_id: 'CAM001',
        client_id: 'client-1',
        start_date: '2024-02-01',
        end_date: '2024-02-05',
        status: 'confirmed',
        project: 'Film Shoot',
        notes: 'Handle with care',
        item: { id: 'CAM001', name: 'Camera', category_name: 'Cameras', brand: 'Canon', status: 'available' },
        client: { id: 'client-1', name: 'Test Client', type: 'company', email: 'a@b.com', phone: '555' },
      }];
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
      const dbData = [{
        id: 'maint-1',
        item_id: 'CAM001',
        maintenance_type: 'repair',
        status: 'scheduled',
        scheduled_date: '2024-03-01',
        description: 'Sensor cleaning',
        cost: 150,
        item: { id: 'CAM001', name: 'Camera', category_name: 'Cameras', brand: 'Canon' },
      }];
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbData));
      const result = await maintenanceService.getAll();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'maint-1');
    });
  });

  describe('create', () => {
    it('should reject invalid maintenance records', async () => {
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
});

// =============================================================================
// Categories Service Tests
// =============================================================================

describe('categoriesService', () => {
  describe('getAll', () => {
    it('should return categories array', async () => {
      const cats = [{ id: 1, name: 'Cameras' }, { id: 2, name: 'Lenses' }];
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
      const dbItem = { id: 'CAM002', name: 'New Camera', category_name: 'Cameras', status: 'available' };
      getSupabase.mockResolvedValueOnce(createMockSupabaseClient(dbItem));
      const result = await inventoryService.create({ name: 'New Camera', category: 'Cameras', category_name: 'Cameras' });
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
    it('should return item with nested details', async () => {
      const dbItem = {
        id: 'CAM001', name: 'Camera', category_name: 'Cameras',
      };
      // getByIdWithDetails makes 6 parallel calls (getById + 5 related services)
      // Use persistent mock that returns empty arrays for all
      getSupabase.mockResolvedValue(createMockSupabaseClient(dbItem));
      const result = await inventoryService.getByIdWithDetails('CAM001');
      expect(result).toBeDefined();
      expect(result.id).toBe('CAM001');
      expect(result).toHaveProperty('notes');
      expect(result).toHaveProperty('reminders');
      expect(result).toHaveProperty('reservations');
      // Reset to avoid leaking into other tests
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
