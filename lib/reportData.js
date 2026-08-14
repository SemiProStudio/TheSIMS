// =============================================================================
// Report data assembly — single source of truth for the Reports hub AND the
// detail report views, so their numbers can never disagree again.
//
// Correctness rules learned the hard way:
// - 'low-stock' and 'overdue' are DERIVED states (never stored in status) —
//   use the shared matchers, not equality (the Search-round lesson).
// - Client activity counts grouped bookings, not per-item reservation rows.
// - Maintenance cost stats require the FULL record set (ensureMaintenance),
//   not the pending-only slice Tier 2 loads for the dashboard.
//
// Everything here is pure and clock-injectable for tests.
// =============================================================================

import { isLowStock, isItemOverdue, getTodayISO, toLocalYMD, groupReservationsForSchedule } from '../utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad2 = (n) => String(n).padStart(2, '0');
const localDayKey = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const monthKeyOf = (date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
const monthLabelOf = (key) => MONTHS[Number(key.slice(5, 7)) - 1];

export const csvDate = (now = new Date()) => toLocalYMD(now);

// =============================================================================
// ALERTS
// =============================================================================

/**
 * All alert items with reasons, deduplicated. Low-stock and overdue are
 * derived via the shared matchers — a stored-status equality check silently
 * matches nothing for either.
 */
export const computeAlertData = (inventory, categorySettings, todayISO = getTodayISO()) => {
  const alertItemMap = new Map();
  const addAlert = (item, reason) => {
    if (alertItemMap.has(item.id)) {
      alertItemMap.get(item.id).reasons.push(reason);
    } else {
      alertItemMap.set(item.id, { ...item, reasons: [reason] });
    }
  };

  const needsAttention = inventory.filter((i) => i.status === 'needs-attention');
  const missing = inventory.filter((i) => i.status === 'missing');
  const lowStock = inventory.filter((i) => isLowStock(i, categorySettings));
  const overdue = inventory.filter((i) => isItemOverdue(i, todayISO));
  const poorCondition = inventory.filter((i) => i.condition === 'poor');

  needsAttention.forEach((i) => addAlert(i, 'Needs Attention'));
  missing.forEach((i) => addAlert(i, 'Missing'));
  lowStock.forEach((i) => addAlert(i, 'Low Stock'));
  overdue.forEach((i) => addAlert(i, 'Overdue'));
  poorCondition.forEach((i) => addAlert(i, 'Poor Condition'));

  const allAlerts = Array.from(alertItemMap.values());
  allAlerts.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return (a.name || '').localeCompare(b.name || '');
  });

  const valueAtRisk = allAlerts.reduce((sum, i) => sum + (i.currentValue || 0), 0);

  const byCategory = {};
  const valueByCategory = {};
  allAlerts.forEach((item) => {
    const cat = item.category || 'Uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    valueByCategory[cat] = (valueByCategory[cat] || 0) + (item.currentValue || 0);
  });

  return {
    needsAttention: needsAttention.length,
    missing: missing.length,
    lowStock: lowStock.length,
    overdue: overdue.length,
    poorCondition: poorCondition.length,
    totalAlerts: allAlerts.length,
    valueAtRisk,
    allAlerts,
    byCategory,
    valueByCategory,
  };
};

// =============================================================================
// CLIENTS
// =============================================================================

/**
 * Clients ranked by GROUPED booking count — a 5-item reservation is one
 * booking. The hub card and the Client Report both consume this.
 */
export const computeClientReportStats = (clients, inventory) => {
  const reservationCounts = {};
  groupReservationsForSchedule(inventory).forEach((group) => {
    if (group.clientId) {
      reservationCounts[group.clientId] = (reservationCounts[group.clientId] || 0) + 1;
    }
  });

  const clientsWithStats = clients
    .map((client) => ({
      ...client,
      reservationCount: reservationCounts[client.id] || 0,
    }))
    .sort((a, b) => b.reservationCount - a.reservationCount);

  const totalReservations = clientsWithStats.reduce((sum, c) => sum + c.reservationCount, 0);
  const activeClients = clientsWithStats.filter((c) => c.reservationCount > 0).length;
  const topClient = clientsWithStats.length > 0 ? clientsWithStats[0] : null;

  return { clientsWithStats, totalReservations, activeClients, topClient };
};

/** Grouped bookings per month over the trailing window, oldest first. */
export const bookingsSeries = (inventory, { months = 12, now = new Date() } = {}) => {
  const keys = lastMonthKeys(months, now);
  const counts = Object.fromEntries(keys.map((k) => [k, 0]));
  groupReservationsForSchedule(inventory).forEach((group) => {
    if (!group.start) return;
    const key = String(group.start).slice(0, 7);
    if (key in counts) counts[key] += 1;
  });
  return keys.map((key) => ({ label: monthLabelOf(key), value: counts[key] }));
};

// =============================================================================
// MAINTENANCE
// =============================================================================

/** Flatten per-item maintenanceHistory into records tagged with item info. */
export const collectMaintenanceRecords = (inventory) => {
  const records = [];
  inventory.forEach((item) => {
    (item.maintenanceHistory || []).forEach((record) => {
      records.push({ ...record, itemId: item.id, itemName: item.name, itemBrand: item.brand });
    });
  });
  return records;
};

const isPendingRecord = (r) => r.status === 'scheduled' || r.status === 'in-progress';

/** Pending first, then newest by completed/scheduled/created date. */
export const sortMaintenanceRecords = (records) =>
  [...records].sort((a, b) => {
    const aP = isPendingRecord(a);
    const bP = isPendingRecord(b);
    if (aP && !bP) return -1;
    if (!aP && bP) return 1;
    return (
      new Date(b.completedDate || b.scheduledDate || b.createdAt) -
      new Date(a.completedDate || a.scheduledDate || a.createdAt)
    );
  });

/**
 * Cost/vendor stats over the full record set. Only meaningful after
 * ensureMaintenance() has merged completed records — the Tier 2 load carries
 * pending records only.
 */
export const computeMaintenanceStats = (records) => {
  const completed = records.filter((r) => r.status === 'completed');
  const pending = records.filter(isPendingRecord);
  const inProgress = records.filter((r) => r.status === 'in-progress');
  const totalCost = completed
    .filter((r) => !r.warrantyWork)
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const warrantySavings = completed
    .filter((r) => r.warrantyWork)
    .reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  const byType = {};
  const costByType = {};
  records.forEach((r) => {
    const type = r.type || 'Other';
    byType[type] = (byType[type] || 0) + 1;
  });
  completed.forEach((r) => {
    const type = r.type || 'Other';
    costByType[type] = (costByType[type] || 0) + (Number(r.cost) || 0);
  });

  const vendorCosts = {};
  completed.forEach((r) => {
    if (r.vendor) {
      vendorCosts[r.vendor] = (vendorCosts[r.vendor] || 0) + (Number(r.cost) || 0);
    }
  });
  const topVendors = Object.entries(vendorCosts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    total: records.length,
    completed: completed.length,
    pending: pending.length,
    inProgress: inProgress.length,
    totalCost,
    warrantySavings,
    byType,
    costByType,
    topVendors,
  };
};

/** Completed non-warranty maintenance cost per month, oldest first. */
export const maintenanceCostSeries = (records, { months = 12, now = new Date() } = {}) => {
  const keys = lastMonthKeys(months, now);
  const sums = Object.fromEntries(keys.map((k) => [k, 0]));
  records.forEach((r) => {
    if (r.status !== 'completed' || r.warrantyWork || !r.completedDate) return;
    const key = String(r.completedDate).slice(0, 7);
    if (key in sums) sums[key] += Number(r.cost) || 0;
  });
  return keys.map((key) => ({ label: monthLabelOf(key), value: sums[key] }));
};

// =============================================================================
// INVENTORY / INSURANCE
// =============================================================================

export const computeInventoryStats = (inventory) => {
  const totalValue = inventory.reduce((sum, i) => sum + (i.currentValue || 0), 0);
  const totalPurchase = inventory.reduce((sum, i) => sum + (i.purchasePrice || 0), 0);

  const byCategory = {};
  const byStatus = {};
  const byCondition = {};
  const byLocation = {};
  inventory.forEach((item) => {
    const cat = item.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { count: 0, value: 0 };
    byCategory[cat].count++;
    byCategory[cat].value += item.currentValue || 0;

    const status = item.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const condition = item.condition || 'Unknown';
    byCondition[condition] = (byCondition[condition] || 0) + 1;

    const loc = item.location || 'Unassigned';
    if (!byLocation[loc]) byLocation[loc] = { count: 0, value: 0 };
    byLocation[loc].count++;
    byLocation[loc].value += item.currentValue || 0;
  });

  return {
    totalItems: inventory.length,
    totalValue,
    totalPurchase,
    depreciation: totalPurchase - totalValue,
    byCategory,
    byStatus,
    byCondition,
    byLocation,
  };
};

/**
 * Cumulative inventory value by purchase month over the trailing window.
 * Items purchased before the window seed the starting level; items without
 * a purchase date are excluded (callers should say so in the caption).
 */
export const acquisitionSeries = (inventory, { months = 24, now = new Date() } = {}) => {
  const keys = lastMonthKeys(months, now);
  const firstKey = keys[0];
  let running = 0;
  const perMonth = Object.fromEntries(keys.map((k) => [k, 0]));
  let datedItems = 0;

  inventory.forEach((item) => {
    if (!item.purchaseDate) return;
    datedItems += 1;
    const key = String(item.purchaseDate).slice(0, 7);
    const value = item.currentValue || 0;
    if (key < firstKey) running += value;
    else if (key in perMonth) perMonth[key] += value;
  });

  const series = keys.map((key) => {
    running += perMonth[key];
    return { label: monthLabelOf(key), value: running };
  });
  return { series, datedItems, undatedItems: inventory.length - datedItems };
};

const VALUE_BUCKETS = [
  { label: 'Under $100', max: 100 },
  { label: '$100–500', max: 500 },
  { label: '$500–1k', max: 1000 },
  { label: '$1k–2.5k', max: 2500 },
  { label: '$2.5k–5k', max: 5000 },
  { label: '$5k+', max: Infinity },
];

/** Item counts per value band — the shape of where the money sits. */
export const valueDistribution = (inventory) =>
  VALUE_BUCKETS.map(({ label, max }, idx) => {
    const min = idx === 0 ? -Infinity : VALUE_BUCKETS[idx - 1].max;
    return {
      label,
      value: inventory.filter((i) => {
        const v = i.currentValue || 0;
        return v >= (min === -Infinity ? 0 : min) && v < max;
      }).length,
    };
  });

// =============================================================================
// ACTIVITY
// =============================================================================

export const computeActivityStats = (inventory, todayISO = getTodayISO()) => {
  const totalCheckouts = inventory.reduce((sum, i) => sum + (i.checkoutCount || 0), 0);
  const currentlyOut = inventory.filter((i) => i.status === 'checked-out');

  const topItems = [...inventory]
    .filter((i) => (i.checkoutCount || 0) > 0)
    .sort((a, b) => (b.checkoutCount || 0) - (a.checkoutCount || 0))
    .slice(0, 15);

  const neverCheckedOut = inventory.filter((i) => !i.checkoutCount || i.checkoutCount === 0);

  const frequencyBuckets = { 0: 0, '1-5': 0, '6-10': 0, '11-25': 0, '26-50': 0, '50+': 0 };
  inventory.forEach((i) => {
    const count = i.checkoutCount || 0;
    if (count === 0) frequencyBuckets['0']++;
    else if (count <= 5) frequencyBuckets['1-5']++;
    else if (count <= 10) frequencyBuckets['6-10']++;
    else if (count <= 25) frequencyBuckets['11-25']++;
    else if (count <= 50) frequencyBuckets['26-50']++;
    else frequencyBuckets['50+']++;
  });

  const byCategory = {};
  inventory.forEach((item) => {
    const cat = item.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = { checkouts: 0, items: 0 };
    byCategory[cat].checkouts += item.checkoutCount || 0;
    byCategory[cat].items++;
  });

  const checkedOutDetails = currentlyOut
    .sort((a, b) => new Date(a.dueBack || '9999') - new Date(b.dueBack || '9999'))
    .map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      borrower: item.checkedOutTo || 'Unknown',
      checkedOutDate: item.checkedOutDate,
      dueBack: item.dueBack,
      project: item.checkoutProject,
      isOverdue: isItemOverdue(item, todayISO),
    }));

  const utilizedCount = inventory.filter((i) => (i.checkoutCount || 0) > 0).length;
  const utilizationRate =
    inventory.length > 0 ? Math.round((utilizedCount / inventory.length) * 100) : 0;

  return {
    totalCheckouts,
    currentlyOut: currentlyOut.length,
    topItems,
    neverCheckedOut: neverCheckedOut.length,
    frequencyBuckets,
    byCategory,
    checkedOutDetails,
    utilizationRate,
  };
};

// =============================================================================
// TIME BUCKETING — checkout_history events
// =============================================================================

const lastMonthKeys = (n, now) => {
  const keys = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  cursor.setMonth(cursor.getMonth() - (n - 1));
  for (let i = 0; i < n; i++) {
    keys.push(monthKeyOf(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
};

const mondayOf = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

/**
 * Bucket timestamped events over a trailing window, oldest bucket first.
 * Granularity follows the window: ≤45 days → daily, ≤180 → weekly (Monday
 * start), otherwise monthly. Events outside the window are ignored.
 */
export const bucketEvents = (events, { days, now = new Date() } = {}) => {
  const unit = days <= 45 ? 'day' : days <= 180 ? 'week' : 'month';
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));
  // Window closes at END of the current day — an event later today must not
  // fall out of its own bucket just because `now` is earlier in the day
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const buckets = [];
  const index = new Map();
  if (unit === 'day') {
    const cursor = new Date(start);
    while (cursor <= now) {
      const key = localDayKey(cursor);
      index.set(key, buckets.length);
      buckets.push({ label: `${cursor.getMonth() + 1}/${cursor.getDate()}`, value: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (unit === 'week') {
    const cursor = mondayOf(start);
    const lastMonday = mondayOf(now);
    while (cursor <= lastMonday) {
      const key = localDayKey(cursor);
      index.set(key, buckets.length);
      buckets.push({ label: `${cursor.getMonth() + 1}/${cursor.getDate()}`, value: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const monthsSpan = Math.max(1, Math.round(days / 30));
    lastMonthKeys(monthsSpan, now).forEach((key) => {
      index.set(key, buckets.length);
      buckets.push({ label: monthLabelOf(key), value: 0 });
    });
  }

  (events || []).forEach((event) => {
    if (!event.timestamp) return;
    const date = new Date(event.timestamp);
    if (Number.isNaN(date.getTime()) || date < start || date > end) return;
    const key =
      unit === 'day'
        ? localDayKey(date)
        : unit === 'week'
          ? localDayKey(mondayOf(date))
          : monthKeyOf(date);
    const i = index.get(key);
    if (i !== undefined) buckets[i].value += 1;
  });

  return buckets;
};

/** Event counts by day of week, Monday first. */
export const dayOfWeekCounts = (events) => {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  (events || []).forEach((event) => {
    if (!event.timestamp) return;
    const date = new Date(event.timestamp);
    if (Number.isNaN(date.getTime())) return;
    counts[(date.getDay() + 6) % 7] += 1;
  });
  return DAYS_MON_FIRST.map((label, i) => ({ label, value: counts[i] }));
};

// =============================================================================
// CSV BUILDERS — {headers, rows, filename}; views hand these to downloadCSV
// =============================================================================

export const csvForInventory = (items, now = new Date()) => ({
  headers: [
    'Item ID',
    'Name',
    'Brand',
    'Category',
    'Status',
    'Condition',
    'Location',
    'Serial Number',
    'Purchase Date',
    'Purchase Price',
    'Current Value',
    'Quantity',
  ],
  rows: items.map((item) => [
    item.id,
    item.name,
    item.brand || '',
    item.category || '',
    item.status || '',
    item.condition || '',
    item.location || '',
    item.serialNumber || '',
    item.purchaseDate || '',
    item.purchasePrice || 0,
    item.currentValue || 0,
    item.quantity || 1,
  ]),
  filename: `inventory-summary-${csvDate(now)}.csv`,
});

export const csvForActivity = (inventory, now = new Date()) => ({
  headers: [
    'Item ID',
    'Name',
    'Brand',
    'Category',
    'Status',
    'Checkout Count',
    'Currently Checked Out To',
    'Checked Out Date',
    'Due Back',
    'Project',
  ],
  rows: [...inventory]
    .sort((a, b) => (b.checkoutCount || 0) - (a.checkoutCount || 0))
    .map((item) => [
      item.id,
      item.name,
      item.brand || '',
      item.category || '',
      item.status || '',
      item.checkoutCount || 0,
      item.checkedOutTo || '',
      item.checkedOutDate || '',
      item.dueBack || '',
      item.checkoutProject || '',
    ]),
  filename: `activity-report-${csvDate(now)}.csv`,
});

export const csvForAlerts = (allAlerts, now = new Date()) => ({
  headers: [
    'Item ID',
    'Name',
    'Brand',
    'Category',
    'Status',
    'Condition',
    'Location',
    'Current Value',
    'Alert Reasons',
    'Due Back',
    'Checked Out To',
  ],
  rows: allAlerts.map((item) => [
    item.id,
    item.name,
    item.brand || '',
    item.category || '',
    item.status || '',
    item.condition || '',
    item.location || '',
    item.currentValue || 0,
    item.reasons.join('; '),
    item.dueBack || '',
    item.checkedOutTo || '',
  ]),
  filename: `alerts-report-${csvDate(now)}.csv`,
});

export const csvForMaintenance = (records, now = new Date()) => ({
  headers: [
    'Item',
    'Item ID',
    'Type',
    'Description',
    'Status',
    'Vendor',
    'Cost',
    'Warranty',
    'Scheduled Date',
    'Completed Date',
  ],
  rows: sortMaintenanceRecords(records).map((r) => [
    r.itemName,
    r.itemId,
    r.type,
    r.description || '',
    r.status,
    r.vendor || '',
    r.cost || 0,
    r.warrantyWork ? 'Yes' : 'No',
    r.scheduledDate || '',
    r.completedDate || '',
  ]),
  filename: `maintenance-report-${csvDate(now)}.csv`,
});

export const csvForInsurance = (items, now = new Date()) => ({
  headers: [
    'Item ID',
    'Name',
    'Brand',
    'Category',
    'Serial Number',
    'Purchase Date',
    'Purchase Price',
    'Current Value',
    'Condition',
    'Location',
    'Status',
  ],
  rows: items.map((i) => [
    i.id,
    i.name,
    i.brand || '',
    i.category || '',
    i.serialNumber || '',
    i.purchaseDate || '',
    i.purchasePrice || 0,
    i.currentValue || 0,
    i.condition || '',
    i.location || '',
    i.status || '',
  ]),
  filename: `insurance-inventory-${csvDate(now)}.csv`,
});

/**
 * Client CSV — reservation counts are grouped bookings. The phantom
 * "Total Value" column is gone: reservations carry no monetary value in the
 * schema, so the old export summed a field that never existed (always $0).
 */
export const csvForClients = (clientsWithStats, now = new Date()) => ({
  headers: ['Client Name', 'Type', 'Company', 'Email', 'Phone', 'Reservations', 'Favorite'],
  rows: clientsWithStats.map((c) => [
    c.name,
    c.type,
    c.company || '',
    c.email || '',
    c.phone || '',
    c.reservationCount,
    c.favorite ? 'Yes' : 'No',
  ]),
  filename: `client-report-${csvDate(now)}.csv`,
});
