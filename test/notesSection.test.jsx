// =============================================================================
// NotesSection — thread visibility + readOnly gating (item-detail hardening)
//
// Deleting a note used to early-return the "[Note deleted]" stub BEFORE the
// replies block, silently hiding the whole thread that markNoteDeleted
// deliberately preserves.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotesSection from '../components/NotesSection.jsx';
import { countVisibleNotes } from '../utils/index.js';

const thread = [
  {
    id: 'n1',
    text: 'Root note',
    user: 'Admin',
    date: '2026-08-10',
    deleted: true,
    replies: [
      { id: 'n2', text: 'Surviving reply', user: 'Sam', date: '2026-08-11' },
      { id: 'n3', text: 'Deleted reply', user: 'Ada', date: '2026-08-12', deleted: true },
    ],
  },
];

describe('NotesSection deleted threads', () => {
  it('renders replies under a deleted parent stub', () => {
    render(
      <NotesSection notes={thread} onAddNote={vi.fn()} onReply={vi.fn()} onDelete={vi.fn()} />,
    );

    // Two stubs: the deleted root and the deleted reply each render one
    expect(screen.getAllByText('[Note deleted]')).toHaveLength(2);
    expect(screen.getByText('Surviving reply')).toBeInTheDocument();
  });

  it('readOnly hides add input, reply, and delete controls entirely', () => {
    render(
      <NotesSection
        notes={[{ id: 'n1', text: 'Root note', user: 'Admin', date: '2026-08-10' }]}
        onAddNote={vi.fn()}
        onReply={vi.fn()}
        onDelete={vi.fn()}
        readOnly
      />,
    );

    expect(screen.queryByPlaceholderText(/add a note/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});

describe('countVisibleNotes', () => {
  it('counts non-deleted notes at every depth', () => {
    // Deleted root + 1 visible reply + 1 deleted reply = 1 visible
    expect(countVisibleNotes(thread)).toBe(1);
    expect(countVisibleNotes([])).toBe(0);
    expect(countVisibleNotes(undefined)).toBe(0);
    expect(
      countVisibleNotes([
        { id: 'a', text: 'x', replies: [{ id: 'b', text: 'y' }] },
        { id: 'c', text: 'z' },
      ]),
    ).toBe(3);
  });
});
