// =============================================================================
// Reservation-status reconciliation
// 'reserved' is written when a reservation starts; nothing fires when it
// ends. These pin the derivation that keeps the UI honest in between.
// =============================================================================
import { describe, it, expect } from 'vitest';
import { reservationStatusCorrection } from '../utils';
import { reconcileReservedStatuses } from '../lib/reconcileReservedStatuses.js';

const TODAY = '2026-08-21';
const past = { start: '2026-08-11', end: '2026-08-14' };
const current = { start: '2026-08-20', end: '2026-08-25' };
const future = { start: '2026-09-01', end: '2026-09-03' };

describe('reservationStatusCorrection', () => {
  it('returns available for a stored reserved item whose reservations are all past or future', () => {
    expect(reservationStatusCorrection({ status: 'reserved', reservations: [past] }, TODAY)).toBe(
      'available',
    );
    expect(reservationStatusCorrection({ status: 'reserved', reservations: [future] }, TODAY)).toBe(
      'available',
    );
    expect(reservationStatusCorrection({ status: 'reserved', reservations: [] }, TODAY)).toBe(
      'available',
    );
  });

  it('returns reserved for a stored available item with a reservation covering today', () => {
    expect(
      reservationStatusCorrection({ status: 'available', reservations: [current] }, TODAY),
    ).toBe('reserved');
    // inclusive on both ends
    expect(
      reservationStatusCorrection(
        { status: 'available', reservations: [{ start: TODAY, end: TODAY }] },
        TODAY,
      ),
    ).toBe('reserved');
  });

  it('returns null when the stored status is already right', () => {
    expect(
      reservationStatusCorrection({ status: 'reserved', reservations: [current] }, TODAY),
    ).toBeNull();
    expect(
      reservationStatusCorrection({ status: 'available', reservations: [past] }, TODAY),
    ).toBeNull();
  });

  it('never touches statuses that own their own transitions', () => {
    for (const status of ['checked-out', 'missing', 'needs-attention']) {
      expect(reservationStatusCorrection({ status, reservations: [current] }, TODAY)).toBeNull();
      expect(reservationStatusCorrection({ status, reservations: [] }, TODAY)).toBeNull();
    }
    expect(reservationStatusCorrection(null, TODAY)).toBeNull();
  });

  it('reads startDate/endDate aliases too', () => {
    expect(
      reservationStatusCorrection(
        { status: 'available', reservations: [{ startDate: '2026-08-21', endDate: '2026-08-22' }] },
        TODAY,
      ),
    ).toBe('reserved');
  });
});

describe('reconcileReservedStatuses', () => {
  it('returns the same array when nothing needs correcting', () => {
    const items = [
      { id: 'A', status: 'available', reservations: [past] },
      { id: 'B', status: 'checked-out', reservations: [current] },
    ];
    expect(reconcileReservedStatuses(items, TODAY)).toBe(items);
  });

  it('flips stale reserved items to available and clears leftover borrower fields', () => {
    const items = [
      {
        id: 'AUD-00003',
        status: 'reserved',
        reservations: [past],
        checkedOutTo: 'patrick',
        dueBack: '2026-05-01',
        checkedOutToUserId: 'u1',
      },
    ];
    const [fixed] = reconcileReservedStatuses(items, TODAY);
    expect(fixed.status).toBe('available');
    expect(fixed.checkedOutTo).toBeNull();
    expect(fixed.dueBack).toBeNull();
    expect(fixed.checkedOutToUserId).toBeNull();
    expect(fixed.reservations).toEqual([past]); // reservations untouched
  });

  it('flips available items with a current reservation to reserved without touching other fields', () => {
    const items = [{ id: 'X', status: 'available', reservations: [current], location: 'Shelf' }];
    const [fixed] = reconcileReservedStatuses(items, TODAY);
    expect(fixed).toEqual({ ...items[0], status: 'reserved' });
  });

  it('leaves untouched items referentially identical inside a changed array', () => {
    const keep = { id: 'K', status: 'available', reservations: [] };
    const out = reconcileReservedStatuses(
      [keep, { id: 'S', status: 'reserved', reservations: [] }],
      TODAY,
    );
    expect(out[0]).toBe(keep);
    expect(out[1].status).toBe('available');
  });

  it('handles an empty or missing list', () => {
    expect(reconcileReservedStatuses([], TODAY)).toEqual([]);
    expect(reconcileReservedStatuses(undefined, TODAY)).toEqual([]);
  });
});
