// =============================================================================
// Report data assembly — pins the correctness rules of the reports round:
// - low-stock/overdue are DERIVED (stored-status equality matches nothing)
// - client activity counts grouped bookings, not per-item rows
// - maintenance cost stats: completed non-warranty only, warranty = savings
// - time bucketing is clock-injectable and window-bounded
// - the client CSV no longer carries the phantom Total Value column
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  computeAlertData,
  computeClientReportStats,
  bookingsSeries,
  collectMaintenanceRecords,
  computeMaintenanceStats,
  sortMaintenanceRecords,
  maintenanceCostSeries,
  computeInventoryStats,
  acquisitionSeries,
  valueDistribution,
  computeActivityStats,
  bucketEvents,
  dayOfWeekCounts,
  csvForClients,
  csvForMaintenance,
  csvDate,
} from '../lib/reportData.js';

// 2026-08-10 is a Monday; fixed clock for every time-based assertion
const NOW = new Date(2026, 7, 14); // Fri Aug 14 2026, local
const TODAY_ISO = '2026-08-14';

// =============================================================================
// Alerts — derived statuses
// =============================================================================

describe('computeAlertData', () => {
  const categorySettings = {
    Consumables: { trackQuantity: true, lowStockThreshold: 5 },
    Cameras: { trackQuantity: false },
  };

  it('detects low stock via quantity thresholds — stored status stays available', () => {
    const inventory = [
      { id: 'A', name: 'Gaff Tape', category: 'Consumables', status: 'available', quantity: 2 },
      { id: 'B', name: 'Batteries', category: 'Consumables', status: 'available', quantity: 50 },
      // Not quantity-tracked: never low stock even at quantity 0
      { id: 'C', name: 'Camera', category: 'Cameras', status: 'available', quantity: 0 },
    ];
    const data = computeAlertData(inventory, categorySettings, TODAY_ISO);
    expect(data.lowStock).toBe(1);
    expect(data.allAlerts.map((a) => a.id)).toEqual(['A']);
    expect(data.allAlerts[0].reasons).toEqual(['Low Stock']);
  });

  it('respects a per-item reorderPoint over the category threshold', () => {
    const inventory = [
      {
        id: 'A',
        name: 'Tape',
        category: 'Consumables',
        status: 'available',
        quantity: 8,
        reorderPoint: 10,
      },
    ];
    const data = computeAlertData(inventory, categorySettings, TODAY_ISO);
    expect(data.lowStock).toBe(1);
  });

  it('detects overdue as checked-out past dueBack — a state never stored in status', () => {
    const inventory = [
      { id: 'A', name: 'Late Cam', status: 'checked-out', dueBack: '2026-08-01' },
      { id: 'B', name: 'On Time', status: 'checked-out', dueBack: '2026-08-20' },
      // Past dueBack but returned — not overdue
      { id: 'C', name: 'Returned', status: 'available', dueBack: '2026-08-01' },
    ];
    const data = computeAlertData(inventory, {}, TODAY_ISO);
    expect(data.overdue).toBe(1);
    expect(data.allAlerts[0].id).toBe('A');
    expect(data.allAlerts[0].reasons).toEqual(['Overdue']);
  });

  it('deduplicates multi-reason items and sorts them first', () => {
    const inventory = [
      { id: 'A', name: 'Solo', status: 'missing', currentValue: 100 },
      {
        id: 'B',
        name: 'Wreck',
        status: 'needs-attention',
        condition: 'poor',
        currentValue: 900,
        category: 'Audio',
      },
    ];
    const data = computeAlertData(inventory, {}, TODAY_ISO);
    expect(data.totalAlerts).toBe(2);
    expect(data.allAlerts[0].id).toBe('B');
    expect(data.allAlerts[0].reasons).toEqual(['Needs Attention', 'Poor Condition']);
    expect(data.valueAtRisk).toBe(1000);
    expect(data.valueByCategory).toEqual({ Uncategorized: 100, Audio: 900 });
  });
});

// =============================================================================
// Clients — grouped bookings
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
      {
        id: 'r3',
        groupId: 'g2',
        clientId: 'CL002',
        project: 'Doc',
        start: '2026-07-01',
        end: '2026-07-02',
      },
    ],
  },
];

describe('computeClientReportStats', () => {
  const clients = [
    { id: 'CL001', name: 'Acme' },
    { id: 'CL002', name: 'Beta' },
    { id: 'CL003', name: 'Idle' },
  ];

  it('counts a multi-item reservation as ONE booking', () => {
    const stats = computeClientReportStats(clients, groupedInventory);
    const acme = stats.clientsWithStats.find((c) => c.id === 'CL001');
    expect(acme.reservationCount).toBe(1);
    expect(stats.totalReservations).toBe(2);
    expect(stats.activeClients).toBe(2);
  });

  it('ranks by booking count and exposes the top client', () => {
    const stats = computeClientReportStats(clients, groupedInventory);
    expect(stats.topClient.reservationCount).toBe(1);
    expect(stats.clientsWithStats[2].id).toBe('CL003');
    expect(stats.clientsWithStats[2].reservationCount).toBe(0);
  });
});

describe('bookingsSeries', () => {
  it('buckets grouped bookings by start month within the window', () => {
    const series = bookingsSeries(groupedInventory, { months: 3, now: NOW });
    expect(series.map((b) => b.label)).toEqual(['Jun', 'Jul', 'Aug']);
    expect(series.map((b) => b.value)).toEqual([0, 1, 1]);
  });
});

// =============================================================================
// Maintenance — full-record cost stats
// =============================================================================

const maintenanceInventory = [
  {
    id: 'A',
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
      { id: 'm3', type: 'Cleaning', status: 'scheduled', cost: 25, scheduledDate: '2026-09-01' },
    ],
  },
  {
    id: 'B',
    name: 'Lens',
    maintenanceHistory: [
      {
        id: 'm4',
        type: 'Calibration',
        status: 'completed',
        cost: 60,
        vendor: 'LensLab',
        completedDate: '2026-07-15',
      },
    ],
  },
];

describe('maintenance stats', () => {
  const records = collectMaintenanceRecords(maintenanceInventory);

  it('tags records with their item identity', () => {
    expect(records).toHaveLength(4);
    expect(records[0]).toMatchObject({ itemId: 'A', itemName: 'Cam', itemBrand: 'Sony' });
  });

  it('total cost counts completed non-warranty work only; warranty cost is savings', () => {
    const stats = computeMaintenanceStats(records);
    expect(stats.totalCost).toBe(160); // m1 + m4; m2 is warranty, m3 pending
    expect(stats.warrantySavings).toBe(50);
    expect(stats.pending).toBe(1);
    expect(stats.completed).toBe(3);
    expect(stats.costByType).toEqual({ Repair: 150, Calibration: 60 });
    expect(stats.topVendors[0]).toEqual(['FixIt', 150]);
  });

  it('sorts pending records first, then newest completed', () => {
    const sorted = sortMaintenanceRecords(records);
    expect(sorted[0].id).toBe('m3');
    expect(sorted[1].id).toBe('m2');
  });

  it('cost series buckets completed non-warranty cost by month', () => {
    const series = maintenanceCostSeries(records, { months: 3, now: NOW });
    expect(series.map((b) => b.label)).toEqual(['Jun', 'Jul', 'Aug']);
    expect(series.map((b) => b.value)).toEqual([0, 60, 100]);
  });
});

// =============================================================================
// Inventory / insurance
// =============================================================================

describe('computeInventoryStats', () => {
  it('aggregates totals, depreciation, and groupings', () => {
    const stats = computeInventoryStats([
      {
        id: 'A',
        category: 'Cameras',
        status: 'available',
        condition: 'good',
        location: 'Shelf 1',
        purchasePrice: 1000,
        currentValue: 700,
      },
      { id: 'B', status: 'missing', purchasePrice: 200, currentValue: 250 },
    ]);
    expect(stats.totalValue).toBe(950);
    expect(stats.totalPurchase).toBe(1200);
    expect(stats.depreciation).toBe(250);
    expect(stats.byCategory.Cameras).toEqual({ count: 1, value: 700 });
    expect(stats.byCategory.Uncategorized.count).toBe(1);
    expect(stats.byStatus).toEqual({ available: 1, missing: 1 });
    expect(stats.byLocation.Unassigned.count).toBe(1);
  });
});

describe('acquisitionSeries', () => {
  it('accumulates value by purchase month, seeding pre-window purchases', () => {
    const { series, datedItems, undatedItems } = acquisitionSeries(
      [
        { id: 'Old', purchaseDate: '2023-01-10', currentValue: 1000 },
        { id: 'New', purchaseDate: '2026-08-01', currentValue: 500 },
        { id: 'NoDate', currentValue: 200 },
      ],
      { months: 24, now: NOW },
    );
    expect(series).toHaveLength(24);
    expect(series[0].value).toBe(1000); // pre-window seed
    // >12-month spans carry the year — bare month names repeated ("Sep",
    // "Sep") and made the axis ambiguous
    expect(series[series.length - 1]).toEqual({ label: "Aug '26", value: 1500 });
    expect(datedItems).toBe(2);
    expect(undatedItems).toBe(1);
  });

  it('12-month spans keep bare month labels', () => {
    const { series } = acquisitionSeries([{ id: 'A', purchaseDate: '2026-08-01', currentValue: 10 }], {
      months: 12,
      now: NOW,
    });
    expect(series[series.length - 1].label).toBe('Aug');
  });
});

describe('valueDistribution', () => {
  it('bands items by current value with inclusive lower bounds', () => {
    const bands = valueDistribution([
      { currentValue: 50 },
      { currentValue: 100 },
      { currentValue: 4999 },
      { currentValue: 5000 },
    ]);
    expect(bands.find((b) => b.label === 'Under $100').value).toBe(1);
    expect(bands.find((b) => b.label === '$100–500').value).toBe(1);
    expect(bands.find((b) => b.label === '$2.5k–5k').value).toBe(1);
    expect(bands.find((b) => b.label === '$5k+').value).toBe(1);
  });
});

// =============================================================================
// Activity — lifetime aggregates
// =============================================================================

describe('computeActivityStats', () => {
  it('computes utilization, frequency buckets, and overdue flags', () => {
    const stats = computeActivityStats(
      [
        { id: 'A', name: 'Cam', checkoutCount: 3, status: 'available' },
        {
          id: 'B',
          name: 'Late',
          checkoutCount: 60,
          status: 'checked-out',
          checkedOutTo: 'Sam',
          dueBack: '2026-08-01',
        },
        { id: 'C', name: 'Unused', checkoutCount: 0, status: 'available' },
      ],
      TODAY_ISO,
    );
    expect(stats.totalCheckouts).toBe(63);
    expect(stats.utilizationRate).toBe(67);
    expect(stats.neverCheckedOut).toBe(1);
    expect(stats.frequencyBuckets['1-5']).toBe(1);
    expect(stats.frequencyBuckets['50+']).toBe(1);
    expect(stats.checkedOutDetails).toHaveLength(1);
    expect(stats.checkedOutDetails[0].isOverdue).toBe(true);
  });
});

// =============================================================================
// Event bucketing
// =============================================================================

describe('bucketEvents', () => {
  it('30-day windows bucket daily, bounded to the window', () => {
    const buckets = bucketEvents(
      [
        { timestamp: '2026-08-14T10:00:00' },
        { timestamp: '2026-08-14T18:00:00' },
        { timestamp: '2026-07-16T01:00:00' }, // first day of window
        { timestamp: '2026-07-15T23:00:00' }, // outside — ignored
        { timestamp: 'garbage' }, // unparseable — ignored
      ],
      { days: 30, now: NOW },
    );
    expect(buckets).toHaveLength(30);
    expect(buckets[0]).toEqual({ label: '7/16', value: 1 });
    expect(buckets[buckets.length - 1]).toEqual({ label: '8/14', value: 2 });
    expect(buckets.reduce((s, b) => s + b.value, 0)).toBe(3);
  });

  it('90-day windows bucket by Monday-started weeks', () => {
    const buckets = bucketEvents(
      [{ timestamp: '2026-08-12T12:00:00' }], // Wednesday → week of Mon 8/10
      { days: 90, now: NOW },
    );
    expect(buckets[buckets.length - 1]).toEqual({ label: '8/10', value: 1 });
  });

  it('365-day windows bucket monthly, including the partial oldest month', () => {
    // NOW = 2026-08-14 → window starts 2025-08-15, spanning 13 calendar
    // months. The old fixed 12-month key list dropped events in the partial
    // oldest month: they passed the date filter but had no bucket, so the
    // trend silently disagreed with the day-of-week chart beside it.
    const buckets = bucketEvents(
      [
        { timestamp: '2026-08-01T09:00:00' },
        { timestamp: '2025-09-20T09:00:00' },
        { timestamp: '2025-08-20T09:00:00' }, // inside the partial oldest month
      ],
      { days: 365, now: NOW },
    );
    expect(buckets).toHaveLength(13);
    expect(buckets[buckets.length - 1]).toEqual({ label: 'Aug', value: 1 });
    expect(buckets[0].label).toBe('Aug');
    expect(buckets[0].value).toBe(1); // no longer dropped
    expect(buckets[1].label).toBe('Sep');
    expect(buckets[1].value).toBe(1);
  });
});

describe('dayOfWeekCounts', () => {
  it('maps events onto Monday-first weekdays', () => {
    const counts = dayOfWeekCounts([
      { timestamp: '2026-08-10T09:00:00' }, // Monday
      { timestamp: '2026-08-15T09:00:00' }, // Saturday
      { timestamp: '2026-08-16T09:00:00' }, // Sunday
      { timestamp: null },
    ]);
    expect(counts[0]).toEqual({ label: 'Mon', value: 1 });
    expect(counts[5]).toEqual({ label: 'Sat', value: 1 });
    expect(counts[6]).toEqual({ label: 'Sun', value: 1 });
    expect(counts.reduce((s, c) => s + c.value, 0)).toBe(3);
  });
});

// =============================================================================
// CSV builders
// =============================================================================

describe('CSV builders', () => {
  it('client CSV has no phantom Total Value column', () => {
    // UTC noon: the ISO date part matches the local date in every timezone
    const utcNoon = new Date(Date.UTC(2026, 7, 14, 12));
    const { headers, rows, filename } = csvForClients(
      [{ name: 'Acme', type: 'Company', reservationCount: 3, favorite: true }],
      utcNoon,
    );
    expect(headers).not.toContain('Total Value');
    expect(headers).toContain('Reservations');
    expect(rows[0]).toContain(3);
    expect(filename).toBe('client-report-2026-08-14.csv');
  });

  it('maintenance CSV rows come out pending-first', () => {
    const { rows } = csvForMaintenance(collectMaintenanceRecords(maintenanceInventory), NOW);
    expect(rows[0][4]).toBe('scheduled');
    expect(rows[0][7]).toBe('No');
  });

  it('csvDate stamps the LOCAL calendar date', () => {
    // Local-midnight fixture: toISOString() would shift this to the previous
    // day east of UTC (and a UTC fixture shifts west) — csvDate must not
    expect(csvDate(new Date(2026, 7, 14))).toBe('2026-08-14');
    expect(csvDate(new Date(2026, 7, 14, 23, 59))).toBe('2026-08-14');
  });
});
