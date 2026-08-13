// =============================================================================
// Schedule utils — grouping, active-reservation check, stable colors
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  groupReservationsForSchedule,
  hasActiveReservation,
  stableColorIndex,
} from '../utils';

const itemA = {
  id: 'A',
  reservations: [{ id: 'r1', groupId: 'g1', project: 'Job X', start: '2026-08-10', end: '2026-08-12' }],
};
const itemB = {
  id: 'B',
  reservations: [{ id: 'r2', groupId: 'g1', project: 'Job X', start: '2026-08-10', end: '2026-08-12' }],
};
// Same name+dates, DIFFERENT group — must stay separate
const itemC = {
  id: 'C',
  reservations: [{ id: 'r3', groupId: 'g2', project: 'Job X', start: '2026-08-10', end: '2026-08-12' }],
};
// Legacy rows without groupId, same name+dates — merge by fallback
const itemD = {
  id: 'D',
  reservations: [{ id: 'r4', project: 'Legacy Job', start: '2026-08-10', end: '2026-08-12' }],
};
const itemE = {
  id: 'E',
  reservations: [{ id: 'r5', project: 'Legacy Job', start: '2026-08-10', end: '2026-08-12' }],
};

describe('groupReservationsForSchedule', () => {
  it('groups rows by shared groupId and carries every row id', () => {
    const groups = groupReservationsForSchedule([itemA, itemB]);
    expect(groups).toHaveLength(1);
    expect(groups[0].itemCount).toBe(2);
    expect([...groups[0].reservationIds].sort()).toEqual(['r1', 'r2']);
    expect(groups[0].items.map((i) => i.id).sort()).toEqual(['A', 'B']);
  });

  it('keeps same-named same-dated reservations separate when group ids differ', () => {
    const groups = groupReservationsForSchedule([itemA, itemB, itemC]);
    expect(groups).toHaveLength(2);
    const counts = groups.map((g) => g.itemCount).sort();
    expect(counts).toEqual([1, 2]);
  });

  it('falls back to project+dates matching for legacy rows without groupId', () => {
    const groups = groupReservationsForSchedule([itemD, itemE]);
    expect(groups).toHaveLength(1);
    expect(groups[0].itemCount).toBe(2);
    expect([...groups[0].reservationIds].sort()).toEqual(['r4', 'r5']);
  });

  it('handles empty inventory', () => {
    expect(groupReservationsForSchedule([])).toEqual([]);
    expect(groupReservationsForSchedule(undefined)).toEqual([]);
  });
});

describe('hasActiveReservation', () => {
  it('is true only when a reservation covers the given day', () => {
    const item = {
      reservations: [{ start: '2026-08-10', end: '2026-08-12' }],
    };
    expect(hasActiveReservation(item, '2026-08-10')).toBe(true);
    expect(hasActiveReservation(item, '2026-08-12')).toBe(true);
    expect(hasActiveReservation(item, '2026-08-13')).toBe(false);
    expect(hasActiveReservation(item, '2026-08-09')).toBe(false);
  });

  it('tolerates startDate/endDate aliases and missing data', () => {
    expect(
      hasActiveReservation({ reservations: [{ startDate: '2026-08-10', endDate: '2026-08-12' }] }, '2026-08-11'),
    ).toBe(true);
    expect(hasActiveReservation({ reservations: [] }, '2026-08-11')).toBe(false);
    expect(hasActiveReservation(null, '2026-08-11')).toBe(false);
    expect(hasActiveReservation({ reservations: [{ start: '2026-08-10' }] }, '2026-08-11')).toBe(
      false,
    );
  });
});

describe('stableColorIndex', () => {
  it('is deterministic and within palette bounds', () => {
    const a = stableColorIndex('g:1234-abcd', 8);
    expect(a).toBe(stableColorIndex('g:1234-abcd', 8));
    for (const key of ['x', 'yy', 'g:deadbeef', '', null]) {
      const idx = stableColorIndex(key, 8);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(8);
    }
  });

  it('does not depend on the surrounding list', () => {
    // The old scheme keyed color to the index within the filtered period —
    // the same reservation changed color when the view range changed
    expect(stableColorIndex('g:same-key', 8)).toBe(stableColorIndex('g:same-key', 8));
  });
});
