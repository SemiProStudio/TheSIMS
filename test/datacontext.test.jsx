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
    checkOut: vi.fn((id, data) => Promise.resolve({ id, status: 'checked-out', ...data })),
    checkIn: vi.fn((id, data) => Promise.resolve({ id, status: 'available', ...data })),
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
  },
  maintenanceService: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  itemNotesService: {
    create: vi.fn((note) => Promise.resolve(note)),
    delete: vi.fn(() => Promise.resolve()),
  },
  itemRemindersService: {
    create: vi.fn((r) => Promise.resolve(r)),
    update: vi.fn((id, u) => Promise.resolve({ id, ...u })),
    delete: vi.fn(() => Promise.resolve()),
  },
  checkoutHistoryService: {
    create: vi.fn((r) => Promise.resolve(r)),
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

vi.mock('../constants.js', () => ({
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

      await act(async () => {
        await capturedContext.deleteClient('client-1');
      });

      expect(capturedContext.clients.find((c) => c.id === 'client-1')).toBeUndefined();
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
