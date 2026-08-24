// =============================================================================
// Dashboard — Test Suite
// Pins the fixes from the dashboard audit:
// - Due Reminders / Upcoming Maintenance render from Tier-2-merged item data
//   (these panels used to be dead: the list load has no reminders/maintenance)
// - cancelled reservations never render; ongoing ones show as Active
// - quick search survives null brands, matches serials, Enter opens the top
//   result, and overflow offers "View all N results"
// - Overdue stat card counts and navigates
// - keyboard accessibility: headers, stat cards, and rows are real buttons
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: () => true,
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const mockData = {
  tier2Loaded: true,
  auditLog: [],
  auditLogLoaded: false,
  ensureAuditLog: vi.fn(),
};
vi.mock('../contexts/DataContext.js', () => ({
  useData: () => mockData,
}));

const { default: Dashboard } = await import('../views/Dashboard.jsx');

const iso = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const baseItem = (overrides) => ({
  status: 'available',
  category: 'Cameras',
  brand: 'Canon',
  reservations: [],
  reminders: [],
  maintenanceHistory: [],
  ...overrides,
});

const makeInventory = () => [
  // brand: null — quick search must not crash on it
  baseItem({ id: 'CA1', name: 'Alpha Camera', brand: null, serialNumber: 'SN-ALPHA-1' }),
  baseItem({
    id: 'CA2',
    name: 'Beta Camera',
    status: 'checked-out',
    checkedOutTo: 'Jordan',
    dueBack: iso(-2), // overdue
    checkedOutDate: iso(-5),
  }),
  baseItem({ id: 'CA3', name: 'Gamma Camera', status: 'needs-attention' }),
  baseItem({ id: 'CA4', name: 'Delta Camera', status: 'reserved' }),
  baseItem({
    id: 'CA5',
    name: 'Epsilon Camera',
    reminders: [
      { id: 'rem1', title: 'Sensor cleaning', dueDate: iso(-1), completed: false },
      { id: 'rem2', title: 'Firmware check', dueDate: iso(30), completed: false }, // not due
    ],
  }),
  baseItem({
    id: 'CA6',
    name: 'Zeta Camera',
    maintenanceHistory: [
      { id: 'mnt1', status: 'scheduled', type: 'Shutter service', scheduledDate: iso(3) },
      { id: 'mnt2', status: 'completed', type: 'Old repair', scheduledDate: iso(-90) },
    ],
  }),
  baseItem({
    id: 'CA7',
    name: 'Eta Camera',
    reservations: [
      {
        id: 'res-active',
        start: iso(-1),
        end: iso(2),
        project: 'Active Shoot',
        status: 'confirmed',
      },
      {
        id: 'res-future',
        start: iso(5),
        end: iso(6),
        project: 'Future Shoot',
        status: 'confirmed',
      },
      {
        id: 'res-cancelled',
        start: iso(9),
        end: iso(10),
        project: 'Cancelled Shoot',
        status: 'cancelled',
      },
      {
        id: 'res-ended',
        start: iso(-10),
        end: iso(-8),
        project: 'Ended Shoot',
        status: 'confirmed',
      },
    ],
  }),
];

function renderDashboard(overrides = {}) {
  const props = {
    inventory: makeInventory(),
    categorySettings: {},
    layoutPrefs: undefined,
    onViewItem: vi.fn(),
    onViewReservation: vi.fn(),
    onFilteredView: vi.fn(),
    onViewAlerts: vi.fn(),
    onViewOverdue: vi.fn(),
    onViewLowStock: vi.fn(),
    onViewReservations: vi.fn(),
    onViewCheckedOut: vi.fn(),
    onCustomizeLayout: vi.fn(),
    onToggleCollapse: vi.fn(),
    ...overrides,
  };
  const view = render(<Dashboard {...props} />);
  return { props, view };
}

beforeEach(() => {
  mockData.tier2Loaded = true;
  mockData.auditLog = [];
  mockData.auditLogLoaded = false;
  mockData.ensureAuditLog = vi.fn();
});

describe('Dashboard reminders and maintenance (Tier-2 merged data)', () => {
  it('shows due reminders from item data and hides not-yet-due ones', () => {
    renderDashboard();
    expect(screen.getByText('Sensor cleaning')).toBeInTheDocument();
    expect(screen.queryByText('Firmware check')).not.toBeInTheDocument();
  });

  it('shows scheduled maintenance and counts it in the stat card', () => {
    renderDashboard();
    expect(screen.getByText(/Shutter service/)).toBeInTheDocument();
    expect(screen.queryByText(/Old repair/)).not.toBeInTheDocument(); // completed

    const maintenanceCard = screen.getByRole('button', { name: /1 Maintenance/ });
    expect(maintenanceCard).toBeInTheDocument();
  });

  it('shows loading placeholders until Tier 2 lands', () => {
    mockData.tier2Loaded = false;
    renderDashboard({
      inventory: [baseItem({ id: 'CA1', name: 'Only Camera' })],
    });
    expect(screen.getByText('Loading reminders...')).toBeInTheDocument();
    expect(screen.getByText('Loading maintenance...')).toBeInTheDocument();
  });
});

describe('Dashboard reservations', () => {
  it('never renders cancelled or ended reservations', () => {
    renderDashboard();
    expect(screen.queryByText(/Cancelled Shoot/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ended Shoot/)).not.toBeInTheDocument();
  });

  it('shows ongoing reservations with an Active badge and date range', () => {
    renderDashboard();
    // The reservation can also appear in the Today panel ("goes out today"),
    // so find the Upcoming Reservations row — the one carrying the badge
    const activeRow = screen
      .getAllByText(/Active Shoot/)
      .map((el) => el.closest('button'))
      .find((btn) => btn && within(btn).queryByText('Active'));
    expect(activeRow).toBeTruthy();
    expect(screen.getByText(/Future Shoot/)).toBeInTheDocument();
  });
});

describe('Dashboard quick search', () => {
  const searchInput = () =>
    screen.getByPlaceholderText('Search by name, ID, brand, serial, or borrower...');

  it('does not crash on items with a null brand', () => {
    renderDashboard();
    fireEvent.change(searchInput(), { target: { value: 'alpha' } });
    expect(screen.getAllByText('Alpha Camera').length).toBeGreaterThan(0);
  });

  it('matches serial numbers', () => {
    renderDashboard();
    fireEvent.change(searchInput(), { target: { value: 'sn-alpha' } });
    expect(screen.getAllByText('Alpha Camera').length).toBeGreaterThan(0);
  });

  it('Enter opens the first result', () => {
    const { props } = renderDashboard();
    fireEvent.change(searchInput(), { target: { value: 'alpha camera' } });
    fireEvent.keyDown(searchInput(), { key: 'Enter' });
    expect(props.onViewItem).toHaveBeenCalledWith('CA1');
  });

  it('offers "View all N results" when more than 5 items match', () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      baseItem({ id: `X${i}`, name: `Matching Item ${i}` }),
    );
    const { props } = renderDashboard({ inventory: many });
    fireEvent.change(searchInput(), { target: { value: 'matching' } });

    const viewAll = screen.getByRole('button', { name: /View all 9 results/ });
    fireEvent.click(viewAll);
    expect(props.onFilteredView).toHaveBeenCalledWith('all', 'all', 'matching');
  });
});

describe('Dashboard stats', () => {
  it('counts overdue items and navigates from the Overdue card', () => {
    const { props } = renderDashboard();
    const overdueCard = screen.getByRole('button', { name: /1 Overdue/ });
    fireEvent.click(overdueCard);
    expect(props.onViewOverdue).toHaveBeenCalled();
  });

  it('stat cards are buttons and navigate to filtered views', () => {
    const { props } = renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /1 Checked Out/ }));
    expect(props.onFilteredView).toHaveBeenCalledWith('all', 'checked-out');
  });
});

describe('Dashboard panel "View All" buttons (shared ViewAllButton)', () => {
  const viewAllIn = (headerName) => {
    const panel = screen.getByRole('button', { name: headerName }).closest('.dashboard-panel');
    return within(panel).getByRole('button', { name: 'View All' });
  };

  it('renders one per busy panel and routes each to its own view', () => {
    const { props } = renderDashboard();
    // Checked Out, Alerts, and Upcoming Reservations are busy; Low Stock is
    // empty with this fixture, so exactly three
    expect(screen.getAllByRole('button', { name: 'View All' })).toHaveLength(3);

    fireEvent.click(viewAllIn(/Currently Checked Out/));
    expect(props.onViewCheckedOut).toHaveBeenCalledTimes(1);
    fireEvent.click(viewAllIn(/Alerts/));
    expect(props.onViewAlerts).toHaveBeenCalledTimes(1);
    fireEvent.click(viewAllIn(/Upcoming Reservations/));
    expect(props.onViewReservations).toHaveBeenCalledTimes(1);
  });

  it('clicking View All never collapses its section', () => {
    const { props } = renderDashboard();
    fireEvent.click(viewAllIn(/Alerts/));
    expect(screen.getByRole('button', { name: /Alerts/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(props.onToggleCollapse).not.toHaveBeenCalled();
  });

  it('the low stock panel gets one once it has rows', () => {
    const { props } = renderDashboard({
      categorySettings: { Consumables: { trackQuantity: true } },
      inventory: [
        baseItem({
          id: 'CO1',
          name: 'Gaff Tape',
          category: 'Consumables',
          quantity: 1,
          reorderPoint: 3,
          lowStockAlert: true,
        }),
      ],
    });
    fireEvent.click(viewAllIn(/Low Stock Items/));
    expect(props.onViewLowStock).toHaveBeenCalledTimes(1);
  });
});

describe('Dashboard recent activity (audit log)', () => {
  it('lazy-loads the audit log on mount', () => {
    renderDashboard();
    expect(mockData.ensureAuditLog).toHaveBeenCalled();
  });

  it('renders audit-log events once loaded, item rows clickable when the item exists', () => {
    mockData.auditLogLoaded = true;
    mockData.auditLog = [
      {
        id: 'a1',
        type: 'item_checkout',
        description: 'Beta Camera checked out to Jordan',
        user: 'Admin',
        timestamp: iso(0),
        itemId: 'CA2',
      },
      {
        id: 'a2',
        type: 'item_deleted',
        description: 'Old Tripod deleted',
        user: 'Admin',
        timestamp: iso(-1),
        itemId: 'GONE1', // no longer in inventory — not clickable
      },
      {
        id: 'a3',
        type: 'profile_updated', // not an activity type — filtered out
        description: 'Profile updated',
        user: 'Admin',
        timestamp: iso(-1),
      },
    ];
    const { props } = renderDashboard();

    const checkoutRow = screen.getByText('Beta Camera checked out to Jordan').closest('button');
    expect(checkoutRow).not.toBeNull();
    fireEvent.click(checkoutRow);
    expect(props.onViewItem).toHaveBeenCalledWith('CA2');

    expect(screen.getByText('Old Tripod deleted').closest('button')).toBeNull();
    expect(screen.queryByText('Profile updated')).not.toBeInTheDocument();
  });
});

describe('Dashboard accessibility and copy', () => {
  it('section headers are buttons with aria-expanded that toggle collapse', () => {
    renderDashboard();
    const statsToggle = screen.getByRole('button', { name: /Statistics/ });
    expect(statsToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(statsToggle);
    expect(statsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Total Items')).not.toBeInTheDocument();
  });

  it('panel list rows are buttons', () => {
    renderDashboard();
    expect(screen.getByText('Sensor cleaning').closest('button')).not.toBeNull();
    // A checked-out item can appear in several panels (Today, Checked Out) —
    // every appearance must be a clickable row
    for (const el of screen.getAllByText('Beta Camera')) {
      expect(el.closest('button')).not.toBeNull();
    }
  });

  it('uses accurate empty-state copy for the checked-out panel', () => {
    renderDashboard({
      inventory: [baseItem({ id: 'CA4', name: 'Delta Camera', status: 'reserved' })],
    });
    expect(screen.getByText('Nothing is checked out')).toBeInTheDocument();
    expect(screen.queryByText('All items are available')).not.toBeInTheDocument();
  });
});

describe('Dashboard low stock panel (per-item opt-in)', () => {
  const consumable = (overrides) =>
    baseItem({ category: 'Consumables', quantity: 1, reorderPoint: 3, ...overrides });
  const categorySettings = {
    Consumables: { trackQuantity: true },
    Cameras: { trackQuantity: false },
  };

  it('lists only items whose reminder is on and that sit at or below their own threshold', () => {
    renderDashboard({
      categorySettings,
      inventory: [
        consumable({ id: 'CO1', name: 'Gaff Tape', lowStockAlert: true }),
        consumable({ id: 'CO2', name: 'Gels', lowStockAlert: false }), // same numbers, opted out
        consumable({ id: 'CO3', name: 'Batteries', lowStockAlert: true, quantity: 10 }), // plenty
        consumable({ id: 'CO4', name: 'No threshold', lowStockAlert: true, reorderPoint: 0 }),
        baseItem({
          id: 'CA9',
          name: 'Untracked Cam',
          quantity: 0,
          reorderPoint: 5,
          lowStockAlert: true,
        }),
      ],
    });
    expect(screen.getByText('Gaff Tape')).toBeInTheDocument();
    expect(screen.getByText('1 remaining (min: 3)')).toBeInTheDocument();
    for (const name of ['Gels', 'Batteries', 'No threshold', 'Untracked Cam']) {
      expect(screen.queryByText(name)).not.toBeInTheDocument();
    }
  });

  it('shows the empty state when nothing is opted in', () => {
    renderDashboard({
      categorySettings,
      inventory: [consumable({ id: 'CO1', name: 'Gaff Tape' })],
    });
    expect(screen.getByText('No low stock items')).toBeInTheDocument();
  });
});

// The two column stacks are sized to the window on wide screens so panels
// share the column instead of each stopping at a cap while the page scrolls
// past the bottom; narrow screens keep the capped, free-flowing stack.
describe('Dashboard column fill (wide screens)', () => {
  const originalMatchMedia = window.matchMedia;
  const wide = (matches) => {
    window.matchMedia = (query) => ({
      matches: query === '(min-width: 1200px)' ? matches : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  };
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('sizes the columns to the window; panels with rows shrink, empty ones stay rigid', () => {
    wide(true);
    window.innerHeight = 1400;
    const { view } = renderDashboard();
    const columns = view.container.querySelector('.dashboard-columns');
    expect(columns).toHaveClass('dashboard-columns-fill');
    // jsdom lays nothing out (top = 0), so the whole window is available
    expect(columns.style.height).toBe('1400px');

    const panels = view.container.querySelectorAll('.dashboard-panel');
    expect(panels.length).toBe(8);
    for (const panel of panels) {
      // Never an intrinsic keyword and never flex-basis 0 — WebKit resolves
      // a panel's intrinsic height through a basis-0 child as ~nothing and
      // collapsed every panel to its header bar in Safari
      expect(panel.style.maxHeight).toBe('');
      expect(panel.style.flex).toMatch(/^0 [01] auto$/);
    }
    // A panel with rows gives up height when its column is squeezed, but
    // never below its header + one row
    const reminders = screen.getByText('Sensor cleaning').closest('.dashboard-panel');
    expect(reminders.style.flex).toBe('0 1 auto');
    expect(reminders.style.minHeight).toBe('148px');
    const list = reminders.querySelector('.collapsible-content > div');
    expect(list.style.maxHeight).toBe('');
    expect(list.style.flex).toBe('1 1 auto');
    expect(list.style.overflowY).toBe('auto');
    // An empty panel is rigid: nothing to give, nothing to clip
    const lowStock = screen.getByText('No low stock items').closest('.dashboard-panel');
    expect(lowStock.style.flex).toBe('0 0 auto');
    expect(lowStock.style.minHeight).toBe('');
  });

  it('tracks a short window down instead of holding a fixed floor', () => {
    wide(true);
    window.innerHeight = 500;
    const { view } = renderDashboard();
    // jsdom lays nothing out (top = 0, no <main> padding): the whole window.
    // The per-panel minimums are the only floor — a fixed columns floor made
    // shrinking a window look like the dashboard was stuck at max height.
    expect(view.container.querySelector('.dashboard-columns').style.height).toBe('500px');
  });

  it('keeps the capped free-flowing stack below the breakpoint', () => {
    wide(false);
    const { view } = renderDashboard();
    const columns = view.container.querySelector('.dashboard-columns');
    expect(columns).not.toHaveClass('dashboard-columns-fill');
    expect(columns.style.height).toBe('');
    const reminders = screen.getByText('Sensor cleaning').closest('.dashboard-panel');
    const list = reminders.querySelector('.collapsible-content > div');
    expect(list.style.maxHeight).toBe('240px');
    expect(reminders.style.maxHeight).toBe('');
  });
});
