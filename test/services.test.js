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
} from '../lib/services.js';

// =============================================================================
// Mock Supabase Response Helpers
// =============================================================================

const createMockSupabaseClient = (responseData = null, error = null) => ({
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: responseData, error })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: responseData, error })),
        })),
      })),
      order: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: responseData, error })),
        limit: vi.fn(() => Promise.resolve({ data: responseData, error })),
      })),
      single: vi.fn(() => Promise.resolve({ data: responseData, error })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: responseData, error })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: responseData, error })),
        })),
      })),
    })),
    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: responseData, error })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: responseData, error })),
    })),
  })),
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
        contactEmail: 'test@example.com',
        contactName: 'Test User',
        items: [{ id: 'CAM001', name: 'Camera' }],
        project: 'Film Shoot',
        startDate: '2024-02-01',
        endDate: '2024-02-05',
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
      const pkgs = [{ id: 'pkg-1', name: 'Interview Kit' }];
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
      const lists = [{ id: 'pl-1', name: 'Corporate Shoot', created_at: '2024-01-01' }];
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
