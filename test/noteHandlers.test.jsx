// =============================================================================
// useNoteHandlers — optimistic-with-rollback note writes for items, packages,
// reservations (JSONB on the row) and clients.
//
// Every handler follows one contract: patch the collection and the selected
// entity first, await the persist, then either swap the temp id for the DB id
// or restore the snapshot and toast. These tests pin that contract per entity
// type, including the branches where the persist is missing, returns null, or
// throws, and the audit entry that must follow — never precede — a delete.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const { useNoteHandlers } = await import('../hooks/handlers/useNoteHandlers.js');

const existingNote = { id: 'n1', user: 'Sam', date: '2026-08-01', text: 'First', replies: [] };

/** Run the last updater passed to a mocked setter against `prev`. */
function lastUpdate(mockSetter, prev) {
  const updater = mockSetter.mock.calls.at(-1)[0];
  return typeof updater === 'function' ? updater(prev) : updater;
}

/** Apply the updater passed to patchInventoryItem/patchPackage to `entity`. */
function lastPatch(mockPatch, entity) {
  const updater = mockPatch.mock.calls.at(-1)[1];
  return typeof updater === 'function' ? updater(entity) : updater;
}

function buildParams(overrides = {}) {
  return {
    selectedItem: { id: 'IT1', name: 'Camera', notes: [existingNote] },
    setSelectedItem: vi.fn(),
    selectedPackage: { id: 'PK1', name: 'Kit', notes: [] },
    setSelectedPackage: vi.fn(),
    selectedReservation: { id: 'RS1', notes: [existingNote] },
    setSelectedReservation: vi.fn(),
    selectedReservationItem: { id: 'IT1' },
    dataContext: {
      patchInventoryItem: vi.fn(),
      patchPackage: vi.fn(),
      patchClient: vi.fn(),
      addItemNote: vi.fn().mockResolvedValue({ id: 'db-1' }),
      deleteItemNote: vi.fn().mockResolvedValue(true),
      addPackageNote: vi.fn().mockResolvedValue({ id: 'db-2' }),
      deletePackageNote: vi.fn().mockResolvedValue(true),
      updateReservation: vi.fn().mockResolvedValue(undefined),
      addClientNote: vi.fn().mockResolvedValue({ id: 'db-3' }),
      deleteClientNote: vi.fn().mockResolvedValue(true),
      addAuditLog: vi.fn(),
    },
    currentUser: { id: 'u1', name: 'Tester' },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Item notes (own table)
// =============================================================================

describe('itemNoteHandlers', () => {
  it('adds optimistically, persists, then swaps the temp id for the DB id everywhere', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));

    await act(async () => {
      await result.current.itemNoteHandlers.add('  Hello  ');
    });

    const { patchInventoryItem, addItemNote } = params.dataContext;
    // optimistic patch (call 1) carries the trimmed note under a temp id
    const optimistic = patchInventoryItem.mock.calls[0][1]({ notes: [existingNote] });
    expect(optimistic.notes).toHaveLength(2);
    const temp = optimistic.notes[1];
    expect(temp).toMatchObject({ text: 'Hello', user: 'Tester', replies: [], deleted: false });
    expect(temp.id).toMatch(/^id_/);
    expect(addItemNote).toHaveBeenCalledWith('IT1', temp);

    // id swap (call 2) on the collection and the selected entity
    expect(patchInventoryItem).toHaveBeenCalledTimes(2);
    const swapped = lastPatch(patchInventoryItem, { notes: optimistic.notes });
    expect(swapped.notes.map((n) => n.id)).toEqual(['n1', 'db-1']);
    expect(
      lastUpdate(params.setSelectedItem, { id: 'IT1', notes: optimistic.notes }).notes[1].id,
    ).toBe('db-1');
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('ignores blank text without touching state', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.add('   ');
      await result.current.itemNoteHandlers.reply('n1', '');
    });
    expect(params.dataContext.patchInventoryItem).not.toHaveBeenCalled();
    expect(params.dataContext.addItemNote).not.toHaveBeenCalled();
  });

  it('does nothing when no item is selected', async () => {
    const params = buildParams({ selectedItem: null });
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.add('text');
      await result.current.itemNoteHandlers.delete('n1');
    });
    expect(params.dataContext.patchInventoryItem).not.toHaveBeenCalled();
  });

  it('rolls back and toasts when the persist returns nothing', async () => {
    const params = buildParams();
    params.dataContext.addItemNote.mockResolvedValue(null);
    const { result } = renderHook(() => useNoteHandlers(params));

    await act(async () => {
      await result.current.itemNoteHandlers.add('Lost note');
    });

    const rolledBack = lastPatch(params.dataContext.patchInventoryItem, { notes: ['whatever'] });
    expect(rolledBack.notes).toEqual([existingNote]);
    expect(lastUpdate(params.setSelectedItem, { id: 'IT1', notes: ['x'] }).notes).toEqual([
      existingNote,
    ]);
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not save the note. Please try again.',
      'error',
    );
  });

  it('keeps the temp id when the DB echoes it back', async () => {
    const params = buildParams();
    params.dataContext.addItemNote.mockImplementation(async (_id, note) => ({ id: note.id }));
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.add('Same id');
    });
    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(1);
  });

  it('nests a reply under its parent and swaps the reply id deep', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.reply('n1', 'Reply text');
    });

    const optimistic = params.dataContext.patchInventoryItem.mock.calls[0][1]({
      notes: [existingNote],
    });
    expect(optimistic.notes[0].replies[0]).toMatchObject({ text: 'Reply text', parentId: 'n1' });
    const swapped = lastPatch(params.dataContext.patchInventoryItem, { notes: optimistic.notes });
    expect(swapped.notes[0].replies[0].id).toBe('db-1');
  });

  it('deletes softly, persists, then writes the audit entry with the note text', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    const order = [];
    params.dataContext.deleteItemNote.mockImplementation(async () => {
      order.push('persist');
      return true;
    });
    params.dataContext.addAuditLog.mockImplementation(() => order.push('audit'));

    await act(async () => {
      await result.current.itemNoteHandlers.delete('n1');
    });

    const patched = lastPatch(params.dataContext.patchInventoryItem, { notes: [existingNote] });
    expect(patched.notes[0].deleted).toBe(true);
    expect(order).toEqual(['persist', 'audit']);
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith({
      type: 'note_deleted',
      description: 'Note deleted from item IT1',
      content: 'First',
      user: 'Tester',
      itemId: 'IT1',
    });
  });

  it('restores the note and skips the audit entry when the delete fails', async () => {
    const params = buildParams();
    params.dataContext.deleteItemNote.mockResolvedValue(false);
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.delete('n1');
    });
    expect(lastPatch(params.dataContext.patchInventoryItem, {}).notes).toEqual([existingNote]);
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not delete the note. Please try again.',
      'error',
    );
  });

  it('writes no audit entry for an id that is not in the notes', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.delete('ghost');
    });
    expect(params.dataContext.deleteItemNote).toHaveBeenCalledWith('ghost');
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
  });

  it('treats a missing persist function as local-only success', async () => {
    const params = buildParams();
    delete params.dataContext.addItemNote;
    delete params.dataContext.deleteItemNote;
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.itemNoteHandlers.add('Local');
      await result.current.itemNoteHandlers.delete('n1');
    });
    expect(params.dataContext.patchInventoryItem).toHaveBeenCalledTimes(2);
    expect(params.dataContext.addAuditLog).toHaveBeenCalledTimes(1);
    expect(mockAddToast).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Package notes
// =============================================================================

describe('packageNoteHandlers', () => {
  it('routes through patchPackage / addPackageNote and tolerates a package without notes', async () => {
    const params = buildParams({ selectedPackage: { id: 'PK1', name: 'Kit' } });
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.packageNoteHandlers.add('Pack note');
    });
    const { patchPackage, addPackageNote, patchInventoryItem } = params.dataContext;
    expect(patchInventoryItem).not.toHaveBeenCalled();
    expect(patchPackage.mock.calls[0][0]).toBe('PK1');
    expect(patchPackage.mock.calls[0][1]({}).notes).toHaveLength(1);
    expect(addPackageNote).toHaveBeenCalledWith(
      'PK1',
      expect.objectContaining({ text: 'Pack note' }),
    );
    expect(
      lastPatch(patchPackage, { notes: patchPackage.mock.calls[0][1]({}).notes }).notes[0].id,
    ).toBe('db-2');
  });

  it('deletes via deletePackageNote and audits against the package', async () => {
    const params = buildParams({ selectedPackage: { id: 'PK1', notes: [existingNote] } });
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.packageNoteHandlers.delete('n1');
    });
    expect(params.dataContext.deletePackageNote).toHaveBeenCalledWith('n1');
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Note deleted from package PK1', itemId: 'PK1' }),
    );
  });
});

// =============================================================================
// Reservation notes (JSONB array on the reservation row)
// =============================================================================

describe('reservationNoteHandlers', () => {
  it('persists the WHOLE notes array through updateReservation and patches the owning item', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.reservationNoteHandlers.add('Res note');
    });

    const { updateReservation, patchInventoryItem } = params.dataContext;
    expect(updateReservation).toHaveBeenCalledTimes(1);
    const [resId, payload] = updateReservation.mock.calls[0];
    expect(resId).toBe('RS1');
    expect(payload.notes).toHaveLength(2);
    expect(payload.notes[1].text).toBe('Res note');

    // The item's reservations array is patched for the matching reservation only
    expect(patchInventoryItem.mock.calls[0][0]).toBe('IT1');
    const patched = patchInventoryItem.mock.calls[0][1]({
      reservations: [
        { id: 'RS1', notes: [] },
        { id: 'RS2', notes: [] },
      ],
    });
    expect(patched.reservations[0].notes).toHaveLength(2);
    expect(patched.reservations[1].notes).toEqual([]);
    expect(lastUpdate(params.setSelectedReservation, { id: 'RS1' }).notes).toHaveLength(2);
    // No temp-id swap for JSONB notes
    expect(patchInventoryItem).toHaveBeenCalledTimes(1);
  });

  it('rolls back when updateReservation throws', async () => {
    const params = buildParams();
    params.dataContext.updateReservation.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.reservationNoteHandlers.reply('n1', 'Reply');
    });
    const restored = lastPatch(params.dataContext.patchInventoryItem, {
      reservations: [{ id: 'RS1', notes: ['dirty'] }],
    });
    expect(restored.reservations[0].notes).toEqual([existingNote]);
    expect(
      lastUpdate(params.setSelectedReservation, { id: 'RS1', notes: ['dirty'] }).notes,
    ).toEqual([existingNote]);
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not save the note. Please try again.',
      'error',
    );
  });

  it('deletes by persisting the marked array, then audits', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.reservationNoteHandlers.delete('n1');
    });
    const payload = params.dataContext.updateReservation.mock.calls[0][1];
    expect(payload.notes[0].deleted).toBe(true);
    expect(params.dataContext.deleteItemNote).not.toHaveBeenCalled();
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Note deleted from reservation RS1' }),
    );
  });

  it('rolls back a failed delete', async () => {
    const params = buildParams();
    params.dataContext.updateReservation.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.reservationNoteHandlers.delete('n1');
    });
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not delete the note. Please try again.',
      'error',
    );
  });
});

// =============================================================================
// Client notes
// =============================================================================

describe('clientNoteHandlers', () => {
  it('adds optimistically then swaps the temp id for the DB id', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.add('CL1', 'Client note');
    });
    const { patchClient, addClientNote } = params.dataContext;
    const optimistic = patchClient.mock.calls[0][1]({});
    expect(optimistic.clientNotes[0]).toMatchObject({ text: 'Client note', user: 'Tester' });
    expect(addClientNote).toHaveBeenCalledWith('CL1', optimistic.clientNotes[0]);
    const swapped = lastPatch(patchClient, { clientNotes: optimistic.clientNotes });
    expect(swapped.clientNotes[0].id).toBe('db-3');
  });

  it('ignores blank text or a missing client id', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.add('CL1', ' ');
      await result.current.clientNoteHandlers.add(null, 'text');
      await result.current.clientNoteHandlers.reply(null, 'n1', 'text');
      await result.current.clientNoteHandlers.delete(null, 'n1');
    });
    expect(params.dataContext.patchClient).not.toHaveBeenCalled();
  });

  it('removes the optimistic note and toasts when the persist returns nothing', async () => {
    const params = buildParams();
    params.dataContext.addClientNote.mockResolvedValue(null);
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.add('CL1', 'Lost');
    });
    const optimistic = params.dataContext.patchClient.mock.calls[0][1]({});
    const rolledBack = lastPatch(params.dataContext.patchClient, {
      clientNotes: [existingNote, ...optimistic.clientNotes],
    });
    expect(rolledBack.clientNotes).toEqual([existingNote]);
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not save the note. Please try again.',
      'error',
    );
  });

  it('replies under the parent and strips only that reply on rollback', async () => {
    const params = buildParams();
    params.dataContext.addClientNote.mockResolvedValue(null);
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.reply('CL1', 'n1', 'Reply');
    });
    const optimistic = params.dataContext.patchClient.mock.calls[0][1]({
      clientNotes: [existingNote],
    });
    const reply = optimistic.clientNotes[0].replies[0];
    expect(reply).toMatchObject({ text: 'Reply', parentId: 'n1' });

    const other = { id: 'r-keep', text: 'keep' };
    const rolledBack = lastPatch(params.dataContext.patchClient, {
      clientNotes: [{ ...existingNote, replies: [other, reply] }],
    });
    expect(rolledBack.clientNotes[0].replies).toEqual([other]);
  });

  it('uses "Unknown" as the author without a current user and skips persist when unavailable', async () => {
    const params = buildParams({ currentUser: null });
    delete params.dataContext.addClientNote;
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.add('CL1', 'Anon');
    });
    expect(params.dataContext.patchClient.mock.calls[0][1]({}).clientNotes[0].user).toBe('Unknown');
    expect(params.dataContext.patchClient).toHaveBeenCalledTimes(1);
  });

  it('deletes softly and leaves the patch alone when the DB confirms', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.delete('CL1', 'n1');
    });
    const marked = params.dataContext.patchClient.mock.calls[0][1]({ clientNotes: [existingNote] });
    expect(marked.clientNotes[0].deleted).toBe(true);
    expect(params.dataContext.deleteClientNote).toHaveBeenCalledWith('n1');
    expect(params.dataContext.patchClient).toHaveBeenCalledTimes(1);
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('restores the snapshot and toasts when the DB refuses the delete', async () => {
    const params = buildParams();
    // The snapshot is captured inside the optimistic updater, so the patch
    // must actually run it — as DataContext does
    const client = { id: 'CL1', clientNotes: [existingNote] };
    params.dataContext.patchClient.mockImplementation((_id, updater) =>
      typeof updater === 'function' ? updater(client) : updater,
    );
    params.dataContext.deleteClientNote.mockResolvedValue(false);
    const { result } = renderHook(() => useNoteHandlers(params));
    await act(async () => {
      await result.current.clientNoteHandlers.delete('CL1', 'n1');
    });
    expect(params.dataContext.patchClient).toHaveBeenCalledTimes(2);
    expect(lastPatch(params.dataContext.patchClient, client).clientNotes).toEqual([existingNote]);
    expect(mockAddToast).toHaveBeenCalledWith(
      'Could not delete the note. Please try again.',
      'error',
    );
  });

  it('exposes selectedClientId state', () => {
    const { result } = renderHook(() => useNoteHandlers(buildParams()));
    expect(result.current.selectedClientId).toBeNull();
    act(() => result.current.setSelectedClientId('CL9'));
    expect(result.current.selectedClientId).toBe('CL9');
  });
});
