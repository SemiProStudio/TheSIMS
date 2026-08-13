// =============================================================================
// ReservationModal — conflict acknowledgment scope
// Ticking "proceed anyway" covers only the conflicts visible at that moment;
// changing the item list must void the acknowledgment.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getTodayISO } from '../utils';

const { ReservationModal } = await import('../modals/ReservationModal.jsx');

const TODAY = getTodayISO();

const conflictedA = {
  id: 'CAM1',
  name: 'Alpha Cam',
  brand: 'BrandA',
  category: 'Video',
  status: 'available',
  reservations: [{ id: 'r-existing', project: 'Existing Job', start: TODAY, end: TODAY }],
};
const conflictedB = {
  id: 'CAM2',
  name: 'Beta Cam',
  brand: 'BrandB',
  category: 'Video',
  status: 'available',
  reservations: [{ id: 'r-other', project: 'Other Job', start: TODAY, end: TODAY }],
};

describe('ReservationModal conflict acknowledgment', () => {
  it('resets the acknowledgment when another item is added', () => {
    let form = {
      project: 'New Job',
      projectType: 'Other',
      start: TODAY,
      end: TODAY,
      user: 'Pat',
      itemIds: ['CAM1'],
      itemId: 'CAM1',
    };
    const setReservationForm = vi.fn((updater) => {
      form = typeof updater === 'function' ? updater(form) : updater;
    });

    const view = render(
      <ReservationModal
        isEdit={false}
        reservationForm={form}
        setReservationForm={setReservationForm}
        onSave={vi.fn()}
        onClose={vi.fn()}
        clients={[]}
        inventory={[conflictedA, conflictedB]}
      />,
    );

    // CAM1 conflicts with its existing reservation — acknowledge it
    const ack = screen.getByRole('checkbox', { name: /proceed anyway/i });
    fireEvent.click(ack);
    expect(ack).toBeChecked();

    // Add CAM2 via the search — the acknowledgment must reset
    fireEvent.change(screen.getByPlaceholderText('Search items by name, ID, or brand...'), {
      target: { value: 'Beta' },
    });
    fireEvent.click(screen.getByText('Beta Cam'));
    view.rerender(
      <ReservationModal
        isEdit={false}
        reservationForm={form}
        setReservationForm={setReservationForm}
        onSave={vi.fn()}
        onClose={vi.fn()}
        clients={[]}
        inventory={[conflictedA, conflictedB]}
      />,
    );

    expect(screen.getByRole('checkbox', { name: /proceed anyway/i })).not.toBeChecked();
  });
});
