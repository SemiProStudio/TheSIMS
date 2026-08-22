// =============================================================================
// Reservation-status reconciliation (client side, display only)
//
// An item is flipped to 'reserved' when a reservation starts, but nothing
// fires when a reservation ENDS — time passing is not an event — so a stored
// 'reserved' outlives its reservation. Whenever reservations are merged into
// inventory the status is re-derived against today so the UI is right at
// once. Nothing is written back from here: persisting would fire one PATCH
// per stale item from every client on every load. The daily job's
// reconcile_reservation_statuses() RPC keeps the database itself honest.
// =============================================================================
import { getTodayISO, reservationStatusCorrection } from '../utils';

// A 'reserved' item is by definition not checked out; borrower fields left
// behind on it are stale and must not be displayed
const CLEARED_CHECKOUT_FIELDS = {
  checkedOutTo: null,
  checkedOutToUserId: null,
  checkoutClientId: null,
  checkedOutDate: null,
  dueBack: null,
  checkoutProject: null,
};

/**
 * Return `items` with every reserved/available status corrected for
 * `todayISO`. Returns the SAME array when nothing changes so callers can
 * keep referential equality.
 */
export function reconcileReservedStatuses(items, todayISO = getTodayISO()) {
  if (!Array.isArray(items)) return [];
  let changed = false;
  const next = items.map((item) => {
    const desired = reservationStatusCorrection(item, todayISO);
    if (!desired) return item;
    changed = true;
    return desired === 'available'
      ? { ...item, status: desired, ...CLEARED_CHECKOUT_FIELDS }
      : { ...item, status: desired };
  });
  return changed ? next : items;
}
