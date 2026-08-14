// =============================================================================
// Reminder handlers — persistence honesty (whole-app hardening round)
// The old handlers fired update/delete without awaiting and swallowed every
// failure: a "completed" reminder came back due on reload, a deleted one
// resurrected, and the audit entry was written regardless.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReminderHandlers } from '../hooks/handlers/useReminderHandlers.js';

const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function buildParams(overrides = {}) {
  const reminders = [{ id: 'r1', title: 'Sensor cleaning', completed: false }];
  return {
    selectedItem: { id: 'CAM001', name: 'Camera', reminders },
    setSelectedItem: vi.fn(),
    dataContext: {
      patchInventoryItem: vi.fn(),
      addItemReminder: vi.fn().mockResolvedValue({ id: 'db-r-1' }),
      updateItemReminder: vi.fn().mockResolvedValue(true),
      deleteItemReminder: vi.fn().mockResolvedValue(true),
      addAuditLog: vi.fn(),
    },
    currentUser: { id: 'u1', name: 'Tester' },
    showConfirm: vi.fn(({ onConfirm }) => onConfirm()),
    ...overrides,
  };
}

describe('completeReminder', () => {
  it('awaits the persist and audits only on success', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      await result.current.completeReminder('r1');
    });

    expect(params.dataContext.updateItemReminder).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ completed: true }),
    );
    expect(params.dataContext.addAuditLog).toHaveBeenCalledTimes(1);
  });

  it('rolls back and toasts when the persist fails — no audit entry', async () => {
    const params = buildParams();
    params.dataContext.updateItemReminder.mockResolvedValue(false);
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      await result.current.completeReminder('r1');
    });

    // Optimistic patch + rollback patch
    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(2);
    const rollback = params.dataContext.patchInventoryItem.mock.calls[1][1];
    expect(rollback().reminders[0].completed).toBe(false);
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('reminder'), 'error');
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
  });
});

describe('addReminder', () => {
  it('rolls the ghost reminder back when the insert fails', async () => {
    const params = buildParams();
    params.dataContext.addItemReminder.mockResolvedValue(null);
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      await result.current.addReminder({ id: 'tmp-1', title: 'New reminder' });
    });

    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(2);
    const rollback = params.dataContext.patchInventoryItem.mock.calls[1][1];
    expect(rollback().reminders.map((r) => r.id)).toEqual(['r1']);
    expect(addToastMock).toHaveBeenCalled();
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
  });
});

describe('deleteReminder', () => {
  it('restores the reminder when the delete fails', async () => {
    const params = buildParams();
    params.dataContext.deleteItemReminder.mockResolvedValue(false);
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      result.current.deleteReminder('r1');
      // showConfirm invokes onConfirm synchronously; let its async body settle
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(2);
    const rollback = params.dataContext.patchInventoryItem.mock.calls[1][1];
    expect(rollback().reminders.map((r) => r.id)).toEqual(['r1']);
    expect(addToastMock).toHaveBeenCalled();
  });
});
