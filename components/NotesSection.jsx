// ============================================================================
// Notes Section Component
// Reusable threaded notes with replies
// ============================================================================

import React, { memo, useState, useCallback } from 'react';
import { Plus, Reply, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate } from '../utils';

// Single note component with replies
const Note = memo(function Note({
  note,
  depth = 0,
  onReply,
  onDelete,
  user,
  panelColor
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const handleSubmitReply = useCallback(() => {
    if (replyText.trim()) {
      onReply(note.id, replyText);
      setReplyText('');
      setShowReplyInput(false);
    }
  }, [note.id, replyText, onReply]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitReply();
    }
  }, [handleSubmitReply]);

  if (note.deleted) {
    return (
      <div style={{
        padding: spacing[3],
        marginLeft: depth * spacing[5],
        color: colors.textMuted,
        fontStyle: 'italic',
        fontSize: typography.fontSize.sm
      }}>
        [Note deleted]
      </div>
    );
  }

  const hasReplies = note.replies && note.replies.length > 0;
  const itemColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;

  return (
    <div style={{ marginLeft: depth * spacing[5] }}>
      <div style={{
        padding: spacing[3],
        background: `${withOpacity(itemColor, 20)}`,
        border: `1px solid ${withOpacity(itemColor, 50)}`,
        borderRadius: borderRadius.md,
        borderLeft: depth > 0 ? `3px solid ${itemColor}` : `1px solid ${withOpacity(itemColor, 50)}`,
        marginBottom: spacing[2]
      }}>
        {/* Note Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginBottom: spacing[2]
        }}>
          {hasReplies && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                padding: 0,
                display: 'flex'
              }}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <span style={{
            fontWeight: typography.fontWeight.medium,
            color: colors.textPrimary,
            fontSize: typography.fontSize.sm
          }}>
            {note.user}
          </span>
          <span style={{
            fontSize: typography.fontSize.xs,
            color: colors.textMuted
          }}>
            {formatDate(note.date)}
          </span>
        </div>

        {/* Note Content */}
        <p style={{
          margin: 0,
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
          lineHeight: 1.5
        }}>
          {note.text}
        </p>

        {/* Note Actions */}
        <div style={{
          display: 'flex',
          gap: spacing[2],
          marginTop: spacing[2]
        }}>
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              fontSize: typography.fontSize.xs,
              padding: spacing[1]
            }}
          >
            <Reply size={12} />
            Reply
          </button>
          <button
            onClick={() => onDelete(note.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              fontSize: typography.fontSize.xs,
              padding: spacing[1]
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div style={{
            display: 'flex',
            gap: spacing[2],
            marginTop: spacing[3]
          }}>
            <input
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply..."
              style={{
                ...styles.input,
                flex: 1,
                padding: spacing[2],
                fontSize: typography.fontSize.sm
              }}
              autoFocus
            />
            <button
              onClick={handleSubmitReply}
              disabled={!replyText.trim()}
              style={{
                ...styles.btn,
                padding: spacing[2],
                opacity: replyText.trim() ? 1 : 0.5
              }}
            >
              Reply
            </button>
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {hasReplies && isExpanded && (
        <div>
          {note.replies.map(reply => (
            <Note
              key={reply.id}
              note={reply}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              user={user}
              panelColor={panelColor}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Main Notes Section Component
function NotesSection({
  notes = [],
  onAddNote,
  onReply,
  onDelete,
  user,
  panelColor
}) {
  const [newNoteText, setNewNoteText] = useState('');

  const handleSubmitNote = useCallback(() => {
    if (newNoteText.trim()) {
      onAddNote(newNoteText);
      setNewNoteText('');
    }
  }, [newNoteText, onAddNote]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitNote();
    }
  }, [handleSubmitNote]);

  // Filter out deleted notes at the root level for display count
  const visibleNotes = notes.filter(n => !n.deleted);

  return (
    <>
      <div style={{ padding: spacing[4] }}>
        {/* Add Note Input */}
        <div style={{
          display: 'flex',
          gap: spacing[2],
          marginBottom: spacing[4]
        }}>
          <input
            value={newNoteText}
            onChange={e => setNewNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a note..."
            style={{
              ...styles.input,
              flex: 1,
              padding: spacing[2],
              fontSize: typography.fontSize.sm
            }}
          />
          <button
            onClick={handleSubmitNote}
            disabled={!newNoteText.trim()}
            style={{
              ...styles.btn,
              padding: spacing[2],
              opacity: newNoteText.trim() ? 1 : 0.5
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Notes List */}
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {notes.length === 0 ? (
            <p style={{
              color: colors.textMuted,
              textAlign: 'center',
              fontSize: typography.fontSize.sm,
              padding: spacing[4]
            }}>
              No notes yet
            </p>
          ) : (
            notes.map(note => (
              <Note
                key={note.id}
                note={note}
                onReply={onReply}
                onDelete={onDelete}
                user={user}
                panelColor={panelColor}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default memo(NotesSection);
