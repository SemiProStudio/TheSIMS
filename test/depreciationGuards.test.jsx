// =============================================================================
// Depreciation hardening (item-detail round)
//
// - 100% salvage made depreciableAmount 0 → percentDepreciated was 0/0 NaN,
//   rendered as "NaN%" with an invalid NaN-width progress bar
// - a future purchaseDate produced a negative age and a current value ABOVE
//   the purchase price
// - declining-balance credited 0 partial-year depreciation at an EXACT
//   anniversary (a 3.0-year-old asset got only 2 years)
// - items with no currentValue could never adopt the calculated value
//   (NaN > 1 is false), and useful-life had no typed-input clamp
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { calculateDepreciation, DEPRECIATION_METHODS, getTodayISO } from '../utils';
import DepreciationCalculator from '../components/DepreciationCalculator.jsx';

const DAY = 24 * 60 * 60 * 1000;

describe('calculateDepreciation guards', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0% (not NaN) when salvage equals the purchase price', () => {
    const result = calculateDepreciation(
      1000,
      '2023-08-15',
      5,
      1000,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    expect(result.percentDepreciated).toBe(0);
    expect(Number.isNaN(result.percentDepreciated)).toBe(false);
  });

  it('clamps a future purchase date to zero age and zero depreciation', () => {
    const result = calculateDepreciation(
      1000,
      '2027-01-01',
      5,
      100,
      DEPRECIATION_METHODS.STRAIGHT_LINE,
    );
    expect(result.ageInYears).toBe(0);
    expect(result.totalDepreciation).toBe(0);
    expect(result.currentValue).toBe(1000);
  });

  it('credits all completed years at an exact anniversary (declining balance)', () => {
    // calculateDepreciation measures age from UTC midnight of the local
    // calendar date, not from Date.now() — anchor the anniversary there
    const todayUTC = new Date(getTodayISO());
    const purchase = new Date(todayUTC.getTime() - 3 * 365.25 * DAY).toISOString();
    const result = calculateDepreciation(
      1000,
      purchase,
      5,
      100,
      DEPRECIATION_METHODS.DECLINING_BALANCE,
    );
    // Exactly 3 full schedule years — the old ceil/floor arms credited 2
    const threeYears = result.schedule
      .slice(0, 3)
      .reduce((sum, row) => sum + row.depreciation, 0);
    expect(result.totalDepreciation).toBeCloseTo(threeYears, 6);
  });
});

describe('DepreciationCalculator component guards', () => {
  const item = {
    id: 'CAM001',
    category: 'Cameras',
    purchasePrice: 3498,
    purchaseDate: '2023-06-15',
    // currentValue deliberately absent
  };

  it('offers the update button when currentValue is missing', () => {
    render(<DepreciationCalculator item={item} onUpdateValue={vi.fn()} />);
    expect(screen.getByText(/Update Current Value to/)).toBeInTheDocument();
  });

  it('clamps typed useful-life input to the advertised max of 30', () => {
    render(<DepreciationCalculator item={item} onUpdateValue={vi.fn()} />);
    const input = screen.getByLabelText('Useful Life (years)');
    fireEvent.change(input, { target: { value: '9999' } });
    expect(input.value).toBe('30');
  });

  it('renders no titled inner card (single header comes from the section)', () => {
    render(<DepreciationCalculator item={item} />);
    expect(screen.queryByText('Depreciation Calculator')).not.toBeInTheDocument();
  });
});
