// =============================================================================
// DataContext Tests
// Tests for the DataContext provider and its methods
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { DataProvider } from '../contexts/DataContext.jsx';
import { useData } from '../contexts/DataContext.js';

// Mock the Supabase client
vi.mock('../lib/supabase.js', () => ({
  isDemoMode: true,
  getSupabase: vi.fn(),
  supabase: null,
}));

// Mock the services
vi.mock('../lib/services.js', () => ({
  freshnessService: {
    check: vi.fn(() => Promise.resolve({ server_time: '2026-08-10T12:00:00.000Z' })),
  },
  inventoryService: {
    getAll: vi.fn(() =>
      Promise.resolve([
        { id: 'CAM001', name: 'Test Camera', status: 'available', category_name: 'Cameras' },
        { id: 'LENS001', name: 'Test Lens', status: 'available', category_name: 'Lenses' },
      ]),
    ),
    create: vi.fn((item) => Promise.resolve(item)),
    update: vi.fn((id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn((id) => Promise.resolve({ id })),
    // Real service returns { item, historyEvent } — the history row is
    // mirrored into the cached activity window by DataContext
    checkOut: vi.fn((id, data) =>
      Promise.resolve({
        item: { id, status: 'checked-out', ...data },
        historyEvent: {
          id: `evt-out-${id}`,
          itemId: id,
          action: 'checkout',
          type: 'checkout',
          timestamp: '2026-08-14T10:00:00.000Z',
        },
      }),
    ),
    checkIn: vi.fn((id, data) =>
      Promise.resolve({
        item: { id, status: 'available', ...data },
        historyEvent: {
          id: `evt-in-${id}`,
          itemId: id,
          action: 'checkin',
          type: 'return',
          timestamp: '2026-08-14T11:00:00.000Z',
        },
      }),
    ),
    getSince: vi.fn(() => Promise.resolve([])),
    getIds: vi.fn(() => Promise.resolve(new Set(['CAM001', 'LENS001']))),
    getByIdWithDetails: vi.fn((id) =>
      Promise.resolve({
        id,
        name: 'Test Camera',
        notes: [],
        reminders: [],
        reservations: [],
        maintenanceHistory: [],
        checkoutHistory: [],
      }),
    ),
  },
  packagesService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 'pkg-1', name: 'Interview Kit' }])),
    create: vi.fn((pkg) => Promise.resolve(pkg)),
    update: vi.fn((id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn((id) => Promise.resolve({ id })),
  },
  packListsService: {
    getAll: vi.fn(() => Promise.resolve([])),
    create: vi.fn((pl) => Promise.resolve(pl)),
    update: vi.fn((id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn((id) => Promise.resolve({ id })),
    toggleItemPacked: vi.fn(() => Promise.resolve({})),
  },
  clientsService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 'client-1', name: 'Test Client' }])),
    create: vi.fn((client) => Promise.resolve(client)),
    update: vi.fn((id, updates) => Promise.resolve({ id, ...updates })),
    delete: vi.fn((id) => Promise.resolve({ id })),
  },
  usersService: {
    getAll: vi.fn(() => Promise.resolve([{ id: 'user-1', name: 'Admin', role: 'admin' }])),
  },
  rolesService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  locationsService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  categoriesService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  specsService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  auditLogService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  reservationsService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getSince: vi.fn(() => Promise.resolve([])),
    getIds: vi.fn(() => Promise.resolve(new Set())),
  },
  maintenanceService: {
    getAll: vi.fn(() => Promise.resolve([])),
    getAllPending: vi.fn(() => Promise.resolve([])),
  },
  itemNotesService: {
    create: vi.fn((note) => Promise.resolve(note)),
    delete: vi.fn(() => Promise.resolve()),
  },
  itemRemindersService: {
    create: vi.fn((r) => Promise.resolve(r)),
    update: vi.fn((id, u) => Promise.resolve({ id, ...u })),
    delete: vi.fn(() => Promise.resolve()),
    getAllActive: vi.fn(() => Promise.resolve([])),
  },
  checkoutHistoryService: {
    create: vi.fn((r) => Promise.resolve(r)),
    getRecent: vi.fn(() => Promise.resolve([])),
  },
  notificationPreferencesService: {
    getByUserId: vi.fn(() => Promise.resolve(null)),
    upsert: vi.fn((userId, prefs) => Promise.resolve(prefs)),
    update: vi.fn((userId, updates) => Promise.resolve(updates)),
  },
  emailService: {
    send: vi.fn(() => Promise.resolve({ success: true, demo: true })),
    sendCheckoutConfirmation: vi.fn(() => Promise.resolve({ success: true, demo: true })),
    sendCheckinConfirmation: vi.fn(() => Promise.resolve({ success: true, demo: true })),
    sendReservationConfirmation: vi.fn(() => Promise.resolve({ success: true, demo: true })),
  },
}));

vi.mock('../constants.js', async (importOriginal) => ({
  // Partial: utils (status reconciliation) reads STATUS from the real module
  ...(await importOriginal()),
  DEFAULT_ROLES: [{ id: 'admin', name: 'Admin' }],
  DEFAULT_LOCATIONS: [{ id: 'loc-1', name: 'Main Storage' }],
  DEFAULT_SPECS: {},
}));

// =============================================================================
// Test Component to access context
// =============================================================================

function TestConsumer({ onContextReady }) {
  const context = useData();

  // Call the callback with context on mount
  React.useEffect(() => {
    if (context && !context.loading) {
      onContextReady(context);
    }
  }, [context, context?.loading, onContextReady]);

  if (context?.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div data-testid="inventory-count">{context?.inventory?.length || 0}</div>
      <div data-testid="packages-count">{context?.packages?.length || 0}</div>
      <div data-testid="clients-count">{context?.clients?.length || 0}</div>
      <div data-testid="is-demo-mode">{context?.isDemoMode ? 'true' : 'false'}</div>
    </div>
  );
}

import React from 'react';

// =============================================================================
// Provider Tests
// =============================================================================

describe('DataProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render children', async () => {
      render(
        <DataProvider>
          <div data-testid="child">Child Content</div>
        </DataProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('child')).toBeInTheDocument();
      });
    });

    it('should provide context to children', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext).not.toBeNull();
      });
    });

    it('should complete loading', async () => {
      render(
        <DataProvider>
          <TestConsumer onContextReady={() => {}} />
        </DataProvider>,
      );

      await waitFor(() => {
        // After loading, inventory-count should be rendered (not "Loading...")
        expect(screen.getByTestId('inventory-count')).toBeInTheDocument();
      });
    });

    it('should start with empty data when services return empty', async () => {
      render(
        <DataProvider>
          <TestConsumer onContextReady={() => {}} />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('inventory-count')).toHaveTextContent('2');
      });
    });
  });

  // =============================================================================
  // Context Value Tests
  // =============================================================================

  describe('Context Value', () => {
    it('should provide inventory array', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.inventory).toBeInstanceOf(Array);
      });
    });

    it('should provide packages array', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.packages).toBeInstanceOf(Array);
      });
    });

    it('should provide clients array', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.clients).toBeInstanceOf(Array);
      });
    });

    it('should provide CRUD methods', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(typeof capturedContext?.createItem).toBe('function');
        expect(typeof capturedContext?.updateItem).toBe('function');
        expect(typeof capturedContext?.deleteItem).toBe('function');
        expect(typeof capturedContext?.createPackage).toBe('function');
        expect(typeof capturedContext?.updatePackage).toBe('function');
        expect(typeof capturedContext?.deletePackage).toBe('function');
        expect(typeof capturedContext?.createClient).toBe('function');
        expect(typeof capturedContext?.updateClient).toBe('function');
        expect(typeof capturedContext?.deleteClient).toBe('function');
      });
    });

    it('should provide notification methods', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(typeof capturedContext?.saveNotificationPreferences).toBe('function');
        expect(typeof capturedContext?.getNotificationPreferences).toBe('function');
        expect(typeof capturedContext?.sendCheckoutEmail).toBe('function');
        expect(typeof capturedContext?.sendCheckinEmail).toBe('function');
        expect(typeof capturedContext?.sendReservationEmail).toBe('function');
      });
    });

    it('should provide patch operations', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(typeof capturedContext?.patchInventoryItem).toBe('function');
        expect(typeof capturedContext?.addInventoryItems).toBe('function');
        expect(typeof capturedContext?.removeInventoryItems).toBe('function');
        expect(typeof capturedContext?.mapInventory).toBe('function');
        expect(typeof capturedContext?.patchPackage).toBe('function');
        expect(typeof capturedContext?.patchClient).toBe('function');
        expect(typeof capturedContext?.patchUser).toBe('function');
      });
    });
  });

  // =============================================================================
  // Inventory CRUD Tests
  // =============================================================================

  describe('Inventory CRUD Operations', () => {
    it('createItem should add item to inventory', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.createItem).toBeDefined();
      });

      const newItem = { id: 'NEW001', name: 'New Camera', status: 'available' };

      await act(async () => {
        await capturedContext.createItem(newItem);
      });

      // Verify item was added
      expect(capturedContext.inventory).toContainEqual(expect.objectContaining({ id: 'NEW001' }));
    });

    it('updateItem should modify existing item', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.updateItem).toBeDefined();
      });

      await act(async () => {
        await capturedContext.updateItem('CAM001', { name: 'Updated Camera' });
      });

      const updatedItem = capturedContext.inventory.find((i) => i.id === 'CAM001');
      expect(updatedItem?.name).toBe('Updated Camera');
    });

    it('deleteItem should remove item from inventory', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.deleteItem).toBeDefined();
      });

      const initialCount = capturedContext.inventory.length;

      await act(async () => {
        await capturedContext.deleteItem('CAM001');
      });

      expect(capturedContext.inventory.length).toBe(initialCount - 1);
      expect(capturedContext.inventory.find((i) => i.id === 'CAM001')).toBeUndefined();
    });
  });

  // =============================================================================
  // Package CRUD Tests
  // =============================================================================

  describe('Package CRUD Operations', () => {
    it('createPackage should add package', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.createPackage).toBeDefined();
      });

      const newPackage = { id: 'pkg-new', name: 'New Package' };

      await act(async () => {
        await capturedContext.createPackage(newPackage);
      });

      expect(capturedContext.packages).toContainEqual(expect.objectContaining({ id: 'pkg-new' }));
    });

    it('updatePackage should modify existing package', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.updatePackage).toBeDefined();
      });

      await act(async () => {
        await capturedContext.updatePackage('pkg-1', { name: 'Updated Kit' });
      });

      const updatedPkg = capturedContext.packages.find((p) => p.id === 'pkg-1');
      expect(updatedPkg?.name).toBe('Updated Kit');
    });

    it('deletePackage should remove package', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.deletePackage).toBeDefined();
      });

      await act(async () => {
        await capturedContext.deletePackage('pkg-1');
      });

      expect(capturedContext.packages.find((p) => p.id === 'pkg-1')).toBeUndefined();
    });
  });

  // =============================================================================
  // Client CRUD Tests
  // =============================================================================

  describe('Client CRUD Operations', () => {
    it('createClient should add client', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.createClient).toBeDefined();
      });

      const newClient = { id: 'client-new', name: 'New Client' };

      await act(async () => {
        await capturedContext.createClient(newClient);
      });

      expect(capturedContext.clients).toContainEqual(expect.objectContaining({ id: 'client-new' }));
    });

    it('updateClient should modify existing client', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.updateClient).toBeDefined();
      });

      // Lazy-load clients first (mirrors real app flow where views call ensureClients)
      await act(async () => {
        await capturedContext.ensureClients();
      });

      await act(async () => {
        await capturedContext.updateClient('client-1', { name: 'Updated Client' });
      });

      const updatedClient = capturedContext.clients.find((c) => c.id === 'client-1');
      expect(updatedClient?.name).toBe('Updated Client');
    });

    it('deleteClient should remove client', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.deleteClient).toBeDefined();
      });

      // Lazy-load clients first (mirrors real app flow where views call ensureClients)
      await act(async () => {
        await capturedContext.ensureClients();
      });

      // Verify client-1 exists before deletion
      expect(capturedContext.clients.find((c) => c.id === 'client-1')).toBeDefined();

      await act(async () => {
        await capturedContext.deleteClient('client-1');
      });

      expect(capturedContext.clients.find((c) => c.id === 'client-1')).toBeUndefined();
    });
  });

  // =============================================================================
  // Lazy-load error signaling (deferred-hardening round, HONEST-7)
  // A failed lazy layer must SAY so — views used to show a permanent spinner
  // (ClientsView) or silently-empty data (AuditLogView) with no retry.
  // =============================================================================

  describe('Lazy-load error signaling', () => {
    it('a failed ensureClients sets lazyErrors.clients and leaves the layer unloaded', async () => {
      const { clientsService } = await import('../lib/services.js');
      clientsService.getAll.mockRejectedValueOnce(new Error('network down'));

      let capturedContext = null;
      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.ensureClients).toBeDefined();
      });

      await act(async () => {
        await capturedContext.ensureClients();
      });

      expect(capturedContext.lazyErrors?.clients).toBe(true);
      expect(capturedContext.clientsLoaded).toBe(false);
    });

    it('a retry clears the flag and loads the layer', async () => {
      const { clientsService } = await import('../lib/services.js');
      clientsService.getAll.mockRejectedValueOnce(new Error('network down'));

      let capturedContext = null;
      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.ensureClients).toBeDefined();
      });

      await act(async () => {
        await capturedContext.ensureClients();
      });
      expect(capturedContext.lazyErrors?.clients).toBe(true);

      // The mock is back to resolving — the retry succeeds
      await act(async () => {
        await capturedContext.ensureClients();
      });

      expect(capturedContext.lazyErrors?.clients).toBe(false);
      expect(capturedContext.clientsLoaded).toBe(true);
      expect(capturedContext.clients).toContainEqual(expect.objectContaining({ id: 'client-1' }));
    });
  });

  // =============================================================================
  // Notification Operation Tests
  // =============================================================================

  describe('Notification Operations', () => {
    it('saveNotificationPreferences should call service upsert', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.saveNotificationPreferences).toBeDefined();
      });

      const prefs = { email_enabled: true, due_date_reminders: true };

      let result;
      await act(async () => {
        result = await capturedContext.saveNotificationPreferences('user-1', prefs);
      });

      expect(result).toEqual(prefs);
    });

    it('sendCheckoutEmail should return success in demo mode', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.sendCheckoutEmail).toBeDefined();
      });

      let result;
      await act(async () => {
        result = await capturedContext.sendCheckoutEmail({
          borrowerEmail: 'test@example.com',
          borrowerName: 'Test User',
          item: { id: 'CAM001', name: 'Camera' },
          checkoutDate: '2024-01-15',
          dueDate: '2024-01-22',
          project: 'Test Project',
        });
      });

      expect(result).toEqual({ success: true, demo: true });
    });

    it('sendCheckinEmail should return success in demo mode', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.sendCheckinEmail).toBeDefined();
      });

      let result;
      await act(async () => {
        result = await capturedContext.sendCheckinEmail({
          borrowerEmail: 'test@example.com',
          borrowerName: 'Test User',
          item: { id: 'CAM001', name: 'Camera' },
          returnDate: '2024-01-20',
        });
      });

      expect(result).toEqual({ success: true, demo: true });
    });

    it('sendReservationEmail should return success in demo mode', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.sendReservationEmail).toBeDefined();
      });

      let result;
      await act(async () => {
        result = await capturedContext.sendReservationEmail({
          userEmail: 'test@example.com',
          userName: 'Test User',
          item: { id: 'CAM001', name: 'Camera' },
          reservation: {
            project: 'Test Project',
            start: '2024-02-01',
            end: '2024-02-03',
          },
        });
      });

      expect(result).toEqual({ success: true, demo: true });
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('Error Handling', () => {
    it('should handle createItem errors gracefully', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.createItem).toBeDefined();
      });

      // Create item with missing data should still work in demo mode
      await act(async () => {
        await capturedContext.createItem({ id: 'test' });
      });

      expect(capturedContext.inventory.find((i) => i.id === 'test')).toBeDefined();
    });

    it('should handle updateItem with non-existent id', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.updateItem).toBeDefined();
      });

      // Should not throw
      await act(async () => {
        await capturedContext.updateItem('non-existent-id', { name: 'Test' });
      });
    });

    it('should handle deleteItem with non-existent id', async () => {
      let capturedContext = null;

      render(
        <DataProvider>
          <TestConsumer
            onContextReady={(ctx) => {
              capturedContext = ctx;
            }}
          />
        </DataProvider>,
      );

      await waitFor(() => {
        expect(capturedContext?.deleteItem).toBeDefined();
      });

      const initialCount = capturedContext.inventory.length;

      // Should not throw and inventory should remain unchanged
      await act(async () => {
        await capturedContext.deleteItem('non-existent-id');
      });

      expect(capturedContext.inventory.length).toBe(initialCount);
    });
  });
});

// =============================================================================
// Check Out / Check In State Transition Tests
// =============================================================================

describe('Check Out / Check In State Transitions', () => {
  it('checkOutItem transitions item to checked-out status', async () => {
    let capturedContext;

    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );

    await waitFor(() => {
      expect(capturedContext?.checkOutItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });

    const checkoutData = {
      userName: 'Alice',
      userId: 'user-alice',
      dueBack: '2025-06-15',
      project: 'Wedding Shoot',
      clientId: 'client-1',
    };

    await act(async () => {
      await capturedContext.checkOutItem('CAM001', checkoutData);
    });

    // Verify state transition
    const item = capturedContext.inventory.find((i) => i.id === 'CAM001');
    expect(item.status).toBe('checked-out');
    expect(item.checkedOutTo).toBe('Alice');
    expect(item.checkedOutToUserId).toBe('user-alice');
    expect(item.dueBack).toBe('2025-06-15');
    expect(item.checkoutProject).toBe('Wedding Shoot');
    expect(item.checkoutClientId).toBe('client-1');
    expect(item.checkedOutDate).toBeTruthy(); // today's date
  });

  it('checkInItem transitions item back to available', async () => {
    let capturedContext;

    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );

    await waitFor(() => {
      expect(capturedContext?.checkOutItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });

    // First check out
    await act(async () => {
      await capturedContext.checkOutItem('CAM001', {
        userName: 'Bob',
        userId: 'user-bob',
        dueBack: '2025-07-01',
        project: 'Studio',
        clientId: 'client-2',
      });
    });

    expect(capturedContext.inventory.find((i) => i.id === 'CAM001').status).toBe('checked-out');

    // Then check in
    await act(async () => {
      await capturedContext.checkInItem('CAM001', {
        returnedBy: 'Bob',
        userId: 'user-bob',
        condition: 'good',
        damageReported: false,
      });
    });

    const item = capturedContext.inventory.find((i) => i.id === 'CAM001');
    expect(item.status).toBe('available');
    expect(item.condition).toBe('good');
    expect(item.checkedOutTo).toBeNull();
    expect(item.checkedOutToUserId).toBeNull();
    expect(item.checkedOutDate).toBeNull();
    expect(item.dueBack).toBeNull();
    expect(item.checkoutProject).toBeNull();
    expect(item.checkoutClientId).toBeNull();
  });

  it('checkInItem keeps BOTH return notes and condition notes (wiring fix 2026-08-24)', async () => {
    // `returnNotes || conditionNotes` used to throw the condition-change
    // explanation away whenever a return note was also written
    let capturedContext;

    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );

    await waitFor(() => {
      expect(capturedContext?.checkInItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });

    const { inventoryService } = await import('../lib/services.js');
    inventoryService.checkIn.mockClear();

    await act(async () => {
      await capturedContext.checkInItem('CAM001', {
        returnedBy: 'Bob',
        userId: 'user-bob',
        condition: 'good',
        returnNotes: 'Returned after the studio day',
        conditionNotes: 'small scratch on the lens hood',
        damageReported: false,
      });
    });

    expect(inventoryService.checkIn).toHaveBeenCalledWith(
      'CAM001',
      expect.objectContaining({
        notes: 'Returned after the studio day — Condition: small scratch on the lens hood',
      }),
    );

    // One field alone still round-trips untouched
    inventoryService.checkIn.mockClear();
    await act(async () => {
      await capturedContext.checkInItem('CAM001', {
        returnedBy: 'Bob',
        userId: 'user-bob',
        condition: 'good',
        conditionNotes: 'sticky zoom ring',
        damageReported: false,
      });
    });
    expect(inventoryService.checkIn).toHaveBeenCalledWith(
      'CAM001',
      expect.objectContaining({ notes: 'Condition: sticky zoom ring' }),
    );
  });

  it('checkInItem sets needs-attention when damage is reported', async () => {
    let capturedContext;

    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );

    await waitFor(() => {
      expect(capturedContext?.checkOutItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });

    // Check out first
    await act(async () => {
      await capturedContext.checkOutItem('CAM001', {
        userName: 'Carol',
        userId: 'user-carol',
        dueBack: '2025-08-01',
      });
    });

    // Check in with damage
    await act(async () => {
      await capturedContext.checkInItem('CAM001', {
        returnedBy: 'Carol',
        userId: 'user-carol',
        condition: 'poor',
        damageReported: true,
        damageDescription: 'Cracked LCD screen',
      });
    });

    const item = capturedContext.inventory.find((i) => i.id === 'CAM001');
    expect(item.status).toBe('needs-attention');
    expect(item.condition).toBe('poor');
    expect(item.checkedOutTo).toBeNull();
  });

  it('checkOutItem does not affect other items', async () => {
    let capturedContext;

    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );

    await waitFor(() => {
      expect(capturedContext?.checkOutItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBe(2);
    });

    await act(async () => {
      await capturedContext.checkOutItem('CAM001', {
        userName: 'Dave',
        userId: 'user-dave',
        dueBack: '2025-09-01',
      });
    });

    // CAM001 should be checked out
    expect(capturedContext.inventory.find((i) => i.id === 'CAM001').status).toBe('checked-out');
    // LENS001 should remain available
    expect(capturedContext.inventory.find((i) => i.id === 'LENS001').status).toBe('available');
  });
});

// =============================================================================
// useData Hook Tests
// =============================================================================

describe('useData Hook', () => {
  it('should throw when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function BadComponent() {
      const data = useData();
      return <div>{data?.inventory?.length}</div>;
    }

    expect(() => render(<BadComponent />)).toThrow();

    consoleSpy.mockRestore();
  });
});

// =============================================================================
// Lazy-Cache Coherence Tests
// The Activity/Maintenance report caches must stay coherent through mutations
// and mid-session reloads (whole-app hardening round, DATA-1/DATA-2)
// =============================================================================

describe('Checkout activity cache coherence', () => {
  async function setup() {
    let capturedContext;
    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );
    await waitFor(() => {
      expect(capturedContext?.checkOutItem).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });
    return () => capturedContext;
  }

  it('checkOutItem mirrors the created history event into checkoutEvents', async () => {
    const ctx = await setup();

    await act(async () => {
      await ctx().checkOutItem('CAM001', { userName: 'Alice', userId: 'u1' });
    });

    expect(ctx().checkoutEvents.map((e) => e.id)).toContain('evt-out-CAM001');
  });

  it('checkInItem mirrors the created history event into checkoutEvents', async () => {
    const ctx = await setup();

    await act(async () => {
      await ctx().checkOutItem('CAM001', { userName: 'Alice', userId: 'u1' });
      await ctx().checkInItem('CAM001', { returnedBy: 'Alice', userId: 'u1', condition: 'good' });
    });

    const ids = ctx().checkoutEvents.map((e) => e.id);
    expect(ids).toContain('evt-out-CAM001');
    expect(ids).toContain('evt-in-CAM001');
  });

  it('a missing history row (insert failed) adds no phantom event', async () => {
    const { inventoryService } = await import('../lib/services.js');
    inventoryService.checkOut.mockResolvedValueOnce({
      item: { id: 'CAM001', status: 'checked-out' },
      historyEvent: null,
    });
    const ctx = await setup();

    await act(async () => {
      await ctx().checkOutItem('CAM001', { userName: 'Alice', userId: 'u1' });
    });

    expect(ctx().checkoutEvents).toHaveLength(0);
  });

  it('ensureCheckoutActivity merges by id — session events survive a stale snapshot', async () => {
    const { checkoutHistoryService } = await import('../lib/services.js');
    // Snapshot fetched from the server does NOT include the event created
    // this session (fetch raced the insert)
    checkoutHistoryService.getRecent.mockResolvedValue([
      { id: 'srv-1', itemId: 'LENS001', action: 'checkout', timestamp: '2026-08-01T09:00:00Z' },
    ]);
    const ctx = await setup();

    await act(async () => {
      await ctx().checkOutItem('CAM001', { userName: 'Alice', userId: 'u1' });
    });
    await act(async () => {
      await ctx().ensureCheckoutActivity();
    });

    const ids = ctx().checkoutEvents.map((e) => e.id);
    expect(ids).toContain('srv-1');
    expect(ids).toContain('evt-out-CAM001'); // not clobbered by the snapshot
    expect(ctx().checkoutEventsLoaded).toBe(true);
  });
});

describe('Mid-session reload re-hydration', () => {
  async function setup() {
    let capturedContext;
    render(
      <DataProvider>
        <TestConsumer
          onContextReady={(ctx) => {
            capturedContext = ctx;
          }}
        />
      </DataProvider>,
    );
    await waitFor(() => {
      expect(capturedContext?.refreshData).toBeDefined();
      expect(capturedContext?.inventory?.length).toBeGreaterThan(0);
    });
    return () => capturedContext;
  }

  it('refreshData re-hydrates full maintenance history instead of stranding the latch', async () => {
    const { maintenanceService } = await import('../lib/services.js');
    const fullHistory = [
      { id: 'm1', itemId: 'CAM001', type: 'Repair', status: 'completed', cost: 100 },
      { id: 'm2', itemId: 'CAM001', type: 'Cleaning', status: 'scheduled', cost: 0 },
    ];
    maintenanceService.getAll.mockResolvedValue(fullHistory);
    const ctx = await setup();

    await act(async () => {
      await ctx().ensureMaintenance();
    });
    expect(ctx().maintenanceLoaded).toBe(true);
    expect(ctx().inventory.find((i) => i.id === 'CAM001').maintenanceHistory).toHaveLength(2);

    // The old bug: refreshData rebuilt inventory from slim rows + pending-only
    // maintenance while maintenanceLoaded stayed true — completed records
    // vanished for the rest of the session.
    await act(async () => {
      await ctx().refreshData();
    });

    expect(ctx().maintenanceLoaded).toBe(true);
    const item = ctx().inventory.find((i) => i.id === 'CAM001');
    expect(item.maintenanceHistory.map((r) => r.id)).toEqual(['m1', 'm2']);
  });

  it('refreshData drops the latch honestly when re-hydration fails', async () => {
    const { maintenanceService } = await import('../lib/services.js');
    maintenanceService.getAll.mockResolvedValue([
      { id: 'm1', itemId: 'CAM001', type: 'Repair', status: 'completed', cost: 100 },
    ]);
    const ctx = await setup();

    await act(async () => {
      await ctx().ensureMaintenance();
    });
    expect(ctx().maintenanceLoaded).toBe(true);

    maintenanceService.getAll.mockRejectedValue(new Error('network down'));
    await act(async () => {
      await ctx().refreshData();
    });

    // Latch dropped → report views show loading and the next ensure retries
    expect(ctx().maintenanceLoaded).toBe(false);

    maintenanceService.getAll.mockResolvedValue([
      { id: 'm1', itemId: 'CAM001', type: 'Repair', status: 'completed', cost: 100 },
    ]);
    await act(async () => {
      await ctx().ensureMaintenance();
    });
    expect(ctx().maintenanceLoaded).toBe(true);
    expect(ctx().inventory.find((i) => i.id === 'CAM001').maintenanceHistory).toHaveLength(1);
  });

  it('refreshData refreshes the checkout-activity window when it was loaded', async () => {
    const { checkoutHistoryService } = await import('../lib/services.js');
    checkoutHistoryService.getRecent.mockResolvedValue([
      { id: 'srv-1', itemId: 'CAM001', action: 'checkout', timestamp: '2026-08-01T09:00:00Z' },
    ]);
    const ctx = await setup();

    await act(async () => {
      await ctx().ensureCheckoutActivity();
    });
    expect(ctx().checkoutEvents.map((e) => e.id)).toEqual(['srv-1']);

    checkoutHistoryService.getRecent.mockResolvedValue([
      { id: 'srv-1', itemId: 'CAM001', action: 'checkout', timestamp: '2026-08-01T09:00:00Z' },
      { id: 'srv-2', itemId: 'LENS001', action: 'checkin', timestamp: '2026-08-13T10:00:00Z' },
    ]);
    await act(async () => {
      await ctx().refreshData();
    });

    expect(ctx().checkoutEvents.map((e) => e.id)).toEqual(['srv-1', 'srv-2']);
    expect(ctx().checkoutEventsLoaded).toBe(true);
  });
});
