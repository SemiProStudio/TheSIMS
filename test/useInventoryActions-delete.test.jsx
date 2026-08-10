// =============================================================================
// Regression test: deleteItem must open the confirm dialog via the ModalContext
// showConfirm API and persist the delete through dataContext.deleteItem.
//
// Context: a previous refactor renamed the confirm API from setConfirmDialog to
// showConfirm in App.jsx, but this hook was never migrated — deleteItem threw
// `TypeError: setConfirmDialog is not a function`, making single-item delete
// impossible from the UI. This test exercises the real hook (no reimplemented
// logic) against the parameter contract App.jsx actually provides.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInventoryActions } from '../hooks/useInventoryActions.js';

function buildParams(overrides = {}) {
  return {
    dataContext: {
      addItem: vi.fn(),
      updateItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      patchInventoryItem: vi.fn(),
    },
    setSelectedItem: vi.fn((updater) =>
      typeof updater === 'function' ? updater(null) : undefined,
    ),
    setCurrentView: vi.fn(),
    setChangeLog: vi.fn(),
    // This is the exact prop name App.jsx passes (ModalContext.showConfirm).
    showConfirm: vi.fn(),
    inventory: [{ id: 'CAM1234', name: 'Test Camera' }],
    selectedItem: null,
    currentUser: { id: 'u1', name: 'Tester' },
    currentView: 'gear-list',
    specs: {},
    editingItemId: null,
    setEditingItemId: vi.fn(),
    itemForm: {},
    setItemForm: vi.fn(),
    resetItemForm: vi.fn(),
    closeModal: vi.fn(),
    openModal: vi.fn(),
    addAuditLog: vi.fn(),
    bulkActionIds: [],
    setBulkActionIds: vi.fn(),
    ...overrides,
  };
}

describe('useInventoryActions — deleteItem confirm flow', () => {
  it('opens the confirm dialog through showConfirm without throwing', () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));

    expect(() => {
      act(() => {
        result.current.deleteItem('CAM1234');
      });
    }).not.toThrow();

    expect(params.showConfirm).toHaveBeenCalledTimes(1);
    const call = params.showConfirm.mock.calls[0][0];
    expect(call.title).toBe('Delete Item');
    expect(typeof call.onConfirm).toBe('function');
  });

  it('persists the delete via dataContext.deleteItem when confirmed', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));

    act(() => {
      result.current.deleteItem('CAM1234');
    });

    const { onConfirm } = params.showConfirm.mock.calls[0][0];
    await act(async () => {
      await onConfirm();
    });

    expect(params.dataContext.deleteItem).toHaveBeenCalledWith('CAM1234');
    expect(params.setChangeLog).toHaveBeenCalled();
  });

  it('handles a failed delete without crashing', async () => {
    const params = buildParams();
    params.dataContext.deleteItem.mockRejectedValueOnce(new Error('RLS: not allowed'));
    const { result } = renderHook(() => useInventoryActions(params));

    act(() => {
      result.current.deleteItem('CAM1234');
    });

    const { onConfirm } = params.showConfirm.mock.calls[0][0];
    await expect(
      act(async () => {
        await onConfirm();
      }),
    ).resolves.not.toThrow();

    // The failed delete must not remove anything locally or log a change.
    expect(params.setChangeLog).not.toHaveBeenCalled();
  });
});
