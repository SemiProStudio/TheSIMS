// =============================================================================
// PackagesView — Test Suite
// Pins the packages improvement round:
// - metadata (name/description/category) editable via the details modal
// - duplicate-name check ignores the package being edited
// - failed DB delete keeps the package locally (no phantom delete)
// - delete confirmation warns when pack lists reference the package
// - availability panel: unavailable items, quantity shortfalls, deleted refs
// - value falls back to purchasePrice like the gear list
// - Reserve hands the resolved package items to the reservation flow
// - notes load lazily and render through NotesSection
// - suggested-accessory adds are audit-logged
// - item-selection checkboxes are labeled and don't double-toggle
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('../contexts/DataContext.js', () => ({
  useData: () => null,
}));
vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
// The view gates mutations on gear_list edit and reserving on schedule edit;
// these tests exercise the full-permission surface
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({ canView: () => true, canEdit: () => true }),
}));
vi.mock('../contexts/PermissionsContext.jsx', () => ({
  ViewOnlyBanner: () => null,
}));

const { default: PackagesView } = await import('../views/PackagesView.jsx');

const inventory = [
  {
    id: 'CAM1',
    name: 'Alpha Cam',
    category: 'Video',
    status: 'available',
    currentValue: 1000,
    requiredAccessories: ['TRI1'],
  },
  {
    id: 'MIC1',
    name: 'Shotgun Mic',
    category: 'Audio',
    status: 'checked-out',
    purchasePrice: 200, // no currentValue — value must fall back
    quantity: 1,
  },
  { id: 'TRI1', name: 'Tripod', category: 'Video', status: 'available', currentValue: 50 },
];

const categorySettings = { Audio: { trackQuantity: true } };

// Kit A: one unavailable item, a quantity shortfall (needs 3, stock 1), and
// a reference to a deleted item — every issue type at once
const pkg1 = {
  id: 'PKG-001',
  name: 'Kit A',
  description: 'Big kit',
  category: 'Video',
  items: ['CAM1', 'MIC1', 'GONE1'],
  itemQuantities: { MIC1: 3 },
  notes: [],
};
// Kit B: value fallback (purchasePrice-only item)
const pkg2 = {
  id: 'PKG-002',
  name: 'Kit B',
  description: '',
  category: 'Audio',
  items: ['MIC1'],
  itemQuantities: {},
  notes: [],
};
// Kit C: clean package, no issues
const pkg3 = {
  id: 'PKG-003',
  name: 'Kit C',
  description: '',
  category: '',
  items: ['CAM1'],
  itemQuantities: {},
  notes: [],
};

const packLists = [{ id: 'PL1', name: 'Job X', packages: ['PKG-001'], items: [] }];

function makeDataContext(overrides = {}) {
  return {
    ensurePackLists: vi.fn(),
    loadPackageNotes: vi.fn().mockResolvedValue([]),
    createPackage: vi.fn().mockResolvedValue({ ...pkg3, id: 'PKG-NEW' }),
    updatePackage: vi.fn().mockResolvedValue({}),
    deletePackage: vi.fn().mockResolvedValue({}),
    patchPackage: vi.fn(),
    addLocalPackage: vi.fn(),
    removeLocalPackage: vi.fn(),
    ...overrides,
  };
}

function renderPackages(overrides = {}) {
  const props = {
    packages: [pkg1, pkg2, pkg3],
    packLists,
    dataContext: makeDataContext(),
    inventory,
    categorySettings,
    onViewItem: vi.fn(),
    addAuditLog: vi.fn(),
    currentUser: { id: 'u1', name: 'Tester' },
    onReserve: vi.fn(),
    onAddNote: vi.fn(),
    onReplyNote: vi.fn(),
    onDeleteNote: vi.fn(),
    ...overrides,
  };
  const view = render(<PackagesView {...props} />);
  return { props, view };
}

beforeEach(() => {
  mockAddToast.mockClear();
});

describe('Packages list', () => {
  it('flags only packages with availability issues', () => {
    renderPackages();
    // Kit A (unavailable+shortfall+missing) and Kit B (unavailable) — not Kit C
    expect(screen.getAllByLabelText('Package has availability issues')).toHaveLength(2);
  });

  it('search matches the package category', () => {
    renderPackages();
    fireEvent.change(screen.getByPlaceholderText('Search packages...'), {
      target: { value: 'audio' },
    });
    expect(screen.getByText('Kit B')).toBeInTheDocument();
    expect(screen.queryByText('Kit A')).not.toBeInTheDocument();
  });

  it('package value falls back to purchase price', () => {
    renderPackages();
    // Kit B = Shotgun Mic with purchasePrice 200 and no currentValue
    expect(screen.getByText('$200')).toBeInTheDocument();
  });
});

describe('Package detail — availability panel', () => {
  it('lists unavailable items, shortfalls, and deleted refs specifically', () => {
    renderPackages();
    fireEvent.click(screen.getByText('Kit A'));

    const text = document.body.textContent;
    expect(text).toContain('Not available: Shotgun Mic');
    expect(text).toContain('Shotgun Mic: package needs 3, only 1 in stock');
    expect(text).toContain('1 item in this package no longer exists in inventory');
  });

  it('shows no warning panel for a clean package', () => {
    renderPackages();
    fireEvent.click(screen.getByText('Kit C'));
    expect(document.body.textContent).not.toContain('Not available:');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('Package detail — actions', () => {
  it('Reserve passes the package and its resolved items', () => {
    const { props } = renderPackages();
    fireEvent.click(screen.getByText('Kit A'));
    fireEvent.click(screen.getByRole('button', { name: /Reserve/ }));

    expect(props.onReserve).toHaveBeenCalledTimes(1);
    const [pkgArg, itemsArg] = props.onReserve.mock.calls[0];
    expect(pkgArg.id).toBe('PKG-001');
    // GONE1 no longer exists and must not reach the reservation form
    expect(itemsArg.map((i) => i.id)).toEqual(['CAM1', 'MIC1']);
  });

  it('adding a suggested accessory persists and writes an audit entry', async () => {
    const { props } = renderPackages();
    fireEvent.click(screen.getByText('Kit C'));

    // CAM1 requires TRI1, which is not in the package
    expect(screen.getByText('Suggested Accessories (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));

    await waitFor(() => {
      expect(props.dataContext.updatePackage).toHaveBeenCalledWith('PKG-003', {
        items: ['CAM1', 'TRI1'],
      });
      expect(props.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'package_updated',
          description: expect.stringContaining('Tripod'),
        }),
      );
    });
  });
});

describe('Package metadata editing', () => {
  it('Edit opens the details modal pre-filled and saves a rename', async () => {
    const { props } = renderPackages();
    fireEvent.click(screen.getByText('Kit C'));
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));

    expect(screen.getByText('Edit Package Details')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('Kit C');
    fireEvent.change(nameInput, { target: { value: 'Kit C2' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Select Items/ }));

    // Item selection step, then save everything
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    await waitFor(() => {
      expect(props.dataContext.updatePackage).toHaveBeenCalledWith(
        'PKG-003',
        expect.objectContaining({ name: 'Kit C2' }),
      );
    });
  });

  it('duplicate-name check ignores the package being edited', () => {
    renderPackages();
    fireEvent.click(screen.getByText('Kit C'));
    fireEvent.click(screen.getByRole('button', { name: /Edit/ }));

    // Renaming to another package's name is rejected
    fireEvent.change(screen.getByDisplayValue('Kit C'), { target: { value: 'Kit A' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Select Items/ }));
    expect(screen.getByText('A package with this name already exists')).toBeInTheDocument();

    // Keeping its own name passes through to item selection
    fireEvent.change(screen.getByDisplayValue('Kit A'), { target: { value: 'Kit C' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Select Items/ }));
    expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument();
  });
});

describe('Package deletion', () => {
  it('confirmation warns when pack lists reference the package', () => {
    renderPackages();
    fireEvent.click(screen.getByText('Kit A'));
    fireEvent.click(screen.getByTitle('Delete package'));

    expect(screen.getByText(/used by 1 pack list \(Job X\)/)).toBeInTheDocument();
  });

  it('a failed DB delete keeps the package and reports the error', async () => {
    const dataContext = makeDataContext({
      deletePackage: vi.fn().mockRejectedValue(new Error('boom')),
    });
    renderPackages({ dataContext });
    fireEvent.click(screen.getByText('Kit C'));
    fireEvent.click(screen.getByTitle('Delete package'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete package', 'error');
    });
    // Still on the detail view, nothing removed locally
    expect(dataContext.removeLocalPackage).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Kit C' })).toBeInTheDocument();
  });
});

describe('Package notes', () => {
  it('loads notes lazily and renders them', async () => {
    const dataContext = makeDataContext({
      loadPackageNotes: vi.fn().mockResolvedValue([
        {
          id: 'n1',
          user: 'Tester',
          date: '2026-01-01',
          text: 'hello note',
          replies: [],
          deleted: false,
        },
      ]),
    });
    // No notes key — simulates a package fresh from getAll()
    const { notes: _unused, ...pkgWithoutNotes } = pkg3;
    renderPackages({ dataContext, packages: [pkgWithoutNotes] });

    fireEvent.click(screen.getByText('Kit C'));
    expect(await screen.findByText('hello note')).toBeInTheDocument();
    expect(dataContext.loadPackageNotes).toHaveBeenCalledWith('PKG-003');
  });

  it('submitting the note input calls onAddNote', async () => {
    const { props } = renderPackages();
    fireEvent.click(screen.getByText('Kit C'));

    const input = await screen.findByPlaceholderText('Add a note...');
    fireEvent.change(input, { target: { value: 'fresh note' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onAddNote).toHaveBeenCalledWith('fresh note');
  });
});

describe('Item selection checkboxes', () => {
  it('are labeled and toggle exactly once per direct click', () => {
    renderPackages({ packages: [] });
    fireEvent.click(screen.getByRole('button', { name: /Create Your First Package/ }));
    fireEvent.change(screen.getByPlaceholderText('e.g., Wedding Photography Package'), {
      target: { value: 'Fresh Package' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Select Items/ }));

    const checkbox = screen.getByRole('checkbox', { name: 'Select Alpha Cam' });
    expect(checkbox).not.toBeChecked();

    // Direct checkbox click used to bubble to the row handler and toggle
    // twice — a silent no-op
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    // Row click still toggles too
    fireEvent.click(screen.getByText('Alpha Cam'));
    expect(checkbox).toBeChecked();
  });
});

describe('navigation resets', () => {
  it('returns to the overview when resetNonce changes (sidebar re-click)', () => {
    const { props, view } = renderPackages({ initialSelectedPackage: pkg3, resetNonce: 0 });
    expect(screen.getByRole('heading', { level: 2, name: 'Kit C' })).toBeInTheDocument();

    view.rerender(<PackagesView {...props} resetNonce={1} />);
    expect(screen.queryByRole('heading', { level: 2, name: 'Kit C' })).not.toBeInTheDocument();
  });

  it('closes the detail view when initialSelectedPackage is cleared to null', () => {
    const { props, view } = renderPackages({ initialSelectedPackage: pkg3 });
    expect(screen.getByRole('heading', { level: 2, name: 'Kit C' })).toBeInTheDocument();

    view.rerender(<PackagesView {...props} initialSelectedPackage={null} />);
    expect(screen.queryByRole('heading', { level: 2, name: 'Kit C' })).not.toBeInTheDocument();
  });
});
