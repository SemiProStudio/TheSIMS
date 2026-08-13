// =============================================================================
// CheckOutModal — reservation awareness
// Checkout used to be completely blind to reservations: gear reserved for a
// job could be checked out with no warning. The modal now surfaces any
// confirmed reservation overlapping [today, dueDate].
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { getTodayISO } from '../utils';

const { CheckOutModal } = await import('../modals/CheckOutModal.jsx');

const TODAY = getTodayISO();

function isoPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function renderModal(item) {
  return render(
    <CheckOutModal
      item={item}
      users={[]}
      clients={[]}
      currentUser={{ name: 'Tester', email: 't@example.com' }}
      onCheckOut={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('CheckOutModal reservation warning', () => {
  it('warns when a reservation covers today', () => {
    renderModal({
      id: 'CAM1',
      name: 'Alpha Cam',
      condition: 'excellent',
      reservations: [{ id: 'r1', project: 'Big Wedding', start: TODAY, end: isoPlus(2) }],
    });

    expect(screen.getByText(/reserved during the checkout period/)).toBeInTheDocument();
    expect(screen.getByText(/Big Wedding/)).toBeInTheDocument();
  });

  it('stays quiet without overlapping reservations, then warns when the due date reaches one', () => {
    renderModal({
      id: 'CAM1',
      name: 'Alpha Cam',
      condition: 'excellent',
      reservations: [{ id: 'r1', project: 'Future Job', start: isoPlus(4), end: isoPlus(6) }],
    });

    // Reservation starts in 4 days; no due date yet -> window is just today
    expect(screen.queryByText(/reserved during the checkout period/)).not.toBeInTheDocument();

    // Quick-pick "1 week" pushes the window across the reservation
    fireEvent.click(screen.getByRole('button', { name: '1 week' }));
    expect(screen.getByText(/reserved during the checkout period/)).toBeInTheDocument();
    expect(screen.getByText(/Future Job/)).toBeInTheDocument();
  });

  it('shows nothing for items without reservations', () => {
    renderModal({ id: 'CAM1', name: 'Alpha Cam', condition: 'excellent', reservations: [] });
    expect(screen.queryByText(/reserved during the checkout period/)).not.toBeInTheDocument();
  });
});
