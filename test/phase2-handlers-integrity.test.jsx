// =============================================================================
// Phase 2 regression tests — handler data integrity (H7, ghost reservations)
//
// - updateMaintenanceStatus must PERSIST the status change (previously it only
//   patched local state: success toast, audit entry, reverted on reload)
// - A failed reservation create must not inject a ghost reservation into
//   local state
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckoutHandlers } from '../hooks/handlers/useCheckoutHandlers.js';
import { useReservationHandlers } from '../hooks/handlers/useReservationHandlers.js';

const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// -----------------------------------------------------------------------------
// H7 — maintenance status changes persist
// -----------------------------------------------------------------------------
describe('useCheckoutHandlers.updateMaintenanceStatus', () => {
  function buildParams(overrides = {}) {
    const record = { id: 'm1', type: 'repair', status: 'scheduled' };
    return {
      inventory: [{ id: 'CAM001', name: 'Camera', maintenanceHistory: [record] }],
      selectedItem: { id: 'CAM001', name: 'Camera', maintenanceHistory: [record] },
      setSelectedItem: vi.fn(),
      dataContext: {
        patchInventoryItem: vi.fn(),
        updateMaintenance: vi.fn().mockResolvedValue({}),
        addMaintenance: vi.fn(),
        checkOutItem: vi.fn(),
        checkInItem: vi.fn(),
      },
      currentUser: { id: 'u1', name: 'Tester' },
      openModal: vi.fn(),
      closeModal: vi.fn(),
      addAuditLog: vi.fn(),
      addChangeLog: vi.fn(),
      ...overrides,
    };
  }

  it('persists the status change through dataContext.updateMaintenance', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useCheckoutHandlers(params));

    await act(async () => {
      await result.current.updateMaintenanceStatus('m1', 'completed');
    });

    expect(params.dataContext.updateMaintenance).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        status: 'completed',
        completed_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(params.addAuditLog).toHaveBeenCalled();
  });

  it('rolls back and toasts when persistence fails, without an audit entry', async () => {
    const params = buildParams();
    params.dataContext.updateMaintenance.mockRejectedValueOnce(new Error('RLS denied'));
    const { result } = renderHook(() => useCheckoutHandlers(params));

    await act(async () => {
      await result.current.updateMaintenanceStatus('m1', 'completed');
    });

    // Optimistic patch + rollback patch
    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(2);
    const rollbackCall = params.dataContext.patchInventoryItem.mock.calls[1];
    expect(rollbackCall[0]).toBe('CAM001');
    expect(rollbackCall[1]).toEqual({
      maintenanceHistory: [{ id: 'm1', type: 'repair', status: 'scheduled' }],
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('reverted'), 'error');
    expect(params.addAuditLog).not.toHaveBeenCalled();
  });
});

// -----------------------------------------------------------------------------
// Ghost reservations — failed create leaves local state untouched
// -----------------------------------------------------------------------------
describe('useReservationHandlers.saveReservation', () => {
  function buildParams(overrides = {}) {
    return {
      inventory: [{ id: 'CAM001', name: 'Camera', reservations: [] }],
      selectedItem: null,
      setSelectedItem: vi.fn(),
      dataContext: {
        createReservation: vi.fn().mockResolvedValue({ id: 'res-db-1' }),
        updateReservation: vi.fn().mockResolvedValue({}),
        deleteReservation: vi.fn(),
        patchInventoryItem: vi.fn(),
        mapInventory: vi.fn(),
        sendReservationEmail: vi.fn().mockResolvedValue({ success: true }),
      },
      openModal: vi.fn(),
      closeModal: vi.fn(),
      addChangeLog: vi.fn(),
      addAuditLog: vi.fn(),
      currentUser: { id: 'u1', name: 'Tester' },
      reservationForm: {
        itemIds: ['CAM001'],
        project: 'Shoot',
        projectType: 'Other',
        start: '2026-09-01',
        end: '2026-09-03',
        user: 'Client A',
      },
      setReservationForm: vi.fn(),
      editingReservationId: null,
      setEditingReservationId: vi.fn(),
      selectedReservationItem: null,
      selectedReservation: null,
      setSelectedReservation: vi.fn(),
      setCurrentView: vi.fn(),
      resetReservationForm: vi.fn(),
      navigateToReservation: vi.fn(),
      showConfirm: vi.fn(),
      ...overrides,
    };
  }

  it('injects the reservation locally when the create succeeds', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useReservationHandlers(params));

    await act(async () => {
      await result.current.saveReservation();
    });

    expect(params.dataContext.createReservation).toHaveBeenCalledTimes(1);
    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledWith(
      'CAM001',
      expect.any(Function),
    );
    expect(params.navigateToReservation).toHaveBeenCalled();
  });

  it('does NOT inject a ghost reservation when the create fails', async () => {
    const params = buildParams();
    params.dataContext.createReservation.mockRejectedValueOnce(new Error('conflict'));
    const { result } = renderHook(() => useReservationHandlers(params));

    await act(async () => {
      await result.current.saveReservation();
    });

    // No local injection, no changelog, no navigation, no email — just a toast
    expect(params.dataContext.patchInventoryItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
    expect(params.navigateToReservation).not.toHaveBeenCalled();
    expect(params.dataContext.sendReservationEmail).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
  });

  it('does not patch local state when a reservation UPDATE fails', async () => {
    const params = buildParams({
      editingReservationId: 'res-1',
      selectedReservationItem: { id: 'CAM001', name: 'Camera' },
    });
    params.dataContext.updateReservation.mockRejectedValueOnce(new Error('RLS denied'));
    const { result } = renderHook(() => useReservationHandlers(params));

    await act(async () => {
      await result.current.saveReservation();
    });

    expect(params.dataContext.patchInventoryItem).not.toHaveBeenCalled();
    expect(params.setSelectedReservation).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('Failed'), 'error');
  });
});
