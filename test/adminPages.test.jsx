// =============================================================================
// Admin Pages (Categories / Specs) — Test Suite
// Pins the admin hardening round:
// - category rows have stable identity: renaming keeps focus (the old
//   name-as-key remounted the input every keystroke) and renaming onto an
//   existing category can never clobber its specs
// - save emits a renames map and remaps specs/settings to final names
// - deletion is guarded by item count; duplicates and empty names block save
// - leaving with unsaved changes asks for confirmation
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesPage, SpecsPage } from '../views/AdminPages.jsx';

const categories = ['Cameras', 'Lighting'];
const specs = {
  Cameras: [{ name: 'Sensor', required: true }],
  Lighting: [{ name: 'Wattage', required: false }],
};
const categorySettings = {
  Cameras: { trackQuantity: false, trackSerialNumbers: true, lowStockThreshold: 0 },
  Lighting: { trackQuantity: true, trackSerialNumbers: false, lowStockThreshold: 2 },
};

function renderCategories(overrides = {}) {
  const props = {
    categories,
    inventory: [],
    specs,
    categorySettings,
    onSave: vi.fn(),
    onBack: vi.fn(),
    showConfirm: vi.fn(),
    ...overrides,
  };
  render(<CategoriesPage {...props} />);
  return props;
}

describe('CategoriesPage — rename stability', () => {
  it('keeps focus in the rename input across keystrokes', () => {
    renderCategories();
    const input = screen.getByDisplayValue('Cameras');
    input.focus();
    fireEvent.change(input, { target: { value: 'CamerasX' } });
    fireEvent.change(screen.getByDisplayValue('CamerasX'), { target: { value: 'CamerasXY' } });

    const after = screen.getByDisplayValue('CamerasXY');
    // Same DOM node still mounted and focused — the old name-as-key
    // implementation remounted the row on every keystroke
    expect(after).toBe(input);
    expect(document.activeElement).toBe(after);
  });

  it('renaming onto an existing category blocks save without touching its specs', () => {
    const props = renderCategories();
    const input = screen.getByDisplayValue('Cameras');
    fireEvent.change(input, { target: { value: 'Lighting' } });

    expect(screen.getByRole('button', { name: 'Fix Duplicates' })).toBeDisabled();

    // Resolve the collision with a different name and save: Lighting keeps
    // ITS OWN specs (the old implementation had already overwritten them)
    fireEvent.change(screen.getAllByDisplayValue('Lighting')[0], {
      target: { value: 'Cams' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    const [newCategories, newSpecs, , renames] = props.onSave.mock.calls[0];
    expect(newCategories).toEqual(['Cams', 'Lighting']);
    expect(newSpecs.Lighting).toEqual([{ name: 'Wattage', required: false }]);
    expect(newSpecs.Cams).toEqual([{ name: 'Sensor', required: true }]);
    expect(renames).toEqual({ Cameras: 'Cams' });
  });

  it('save remaps settings to the renamed category', () => {
    const props = renderCategories();
    fireEvent.change(screen.getByDisplayValue('Lighting'), { target: { value: 'Lights' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    const [, , newSettings, renames] = props.onSave.mock.calls[0];
    expect(newSettings.Lights).toEqual(categorySettings.Lighting);
    expect(renames).toEqual({ Lighting: 'Lights' });
  });
});

describe('CategoriesPage — deletion and guards', () => {
  it('blocks deleting a category that has items', () => {
    renderCategories({
      inventory: [{ id: 'CA1', category: 'Cameras' }],
    });
    const deleteButtons = screen.getAllByTitle(/Cannot delete - has 1 item/);
    expect(deleteButtons).toHaveLength(1);
    expect(deleteButtons[0]).toBeDisabled();
  });

  it('counts items by the ORIGINAL name while a rename is unsaved', () => {
    renderCategories({
      inventory: [{ id: 'CA1', category: 'Cameras' }],
    });
    // Rename doesn't zero the guard — items still reference "Cameras"
    fireEvent.change(screen.getByDisplayValue('Cameras'), { target: { value: 'Cams' } });
    expect(screen.getByTitle(/Cannot delete - has 1 item/)).toBeDisabled();
  });

  it('deleting an empty category removes it from the save payload', () => {
    const props = renderCategories();
    fireEvent.click(screen.getAllByTitle('Delete category')[1]); // Lighting
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(props.onSave.mock.calls[0][0]).toEqual(['Cameras']);
  });
});

describe('CategoriesPage — unsaved changes guard', () => {
  it('backs out directly when nothing changed', () => {
    const props = renderCategories();
    fireEvent.click(screen.getByText('Back to Admin'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
    expect(props.showConfirm).not.toHaveBeenCalled();
  });

  it('asks before discarding unsaved edits', () => {
    const props = renderCategories();
    fireEvent.change(screen.getByDisplayValue('Cameras'), { target: { value: 'Cams' } });
    fireEvent.click(screen.getByText('Back to Admin'));

    expect(props.onBack).not.toHaveBeenCalled();
    expect(props.showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard Changes?', onConfirm: props.onBack }),
    );
  });
});

describe('SpecsPage', () => {
  function renderSpecs(overrides = {}) {
    const props = {
      specs,
      onSave: vi.fn(),
      onBack: vi.fn(),
      showConfirm: vi.fn(),
      ...overrides,
    };
    render(<SpecsPage {...props} />);
    return props;
  }

  it('tracks field renames for item propagation', () => {
    const props = renderSpecs();
    fireEvent.change(screen.getByDisplayValue('Sensor'), { target: { value: 'Sensor Type' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    const [newSpecs, fieldRenames] = props.onSave.mock.calls[0];
    expect(newSpecs.Cameras[0].name).toBe('Sensor Type');
    expect(fieldRenames).toEqual({ Cameras: { Sensor: 'Sensor Type' } });
  });

  it('rejects duplicate field names within a category', () => {
    renderSpecs();
    fireEvent.click(screen.getByRole('button', { name: /New Specification Field/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter field name...'), {
      target: { value: 'Sensor' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('"Sensor" already exists in this category')).toBeInTheDocument();
  });

  it('asks before discarding unsaved edits', () => {
    const props = renderSpecs();
    fireEvent.change(screen.getByDisplayValue('Sensor'), { target: { value: 'Sensor 2' } });
    fireEvent.click(screen.getByText('Back to Admin'));

    expect(props.onBack).not.toHaveBeenCalled();
    expect(props.showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Discard Changes?' }),
    );
  });
});
