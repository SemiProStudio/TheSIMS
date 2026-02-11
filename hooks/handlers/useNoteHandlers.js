// ============================================================================
// Note Handlers (Items, Packages, Reservations, Clients)
// Extracted from App.jsx — manages note CRUD for all entity types
// ============================================================================
import { useState, useCallback, useMemo } from 'react';
import { generateId, getTodayISO, addReplyToNote, markNoteDeleted, findNoteById } from '../../utils.js';

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

  const createNoteHandler = useCallback((entityType) => {
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
        dataContext.patchInventoryItem(entityId, item => ({
          notes: notesUpdater(item.notes)
        }));
      } else if (entityType === 'package') {
        dataContext.patchPackage(entityId, pkg => ({
          notes: notesUpdater(pkg.notes || [])
        }));
      } else if (entityType === 'reservation') {
        dataContext.patchInventoryItem(selectedReservationItem.id, item => ({
          reservations: (item.reservations || []).map(r =>
            r.id === entityId ? { ...r, notes: notesUpdater(r.notes || []) } : r
          )
        }));
      }
    };

    const replaceNoteId = (notes, tempId, realId) => {
      return notes.map(n => ({
        ...n,
        id: n.id === tempId ? realId : n.id,
        replies: n.replies ? replaceNoteId(n.replies, tempId, realId) : []
      }));
    };

    return {
      add: async (text) => {
        const entity = getEntity();
        if (!text?.trim() || !entity) return;

        const tempId = generateId();
        const note = { id: tempId, user: currentUser.name, date: getTodayISO(), text: text.trim(), replies: [], deleted: false };
        const updatedNotes = [...(entity.notes || []), note];

        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        if (entityType === 'item' && dataContext?.addItemNote) {
          const dbResult = await dataContext.addItemNote(entity.id, note);
          if (dbResult?.id && dbResult.id !== tempId) {
            const swapId = (notes) => replaceNoteId(notes, tempId, dbResult.id);
            updateCollection(entity.id, swapId);
            setEntity(prev => ({ ...prev, notes: swapId(prev.notes || []) }));
          }
        }
      },

      reply: async (parentId, text) => {
        const entity = getEntity();
        if (!text?.trim() || !entity) return;

        const tempId = generateId();
        const reply = { id: tempId, user: currentUser.name, date: getTodayISO(), text: text.trim(), replies: [], deleted: false, parentId };
        const updatedNotes = addReplyToNote(entity.notes || [], parentId, reply);

        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        if (entityType === 'item' && dataContext?.addItemNote) {
          const dbResult = await dataContext.addItemNote(entity.id, reply);
          if (dbResult?.id && dbResult.id !== tempId) {
            const swapId = (notes) => replaceNoteId(notes, tempId, dbResult.id);
            updateCollection(entity.id, swapId);
            setEntity(prev => ({ ...prev, notes: swapId(prev.notes || []) }));
          }
        }
      },

      delete: (noteId) => {
        const entity = getEntity();
        if (!entity) return;

        const note = findNoteById(entity.notes || [], noteId);
        if (note) {
          dataContext.addAuditLog({
            type: 'note_deleted',
            description: `Note deleted from ${entityType} ${entity.id}`,
            content: note.text,
            user: currentUser.name,
            itemId: entity.id
          });
        }

        const updatedNotes = markNoteDeleted(entity.notes || [], noteId);
        updateCollection(entity.id, () => updatedNotes);
        setEntity(prev => ({ ...prev, notes: updatedNotes }));
        
        if (entityType === 'item' && dataContext?.deleteItemNote) {
          dataContext.deleteItemNote(noteId);
        }
      }
    };
  }, [selectedItem, selectedPackage, selectedReservation, selectedReservationItem, currentUser, dataContext, setSelectedReservation]);

  const itemNoteHandlers = useMemo(() => createNoteHandler('item'), [createNoteHandler]);
  const packageNoteHandlers = useMemo(() => createNoteHandler('package'), [createNoteHandler]);
  const reservationNoteHandlers = useMemo(() => createNoteHandler('reservation'), [createNoteHandler]);

  const clientNoteHandlers = useMemo(() => ({
    add: (clientId, text) => {
      if (!text?.trim() || !clientId) return;
      const note = { id: generateId(), user: currentUser?.name || 'Unknown', date: getTodayISO(), text: text.trim(), replies: [], deleted: false };
      dataContext.patchClient(clientId, client => ({ clientNotes: [...(client.clientNotes || []), note] }));
    },
    reply: (clientId, parentId, text) => {
      if (!text?.trim() || !clientId) return;
      const reply = { id: generateId(), user: currentUser?.name || 'Unknown', date: getTodayISO(), text: text.trim(), replies: [], deleted: false };
      dataContext.patchClient(clientId, client => ({ clientNotes: addReplyToNote(client.clientNotes || [], parentId, reply) }));
    },
    delete: (clientId, noteId) => {
      if (!clientId) return;
      dataContext.patchClient(clientId, client => ({ clientNotes: markNoteDeleted(client.clientNotes || [], noteId) }));
    }
  }), [currentUser, dataContext]);

  return {
    itemNoteHandlers, packageNoteHandlers, reservationNoteHandlers, clientNoteHandlers,
    selectedClientId, setSelectedClientId,
  };
}
