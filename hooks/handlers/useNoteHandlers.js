// ============================================================================
// Note Handlers (Items, Packages, Reservations, Clients)
// Extracted from App.jsx — manages note CRUD for all entity types.
// Optimistic-with-rollback: patch state, await the persist, and on failure
// restore the snapshot and toast. (The old handlers swallowed failures — a
// note that never reached the DB stayed on screen until reload, and deletes
// wrote their audit entry before the un-awaited persist.)
// ============================================================================
import { useState, useCallback, useMemo } from 'react';
import { useToast } from '../../contexts/ToastContext.js';
import {
  generateId,
  getTodayISO,
  addReplyToNote,
  markNoteDeleted,
  findNoteById,
} from '../../utils';

// Swap an optimistic temp id for the DB-generated one, recursively
const replaceNoteIdDeep = (notes, tempId, realId) =>
  notes.map((n) => ({
    ...n,
    id: n.id === tempId ? realId : n.id,
    replies: n.replies ? replaceNoteIdDeep(n.replies, tempId, realId) : [],
  }));

export function useNoteHandlers({
  selectedItem,
  setSelectedItem,
  selectedPackage,
  setSelectedPackage,
  selectedReservation,
  setSelectedReservation,
  selectedReservationItem,
  dataContext,
  currentUser,
}) {
  const [selectedClientId, setSelectedClientId] = useState(null);
  const { addToast } = useToast();

  const createNoteHandler = useCallback(
    (entityType) => {
      const getEntity = () => {
        if (entityType === 'item') return selectedItem;
        if (entityType === 'package') return selectedPackage;
        if (entityType === 'reservation') return selectedReservation;
        return null;
      };

      const setEntity = (updater) => {
        if (entityType === 'item') setSelectedItem(updater);
        else if (entityType === 'package') setSelectedPackage(updater);
        else if (entityType === 'reservation') setSelectedReservation(updater);
      };

      const updateCollection = (entityId, notesUpdater) => {
        if (entityType === 'item') {
          dataContext.patchInventoryItem(entityId, (item) => ({
            notes: notesUpdater(item.notes),
          }));
        } else if (entityType === 'package') {
          dataContext.patchPackage(entityId, (pkg) => ({
            notes: notesUpdater(pkg.notes || []),
          }));
        } else if (entityType === 'reservation') {
          dataContext.patchInventoryItem(selectedReservationItem.id, (item) => ({
            reservations: (item.reservations || []).map((r) =>
              r.id === entityId ? { ...r, notes: notesUpdater(r.notes || []) } : r,
            ),
          }));
        }
      };

      const replaceNoteId = (notes, tempId, realId) => {
        return notes.map((n) => ({
          ...n,
          id: n.id === tempId ? realId : n.id,
          replies: n.replies ? replaceNoteId(n.replies, tempId, realId) : [],
        }));
      };

      // DB persistence per entity type. Item/package notes live in their own
      // tables (persist returns the row or null). Reservation notes are JSONB
      // on the reservation row, so the WHOLE updated array persists through
      // updateReservation — the old code claimed that happened but no
      // mapping existed, and every reservation note vanished on reload.
      const persistNote =
        entityType === 'item'
          ? dataContext?.addItemNote
          : entityType === 'package'
            ? dataContext?.addPackageNote
            : null;
      const persistNoteDelete =
        entityType === 'item'
          ? dataContext?.deleteItemNote
          : entityType === 'package'
            ? dataContext?.deletePackageNote
            : null;

      // Persist the full notes array for JSONB-backed reservations; true on
      // success. Used by add/reply/delete alike.
      const persistReservationNotes = async (reservationId, notes) => {
        try {
          await dataContext.updateReservation(reservationId, { notes });
          return true;
        } catch {
          return false;
        }
      };

      const rollback = (entityId, previousNotes) => {
        updateCollection(entityId, () => previousNotes);
        setEntity((prev) => (prev ? { ...prev, notes: previousNotes } : prev));
      };

      const addOrReply = async (buildNotes, note, tempId) => {
        const entity = getEntity();
        if (!entity) return;
        const previousNotes = entity.notes || [];
        const updatedNotes = buildNotes(previousNotes, note);

        updateCollection(entity.id, () => updatedNotes);
        setEntity((prev) => ({ ...prev, notes: updatedNotes }));

        if (entityType === 'reservation') {
          const ok = await persistReservationNotes(entity.id, updatedNotes);
          if (!ok) {
            rollback(entity.id, previousNotes);
            addToast('Could not save the note. Please try again.', 'error');
          }
          return;
        }

        if (persistNote) {
          const dbResult = await persistNote(entity.id, note);
          if (!dbResult) {
            rollback(entity.id, previousNotes);
            addToast('Could not save the note. Please try again.', 'error');
            return;
          }
          if (dbResult.id && dbResult.id !== tempId) {
            const swapId = (notes) => replaceNoteId(notes, tempId, dbResult.id);
            updateCollection(entity.id, swapId);
            setEntity((prev) => ({ ...prev, notes: swapId(prev.notes || []) }));
          }
        }
      };

      return {
        add: async (text) => {
          if (!text?.trim()) return;
          const tempId = generateId();
          const note = {
            id: tempId,
            user: currentUser.name,
            date: getTodayISO(),
            text: text.trim(),
            replies: [],
            deleted: false,
          };
          await addOrReply((prev) => [...prev, note], note, tempId);
        },

        reply: async (parentId, text) => {
          if (!text?.trim()) return;
          const tempId = generateId();
          const reply = {
            id: tempId,
            user: currentUser.name,
            date: getTodayISO(),
            text: text.trim(),
            replies: [],
            deleted: false,
            parentId,
          };
          await addOrReply((prev) => addReplyToNote(prev, parentId, reply), reply, tempId);
        },

        delete: async (noteId) => {
          const entity = getEntity();
          if (!entity) return;

          const previousNotes = entity.notes || [];
          const note = findNoteById(previousNotes, noteId);
          const updatedNotes = markNoteDeleted(previousNotes, noteId);
          updateCollection(entity.id, () => updatedNotes);
          setEntity((prev) => ({ ...prev, notes: updatedNotes }));

          const ok =
            entityType === 'reservation'
              ? await persistReservationNotes(entity.id, updatedNotes)
              : persistNoteDelete
                ? await persistNoteDelete(noteId)
                : true;

          if (!ok) {
            rollback(entity.id, previousNotes);
            addToast('Could not delete the note. Please try again.', 'error');
            return;
          }

          // Audit AFTER the persist — the entry used to be written first,
          // recording deletions that never happened
          if (note) {
            dataContext.addAuditLog({
              type: 'note_deleted',
              description: `Note deleted from ${entityType} ${entity.id}`,
              content: note.text,
              user: currentUser.name,
              itemId: entity.id,
            });
          }
        },
      };
    },
    [
      selectedItem,
      setSelectedItem,
      selectedPackage,
      setSelectedPackage,
      selectedReservation,
      setSelectedReservation,
      selectedReservationItem,
      currentUser,
      dataContext,
      addToast,
    ],
  );

  const itemNoteHandlers = useMemo(() => createNoteHandler('item'), [createNoteHandler]);
  const packageNoteHandlers = useMemo(() => createNoteHandler('package'), [createNoteHandler]);
  const reservationNoteHandlers = useMemo(
    () => createNoteHandler('reservation'),
    [createNoteHandler],
  );

  // Client notes persist to the client_notes table (optimistic local patch,
  // then swap the temp id for the DB UUID). These were local-only before —
  // every note typed on a client silently vanished on reload.
  const clientNoteHandlers = useMemo(() => {
    // Same rollback contract as the entity handlers: a failed persist
    // restores the previous notes and tells the user
    const persistOrRollback = async (clientId, note, tempId, previousUpdater) => {
      const dbResult = await dataContext.addClientNote(clientId, note);
      if (!dbResult) {
        dataContext.patchClient(clientId, previousUpdater);
        addToast('Could not save the note. Please try again.', 'error');
        return;
      }
      if (dbResult.id && dbResult.id !== tempId) {
        dataContext.patchClient(clientId, (client) => ({
          clientNotes: replaceNoteIdDeep(client.clientNotes || [], tempId, dbResult.id),
        }));
      }
    };

    return {
      add: async (clientId, text) => {
        if (!text?.trim() || !clientId) return;
        const tempId = generateId();
        const note = {
          id: tempId,
          user: currentUser?.name || 'Unknown',
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false,
        };
        dataContext.patchClient(clientId, (client) => ({
          clientNotes: [...(client.clientNotes || []), note],
        }));
        if (dataContext?.addClientNote) {
          await persistOrRollback(clientId, note, tempId, (client) => ({
            clientNotes: (client.clientNotes || []).filter((n) => n.id !== tempId),
          }));
        }
      },
      reply: async (clientId, parentId, text) => {
        if (!text?.trim() || !clientId) return;
        const tempId = generateId();
        const reply = {
          id: tempId,
          user: currentUser?.name || 'Unknown',
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false,
          parentId,
        };
        dataContext.patchClient(clientId, (client) => ({
          clientNotes: addReplyToNote(client.clientNotes || [], parentId, reply),
        }));
        if (dataContext?.addClientNote) {
          const stripReply = (notes) =>
            notes.map((n) => ({
              ...n,
              replies: (n.replies || []).filter((r) => r.id !== tempId),
            }));
          await persistOrRollback(clientId, reply, tempId, (client) => ({
            clientNotes: stripReply(client.clientNotes || []),
          }));
        }
      },
      delete: async (clientId, noteId) => {
        if (!clientId) return;
        let previousNotes = null;
        dataContext.patchClient(clientId, (client) => {
          previousNotes = client.clientNotes || [];
          return { clientNotes: markNoteDeleted(previousNotes, noteId) };
        });
        const ok = await dataContext?.deleteClientNote?.(noteId);
        if (ok === false && previousNotes) {
          dataContext.patchClient(clientId, () => ({ clientNotes: previousNotes }));
          addToast('Could not delete the note. Please try again.', 'error');
        }
      },
    };
  }, [currentUser, dataContext, addToast]);

  return {
    itemNoteHandlers,
    packageNoteHandlers,
    reservationNoteHandlers,
    clientNoteHandlers,
    selectedClientId,
    setSelectedClientId,
  };
}
