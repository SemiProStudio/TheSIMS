// =============================================================================
// LocationsManager — Test Suite
// Pins the locations hardening: renames are diffed by node id (cascading to
// descendants) so items can follow, and deletion is guarded by the SUBTREE
// item count, not just the node's own.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationsManager, { computeLocationPathRenames } from '../views/LocationsManager.jsx';

const tree = [
  {
    id: 'loc-a',
    name: 'Studio A',
    type: 'building',
    children: [
      { id: 'loc-a-cab', name: 'Camera Cabinet', type: 'cabinet', children: [] },
      { id: 'loc-a-shelf', name: 'Shelf 1', type: 'shelf', children: [] },
    ],
  },
  { id: 'loc-b', name: 'Studio B', type: 'building', children: [] },
];

describe('computeLocationPathRenames', () => {
  it('returns nothing when paths are unchanged', () => {
    expect(computeLocationPathRenames(tree, structuredClone(tree))).toEqual([]);
  });

  it('renaming a parent cascades path entries to every descendant', () => {
    const edited = structuredClone(tree);
    edited[0].name = 'Stage A';

    expect(computeLocationPathRenames(tree, edited)).toEqual([
      { from: 'Studio A', to: 'Stage A' },
      { from: 'Studio A > Camera Cabinet', to: 'Stage A > Camera Cabinet' },
      { from: 'Studio A > Shelf 1', to: 'Stage A > Shelf 1' },
    ]);
  });

  it('renaming a leaf yields a single entry', () => {
    const edited = structuredClone(tree);
    edited[0].children[0].name = 'Lens Cabinet';

    expect(computeLocationPathRenames(tree, edited)).toEqual([
      { from: 'Studio A > Camera Cabinet', to: 'Studio A > Lens Cabinet' },
    ]);
  });

  it('deleted nodes produce no rename entries', () => {
    const edited = structuredClone(tree);
    edited[0].children = [];
    expect(computeLocationPathRenames(tree, edited)).toEqual([]);
  });
});

describe('LocationsManager delete guard', () => {
  function renderManager(inventory) {
    const props = {
      locations: tree,
      inventory,
      onSave: vi.fn(),
      onClose: vi.fn(),
      showConfirm: vi.fn(),
    };
    render(<LocationsManager {...props} />);
    return props;
  }

  it('blocks deleting a PARENT whose children hold items', () => {
    // Item sits in the child (canonical separator); parent has none directly
    renderManager([{ id: 'CA1', location: 'Studio A > Camera Cabinet' }]);

    const blocked = screen.getAllByTitle(/Cannot delete - 1 item\(s\) here or in sub-locations/);
    // Both the parent (Studio A) and the child holding the item are guarded
    expect(blocked.length).toBeGreaterThanOrEqual(1);
    blocked.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('matches legacy " - " location strings too', () => {
    renderManager([{ id: 'CA1', location: 'Studio A - Camera Cabinet' }]);
    expect(
      screen.getAllByTitle(/Cannot delete - 1 item\(s\) here or in sub-locations/).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('asks before discarding unsaved edits', () => {
    const props = renderManager([]);
    // Delete an empty location → dirty
    fireEvent.click(screen.getAllByTitle('Delete location')[0]);
    fireEvent.click(screen.getByText('Back to Admin'));

    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard Changes?' }),
    );
  });

  it('save reports path renames alongside the tree', () => {
    const props = renderManager([]);
    // Rename Studio B via the edit form (children are collapsed, so the
    // visible rows are Studio A [0] and Studio B [1])
    fireEvent.click(screen.getAllByTitle('Edit location')[1]);
    fireEvent.change(screen.getByPlaceholderText('e.g., Studio A, Main Floor, Shelf 1'), {
      target: { value: 'Stage B' },
    });
    // Two "Save Changes" buttons while the form is open: [0] page header,
    // [1] the edit form. Submit the form, then save the page.
    fireEvent.click(screen.getAllByRole('button', { name: 'Save Changes' })[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    const [savedTree, renames] = props.onSave.mock.calls[0];
    expect(savedTree.find((l) => l.id === 'loc-b').name).toBe('Stage B');
    expect(renames).toEqual([{ from: 'Studio B', to: 'Stage B' }]);
  });
});
