// ============================================================================
// Note Handlers (Items, Packages, Reservations, Clients)
// Extracted from App.jsx — manages note CRUD for all entity types
// ============================================================================
import { useState, useCallback, useMemo } from 'react';
import { generateId, getTodayISO, updateById, addReplyToNote, markNoteDeleted, findNoteById } from '../utils.js';

export function useNoteHandlers({
  selectedItem,
  setSelectedItem,
  setInventory,
  selectedPackage,
  setSelectedPackage,
  selectedReservation,
  setSelectedReservation,
  selectedReservationItem,
  setPackages,
  setClients,
  setAuditLog,
  dataContext,
  currentUser,
}) {
  // Client note selection state
  const [selectedClientId, setSelectedClientId] = useState(null);

  // ---- Generic note handler factory (items/packages/reservations) ----

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
        setInventory(prev => updateById(prev, entityId, item => ({
          notes: notesUpdater(item.notes)
        })));
      } else if (entityType === 'package') {
        setPackages(prev => updateById(prev, entityId, pkg => ({
          notes: notesUpdater(pkg.notes || [])
        })));
      } else if (entityType === 'reservation') {
        setInventory(prev => updateById(prev, selectedReservationItem.id, item => ({
          reservations: (item.reservations || []).map(r =>
            r.id === entityId ? { ...r, notes: notesUpdater(r.notes || []) } : r
          )
        })));
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
        const note = {
          id: tempId,
          user: currentUser.name,
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false
        };

        const currentNotes = entity.notes || [];
        const updatedNotes = [...currentNotes, note];

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
        const reply = {
          id: tempId,
          user: currentUser.name,
          date: getTodayISO(),
          text: text.trim(),
          replies: [],
          deleted: false,
          parentId: parentId
        };

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
          setAuditLog(prev => [...prev, {
            type: 'note_deleted',
            timestamp: new Date().toISOString(),
            description: `Note deleted from ${entityType} ${entity.id}`,
            content: note.text,
            user: currentUser.name,
            itemId: entity.id
          }]);
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

  // Memoized note handlers per entity type
  const itemNoteHandlers = useMemo(() => createNoteHandler('item'), [createNoteHandler]);
  const packageNoteHandlers = useMemo(() => createNoteHandler('package'), [createNoteHandler]);
  const reservationNoteHandlers = useMemo(() => createNoteHandler('reservation'), [createNoteHandler]);

  // ---- Client notes ----

  const clientNoteHandlers = useMemo(() => ({
    add: (clientId, text) => {
      if (!text?.trim() || !clientId) return;
      
      const note = {
        id: generateId(),
        user: currentUser?.name || 'Unknown',
        date: getTodayISO(),
        text: text.trim(),
        replies: [],
        deleted: false
      };
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: [...(client.clientNotes || []), note] }
          : client
      ));
    },
    
    reply: (clientId, parentId, text) => {
      if (!text?.trim() || !clientId) return;
      
      const reply = {
        id: generateId(),
        user: currentUser?.name || 'Unknown',
        date: getTodayISO(),
        text: text.trim(),
        replies: [],
        deleted: false
      };
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: addReplyToNote(client.clientNotes || [], parentId, reply) }
          : client
      ));
    },
    
    delete: (clientId, noteId) => {
      if (!clientId) return;
      
      setClients(prev => prev.map(client => 
        client.id === clientId 
          ? { ...client, clientNotes: markNoteDeleted(client.clientNotes || [], noteId) }
          : client
      ));
    }
  }), [currentUser]);

  return {
    // Note handlers by entity type
    itemNoteHandlers,
    packageNoteHandlers,
    reservationNoteHandlers,
    clientNoteHandlers,
    // Client selection state
    selectedClientId,
    setSelectedClientId,
  };
}
