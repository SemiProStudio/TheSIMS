// =============================================================================
// Report views — pins the data-honesty behaviors of the reports round:
// - Maintenance report demands the FULL record set (ensureMaintenance) and
//   says so while loading; cost stats come from completed records
// - Alerts report surfaces DERIVED low-stock/overdue items
// - Activity report loads checkout history and re-buckets on range change
// - Client report counts grouped bookings, and the hub agrees with it
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { dataState } = vi.hoisted(() => ({
  dataState: {
    ensureMaintenance: vi.fn(),
    ensureCheckoutActivity: vi.fn(),
    ensureClients: vi.fn(),
    maintenanceLoaded: true,
    checkoutEvents: [],
    checkoutEventsLoaded: true,
    categorySettings: {},
  },
}));

vi.mock('../contexts/DataContext.js', () => ({
  useData: () => dataState,
}));

const { MaintenanceReportPanel } = await import('../views/MaintenanceReportView.jsx');
const { AlertsReportPanel } = await import('../views/AlertsReportView.jsx');
const { ActivityReportPanel } = await import('../views/ActivityReportView.jsx');
const { ClientReportPanel } = await import('../views/ClientReportView.jsx');
const { ReportsPanel } = await import('../views/ReportsView.jsx');

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  dataState.maintenanceLoaded = true;
  dataState.checkoutEvents = [];
  dataState.checkoutEventsLoaded = true;
  dataState.categorySettings = {};
});

// =============================================================================
// Maintenance
// =============================================================================

const maintenanceInventory = [
  {
    id: 'CA1',
    name: 'Cam',
    brand: 'Sony',
    maintenanceHistory: [
      {
        id: 'm1',
        type: 'Repair',
        status: 'completed',
        cost: 100,
        vendor: 'FixIt',
        completedDate: '2026-08-02',
      },
      {
        id: 'm2',
        type: 'Repair',
        status: 'completed',
        cost: 50,
        warrantyWork: true,
        vendor: 'FixIt',
        completedDate: '2026-08-03',
      },
      { id: 'm3', type: 'Cleaning', status: 'scheduled', scheduledDate: '2026-09-01' },
    ],
  },
];

describe('MaintenanceReportPanel', () => {
  it('requests the full record set on mount', () => {
    render(<MaintenanceReportPanel inventory={[]} onViewItem={noop} onBack={noop} />);
    expect(dataState.ensureMaintenance).toHaveBeenCalledTimes(1);
  });

  it('announces while the full history is still loading', () => {
    dataState.maintenanceLoaded = false;
    render(<MaintenanceReportPanel inventory={[]} onViewItem={noop} onBack={noop} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading full maintenance history');
  });

  it('cost stats come from completed records: warranty splits out as savings', () => {
    render(
      <MaintenanceReportPanel inventory={maintenanceInventory} onViewItem={noop} onBack={noop} />,
    );
    // $100 completed non-warranty; $50 warranty savings (scoped to the stat
    // cards — the raw amounts also appear in record rows and charts)
    expect(screen.getByText('Total Cost').parentElement).toHaveTextContent('$100');
    expect(screen.getByText('Warranty Savings').parentElement).toHaveTextContent('$50');
    expect(screen.getByText('Maintenance Cost — Last 12 Months')).toBeInTheDocument();
  });

  it('record rows are real buttons that open the item', () => {
    const onViewItem = vi.fn();
    render(
      <MaintenanceReportPanel
        inventory={maintenanceInventory}
        onViewItem={onViewItem}
        onBack={noop}
      />,
    );
    const row = screen.getAllByRole('button').find((b) => b.textContent.includes('Cam (CA1)'));
    fireEvent.click(row);
    expect(onViewItem).toHaveBeenCalledWith('CA1');
  });
});

// =============================================================================
// Alerts — derived states reach the DOM
// =============================================================================

describe('AlertsReportPanel', () => {
  it('shows a derived low-stock item that a status check would miss', () => {
    dataState.categorySettings = { Consumables: { trackQuantity: true } };
    render(
      <AlertsReportPanel
        inventory={[
          {
            id: 'TA1',
            name: 'Gaff Tape',
            category: 'Consumables',
            status: 'available',
            quantity: 2,
            reorderPoint: 5,
            lowStockAlert: true,
          },
        ]}
        onViewItem={noop}
        onBack={noop}
      />,
    );
    expect(screen.getAllByText('Low Stock').length).toBeGreaterThan(0);
    expect(screen.getByText('Gaff Tape')).toBeInTheDocument();
  });

  it('shows overdue checked-out items', () => {
    render(
      <AlertsReportPanel
        inventory={[
          {
            id: 'CA1',
            name: 'Late Cam',
            status: 'checked-out',
            dueBack: '2020-01-01',
            checkedOutTo: 'Sam',
          },
        ]}
        onViewItem={noop}
        onBack={noop}
      />,
    );
    expect(screen.getAllByText('Overdue').length).toBeGreaterThan(0);
    expect(screen.getByText('Late Cam')).toBeInTheDocument();
  });
});

// =============================================================================
// Activity — time series wiring
// =============================================================================

describe('ActivityReportPanel', () => {
  it('loads checkout history on mount and buckets it into the trend', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    dataState.checkoutEvents = [
      { id: 'e1', action: 'checkout', timestamp: yesterday },
      { id: 'e2', action: 'checkin', timestamp: yesterday }, // not counted
    ];
    render(<ActivityReportPanel inventory={[]} onViewItem={noop} onBack={noop} />);
    expect(dataState.ensureCheckoutActivity).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Checkout Trend — 1 in the last 90 days/)).toBeInTheDocument();
  });

  it('range buttons re-bucket the window', () => {
    dataState.checkoutEvents = [
      {
        id: 'e1',
        action: 'checkout',
        timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    render(<ActivityReportPanel inventory={[]} onViewItem={noop} onBack={noop} />);
    expect(screen.getByText(/1 in the last 90 days/)).toBeInTheDocument();

    const btn30 = screen.getByRole('button', { name: '30 days' });
    fireEvent.click(btn30);
    expect(btn30).toHaveAttribute('aria-pressed', 'true');
    // 60-day-old event falls outside the 30-day window
    expect(screen.getByText(/0 in the last 30 days/)).toBeInTheDocument();
  });

  it('says so while checkout history loads', () => {
    dataState.checkoutEventsLoaded = false;
    render(<ActivityReportPanel inventory={[]} onViewItem={noop} onBack={noop} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading checkout history');
  });
});

// =============================================================================
// Clients — grouped bookings, hub agreement
// =============================================================================

const groupedInventory = [
  {
    id: 'CAM1',
    reservations: [
      {
        id: 'r1',
        groupId: 'g1',
        clientId: 'CL001',
        project: 'Ad',
        start: '2026-08-05',
        end: '2026-08-06',
      },
    ],
  },
  {
    id: 'CAM2',
    reservations: [
      {
        id: 'r2',
        groupId: 'g1',
        clientId: 'CL001',
        project: 'Ad',
        start: '2026-08-05',
        end: '2026-08-06',
      },
    ],
  },
];
const clients = [{ id: 'CL001', name: 'Acme Films', type: 'Company' }];

describe('ClientReportPanel', () => {
  it('counts a 2-item grouped reservation as one booking', () => {
    render(
      <ClientReportPanel
        clients={clients}
        inventory={groupedInventory}
        onViewClient={noop}
        onBack={noop}
      />,
    );
    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    // Booking count cell shows 1, not 2 — the name also appears in the Top
    // Clients chart, so pick the occurrence inside the table
    const row = screen
      .getAllByText('Acme Films')
      .map((el) => el.closest('tr'))
      .find(Boolean);
    expect(row).toHaveTextContent('1');
    expect(row).not.toHaveTextContent('2');
  });
});

describe('ReportsPanel (hub)', () => {
  it('shows the SAME grouped top-client count as the client report', () => {
    render(
      <ReportsPanel
        inventory={groupedInventory}
        clients={clients}
        onExport={noop}
        onBack={noop}
        setCurrentView={noop}
      />,
    );
    expect(screen.getByText('Top: Acme Films (1)')).toBeInTheDocument();
  });

  it('lazy-loads clients, maintenance, and checkout activity for its cards', () => {
    render(
      <ReportsPanel
        inventory={[]}
        clients={[]}
        onExport={noop}
        onBack={noop}
        setCurrentView={noop}
      />,
    );
    expect(dataState.ensureClients).toHaveBeenCalled();
    expect(dataState.ensureMaintenance).toHaveBeenCalled();
    expect(dataState.ensureCheckoutActivity).toHaveBeenCalled();
  });
});
