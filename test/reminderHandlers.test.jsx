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

describe('recurring reminders spawn the next occurrence (2026-08-24)', () => {
  // recurrence was collected, stored, and badged while completion simply
  // ended the series — nothing anywhere advanced an occurrence
  const recurring = {
    id: 'r2',
    title: 'Sensor cleaning',
    description: 'Full sensor swab',
    dueDate: '2026-08-10',
    recurrence: 'weekly',
    completed: false,
  };

  const daysBetween = (a, b) =>
    Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

  it('completing a weekly reminder creates the next one, anchored to the original weekday', async () => {
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', reminders: [recurring] },
    });
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      await result.current.completeReminder('r2');
    });

    expect(params.dataContext.addItemReminder).toHaveBeenCalledTimes(1);
    const [itemId, spawned] = params.dataContext.addItemReminder.mock.calls[0];
    expect(itemId).toBe('CAM001');
    expect(spawned).toMatchObject({
      title: 'Sensor cleaning',
      description: 'Full sensor swab',
      recurrence: 'weekly',
      completed: false,
      createdBy: 'Tester',
    });
    // Strictly in the future, on the original cadence
    const today = new Date().toISOString().slice(0, 10);
    expect(spawned.dueDate > today).toBe(true);
    expect(daysBetween('2026-08-10', spawned.dueDate) % 7).toBe(0);

    // Both local copies gain the spawned reminder with the DB id
    const appendPatch = params.dataContext.patchInventoryItem.mock.calls.at(-1)[1];
    const appended = appendPatch({ reminders: [recurring] }).reminders;
    expect(appended.map((r) => r.id)).toEqual(['r2', 'db-r-1']);
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('scheduled'), 'success');
  });

  it('warns (but keeps the completion) when the spawn insert fails', async () => {
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', reminders: [recurring] },
    });
    params.dataContext.addItemReminder.mockResolvedValue(null);
    const { result } = renderHook(() => useReminderHandlers(params));

    await act(async () => {
      await result.current.completeReminder('r2');
    });

    expect(params.dataContext.addAuditLog).toHaveBeenCalledTimes(1); // completion stood
    expect(addToastMock).toHaveBeenCalledWith(
      expect.stringContaining('could not be created'),
      'warning',
    );
  });

  it('one-time reminders spawn nothing', async () => {
    const params = buildParams(); // r1 has no recurrence
    const { result } = renderHook(() => useReminderHandlers(params));
    await act(async () => {
      await result.current.completeReminder('r1');
    });
    expect(params.dataContext.addItemReminder).not.toHaveBeenCalled();
  });

  it('does not spawn when completion itself failed', async () => {
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', reminders: [recurring] },
    });
    params.dataContext.updateItemReminder.mockResolvedValue(false);
    const { result } = renderHook(() => useReminderHandlers(params));
    await act(async () => {
      await result.current.completeReminder('r2');
    });
    expect(params.dataContext.addItemReminder).not.toHaveBeenCalled();
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
