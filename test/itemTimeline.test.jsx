// =============================================================================
// ItemTimeline — event derivation honesty (item-detail hardening round)
//
// - completed reminders were dated on their DUE date: the code read
//   rem.completedAt, a field the reminder field map never produces
// - cancelled maintenance still showed as "Maintenance Scheduled"
// - detail rows rendered literal "undefined" for absent fields (incl.
//   dueDate, which checkout_history rows never had)
// - a null-text note crashed the whole view (note.text.length)
// - replies never appeared (only root notes were iterated)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ItemTimeline from '../components/ItemTimeline.jsx';
import { MAINTENANCE_STATUS } from '../constants.js';

const baseItem = (overrides = {}) => ({
  id: 'CA1001',
  name: 'Camera',
  ...overrides,
});

describe('ItemTimeline event derivation', () => {
  it('dates completed reminders on completedDate, not dueDate', () => {
    render(
      <ItemTimeline
        item={baseItem({
          reminders: [
            {
              id: 'r1',
              title: 'Sensor cleaning',
              completed: true,
              completedDate: '2026-08-14T10:00:00Z',
              dueDate: '2026-08-01',
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('Reminder Completed')).toBeInTheDocument();
    // Rendered card date comes from completedDate (Aug 14), not the due date
    expect(screen.getByText(/Aug 14, 2026/)).toBeInTheDocument();
  });

  it('omits cancelled maintenance from scheduled events', () => {
    render(
      <ItemTimeline
        item={baseItem({
          maintenanceHistory: [
            {
              id: 'm1',
              type: 'Repair',
              status: MAINTENANCE_STATUS.CANCELLED,
              scheduledDate: '2026-08-10',
            },
            {
              id: 'm2',
              type: 'Cleaning',
              status: MAINTENANCE_STATUS.SCHEDULED,
              scheduledDate: '2026-08-12',
            },
          ],
        })}
      />,
    );

    expect(screen.getAllByText('Maintenance Scheduled')).toHaveLength(1);
    expect(screen.queryByText(/Repair/)).not.toBeInTheDocument();
  });

  it('never renders literal "undefined" in expanded details', () => {
    const { container } = render(
      <ItemTimeline
        item={baseItem({
          checkoutHistory: [
            {
              id: 'c1',
              type: 'checkout',
              checkedOutDate: '2026-08-10T09:00:00Z',
              borrowerName: 'Sam',
              // no project, no notes, no condition — old code printed
              // "Due Date undefined" and friends here
            },
          ],
        })}
      />,
    );

    // With every detail field absent there is nothing to expand — the card
    // must not offer an empty details block
    fireEvent.click(screen.getByText(/Checked out to Sam/));
    expect(container.textContent).not.toContain('undefined');
  });

  it('survives a null-text note and shows replies as their own events', () => {
    render(
      <ItemTimeline
        item={baseItem({
          notes: [
            {
              id: 'n1',
              text: null,
              date: '2026-08-09T12:00:00Z',
              user: 'Admin',
              replies: [
                { id: 'n2', text: 'A reply', date: '2026-08-10T12:00:00Z', user: 'Sam' },
              ],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText('Note Added')).toBeInTheDocument();
    expect(screen.getByText('Reply Added')).toBeInTheDocument();
    expect(screen.getByText('A reply')).toBeInTheDocument();
  });

  it('sorts date-only strings as local midnight alongside timestamps', () => {
    render(
      <ItemTimeline
        item={baseItem({
          reservations: [
            { id: 'res1', start: '2026-08-16', end: '2026-08-18', project: 'Wedding' },
          ],
          checkoutHistory: [
            {
              id: 'c1',
              type: 'checkout',
              checkedOutDate: '2026-08-16T08:00:00',
              borrowerName: 'Sam',
            },
          ],
        })}
      />,
    );

    const cards = screen.getAllByText(/Reserved for|Checked out/);
    // Newest first: the 8am checkout outranks the reservation's local
    // midnight regardless of the machine's timezone (UTC parsing used to
    // flip this ordering east of Greenwich)
    expect(cards[0].textContent).toContain('Checked out');
    // Date-only events render without a fabricated ", 12:00 AM"
    expect(screen.queryByText(/12:00 AM/)).not.toBeInTheDocument();
  });
});
