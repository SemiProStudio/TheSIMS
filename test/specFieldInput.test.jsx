// =============================================================================
// SpecFieldInput — typed spec value inputs (Phase 1 taxonomy)
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecFieldInput } from '../components/SpecFieldInput.jsx';

const setup = (spec, value = '', onChange = vi.fn()) => {
  render(<SpecFieldInput spec={spec} value={value} onChange={onChange} />);
  return onChange;
};

describe('SpecFieldInput', () => {
  it('renders a plain input for text fields', () => {
    const onChange = setup({ name: 'Sensor Type', type: 'text' }, 'CMOS');
    const input = screen.getByLabelText('Sensor Type');
    expect(input).toHaveValue('CMOS');
    fireEvent.change(input, { target: { value: 'BSI CMOS' } });
    expect(onChange).toHaveBeenCalledWith('BSI CMOS');
  });

  it('renders a Yes/No select for boolean fields', () => {
    setup({ name: 'Weather Sealing', type: 'boolean' }, 'Yes');
    expect(screen.getByLabelText('Weather Sealing')).toHaveTextContent('Yes');
  });

  it('shows the unit suffix and accepts numbers without warning', () => {
    setup({ name: 'Weight', type: 'number', unit: 'oz' }, '24');
    expect(screen.getByText('oz')).toBeInTheDocument();
    expect(screen.queryByText(/Expected a number/)).not.toBeInTheDocument();
  });

  it('soft-warns on legacy non-numeric values in number fields without blocking', () => {
    const onChange = setup({ name: 'Weight', type: 'number', unit: 'oz' }, '1.54 lb / 695 g');
    expect(screen.getByText(/Expected a number in oz/)).toBeInTheDocument();
    // Still editable — never blocks
    fireEvent.change(screen.getByLabelText('Weight (oz)'), { target: { value: '24.5' } });
    expect(onChange).toHaveBeenCalledWith('24.5');
  });

  it('renders enum options as a select', () => {
    setup({ name: 'Lens Mount', type: 'enum', options: ['Sony E', 'Canon RF'] }, 'Sony E');
    expect(screen.getByLabelText('Lens Mount')).toHaveTextContent('Sony E');
  });

  it('falls back to free text when the stored value is not an option', () => {
    const onChange = setup(
      { name: 'Lens Mount', type: 'enum', options: ['Sony E', 'Canon RF'] },
      'Arri LPL',
    );
    // Legacy/custom value renders as an editable text input, not the select
    const input = screen.getByLabelText('Lens Mount');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveValue('Arri LPL');
    fireEvent.change(input, { target: { value: 'Arri PL' } });
    expect(onChange).toHaveBeenCalledWith('Arri PL');
  });

  it('treats missing type as text', () => {
    setup({ name: 'Notes Field' }, 'anything');
    expect(screen.getByLabelText('Notes Field')).toHaveValue('anything');
  });
});
