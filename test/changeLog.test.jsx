// =============================================================================
// ChangeLog view — render tests
// The view had no tests at all: empty state, the recent-changes list (latest
// ten, newest first, typed badges, field diffs), search across items and
// packages, and the drill-in to one item's history.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChangeLog from '../views/ChangeLog.jsx';

const entry = (overrides) => ({
  id: `CL${Math.random().toString(36).slice(2, 8)}`,
  type: 'updated',
  itemId: 'CA1001',
  itemType: 'item',
  itemName: 'Sony A7S III',
  description: 'Updated item',
  timestamp: '2026-08-20T10:00:00Z',
  user: 'Tester',
  changes: [],
  ...overrides,
});

const inventory = [
  { id: 'CA1001', name: 'Sony A7S III', brand: 'Sony' },
  { id: 'LE1001', name: 'Sigma 24-70', brand: 'Sigma' },
];
const packages = [{ id: 'pkg-doc', name: 'Documentary Kit' }];

function renderView(props = {}) {
  const onBack = vi.fn();
  const utils = render(
    <ChangeLog
      changeLog={[]}
      inventory={inventory}
      packages={packages}
      onBack={onBack}
      {...props}
    />,
  );
  return { ...utils, onBack };
}

describe('ChangeLog', () => {
  it('renders the header, back action and empty state', () => {
    const { onBack } = renderView();
    expect(screen.getByText('Change Log')).toBeInTheDocument();
    expect(screen.getByText('No changes recorded yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Admin/ }));
    expect(onBack).toHaveBeenCalled();
  });

  it('lists the ten most recent changes newest first with typed badges and field diffs', () => {
    const changeLog = Array.from({ length: 12 }, (_, i) =>
      entry({
        id: `CL${i}`,
        description: `Change ${i}`,
        timestamp: `2026-08-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
        type: i === 11 ? 'checkout' : 'updated',
        changes:
          i === 11 ? [{ field: 'status', oldValue: 'available', newValue: 'checked-out' }] : [],
      }),
    );
    renderView({ changeLog });

    expect(screen.getByText('Recent Changes')).toBeInTheDocument();
    expect(screen.getByText('Change 11')).toBeInTheDocument();
    expect(screen.getByText('Change 2')).toBeInTheDocument();
    // the two oldest fall outside the window
    expect(screen.queryByText('Change 0')).toBeNull();
    expect(screen.queryByText('Change 1')).toBeNull();

    const descriptions = screen
      .getAllByText(/^Change \d+$/)
      .map((el) => Number(el.textContent.replace('Change ', '')));
    expect(descriptions).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

    expect(screen.getByText('Checked Out')).toBeInTheDocument();
    expect(screen.getAllByText('Updated')).toHaveLength(9);
    expect(screen.getByText('available')).toBeInTheDocument();
    expect(screen.getByText('checked-out')).toBeInTheDocument();
  });

  it('falls back to the Updated badge for an unknown change type', () => {
    renderView({ changeLog: [entry({ type: 'something_new' })] });
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('searches items and packages by id, name or brand', () => {
    renderView({ changeLog: [entry(), entry({ itemId: 'pkg-doc', itemType: 'package' })] });
    const search = screen.getByPlaceholderText('Search by ID, name, or brand...');

    fireEvent.change(search, { target: { value: 'sigma' } });
    expect(screen.getByText('Sigma 24-70')).toBeInTheDocument();
    expect(screen.queryByText('Documentary Kit')).toBeNull();

    fireEvent.change(search, { target: { value: 'pkg-' } });
    expect(screen.getByText('Documentary Kit')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz nothing' } });
    expect(screen.getByText(/No items, kits or packages found matching/)).toBeInTheDocument();
  });

  it('drills into one item’s history from an entry and from a search result, then back', () => {
    const changeLog = [
      entry({ description: 'Camera change A' }),
      entry({ description: 'Camera change B', timestamp: '2026-08-21T10:00:00Z' }),
      entry({ itemId: 'LE1001', itemName: 'Sigma 24-70', description: 'Lens change' }),
    ];
    renderView({ changeLog });

    // From a recent-changes entry: the item link opens its history
    fireEvent.click(screen.getAllByRole('button', { name: /CA1001 - Sony A7S III/ })[0]);
    expect(screen.getByText(/CA1001 • 2 changes recorded/)).toBeInTheDocument();
    expect(screen.getByText('Camera change A')).toBeInTheDocument();
    expect(screen.queryByText('Lens change')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Go back: Back to Change Log' }));
    expect(screen.getByText('Recent Changes')).toBeInTheDocument();

    // From a search result
    fireEvent.change(screen.getByPlaceholderText('Search by ID, name, or brand...'), {
      target: { value: 'LE1001' },
    });
    fireEvent.click(screen.getByText('Sigma 24-70'));
    expect(screen.getByText(/LE1001 • 1 change recorded/)).toBeInTheDocument();
    expect(screen.getByText('Lens change')).toBeInTheDocument();
  });

  it('ignores an entry link whose item no longer exists', () => {
    renderView({ changeLog: [entry({ itemId: 'GONE', itemName: 'Deleted thing' })] });
    fireEvent.click(screen.getByRole('button', { name: /GONE - Deleted thing/ }));
    expect(screen.getByText('Recent Changes')).toBeInTheDocument();
    expect(screen.queryByText(/change recorded/)).toBeNull();
  });
});
