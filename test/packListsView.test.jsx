// =============================================================================
// PackListsView — Test Suite
// Pins the pack-lists hardening round:
// - persistence failures are honest: create/update/delete/reset toast an
//   error and leave state, the form, and the dialog intact (no local lies)
// - view-level users get no edit UI (banner instead) and RLS can't be
//   tripped from here
// - lazy loading shows "Loading" instead of a misleading empty state
// - empty packages can be selected AND deselected
// - fulfillability banner: unavailable items + quantity shortfalls
// - created-by shows on cards and in the detail meta
// - resetNonce / null initialSelectedList return the view to the overview
// - clipboard export only claims success when the write resolves
// - scan overlay log entry flips to failed when the persist rolls back
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const { mockAddToast, permissionsState } = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  permissionsState: { canEdit: true },
}));

vi.mock('../contexts/DataContext.js', () => ({
  useData: () => null,
}));
vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({ canEdit: () => permissionsState.canEdit }),
}));
vi.mock('../contexts/PermissionsContext.jsx', () => ({
  ViewOnlyBanner: ({ functionId }) => <div data-testid="view-only-banner">{functionId}</div>,
}));

const { default: PackListsView } = await import('../views/PackListsView.jsx');

const categorySettings = { Audio: { trackQuantity: true } };

const inventory = [
  { id: 'CAM1', name: 'Alpha Cam', category: 'Video', status: 'available' },
  { id: 'CAM2', name: 'Beta Cam', category: 'Video', status: 'checked-out' },
  { id: 'MIC1', name: 'Shotgun Mic', category: 'Audio', status: 'available', quantity: 2 },
];

const packages = [
  { id: 'PKG1', name: 'Video Kit', items: ['CAM1', 'CAM2'] },
  { id: 'PKGEMPTY', name: 'Empty Kit', items: [] },
];

const baseList = {
  id: 'PL1',
  name: 'Job Alpha',
  createdAt: '2026-08-01T00:00:00Z',
  created_by_name: 'Pat Creator',
  packages: [],
  items: [
    { id: 'CAM1', quantity: 1 },
    { id: 'CAM2', quantity: 1 },
  ],
  packedItems: ['CAM1'],
};

// One unavailable item (checked-out) and one quantity shortfall (needs 5,
// stock 2) — both fulfillability warning types at once
const shortfallList = {
  id: 'PL2',
  name: 'Job Shortfall',
  createdAt: '2026-08-02T00:00:00Z',
  packages: [],
  items: [
    { id: 'CAM2', quantity: 1 },
    { id: 'MIC1', quantity: 5 },
  ],
  packedItems: [],
};

function makeDataContext(overrides = {}) {
  return {
    packListsLoaded: true,
    createPackList: vi
      .fn()
      .mockImplementation(async (l) => ({ ...l, id: 'PL-NEW', createdAt: '2026-08-12T00:00:00Z' })),
    updatePackList: vi.fn().mockResolvedValue({}),
    deletePackList: vi.fn().mockResolvedValue({}),
    togglePackListItemPacked: vi.fn().mockResolvedValue({}),
    patchPackList: vi.fn(),
    addLocalPackList: vi.fn(),
    removeLocalPackList: vi.fn(),
    ...overrides,
  };
}

function renderView(props = {}) {
  const defaults = {
    packLists: [baseList],
    dataContext: makeDataContext(),
    inventory,
    packages,
    categorySettings,
    onViewItem: vi.fn(),
    addAuditLog: vi.fn(),
    currentUser: { id: 'u1', name: 'Tester' },
  };
  const merged = { ...defaults, ...props };
  return { ...render(<PackListsView {...merged} />), props: merged };
}

function openDetail(name = 'Job Alpha') {
  fireEvent.click(screen.getByText(name));
}

async function fillCreateForm(name = 'New Job') {
  fireEvent.click(screen.getByRole('button', { name: /Create Pack List/ }));
  fireEvent.change(screen.getByPlaceholderText(/Smith Wedding/), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  // Select one item in the Individual Items panel
  fireEvent.click(screen.getByText('Alpha Cam'));
}

beforeEach(() => {
  mockAddToast.mockClear();
  permissionsState.canEdit = true;
});

// =============================================================================
// Honest failure handling
// =============================================================================

describe('persist-first failure handling', () => {
  it('create failure: toasts an error, keeps the form open, logs no audit entry', async () => {
    const dataContext = makeDataContext({
      createPackList: vi.fn().mockRejectedValue(new Error('rls denied')),
    });
    const { props } = renderView({ dataContext });

    await fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Pack List/ }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to create pack list — nothing was saved',
        'error',
      ),
    );
    // Still on the create form with the selection intact
    expect(screen.getByText(/Create Pack List: New Job/)).toBeInTheDocument();
    expect(props.addAuditLog).not.toHaveBeenCalled();
  });

  it('create success: lands on the detail view and audits', async () => {
    const { props } = renderView();

    await fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /Create Pack List/ }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'New Job' })).toBeInTheDocument(),
    );
    expect(props.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pack_list_created', packListId: 'PL-NEW' }),
    );
  });

  it('update failure: toasts, stays in the edit form, no audit entry, no local patch', async () => {
    const dataContext = makeDataContext({
      updatePackList: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { props } = renderView({ dataContext });

    openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to save pack list — nothing was changed',
        'error',
      ),
    );
    expect(screen.getByText(/Edit Pack List: Job Alpha/)).toBeInTheDocument();
    expect(props.addAuditLog).not.toHaveBeenCalled();
    expect(dataContext.patchPackList).not.toHaveBeenCalled();
  });

  it('delete failure: toasts, keeps the card and the dialog, no local removal', async () => {
    const dataContext = makeDataContext({
      deletePackList: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { props } = renderView({ dataContext });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Job Alpha' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('Failed to delete pack list — try again', 'error'),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Job Alpha')).toBeInTheDocument();
    expect(dataContext.removeLocalPackList).not.toHaveBeenCalled();
    expect(props.addAuditLog).not.toHaveBeenCalled();
  });

  it('delete success: removes the card and audits', async () => {
    const { props } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Job Alpha' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(props.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'pack_list_deleted', packListId: 'PL1' }),
      ),
    );
  });

  it('reset failure: toasts and keeps the packed state', async () => {
    const dataContext = makeDataContext({
      updatePackList: vi.fn().mockRejectedValue(new Error('offline')),
    });
    renderView({ dataContext });

    openDetail();
    expect(screen.getByText(/1\/2 packed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(
        'Failed to reset packed state — nothing was changed',
        'error',
      ),
    );
    expect(screen.getByText(/1\/2 packed/)).toBeInTheDocument();
    expect(dataContext.patchPackList).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Delete confirmation — one shared dialog serves the overview and the detail
// branch (it used to be rendered twice with identical copy)
// =============================================================================

describe('delete confirmation (shared dialog)', () => {
  const expectedMessage =
    'Are you sure you want to delete "Job Alpha"? This action cannot be undone.';

  it('opens from the detail view with the same copy and deletes on confirm', async () => {
    const { props } = renderView();
    openDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Job Alpha' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Delete Pack List')).toBeInTheDocument();
    expect(within(dialog).getByText(expectedMessage)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(props.addAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'pack_list_deleted', packListId: 'PL1' }),
      ),
    );
    // Deleting the open list closes its detail view
    expect(screen.getByRole('heading', { level: 2, name: 'Pack Lists' })).toBeInTheDocument();
  });

  it('opens from the overview with identical copy; cancel closes without deleting', () => {
    const { props } = renderView();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Job Alpha' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Delete Pack List')).toBeInTheDocument();
    expect(within(dialog).getByText(expectedMessage)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(props.dataContext.deletePackList).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Permission gating
// =============================================================================

describe('view-only permission gating', () => {
  it('hides all edit UI on the overview and shows the banner', () => {
    permissionsState.canEdit = false;
    renderView();

    expect(screen.getByTestId('view-only-banner')).toHaveTextContent('pack_lists');
    expect(screen.queryByRole('button', { name: /Create Pack List/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Job Alpha' })).not.toBeInTheDocument();
  });

  it('hides Scan/Edit/Reset/Delete in the detail view but keeps Export', () => {
    permissionsState.canEdit = false;
    renderView();
    openDetail();

    expect(screen.queryByRole('button', { name: 'Scan to Pack' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Job Alpha' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export / Print' })).toBeInTheDocument();

    // Packed toggles render but are disabled
    const toggle = screen.getByRole('button', { name: 'Mark as unpacked: Alpha Cam' });
    expect(toggle).toBeDisabled();
  });
});

// =============================================================================
// Loading state
// =============================================================================

describe('lazy loading', () => {
  it('shows a loading indicator instead of the empty state while fetching', () => {
    renderView({
      packLists: [],
      dataContext: makeDataContext({ packListsLoaded: false }),
    });
    expect(screen.getByText('Loading pack lists...')).toBeInTheDocument();
    expect(screen.queryByText('No pack lists yet')).not.toBeInTheDocument();
  });

  it('shows the empty state once loaded with no lists', () => {
    renderView({ packLists: [] });
    expect(screen.getByText('No pack lists yet')).toBeInTheDocument();
    expect(screen.queryByText('Loading pack lists...')).not.toBeInTheDocument();
  });
});

// =============================================================================
// Selection logic
// =============================================================================

describe('package selection', () => {
  // Both panels render an "N selected" count — scope to the Packages panel
  const packagesCount = () =>
    screen.getByText('Packages').parentElement.querySelector('.panel-header-count').textContent;

  it('empty packages can be selected and deselected', async () => {
    renderView();
    await fillCreateForm('Empty Pkg Job');

    expect(packagesCount()).toBe('0 selected');
    fireEvent.click(screen.getByText('Empty Kit'));
    expect(packagesCount()).toBe('1 selected');
    fireEvent.click(screen.getByText('Empty Kit'));
    expect(packagesCount()).toBe('0 selected');
  });

  it('selecting all of a package marks it full; removing one item makes it partial', async () => {
    renderView();
    await fillCreateForm('Pkg States'); // Alpha Cam already selected

    fireEvent.click(screen.getByText('Beta Cam'));
    // Both PKG1 items selected -> package auto-selected
    expect(packagesCount()).toBe('1 selected');

    fireEvent.click(screen.getByText('Beta Cam'));
    // Dropping one item deselects the package
    expect(packagesCount()).toBe('0 selected');
    expect(screen.getByText(/\(1 selected\)/)).toBeInTheDocument(); // partial marker
  });
});

// =============================================================================
// Fulfillability + created-by
// =============================================================================

describe('detail view info', () => {
  it('warns about unavailable items and quantity shortfalls', () => {
    renderView({ packLists: [shortfallList] });
    openDetail('Job Shortfall');

    expect(screen.getByText(/2 items on this list may not be available/)).toBeInTheDocument();
    expect(screen.getByText(/1 checked out/)).toBeInTheDocument();
    expect(screen.getByText(/Shotgun Mic needs 5 but only 2 in stock/)).toBeInTheDocument();
  });

  it('shows no fulfillability banner when everything is available', () => {
    const cleanList = { ...baseList, items: [{ id: 'CAM1', quantity: 1 }], packedItems: [] };
    renderView({ packLists: [cleanList] });
    openDetail();
    expect(screen.queryByText(/may not be available/)).not.toBeInTheDocument();
  });

  it('shows created-by on the card and in the detail meta', () => {
    renderView();
    expect(screen.getByText(/by Pat Creator/)).toBeInTheDocument();
    openDetail();
    expect(screen.getByText(/Created .* by Pat Creator/)).toBeInTheDocument();
  });

  it('flags a quantity shortfall inline in the create form', async () => {
    renderView();
    await fillCreateForm('Qty Check');
    fireEvent.click(screen.getByText('Shotgun Mic'));

    const qtyInput = screen.getByRole('spinbutton', { name: 'Quantity for Shotgun Mic' });
    fireEvent.change(qtyInput, { target: { value: '5' } });
    expect(screen.getByText('only 2 in stock')).toBeInTheDocument();

    fireEvent.change(qtyInput, { target: { value: '2' } });
    expect(screen.queryByText(/only 2 in stock/)).not.toBeInTheDocument();
  });
});

// =============================================================================
// Navigation resets
// =============================================================================

describe('navigation resets', () => {
  it('returns to the overview when resetNonce changes (sidebar re-click)', () => {
    const { rerender, props } = renderView({ initialSelectedList: baseList, resetNonce: 0 });
    // Detail view: the list name is the level-2 heading
    expect(screen.getByRole('heading', { level: 2, name: 'Job Alpha' })).toBeInTheDocument();

    rerender(<PackListsView {...props} resetNonce={1} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Pack Lists' })).toBeInTheDocument();
    // The overview card still shows the name as an h3 — only the detail h2 must be gone
    expect(screen.queryByRole('heading', { level: 2, name: 'Job Alpha' })).not.toBeInTheDocument();
  });

  it('resetNonce also exits the create form', async () => {
    const { rerender, props } = renderView({ resetNonce: 0 });
    await fillCreateForm('Abandoned');
    expect(screen.getByText(/Create Pack List: Abandoned/)).toBeInTheDocument();

    rerender(<PackListsView {...props} resetNonce={1} />);
    expect(screen.getByRole('heading', { name: 'Pack Lists' })).toBeInTheDocument();
  });

  it('closes the detail view when initialSelectedList is cleared to null', () => {
    const { rerender, props } = renderView({ initialSelectedList: baseList });
    expect(screen.getByRole('heading', { name: 'Job Alpha' })).toBeInTheDocument();

    rerender(<PackListsView {...props} initialSelectedList={null} />);
    expect(screen.getByRole('heading', { name: 'Pack Lists' })).toBeInTheDocument();
  });
});

// =============================================================================
// Clipboard export
// =============================================================================

describe('clipboard export', () => {
  function setClipboard(writeText) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  }

  async function exportToClipboard() {
    openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Export / Print' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
  }

  it('toasts an error when the clipboard write is rejected', async () => {
    setClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    renderView();
    await exportToClipboard();

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('Could not copy to clipboard — try again', 'error'),
    );
  });

  it('toasts success only when the write resolves', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);
    renderView();
    await exportToClipboard();

    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Copied to clipboard!', 'success'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Alpha Cam'));
  });
});

// =============================================================================
// Scan overlay honesty
// =============================================================================

describe('scan-to-pack log', () => {
  it('flips the log entry to failed when the persist rolls back', async () => {
    const dataContext = makeDataContext({
      togglePackListItemPacked: vi.fn().mockRejectedValue(new Error('offline')),
    });
    renderView({ dataContext });

    openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Scan to Pack' }));
    fireEvent.change(screen.getByPlaceholderText('Item ID or Serial Number'), {
      target: { value: 'CAM2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pack' }));

    expect(await screen.findByText('Save failed — rescan')).toBeInTheDocument();
    expect(mockAddToast).toHaveBeenCalledWith('Failed to save packed state — try again', 'error');
  });

  it('reports already-packed items without re-toggling them', async () => {
    const dataContext = makeDataContext();
    renderView({ dataContext });

    openDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Scan to Pack' }));
    fireEvent.change(screen.getByPlaceholderText('Item ID or Serial Number'), {
      target: { value: 'CAM1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pack' }));

    expect(await screen.findByText('Already packed')).toBeInTheDocument();
    expect(dataContext.togglePackListItemPacked).not.toHaveBeenCalled();
  });
});
