// =============================================================================
// SearchView — Test Suite
// Pins the global-search round:
// - genuinely global: gear (incl. kits), clients, packages, pack lists, and
//   reservations, in permission-gated sections
// - the overdue/low-stock status filters match COMPUTED state (the old raw
//   equality check silently matched nothing, ever)
// - multi-word queries match across fields ("sony a7s3" = brand + serial)
// - reservations are grouped: a 2-item booking is one result
// - prompt state instead of a full inventory dump on empty query
// - stale category selections (deleted in Admin) are pruned
// - lazy slices are ensured on mount; loading is announced, not hidden
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const { filterState, dataState, permissionsState } = vi.hoisted(() => {
  const filterState = {};
  const dataState = {};
  const permissionsState = { visible: [] };
  return { filterState, dataState, permissionsState };
});

vi.mock('../contexts/FilterContext.js', () => ({
  useFilterContext: () => filterState,
}));
vi.mock('../contexts/DataContext.js', () => ({
  useData: () => dataState,
}));
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canView: (id) => permissionsState.visible.includes(id),
    canEdit: () => false,
    hasPermission: () => true,
  }),
}));

const { default: SearchView } = await import('../views/SearchView.jsx');

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const reservation = (id, itemFields) => ({
  id,
  groupId: 'g1',
  clientId: 'CL001',
  project: 'Desert Shoot',
  start: '2026-08-01',
  end: '2026-08-03',
  status: 'confirmed',
  ...itemFields,
});

const inventory = [
  {
    id: 'CAM1',
    name: 'Sony A7S III',
    brand: 'Sony',
    category: 'Cameras',
    status: 'available',
    serialNumber: 'SN-A7S3-001',
    reservations: [reservation('r1')],
  },
  {
    id: 'CAM2',
    name: 'Alpha Cam',
    brand: 'Canon',
    category: 'Cameras',
    status: 'checked-out',
    dueBack: '2020-01-01', // long overdue — stored status stays 'checked-out'
    reservations: [reservation('r2')],
  },
  {
    id: 'TAPE1',
    name: 'Gaffer Tape',
    brand: 'Pro Gaff',
    category: 'Consumables',
    status: 'available',
    quantity: 2,
    reorderPoint: 5,
    lowStockAlert: true, // the per-item opt-in — off means never low
  },
  {
    id: 'KIT1',
    name: 'Interview Kit Alpha',
    brand: 'Mixed',
    category: 'Cameras',
    status: 'available',
    isKit: true,
  },
];

const clients = [
  { id: 'CL001', name: 'Acme Films', type: 'Company', email: 'acme@example.com' },
  { id: 'CL002', name: 'Sarah Lens', type: 'Individual', company: 'Freelance', phone: '555-1234' },
];

const packages = [
  {
    id: 'pkg-1',
    name: 'Interview Package',
    category: 'Audio',
    description: 'Two-person interview setup',
    items: [{ itemId: 'CAM1' }, { itemId: 'CAM2' }],
  },
];

const packLists = [{ id: 'pl-1', name: 'Job Alpha List', items: [{ itemId: 'CAM1' }] }];

function resetState({ query = '', visible, data = {}, filters = {} } = {}) {
  Object.keys(filterState).forEach((k) => delete filterState[k]);
  Object.assign(filterState, {
    globalSearchQuery: query,
    setGlobalSearchQuery: vi.fn(),
    globalSearchTypes: [],
    setGlobalSearchTypes: vi.fn(),
    selectedCategories: [],
    setSelectedCategories: vi.fn(),
    selectedStatuses: [],
    setSelectedStatuses: vi.fn(),
    ...filters,
  });

  Object.keys(dataState).forEach((k) => delete dataState[k]);
  Object.assign(dataState, {
    inventory,
    clients,
    packages,
    packLists,
    categories: ['Cameras', 'Consumables'],
    categorySettings: { Consumables: { trackQuantity: true } },
    clientsLoaded: true,
    packListsLoaded: true,
    tier2Loaded: true,
    ensureClients: vi.fn(),
    ensurePackLists: vi.fn(),
    ...data,
  });

  permissionsState.visible = visible || [
    'search',
    'gear_list',
    'clients',
    'pack_lists',
    'schedule',
  ];
}

function renderSearch(props = {}) {
  const defaults = {
    onViewItem: vi.fn(),
    onViewClient: vi.fn(),
    onViewPackage: vi.fn(),
    onViewPackList: vi.fn(),
    onViewReservation: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<SearchView {...merged} />), props: merged };
}

beforeEach(() => {
  resetState();
});

// =============================================================================
// Prompt state + lazy loading
// =============================================================================

describe('prompt state', () => {
  it('shows a prompt instead of dumping the inventory on empty query', () => {
    renderSearch();
    expect(screen.getByText('Search everything in SIMS')).toBeInTheDocument();
    expect(screen.queryByText(/result/)).not.toBeInTheDocument();
    expect(screen.queryByText('Sony A7S III')).not.toBeInTheDocument();
  });

  it('ensures lazy slices on mount so results are ready as the user types', () => {
    renderSearch();
    expect(dataState.ensureClients).toHaveBeenCalled();
    expect(dataState.ensurePackLists).toHaveBeenCalled();
  });

  it('skips lazy loads the role cannot view', () => {
    resetState({ visible: ['search', 'gear_list'] });
    renderSearch();
    expect(dataState.ensureClients).not.toHaveBeenCalled();
    expect(dataState.ensurePackLists).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Global sections
// =============================================================================

describe('global sections', () => {
  it('finds gear and shows serial + human status label', () => {
    resetState({ query: 'sony' });
    renderSearch();
    expect(screen.getByText('Sony A7S III')).toBeInTheDocument();
    expect(screen.getByText(/SN-A7S3-001/)).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
    expect(screen.queryByText('Acme Films')).not.toBeInTheDocument();
  });

  it('matches multi-word queries across fields (brand + serial)', () => {
    resetState({ query: 'sony a7s3' });
    renderSearch();
    expect(screen.getByText('Sony A7S III')).toBeInTheDocument();
  });

  it('finds kits, badged as such', () => {
    resetState({ query: 'interview kit' });
    renderSearch();
    expect(screen.getByText('Interview Kit Alpha')).toBeInTheDocument();
    expect(screen.getByText('Kit')).toBeInTheDocument();
  });

  it('finds clients', () => {
    resetState({ query: 'acme' });
    renderSearch();
    expect(screen.getByRole('button', { name: 'View client Acme Films' })).toBeInTheDocument();
  });

  it('finds packages', () => {
    resetState({ query: 'two-person' });
    renderSearch();
    expect(screen.getByRole('button', { name: 'View package Interview Package' })).toBeInTheDocument();
  });

  it('finds pack lists', () => {
    resetState({ query: 'job alpha' });
    renderSearch();
    expect(
      screen.getByRole('button', { name: 'View pack list Job Alpha List' }),
    ).toBeInTheDocument();
  });

  it('shows a grouped reservation as ONE result with item count and client', () => {
    resetState({ query: 'desert' });
    renderSearch();
    const row = screen.getByRole('button', { name: 'View reservation Desert Shoot' });
    expect(row).toBeInTheDocument();
    expect(within(row).getByText(/2 items/)).toBeInTheDocument();
    expect(within(row).getByText(/Acme Films/)).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('searches reservations by client name too', () => {
    resetState({ query: 'acme' });
    renderSearch();
    expect(screen.getByRole('button', { name: 'View reservation Desert Shoot' })).toBeInTheDocument();
  });
});

// =============================================================================
// Computed status filters — the headline bug
// =============================================================================

describe('computed status filters', () => {
  it('overdue matches items whose stored status is checked-out with a past due date', () => {
    resetState({ filters: { selectedStatuses: ['overdue'] } });
    renderSearch();
    expect(screen.getByText('Alpha Cam')).toBeInTheDocument();
    expect(screen.queryByText('Sony A7S III')).not.toBeInTheDocument();
  });

  it('low-stock matches opted-in items via quantity vs their reorder point', () => {
    resetState({ filters: { selectedStatuses: ['low-stock'] } });
    renderSearch();
    expect(screen.getByText('Gaffer Tape')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Cam')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Permission gating
// =============================================================================

describe('permission gating', () => {
  it('never leaks sections the role cannot view', () => {
    resetState({ query: 'acme', visible: ['search', 'gear_list'] });
    renderSearch();
    expect(screen.queryByText('Acme Films')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'View reservation Desert Shoot' }),
    ).not.toBeInTheDocument();
  });
});

// =============================================================================
// Loading, empty state, pruning, navigation
// =============================================================================

describe('loading and empty states', () => {
  it('announces slices still loading instead of a false "no results"', () => {
    resetState({ query: 'acme', data: { clients: [], clientsLoaded: false } });
    renderSearch();
    expect(screen.getByRole('status')).toHaveTextContent(/Still loading: clients/);
  });

  it('shows the empty state with a Clear Filters escape hatch', () => {
    resetState({ query: 'zzz-nothing-matches' });
    renderSearch();
    expect(screen.getByText('No results match your search')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(filterState.setGlobalSearchQuery).toHaveBeenCalledWith('');
    expect(filterState.setGlobalSearchTypes).toHaveBeenCalledWith([]);
    expect(filterState.setSelectedCategories).toHaveBeenCalledWith([]);
    expect(filterState.setSelectedStatuses).toHaveBeenCalledWith([]);
  });
});

describe('stale category pruning', () => {
  it('drops selected categories that no longer exist', () => {
    resetState({ filters: { selectedCategories: ['Cameras', 'Ghost'] } });
    renderSearch();
    expect(filterState.setSelectedCategories).toHaveBeenCalled();
    const updater = filterState.setSelectedCategories.mock.calls[0][0];
    expect(updater(['Cameras', 'Ghost'])).toEqual(['Cameras']);
  });

  it('keeps the selection identity when nothing is stale', () => {
    resetState({ filters: { selectedCategories: ['Cameras'] } });
    renderSearch();
    const updater = filterState.setSelectedCategories.mock.calls[0][0];
    const prev = ['Cameras'];
    expect(updater(prev)).toBe(prev);
  });
});

describe('navigation callbacks', () => {
  it('gear row → onViewItem(id)', () => {
    resetState({ query: 'sony' });
    const { props } = renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'View Sony A7S III' }));
    expect(props.onViewItem).toHaveBeenCalledWith('CAM1');
  });

  it('client row → onViewClient(client)', () => {
    resetState({ query: 'sarah' });
    const { props } = renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'View client Sarah Lens' }));
    expect(props.onViewClient).toHaveBeenCalledWith(expect.objectContaining({ id: 'CL002' }));
  });

  it('package row → onViewPackage(pkg)', () => {
    resetState({ query: 'interview package' });
    const { props } = renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'View package Interview Package' }));
    expect(props.onViewPackage).toHaveBeenCalledWith(expect.objectContaining({ id: 'pkg-1' }));
  });

  it('pack list row → onViewPackList(list)', () => {
    resetState({ query: 'job alpha' });
    const { props } = renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'View pack list Job Alpha List' }));
    expect(props.onViewPackList).toHaveBeenCalledWith(expect.objectContaining({ id: 'pl-1' }));
  });

  it('reservation row → onViewReservation(group, firstItem)', () => {
    resetState({ query: 'desert' });
    const { props } = renderSearch();
    fireEvent.click(screen.getByRole('button', { name: 'View reservation Desert Shoot' }));
    const [group, item] = props.onViewReservation.mock.calls[0];
    expect(group.itemCount).toBe(2);
    expect(group.reservationIds).toEqual(['r1', 'r2']);
    expect(item.id).toBe('CAM1');
  });
});
