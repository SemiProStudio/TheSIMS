// =============================================================================
// BatchCheckOutModal — the reservation load-out dialog
// Happy path plus the gates: only available/reserved items are checked out,
// the rest are listed as skipped, the confirm needs borrower + date +
// acknowledgment, and the reservation's client/project ride along.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchCheckOutModal } from '../modals/BatchCheckOutModal.jsx';

const items = [
  { id: 'CA1001', name: 'Camera', status: 'available' },
  { id: 'LI1001', name: 'Light', status: 'reserved' },
  { id: 'LE1001', name: 'Lens', status: 'checked-out' },
  { id: 'AU1001', name: 'Mic', status: 'missing' },
];

const reservation = {
  id: 'R1',
  project: 'Wedding',
  user: 'Sam',
  end: '2026-09-05',
  clientId: 'CL002',
  clientName: 'Smith',
};

function renderModal(props = {}) {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <BatchCheckOutModal
      reservation={reservation}
      items={items}
      currentUser={{ name: 'Admin' }}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );
  return { onConfirm, onClose };
}

const confirmButton = () => screen.getByRole('button', { name: /Check Out \d+ Item/ });

describe('BatchCheckOutModal', () => {
  it('prefills borrower and due date from the reservation and splits the items', () => {
    renderModal();
    expect(screen.getByText(/Wedding: one borrower and due date/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Who is taking the gear')).toHaveValue('Sam');
    // DatePicker renders the ISO value as a readable date
    expect(screen.getByLabelText('Due back date')).toHaveValue('Sep 5, 2026');

    expect(screen.getByText('Camera')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Lens — skipped')).toBeInTheDocument();
    expect(screen.getByText('Mic — skipped')).toBeInTheDocument();
    expect(confirmButton()).toHaveTextContent('Check Out 2 Items');
  });

  it('falls back to the operator as borrower and today as the due date', () => {
    renderModal({ reservation: null });
    expect(screen.getByPlaceholderText('Who is taking the gear')).toHaveValue('Admin');
    expect(screen.getByLabelText('Due back date').value).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });

  it('needs borrower, date and the acknowledgment before it can confirm', async () => {
    const { onConfirm } = renderModal();
    expect(confirmButton()).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirmButton()).toBeEnabled();

    fireEvent.change(screen.getByPlaceholderText('Who is taking the gear'), {
      target: { value: '   ' },
    });
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirms with only the checkout-able items and the reservation context', async () => {
    const { onConfirm } = renderModal();
    fireEvent.change(screen.getByPlaceholderText('Who is taking the gear'), {
      target: { value: '  Jordan  ' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      items: [items[0], items[1]],
      borrowerName: 'Jordan',
      clientId: 'CL002',
      clientName: 'Smith',
      project: 'Wedding',
      dueDate: '2026-09-05',
    });
    // Submitting state while the batch runs; the handler closes the modal
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Checking Out...' })).toBeDisabled(),
    );
  });

  it('explains when nothing can be checked out and keeps confirm disabled', () => {
    renderModal({ items: [items[2], items[3]] });
    expect(
      screen.getByText(/None of this reservation's items can be checked out right now/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Check Out 0 Items' })).toBeDisabled();
  });

  it('Cancel closes without confirming', () => {
    const { onConfirm, onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
