// =============================================================================
// MultiSelectDropdown — Test Suite
// Pins the a11y rewrite: the old dropdown nested a <button> inside a
// <button> (invalid HTML) and its options were bare divs — impossible to
// operate from the keyboard. Now: listbox pattern with aria-activedescendant,
// full keyboard support, labeled trigger, sibling clear button.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectDropdown } from '../components/MultiSelectDropdown.jsx';

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

let onChange;

function renderDropdown(props = {}) {
  return render(
    <MultiSelectDropdown
      label="Status"
      options={OPTIONS}
      selectedValues={[]}
      onChange={onChange}
      {...props}
    />,
  );
}

const openDropdown = () => {
  fireEvent.click(screen.getByLabelText('Status'));
  return screen.getByRole('listbox');
};

beforeEach(() => {
  onChange = vi.fn();
});

describe('semantics', () => {
  it('associates the label with the trigger and exposes popup state', () => {
    renderDropdown();
    const trigger = screen.getByLabelText('Status');
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
  });

  it('renders options with roles and selection state', () => {
    renderDropdown({ selectedValues: ['b'] });
    openDropdown();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false');
  });

  it('never nests the clear button inside the trigger (invalid HTML)', () => {
    renderDropdown({ selectedValues: ['a'] });
    expect(document.querySelector('button button')).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear Status' })).toBeInTheDocument();
  });

  it('clear button empties the selection without opening the popup', () => {
    renderDropdown({ selectedValues: ['a', 'b'] });
    fireEvent.click(screen.getByRole('button', { name: 'Clear Status' }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('mouse interaction', () => {
  it('clicking an option toggles it', () => {
    renderDropdown({ selectedValues: ['b'] });
    openDropdown();
    fireEvent.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(onChange).toHaveBeenCalledWith(['b', 'a']);

    fireEvent.click(screen.getByRole('option', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('keyboard interaction', () => {
  it('moves focus into the listbox on open, starting at the first selected option', () => {
    renderDropdown({ selectedValues: ['b'] });
    const listbox = openDropdown();
    expect(document.activeElement).toBe(listbox);
    expect(listbox.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Beta' }).id,
    );
  });

  it('arrows, Home and End move the active option', () => {
    renderDropdown();
    const listbox = openDropdown();
    const idOf = (name) => screen.getByRole('option', { name }).id;

    expect(listbox.getAttribute('aria-activedescendant')).toBe(idOf('Alpha'));
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe(idOf('Beta'));
    fireEvent.keyDown(listbox, { key: 'End' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe(idOf('Gamma'));
    // Clamped at the last option
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe(idOf('Gamma'));
    fireEvent.keyDown(listbox, { key: 'Home' });
    expect(listbox.getAttribute('aria-activedescendant')).toBe(idOf('Alpha'));
  });

  it('Enter and Space toggle the active option and keep the popup open', () => {
    renderDropdown();
    const listbox = openDropdown();
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['b']);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(listbox, { key: ' ' });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('Escape closes the popup and returns focus to the trigger', () => {
    renderDropdown();
    const listbox = openDropdown();
    fireEvent.keyDown(listbox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('Status'));
  });

  it('ArrowDown on the closed trigger opens the popup', () => {
    renderDropdown();
    fireEvent.keyDown(screen.getByLabelText('Status'), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});
