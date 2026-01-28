// =============================================================================
// Services Layer Tests
// Tests for Supabase service functions
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client before importing services
vi.mock('../lib/supabase.js', () => ({
  isDemoMode: true,
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
        limit: vi.fn(() => Promise.resolve({ data: responseData, error })),
      })),
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
// Notification Preferences Service Tests
// =============================================================================

describe('notificationPreferencesService', () => {
  describe('getByUserId', () => {
    it('should return null in demo mode', async () => {
      const result = await notificationPreferencesService.getByUserId('user-123');
      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should return preferences in demo mode', async () => {
      const prefs = {
        email_enabled: true,
        due_date_reminders: true,
      };
      const result = await notificationPreferencesService.upsert('user-123', prefs);
      expect(result).toEqual(prefs);
    });
  });

  describe('update', () => {
    it('should return updates in demo mode', async () => {
      const updates = { email_enabled: false };
      const result = await notificationPreferencesService.update('user-123', updates);
      expect(result).toEqual(updates);
    });
  });
});

// =============================================================================
// Notification Log Service Tests
// =============================================================================

describe('notificationLogService', () => {
  describe('getByUserId', () => {
    it('should return empty array in demo mode', async () => {
      const result = await notificationLogService.getByUserId('user-123');
      expect(result).toEqual([]);
    });

    it('should accept limit parameter', async () => {
      const result = await notificationLogService.getByUserId('user-123', 10);
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return notification in demo mode', async () => {
      const notification = {
        user_id: 'user-123',
        email: 'test@example.com',
        notification_type: 'checkout_confirmation',
        subject: 'Test Subject',
      };
      const result = await notificationLogService.create(notification);
      expect(result).toEqual(notification);
    });
  });

  describe('updateStatus', () => {
    it('should return status update in demo mode', async () => {
      const result = await notificationLogService.updateStatus('log-123', 'sent');
      expect(result).toEqual({ id: 'log-123', status: 'sent' });
    });

    it('should include error message when provided', async () => {
      const result = await notificationLogService.updateStatus('log-123', 'failed', 'Network error');
      expect(result).toEqual({ id: 'log-123', status: 'failed' });
    });
  });
});

// =============================================================================
// Email Service Tests
// =============================================================================

describe('emailService', () => {
  describe('send', () => {
    it('should return success with demo flag in demo mode', async () => {
      const result = await emailService.send({
        to: 'test@example.com',
        templateKey: 'checkout_confirmation',
        templateData: { borrower_name: 'Test User' },
      });
      expect(result).toEqual({ success: true, demo: true });
    });

    it('should log email details in demo mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await emailService.send({
        to: 'test@example.com',
        templateKey: 'checkout_confirmation',
        templateData: { item_name: 'Camera' },
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Demo Mode] Would send email:',
        expect.objectContaining({
          to: 'test@example.com',
          templateKey: 'checkout_confirmation',
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('sendCheckoutConfirmation', () => {
    it('should call send with correct template data', async () => {
      const sendSpy = vi.spyOn(emailService, 'send');
      
      await emailService.sendCheckoutConfirmation({
        borrowerEmail: 'borrower@example.com',
        borrowerName: 'John Doe',
        item: { id: 'CAM001', name: 'Canon R5', brand: 'Canon' },
        checkoutDate: '2024-01-15',
        dueDate: '2024-01-22',
        project: 'Corporate Video',
      });
      
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'borrower@example.com',
        templateKey: 'checkout_confirmation',
        templateData: expect.objectContaining({
          borrower_name: 'John Doe',
          item_name: 'Canon R5',
          item_id: 'CAM001',
          item_brand: 'Canon',
          checkout_date: '2024-01-15',
          due_date: '2024-01-22',
          project: 'Corporate Video',
          company_name: 'SIMS',
        }),
      });
      
      sendSpy.mockRestore();
    });
  });

  describe('sendCheckinConfirmation', () => {
    it('should call send with correct template data', async () => {
      const sendSpy = vi.spyOn(emailService, 'send');
      
      await emailService.sendCheckinConfirmation({
        borrowerEmail: 'borrower@example.com',
        borrowerName: 'John Doe',
        item: { id: 'CAM001', name: 'Canon R5' },
        returnDate: '2024-01-20',
      });
      
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'borrower@example.com',
        templateKey: 'checkin_confirmation',
        templateData: expect.objectContaining({
          borrower_name: 'John Doe',
          item_name: 'Canon R5',
          item_id: 'CAM001',
          return_date: '2024-01-20',
          company_name: 'SIMS',
        }),
      });
      
      sendSpy.mockRestore();
    });
  });

  describe('sendReservationConfirmation', () => {
    it('should call send with correct template data', async () => {
      const sendSpy = vi.spyOn(emailService, 'send');
      
      await emailService.sendReservationConfirmation({
        userEmail: 'user@example.com',
        userName: 'Jane Smith',
        item: { id: 'LENS001', name: '24-70mm f/2.8', brand: 'Canon' },
        reservation: {
          project: 'Wedding Shoot',
          start: '2024-02-01',
          end: '2024-02-03',
        },
      });
      
      expect(sendSpy).toHaveBeenCalledWith({
        to: 'user@example.com',
        templateKey: 'reservation_confirmation',
        templateData: expect.objectContaining({
          user_name: 'Jane Smith',
          item_name: '24-70mm f/2.8',
          item_id: 'LENS001',
          item_brand: 'Canon',
          project_name: 'Wedding Shoot',
          start_date: '2024-02-01',
          end_date: '2024-02-03',
          company_name: 'SIMS',
        }),
      });
      
      sendSpy.mockRestore();
    });
  });

  describe('sendDueDateReminder', () => {
    it('should use due_date_reminder template for upcoming due dates', async () => {
      const sendSpy = vi.spyOn(emailService, 'send');
      
      await emailService.sendDueDateReminder({
        borrowerEmail: 'borrower@example.com',
        borrowerName: 'John Doe',
        item: { id: 'CAM001', name: 'Canon R5' },
        dueDate: '2024-01-22',
        daysUntilDue: 3,
      });
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: 'due_date_reminder',
        })
      );
      
      sendSpy.mockRestore();
    });

    it('should use overdue_notice template for overdue items', async () => {
      const sendSpy = vi.spyOn(emailService, 'send');
      
      await emailService.sendDueDateReminder({
        borrowerEmail: 'borrower@example.com',
        borrowerName: 'John Doe',
        item: { id: 'CAM001', name: 'Canon R5' },
        dueDate: '2024-01-15',
        daysUntilDue: -3,
      });
      
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          templateKey: 'overdue_notice',
        })
      );
      
      sendSpy.mockRestore();
    });
  });
});

// =============================================================================
// Inventory Service Tests (Demo Mode)
// =============================================================================

describe('inventoryService (demo mode)', () => {
  describe('getAll', () => {
    it('should return empty array in demo mode', async () => {
      const result = await inventoryService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return null in demo mode', async () => {
      const result = await inventoryService.getById('CAM001');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should return the item in demo mode', async () => {
      const item = { id: 'CAM001', name: 'Test Camera' };
      const result = await inventoryService.create(item);
      expect(result).toEqual(item);
    });
  });

  describe('update', () => {
    it('should return updates in demo mode', async () => {
      const updates = { name: 'Updated Camera' };
      const result = await inventoryService.update('CAM001', updates);
      expect(result).toEqual(updates);
    });
  });

  describe('delete', () => {
    it('should return id in demo mode', async () => {
      const result = await inventoryService.delete('CAM001');
      expect(result).toEqual({ id: 'CAM001' });
    });
  });
});

// =============================================================================
// Clients Service Tests (Demo Mode)
// =============================================================================

describe('clientsService (demo mode)', () => {
  describe('getAll', () => {
    it('should return empty array in demo mode', async () => {
      const result = await clientsService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return the client in demo mode', async () => {
      const client = { id: 'client-1', name: 'Test Client' };
      const result = await clientsService.create(client);
      expect(result).toEqual(client);
    });
  });
});

// =============================================================================
// Packages Service Tests (Demo Mode)
// =============================================================================

describe('packagesService (demo mode)', () => {
  describe('getAll', () => {
    it('should return empty array in demo mode', async () => {
      const result = await packagesService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return the package in demo mode', async () => {
      const pkg = { id: 'pkg-1', name: 'Interview Kit' };
      const result = await packagesService.create(pkg);
      expect(result).toEqual(pkg);
    });
  });
});

// =============================================================================
// Pack Lists Service Tests (Demo Mode)
// =============================================================================

describe('packListsService (demo mode)', () => {
  describe('getAll', () => {
    it('should return empty array in demo mode', async () => {
      const result = await packListsService.getAll();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should return the pack list in demo mode', async () => {
      const packList = { id: 'pl-1', name: 'Corporate Shoot' };
      const result = await packListsService.create(packList);
      expect(result).toEqual(packList);
    });
  });
});

// =============================================================================
// Service Error Handling Tests
// =============================================================================

describe('Service Error Handling', () => {
  it('emailService.send should handle missing email gracefully', async () => {
    // Should not throw in demo mode
    const result = await emailService.send({
      to: '',
      templateKey: 'checkout_confirmation',
      templateData: {},
    });
    expect(result).toEqual({ success: true, demo: true });
  });

  it('emailService helper methods should handle missing item properties', async () => {
    const sendSpy = vi.spyOn(emailService, 'send');
    
    await emailService.sendCheckoutConfirmation({
      borrowerEmail: 'test@example.com',
      borrowerName: 'Test',
      item: { id: 'CAM001', name: 'Camera' }, // No brand
      checkoutDate: '2024-01-15',
      dueDate: '2024-01-22',
    });
    
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        templateData: expect.objectContaining({
          item_brand: '', // Should default to empty string
        }),
      })
    );
    
    sendSpy.mockRestore();
  });
});
