// =============================================================================
// GearList — Test Suite
// Pins the gear-list improvement round:
// - selection syncs to FilterContext (Export Data scope) and clears on exit
// - search covers serial numbers; sort orders and is captured by saved views
// - kits appear only under the explicit Kits filter, badged
// - selection checkboxes are real checkboxes (aria-checked, labels)
// - saved views upsert by name and mark the active view
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: () => true,
    canView: () => true,
    hasPermission: () => true,
  }),
}));
vi.mock('../contexts/PermissionsContext.jsx', () => ({
  ViewOnlyBanner: () => null,
}));

const { default: GearList } = await import('../views/GearList.jsx');
const { sortItems, SORT_OPTIONS, KITS_FILTER } = await import('../lib/gearListOptions.js');
const { ExportModal } = await import('../modals/ExportModal.jsx');

const inventory = [
  {
    id: 'CA1',
    name: 'Zeta Camera',
    brand: 'Canon',
    category: 'Cameras',
    status: 'available',
    serialNumber: 'SN-ZETA-9',
    currentValue: 3000,
    location: 'Shelf A',
    condition: 'good',
  },
  {
    id: 'CA2',
    name: 'Alpha Camera',
    brand: 'Sony',
    category: 'Cameras',
    status: 'checked-out',
    checkedOutTo: 'Jordan',
    dueBack: '2020-01-01', // long overdue
    currentValue: 1000,
    location: 'Shelf B',
    condition: 'fair',
  },
  {
    id: 'LI1',
    name: 'Mid Light',
    brand: 'Aputure',
    category: 'Lighting',
    status: 'available',
    purchasePrice: 2000, // no currentValue — falls back
    location: 'Shelf C',
    condition: 'excellent',
  },
  {
    id: 'KIT1',
    name: 'A-Cam Kit',
    brand: 'Mixed',
    category: 'Cameras',
    status: 'available',
    isKit: true,
    kitItems: ['CA1'],
  },
];

function renderGearList(overrides = {}) {
  const props = {
    inventory,
    categories: ['Cameras', 'Lighting'],
    categorySettings: {},
    searchQuery: '',
    setSearchQuery: vi.fn(),
    categoryFilter: 'all',
    setCategoryFilter: vi.fn(),
    statusFilter: 'all',
    setStatusFilter: vi.fn(),
    isGridView: false,
    setIsGridView: vi.fn(),
    onViewItem: vi.fn(),
    onAddItem: vi.fn(),
    onBulkAction: vi.fn(),
    onSelectionChange: vi.fn(),
    savedViews: [],
    onChangeSavedViews: vi.fn(),
    uiPrefs: undefined,
    onSaveUiPrefs: vi.fn(),
    ...overrides,
  };
  const view = render(<GearList {...props} />);
  return { props, view };
}

describe('sortItems', () => {
  const names = (items) => items.map((i) => i.name);

  it('leaves order untouched for default', () => {
    expect(names(sortItems(inventory, 'default'))).toEqual(names(inventory));
  });

  it('sorts by name in both directions', () => {
    expect(names(sortItems(inventory, 'name-asc'))[0]).toBe('A-Cam Kit');
    expect(names(sortItems(inventory, 'name-desc'))[0]).toBe('Zeta Camera');
  });

  it('sorts by value with purchase-price fallback', () => {
    const desc = sortItems(inventory, 'value-desc');
    expect(desc[0].id).toBe('CA1'); // 3000
    expect(desc[1].id).toBe('LI1'); // 2000 via purchasePrice
    const asc = sortItems(inventory, 'value-asc');
    // KIT1 has no value at all (0), then 1000, 2000 (purchasePrice), 3000
    expect(asc.map((i) => i.id)).toEqual(['KIT1', 'CA2', 'LI1', 'CA1']);
  });

  it('every SORT_OPTIONS value is handled', () => {
    for (const { value } of SORT_OPTIONS) {
      expect(() => sortItems(inventory, value)).not.toThrow();
    }
  });
});

describe('GearList search and filters', () => {
  it('finds items by serial number', () => {
    renderGearList({ searchQuery: 'sn-zeta' });
    expect(screen.getByText('Zeta Camera')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Camera')).not.toBeInTheDocument();
  });

  it('excludes kits from normal browsing but shows them under the Kits filter', () => {
    const { view } = renderGearList();
    expect(screen.queryByText('A-Cam Kit')).not.toBeInTheDocument();

    view.rerender(
      <GearList
        {...{
          inventory,
          categories: ['Cameras', 'Lighting'],
          categorySettings: {},
          searchQuery: '',
          setSearchQuery: vi.fn(),
          categoryFilter: KITS_FILTER,
          setCategoryFilter: vi.fn(),
          statusFilter: 'all',
          setStatusFilter: vi.fn(),
          isGridView: false,
          setIsGridView: vi.fn(),
          onViewItem: vi.fn(),
          onAddItem: vi.fn(),
          onBulkAction: vi.fn(),
        }}
      />,
    );
    expect(screen.getByText('A-Cam Kit')).toBeInTheDocument();
    expect(screen.getByText('Kit')).toBeInTheDocument(); // badge
    expect(screen.queryByText('Zeta Camera')).not.toBeInTheDocument();
  });

  it('shows borrower/due info and an Overdue badge in list view', () => {
    renderGearList();
    const row = screen.getByText('Alpha Camera').closest('.card');
    expect(within(row).getByText(/Jordan/)).toBeInTheDocument();
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
  });

  it('empty state offers Clear Filters when filters are active', () => {
    const { props } = renderGearList({ searchQuery: 'zzz-no-match' });
    fireEvent.click(screen.getByRole('button', { name: /Clear Filters/ }));
    expect(props.setSearchQuery).toHaveBeenCalledWith('');
    expect(props.setCategoryFilter).toHaveBeenCalledWith('all');
    expect(props.setStatusFilter).toHaveBeenCalledWith('all');
  });
});

describe('GearList selection', () => {
  const enterSelection = () =>
    fireEvent.click(screen.getByRole('button', { name: /Multiple Selection/ }));

  it('checkboxes are real checkboxes with labels', () => {
    renderGearList();
    enterSelection();
    const cb = screen.getByRole('checkbox', { name: 'Select Zeta Camera' });
    expect(cb).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(cb);
    expect(cb).toHaveAttribute('aria-checked', 'true');

    const selectAllCb = screen.getByRole('checkbox', { name: 'Select all items' });
    expect(selectAllCb).toHaveAttribute('aria-checked', 'mixed'); // some selected
  });

  it('syncs the selection to FilterContext and clears it on exit', () => {
    const { props } = renderGearList();
    enterSelection();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Zeta Camera' }));
    expect(props.onSelectionChange).toHaveBeenLastCalledWith(['CA1']);

    fireEvent.click(screen.getByRole('button', { name: /Exit Selection/ }));
    expect(props.onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('shift-click selects the range between two items', () => {
    const { props } = renderGearList();
    enterSelection();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Zeta Camera' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Mid Light' }), {
      shiftKey: true,
    });
    // Range covers CA1, CA2, LI1 in display order
    expect(props.onSelectionChange).toHaveBeenLastCalledWith(
      expect.arrayContaining(['CA1', 'CA2', 'LI1']),
    );
  });
});

describe('GearList saved views', () => {
  it('marks the matching view active and shows its name on the trigger', () => {
    renderGearList({
      searchQuery: 'sony',
      savedViews: [
        {
          id: 'v1',
          name: 'Sony gear',
          filters: { search: 'sony', category: 'all', status: 'all', sort: 'default' },
        },
      ],
    });
    expect(screen.getByRole('button', { name: /Sony gear/ })).toBeInTheDocument();
  });

  it('updates the existing view when saving under the same name', () => {
    const { props } = renderGearList({
      searchQuery: 'canon',
      savedViews: [
        {
          id: 'v1',
          name: 'My View',
          filters: { search: 'sony', category: 'all', status: 'all', sort: 'default' },
        },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: /Saved Views/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Current Filters/ }));
    fireEvent.change(screen.getByPlaceholderText('View name...'), {
      target: { value: 'My View' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(props.onChangeSavedViews).toHaveBeenCalledTimes(1);
    const next = props.onChangeSavedViews.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('v1');
    expect(next[0].filters.search).toBe('canon');
  });

  it('deleting a view asks for confirmation first', () => {
    const { props } = renderGearList({
      savedViews: [
        // Filters that do NOT match current state, so the view isn't "active"
        { id: 'v1', name: 'Doomed', filters: { search: 'xyz', category: 'all', status: 'all' } },
      ],
    });
    fireEvent.click(screen.getByRole('button', { name: /Saved Views/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete saved view Doomed' }));
    expect(props.onChangeSavedViews).not.toHaveBeenCalled(); // not yet

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(props.onChangeSavedViews).toHaveBeenCalledWith([]);
  });
});

// =============================================================================
// Per-user UI prefs (profile-persistence round)
// Sort/page-size were device-scoped localStorage; saved views fell back to a
// shared device store that leaked one user's views to the next account.
// =============================================================================
describe('GearList per-user UI prefs', () => {
  // The Select is a custom listbox — the trigger button shows the current
  // option's label, options are picked by role
  const sortTrigger = () => screen.getByLabelText('Sort items');

  it('initializes sort from the profile uiPrefs', () => {
    renderGearList({ uiPrefs: { gearListSort: 'name-desc' } });
    expect(sortTrigger()).toHaveTextContent('Name Z–A');
    // Zeta before Alpha before Mid
    const names = screen.getAllByText(/Camera|Light/).map((el) => el.textContent);
    expect(names.indexOf('Zeta Camera')).toBeLessThan(names.indexOf('Alpha Camera'));
  });

  it('falls back to default sort for unknown stored values', () => {
    renderGearList({ uiPrefs: { gearListSort: 'not-a-sort' } });
    expect(sortTrigger()).toHaveTextContent('Category (default)');
  });

  it('persists sort changes via onSaveUiPrefs — but never on mount', () => {
    const { props } = renderGearList();
    expect(props.onSaveUiPrefs).not.toHaveBeenCalled();

    fireEvent.click(sortTrigger());
    fireEvent.click(screen.getByRole('option', { name: 'Name A–Z' }));
    expect(props.onSaveUiPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ gearListSort: 'name-asc' }),
    );
  });

  it('ignores the legacy device stores entirely (no cross-user leak)', () => {
    localStorage.setItem('sims-gear-list-sort', 'name-desc');
    localStorage.setItem(
      'sims-saved-filter-views',
      JSON.stringify([{ id: 'v9', name: 'Leaked View', filters: { search: 'x' } }]),
    );
    renderGearList({ savedViews: undefined });
    expect(sortTrigger()).toHaveTextContent('Category (default)');
    fireEvent.click(screen.getByRole('button', { name: /Saved Views/ }));
    expect(screen.queryByText('Leaked View')).not.toBeInTheDocument();
  });

  it('saving a view no longer writes the shared device store', () => {
    localStorage.clear();
    renderGearList({ searchQuery: 'sony' });
    fireEvent.click(screen.getByRole('button', { name: /Saved Views/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Current Filters/ }));
    fireEvent.change(screen.getByPlaceholderText('View name...'), {
      target: { value: 'Mine Only' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(localStorage.getItem('sims-saved-filter-views')).toBeNull();
  });

  it('resyncs sort and page size when profile prefs arrive after mount', () => {
    const { props, view } = renderGearList(); // uiPrefs undefined at mount
    expect(sortTrigger()).toHaveTextContent('Category (default)');
    expect(screen.getByLabelText('Items per page')).toHaveTextContent('25');

    view.rerender(
      <GearList {...props} uiPrefs={{ gearListSort: 'name-asc', gearListPageSize: 50 }} />,
    );
    expect(sortTrigger()).toHaveTextContent('Name A–Z');
    expect(screen.getByLabelText('Items per page')).toHaveTextContent('50');
  });

  it('keeps a sort picked this session over a later profile refresh', () => {
    const { props, view } = renderGearList();
    fireEvent.click(sortTrigger());
    fireEvent.click(screen.getByRole('option', { name: 'Value: high to low' }));
    expect(sortTrigger()).toHaveTextContent('Value: high to low');

    view.rerender(<GearList {...props} uiPrefs={{ gearListSort: 'name-asc' }} />);
    expect(sortTrigger()).toHaveTextContent('Value: high to low');
  });
});

describe('ExportModal scope', () => {
  it('states the selection scope when items are selected', () => {
    render(<ExportModal onExport={vi.fn()} onClose={vi.fn()} selectionCount={2} totalCount={20} />);
    expect(screen.getByText('Exporting 2 selected items')).toBeInTheDocument();
  });

  it('states the full scope when nothing is selected', () => {
    render(<ExportModal onExport={vi.fn()} onClose={vi.fn()} selectionCount={0} totalCount={20} />);
    expect(screen.getByText('Exporting all 20 items')).toBeInTheDocument();
  });
});
