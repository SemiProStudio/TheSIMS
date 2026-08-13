// =============================================================================
// useReservationHandlers — Test Suite
// Pins the schedule hardening round:
// - editing a multi-item reservation updates EVERY row of the group (shared
//   group_id, or legacy project+dates fallback) in one call — updating only
//   the first row silently split the group
// - cancelling targets the exact group rows (soft-cancel, persist-first);
//   a failure toasts and changes nothing locally
// - unrelated reservations that merely share a name+dates are NOT dragged
//   into a groupId-based cancel
// - a create where every insert fails keeps the modal open
// - reserved/available status reconciles after create/cancel
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getTodayISO } from '../utils';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const { useReservationHandlers } = await import('../hooks/handlers/useReservationHandlers.js');

const TODAY = getTodayISO();

// Two items sharing a grouped reservation (group g1), plus a third item with
// an UNRELATED reservation that has the same project name and dates — the
// name-matching trap.
function makeInventory() {
  return [
    {
      id: 'CAM1',
      name: 'Alpha Cam',
      status: 'reserved',
      reservations: [
        {
          id: 'r1',
          groupId: 'g1',
          project: 'Job X',
          start: TODAY,
          end: TODAY,
          user: 'Pat',
          notes: [{ id: 'n1', text: 'keep me' }],
        },
      ],
    },
    {
      id: 'CAM2',
      name: 'Beta Cam',
      status: 'reserved',
      reservations: [
        { id: 'r2', groupId: 'g1', project: 'Job X', start: TODAY, end: TODAY, user: 'Pat' },
      ],
    },
    {
      id: 'CAM3',
      name: 'Gamma Cam',
      status: 'reserved',
      reservations: [
        { id: 'r3', groupId: 'g-other', project: 'Job X', start: TODAY, end: TODAY, user: 'Sam' },
      ],
    },
  ];
}

function makeDataContext(overrides = {}) {
  return {
    createReservation: vi.fn().mockImplementation(async () => ({ id: `db-${Math.random()}` })),
    updateReservationRows: vi.fn().mockResolvedValue({}),
    cancelReservations: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
    patchInventoryItem: vi.fn(),
    mapInventory: vi.fn(),
    sendReservationEmail: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function setup({
  inventory = makeInventory(),
  dataContext = makeDataContext(),
  reservationForm = {},
  editingReservationId = null,
  selectedReservation = null,
  selectedReservationItem = null,
} = {}) {
  const showConfirm = vi.fn();
  const deps = {
    inventory,
    selectedItem: null,
    setSelectedItem: vi.fn(),
    dataContext,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    addChangeLog: vi.fn(),
    addAuditLog: vi.fn(),
    currentUser: { id: 'u1', name: 'Tester' },
    reservationForm,
    setReservationForm: vi.fn(),
    editingReservationId,
    setEditingReservationId: vi.fn(),
    selectedReservationItem,
    selectedReservation,
    setSelectedReservation: vi.fn(),
    setCurrentView: vi.fn(),
    resetReservationForm: vi.fn(),
    navigateToReservation: vi.fn(),
    showConfirm,
  };
  const hook = renderHook(() => useReservationHandlers(deps));
  return { hook, deps, dataContext, showConfirm };
}

beforeEach(() => {
  mockAddToast.mockClear();
});

// =============================================================================
// Group edit
// =============================================================================

describe('saveReservation (edit)', () => {
  const editedForm = {
    project: 'Job X Renamed',
    projectType: 'Other',
    start: TODAY,
    end: TODAY,
    user: 'Pat',
  };

  it('updates every row of a groupId-based group, not just the first', async () => {
    const inventory = makeInventory();
    const dataContext = makeDataContext();
    const { hook } = setup({
      inventory,
      dataContext,
      reservationForm: editedForm,
      editingReservationId: 'r1',
      selectedReservation: inventory[0].reservations[0],
      selectedReservationItem: inventory[0],
    });

    await act(() => hook.result.current.saveReservation());

    expect(dataContext.updateReservationRows).toHaveBeenCalledTimes(1);
    const [ids, form] = dataContext.updateReservationRows.mock.calls[0];
    expect([...ids].sort()).toEqual(['r1', 'r2']);
    expect(ids).not.toContain('r3'); // same name+dates but different group
    expect(form).toBe(editedForm);
  });

  it('falls back to project+dates matching for legacy rows without groupId', async () => {
    const inventory = makeInventory().map((i) => ({
      ...i,
      reservations: i.reservations.map(({ groupId: _g, ...r }) => r),
    }));
    const dataContext = makeDataContext();
    const { hook } = setup({
      inventory,
      dataContext,
      reservationForm: editedForm,
      editingReservationId: 'r1',
      selectedReservation: inventory[0].reservations[0],
      selectedReservationItem: inventory[0],
    });

    await act(() => hook.result.current.saveReservation());

    const [ids] = dataContext.updateReservationRows.mock.calls[0];
    // Without group ids, name matching is the best available grouping —
    // r3 shares the name and dates so it IS included here
    expect([...ids].sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('update failure: toasts, leaves local state alone, keeps the modal open', async () => {
    const dataContext = makeDataContext({
      updateReservationRows: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const inventory = makeInventory();
    const { hook, deps } = setup({
      inventory,
      dataContext,
      reservationForm: editedForm,
      editingReservationId: 'r1',
      selectedReservation: inventory[0].reservations[0],
      selectedReservationItem: inventory[0],
    });

    await act(() => hook.result.current.saveReservation());

    expect(dataContext.updateReservationRows).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    expect(dataContext.mapInventory).not.toHaveBeenCalled();
    expect(deps.closeModal).not.toHaveBeenCalled();
    expect(deps.addAuditLog).not.toHaveBeenCalled();
  });

  it('reconciles item status when the edited dates no longer cover today', async () => {
    const inventory = makeInventory();
    const dataContext = makeDataContext();
    const futureForm = {
      ...editedForm,
      start: '2030-01-01',
      end: '2030-01-05',
    };
    const { hook } = setup({
      inventory,
      dataContext,
      reservationForm: futureForm,
      editingReservationId: 'r1',
      selectedReservation: inventory[0].reservations[0],
      selectedReservationItem: inventory[0],
    });

    await act(() => hook.result.current.saveReservation());

    // Both group items were 'reserved' with only this reservation active —
    // moving it to 2030 must release them
    expect(dataContext.updateItem).toHaveBeenCalledWith('CAM1', { status: 'available' });
    expect(dataContext.updateItem).toHaveBeenCalledWith('CAM2', { status: 'available' });
    expect(dataContext.updateItem).not.toHaveBeenCalledWith('CAM3', expect.anything());
  });
});

// =============================================================================
// Create
// =============================================================================

describe('saveReservation (create)', () => {
  const createForm = {
    project: 'New Job',
    projectType: 'Other',
    start: TODAY,
    end: TODAY,
    user: 'Pat',
    itemIds: ['CAM1', 'CAM2'],
  };

  it('stamps one shared groupId and creator on every row', async () => {
    const dataContext = makeDataContext();
    const { hook } = setup({ dataContext, reservationForm: createForm });

    await act(() => hook.result.current.saveReservation());

    expect(dataContext.createReservation).toHaveBeenCalledTimes(2);
    const payloads = dataContext.createReservation.mock.calls.map(([, payload]) => payload);
    expect(payloads[0].groupId).toBeTruthy();
    expect(payloads[0].groupId).toBe(payloads[1].groupId);
    expect(payloads[0].createdById).toBe('u1');
    expect(payloads[0].createdByName).toBe('Tester');
  });

  it('keeps the modal open when every insert fails', async () => {
    const dataContext = makeDataContext({
      createReservation: vi.fn().mockRejectedValue(new Error('rls denied')),
    });
    const { hook, deps } = setup({ dataContext, reservationForm: createForm });

    await act(() => hook.result.current.saveReservation());

    expect(mockAddToast).toHaveBeenCalled();
    expect(deps.closeModal).not.toHaveBeenCalled();
    expect(deps.resetReservationForm).not.toHaveBeenCalled();
  });

  it('closes and navigates when at least one insert succeeds', async () => {
    let call = 0;
    const dataContext = makeDataContext({
      createReservation: vi.fn().mockImplementation(async () => {
        call++;
        if (call === 1) throw new Error('nope');
        return { id: 'db-ok' };
      }),
    });
    const { hook, deps } = setup({ dataContext, reservationForm: createForm });

    await act(() => hook.result.current.saveReservation());

    expect(deps.closeModal).toHaveBeenCalled();
    expect(deps.navigateToReservation).toHaveBeenCalled();
  });

  it('marks an available item reserved when the reservation starts today', async () => {
    const inventory = makeInventory();
    inventory[0].status = 'available';
    inventory[0].reservations = [];
    const dataContext = makeDataContext();
    const { hook } = setup({
      inventory,
      dataContext,
      reservationForm: { ...createForm, itemIds: ['CAM1'] },
    });

    await act(() => hook.result.current.saveReservation());

    expect(dataContext.updateItem).toHaveBeenCalledWith('CAM1', { status: 'reserved' });
  });

  it('does not touch status for future reservations', async () => {
    const inventory = makeInventory();
    inventory[0].status = 'available';
    inventory[0].reservations = [];
    const dataContext = makeDataContext();
    const { hook } = setup({
      inventory,
      dataContext,
      reservationForm: { ...createForm, itemIds: ['CAM1'], start: '2030-01-01', end: '2030-01-02' },
    });

    await act(() => hook.result.current.saveReservation());

    expect(dataContext.updateItem).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Cancel
// =============================================================================

describe('deleteReservation (cancel)', () => {
  async function confirmCancel(showConfirm) {
    expect(showConfirm).toHaveBeenCalledTimes(1);
    const { onConfirm } = showConfirm.mock.calls[0][0];
    await act(() => onConfirm());
  }

  it('cancels exactly the group rows — not same-named strangers', async () => {
    const dataContext = makeDataContext();
    const { hook, showConfirm } = setup({ dataContext });

    act(() => hook.result.current.deleteReservation('CAM1', 'r1'));
    await confirmCancel(showConfirm);

    expect(dataContext.cancelReservations).toHaveBeenCalledTimes(1);
    const [ids] = dataContext.cancelReservations.mock.calls[0];
    expect([...ids].sort()).toEqual(['r1', 'r2']);
  });

  it('failure: toasts and leaves everything untouched', async () => {
    const dataContext = makeDataContext({
      cancelReservations: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { hook, deps, showConfirm } = setup({ dataContext });

    act(() => hook.result.current.deleteReservation('CAM1', 'r1'));
    await confirmCancel(showConfirm);

    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
    expect(dataContext.mapInventory).not.toHaveBeenCalled();
    expect(dataContext.updateItem).not.toHaveBeenCalled();
    expect(deps.addAuditLog).not.toHaveBeenCalled();
  });

  it('success: prunes local rows, reconciles items to available, audits as cancelled', async () => {
    const dataContext = makeDataContext();
    const { hook, deps, showConfirm } = setup({ dataContext });

    act(() => hook.result.current.deleteReservation('CAM1', 'r1'));
    await confirmCancel(showConfirm);

    expect(dataContext.mapInventory).toHaveBeenCalled();
    // The cancelled group covered today and was the only reservation on
    // each item — both go back to available; the unrelated CAM3 does not
    expect(dataContext.updateItem).toHaveBeenCalledWith('CAM1', { status: 'available' });
    expect(dataContext.updateItem).toHaveBeenCalledWith('CAM2', { status: 'available' });
    expect(dataContext.updateItem).not.toHaveBeenCalledWith('CAM3', expect.anything());
    expect(deps.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reservation_cancelled' }),
    );
  });
});
