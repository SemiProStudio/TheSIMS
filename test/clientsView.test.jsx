// =============================================================================
// ClientsView — Test Suite
// Pins the clients hardening round:
// - the save payload carries form fields only (no client-generated ids or
//   camelCase timestamps — those made PostgREST reject every write)
// - persist-first honesty: create/update/delete failures toast, keep the
//   form/dialog open, and never patch local state or write audit entries
// - the created row RETURNED by the DB becomes the selection (real CL### id)
// - view-only users get no edit UI and read-only notes
// - lazy loading shows "Loading" instead of "No clients yet"
// - project history groups multi-item reservations into one project
// - notes hydrate once per selected client
// - validator errors surface inline (1-char names used to fail silently)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const { mockAddToast, permissionsState } = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  permissionsState: { canEdit: true },
}));

vi.mock('../contexts/DataContext.js', () => ({
  useData: () => ({ ensureClients: vi.fn() }),
}));
vi.mock('../contexts/NavigationContext.js', () => ({
  useNavigationContext: () => ({ reservationBackView: null, setReservationBackView: vi.fn() }),
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

const { default: ClientsView } = await import('../views/ClientsView.jsx');

const baseClient = {
  id: 'CL001',
  name: 'Acme Films',
  type: 'Company',
  email: 'acme@example.com',
  favorite: false,
  clientNotes: [],
};

// Two items sharing one grouped reservation for CL001 — must show as ONE project
const inventory = [
  {
    id: 'CAM1',
    name: 'Alpha Cam',
    reservations: [
      {
        id: 'r1',
        groupId: 'g1',
        clientId: 'CL001',
        project: 'Ad Shoot',
        start: '2026-08-01',
        end: '2026-08-02',
      },
    ],
  },
  {
    id: 'CAM2',
    name: 'Beta Cam',
    checkoutClientId: null,
    reservations: [
      {
        id: 'r2',
        groupId: 'g1',
        clientId: 'CL001',
        project: 'Ad Shoot',
        start: '2026-08-01',
        end: '2026-08-02',
      },
    ],
  },
];

function makeDataContext(overrides = {}) {
  return {
    clientsLoaded: true,
    createClient: vi.fn().mockResolvedValue({ id: 'CL042', name: 'Fresh Client' }),
    updateClient: vi.fn().mockResolvedValue({}),
    deleteClient: vi.fn().mockResolvedValue({}),
    patchClient: vi.fn(),
    loadClientNotes: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function renderClients(props = {}) {
  const defaults = {
    clients: [baseClient],
    inventory,
    dataContext: makeDataContext(),
    onViewReservation: vi.fn(),
    onAddNote: vi.fn(),
    onReplyNote: vi.fn(),
    onDeleteNote: vi.fn(),
    user: { id: 'u1', name: 'Tester' },
    addAuditLog: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return { ...render(<ClientsView {...merged} />), props: merged };
}

beforeEach(() => {
  mockAddToast.mockClear();
  permissionsState.canEdit = true;
});

// =============================================================================
// Save payload + honest failures
// =============================================================================

describe('create', () => {
  async function fillAndSubmit(name = 'Fresh Client') {
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Client' })[0]);
    fireEvent.change(screen.getByPlaceholderText('Client name'), { target: { value: name } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add Client' }).pop());
  }

  it('sends form fields only — no local id, no camelCase timestamps', async () => {
    const dataContext = makeDataContext();
    renderClients({ dataContext });
    await fillAndSubmit();

    await waitFor(() => expect(dataContext.createClient).toHaveBeenCalledTimes(1));
    const payload = dataContext.createClient.mock.calls[0][0];
    expect(payload.name).toBe('Fresh Client');
    expect(payload.id).toBeUndefined();
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload).not.toHaveProperty('updatedAt');
  });

  it('selects the RETURNED row (real DB id) and audits on success', async () => {
    const { props } = renderClients();
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Fresh Client' })).toBeInTheDocument(),
    );
    expect(props.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'client_created', clientId: 'CL042' }),
    );
  });

  it('failure: toasts, keeps the form open, no audit entry', async () => {
    const dataContext = makeDataContext({
      createClient: vi.fn().mockRejectedValue(new Error('rls denied')),
    });
    const { props } = renderClients({ dataContext });
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error'),
    );
    expect(screen.getByPlaceholderText('Client name')).toBeInTheDocument();
    expect(props.addAuditLog).not.toHaveBeenCalled();
  });

  it('shows the validator error inline for a 1-char name instead of failing silently', async () => {
    const dataContext = makeDataContext();
    renderClients({ dataContext });
    await fillAndSubmit('A');

    expect(await screen.findByText(/between 2 and 100/)).toBeInTheDocument();
    expect(dataContext.createClient).not.toHaveBeenCalled();
  });
});

describe('edit', () => {
  function openEditModal() {
    fireEvent.click(screen.getByText('Acme Films'));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  }

  it('failure: toasts, keeps the modal open, never patches local state', async () => {
    const dataContext = makeDataContext({
      updateClient: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { props } = renderClients({ dataContext });
    openEditModal();
    fireEvent.change(screen.getByPlaceholderText('Client name'), {
      target: { value: 'Renamed Films' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error'),
    );
    expect(dataContext.patchClient).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Client name')).toBeInTheDocument();
    expect(props.addAuditLog).not.toHaveBeenCalled();
  });

  it('success: persists via updateClient and audits', async () => {
    const dataContext = makeDataContext();
    const { props } = renderClients({ dataContext });
    openEditModal();
    fireEvent.change(screen.getByPlaceholderText('Client name'), {
      target: { value: 'Renamed Films' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(dataContext.updateClient).toHaveBeenCalledTimes(1));
    const [id, payload] = dataContext.updateClient.mock.calls[0];
    expect(id).toBe('CL001');
    expect(payload.name).toBe('Renamed Films');
    expect(payload).not.toHaveProperty('createdAt');
    expect(props.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'client_updated' }),
    );
  });
});

describe('delete', () => {
  it('warns about linked reservations in the confirmation', () => {
    renderClients();
    fireEvent.click(screen.getByText('Acme Films'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Acme Films' }));

    const dialog = screen.getByRole('alertdialog');
    expect(
      within(dialog).getByText(/1 reservation will keep their history but lose the link/),
    ).toBeInTheDocument();
  });

  it('failure: toasts, keeps the dialog and the client', async () => {
    const dataContext = makeDataContext({
      deleteClient: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { props } = renderClients({ dataContext });
    fireEvent.click(screen.getByText('Acme Films'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Acme Films' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error'),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    // Still on the detail view — deletion did not navigate away
    expect(screen.getByRole('heading', { name: 'Acme Films' })).toBeInTheDocument();
    expect(props.addAuditLog).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Gating, loading, grouping, notes
// =============================================================================

describe('view-only gating', () => {
  it('hides Add/Edit/Delete and shows the banner', () => {
    permissionsState.canEdit = false;
    renderClients();

    expect(screen.getByTestId('view-only-banner')).toHaveTextContent('clients');
    expect(screen.queryByRole('button', { name: 'Add Client' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Acme Films'));
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Acme Films' })).not.toBeInTheDocument();
    // Notes are read-only: no composer input
    expect(screen.queryByPlaceholderText('Add a note...')).not.toBeInTheDocument();
  });
});

describe('lazy loading', () => {
  it('shows a loading indicator instead of the empty state while fetching', () => {
    renderClients({ clients: [], dataContext: makeDataContext({ clientsLoaded: false }) });
    expect(screen.getByText('Loading clients...')).toBeInTheDocument();
    expect(screen.queryByText('No clients yet')).not.toBeInTheDocument();
  });
});

describe('project history grouping', () => {
  it('shows a multi-item reservation as one project', () => {
    renderClients();
    // Card badge counts groups, not rows
    expect(screen.getByText('1 projects')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Acme Films'));
    expect(screen.getByText('Ad Shoot')).toBeInTheDocument();
    expect(screen.getByText(/2 items/)).toBeInTheDocument();
  });
});

describe('notes hydration', () => {
  it('loads notes once when a client without clientNotes is opened', async () => {
    const dataContext = makeDataContext();
    const clientNoNotes = { ...baseClient };
    delete clientNoNotes.clientNotes;
    renderClients({ clients: [clientNoNotes], dataContext });

    fireEvent.click(screen.getByText('Acme Films'));
    await waitFor(() => expect(dataContext.loadClientNotes).toHaveBeenCalledWith('CL001'));
    expect(dataContext.loadClientNotes).toHaveBeenCalledTimes(1);
  });

  it('skips hydration when notes are already present', () => {
    const dataContext = makeDataContext();
    renderClients({ dataContext });
    fireEvent.click(screen.getByText('Acme Films'));
    expect(dataContext.loadClientNotes).not.toHaveBeenCalled();
  });
});
