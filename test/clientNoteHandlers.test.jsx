// =============================================================================
// clientNoteHandlers — persistence
// Client notes were local-only (patchClient with no service call) — every
// note typed on a client vanished on reload. They now persist through
// addClientNote/deleteClientNote with optimistic temp-id swapping.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { useNoteHandlers } = await import('../hooks/handlers/useNoteHandlers.js');

function makeDataContext(overrides = {}) {
  return {
    patchClient: vi.fn(),
    addClientNote: vi.fn().mockResolvedValue({ id: 'db-uuid-1' }),
    deleteClientNote: vi.fn().mockResolvedValue({}),
    addAuditLog: vi.fn(),
    patchInventoryItem: vi.fn(),
    patchPackage: vi.fn(),
    ...overrides,
  };
}

function setup(dataContext = makeDataContext()) {
  const hook = renderHook(() =>
    useNoteHandlers({
      selectedItem: null,
      setSelectedItem: vi.fn(),
      selectedPackage: null,
      setSelectedPackage: vi.fn(),
      selectedReservation: null,
      setSelectedReservation: vi.fn(),
      selectedReservationItem: null,
      dataContext,
      currentUser: { name: 'Tester' },
    }),
  );
  return { hook, dataContext };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('clientNoteHandlers', () => {
  it('add: optimistic patch, service persist, temp id swapped for DB uuid', async () => {
    const { hook, dataContext } = setup();

    await act(() => hook.result.current.clientNoteHandlers.add('CL001', 'hello'));

    // Optimistic patch first, then the id-swap patch after the service call
    expect(dataContext.patchClient).toHaveBeenCalledTimes(2);
    expect(dataContext.addClientNote).toHaveBeenCalledWith(
      'CL001',
      expect.objectContaining({ text: 'hello', user: 'Tester' }),
    );

    // The swap patch replaces the temp id with the DB uuid
    const swapUpdater = dataContext.patchClient.mock.calls[1][1];
    const tempNote = dataContext.addClientNote.mock.calls[0][1];
    const swapped = swapUpdater({ clientNotes: [{ ...tempNote }] });
    expect(swapped.clientNotes[0].id).toBe('db-uuid-1');
  });

  it('add: no second patch when the DB echoes the same id', async () => {
    const { hook, dataContext } = setup(
      makeDataContext({ addClientNote: vi.fn(async (clientId, note) => ({ id: note.id })) }),
    );

    await act(() => hook.result.current.clientNoteHandlers.add('CL001', 'hello'));
    expect(dataContext.patchClient).toHaveBeenCalledTimes(1);
  });

  it('add: a failed persist rolls the optimistic note back (null = failure)', async () => {
    const { hook, dataContext } = setup(
      makeDataContext({ addClientNote: vi.fn().mockResolvedValue(null) }),
    );

    await act(() => hook.result.current.clientNoteHandlers.add('CL001', 'hello'));

    // Optimistic patch + rollback patch — the note must NOT stay on screen
    // pretending it saved
    expect(dataContext.patchClient).toHaveBeenCalledTimes(2);
    const rollbackUpdater = dataContext.patchClient.mock.calls[1][1];
    const tempNote = dataContext.addClientNote.mock.calls[0][1];
    const rolledBack = rollbackUpdater({ clientNotes: [{ ...tempNote }] });
    expect(rolledBack.clientNotes).toHaveLength(0);
  });

  it('reply: persists with parentId', async () => {
    const { hook, dataContext } = setup();

    await act(() => hook.result.current.clientNoteHandlers.reply('CL001', 'parent-1', 'a reply'));

    expect(dataContext.addClientNote).toHaveBeenCalledWith(
      'CL001',
      expect.objectContaining({ text: 'a reply', parentId: 'parent-1' }),
    );
  });

  it('delete: soft-deletes through the service', async () => {
    const { hook, dataContext } = setup();

    await act(() => hook.result.current.clientNoteHandlers.delete('CL001', 'note-9'));

    expect(dataContext.patchClient).toHaveBeenCalledTimes(1);
    expect(dataContext.deleteClientNote).toHaveBeenCalledWith('note-9');
  });
});
