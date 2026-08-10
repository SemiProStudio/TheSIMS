// =============================================================================
// Phase 3 regression tests — view correctness (H13, H15 + medium items)
//
// - H13: ItemDetail's "Packages" and "Required Accessories" sections render
//   (the hardcoded section-id list omitted them and included a dead 'addToKit')
// - H15: parseLocalDate parses date-only strings as LOCAL midnight (views west
//   of UTC rendered the previous day / flagged items overdue a day early)
// - OptimizedImage retries the full-size fallback exactly once (a broken
//   full-size URL used to re-enter onError in an infinite request loop)
// - ReservationModal item search no longer hides items that are checked out
//   today but free on the requested future dates
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { parseLocalDate, isOverdue, getTodayISO } from '../utils';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { ReservationModal } from '../modals/ReservationModal.jsx';

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: () => true,
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const { default: ItemDetail } = await import('../views/ItemDetail.jsx');

// -----------------------------------------------------------------------------
// H13 — ItemDetail renders every section defined in ITEM_DETAIL_SECTIONS
// -----------------------------------------------------------------------------
describe('ItemDetail sections (H13)', () => {
  const noop = () => {};
  const baseProps = {
    item: {
      id: 'CAM001',
      name: 'Test Camera',
      category: 'Cameras',
      status: 'available',
      condition: 'good',
      reservations: [],
      notes: [],
      reminders: [],
      maintenanceHistory: [],
      checkoutHistory: [],
      requiredAccessories: [],
    },
    inventory: [],
    packages: [],
    specs: {},
    categorySettings: {},
    layoutPrefs: undefined,
    onBack: noop,
    user: { id: 'u1', name: 'Tester' },
  };

  it('renders the previously unreachable Packages and Required Accessories sections', () => {
    render(<ItemDetail {...baseProps} />);
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(screen.getByText('Required Accessories')).toBeInTheDocument();
  });
});

// -----------------------------------------------------------------------------
// H15 — parseLocalDate parses date-only strings as local midnight
// -----------------------------------------------------------------------------
describe('parseLocalDate (H15)', () => {
  it('parses YYYY-MM-DD as local midnight, not UTC', () => {
    const d = parseLocalDate('2026-08-10');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August
    expect(d.getDate()).toBe(10); // NOT the 9th for users west of UTC
    expect(d.getHours()).toBe(0);
  });

  it('passes Date instances through unchanged', () => {
    const d = new Date(2026, 7, 10, 15, 30);
    expect(parseLocalDate(d)).toBe(d);
  });

  it('still parses full datetime strings', () => {
    const d = parseLocalDate('2026-08-10T12:00:00.000Z');
    expect(d.getTime()).toBe(Date.parse('2026-08-10T12:00:00.000Z'));
  });

  it('isOverdue treats today as NOT overdue (string compare, no TZ shift)', () => {
    expect(isOverdue(getTodayISO())).toBe(false);
    expect(isOverdue('2000-01-01')).toBe(true);
    expect(isOverdue('2099-01-01')).toBe(false);
  });
});

// -----------------------------------------------------------------------------
// OptimizedImage — full-size fallback fires once, then settles into error state
// -----------------------------------------------------------------------------
describe('OptimizedImage fallback retry (medium)', () => {
  const fullUrl = 'https://example.supabase.co/storage/v1/object/public/items/photo.jpg';
  const thumbUrl = 'https://example.supabase.co/storage/v1/object/public/items/photo_thumb.jpg';

  it('falls back to full-size once, then shows the error state instead of looping', () => {
    const onError = vi.fn();
    const { container } = render(
      <OptimizedImage src={fullUrl} alt="camera" lazy={false} onError={onError} />,
    );
    const img = container.querySelector('img');
    expect(img.src).toBe(thumbUrl);

    // Thumbnail fails → retries with the full-size URL, no error state yet
    fireEvent.error(img);
    expect(img.src).toBe(fullUrl);
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument();

    // Full-size also fails → gives up (previously re-assigned src forever)
    fireEvent.error(img);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    // A further error event must not re-trigger the fallback
    fireEvent.error(img);
    expect(img.src).toBe(fullUrl);
  });
});

// -----------------------------------------------------------------------------
// ReservationModal — search finds items regardless of current status
// -----------------------------------------------------------------------------
describe('ReservationModal item search (medium)', () => {
  const inventory = [
    {
      id: 'CAM001',
      name: 'Alpha Camera',
      brand: 'Sony',
      category: 'Cameras',
      status: 'checked-out',
      reservations: [],
    },
    {
      id: 'CAM002',
      name: 'Alpha Backup',
      brand: 'Sony',
      category: 'Cameras',
      status: 'available',
      reservations: [],
    },
  ];

  const baseProps = {
    isEdit: false,
    reservationForm: {
      itemIds: [],
      project: '',
      projectType: 'Other',
      start: '',
      end: '',
      user: '',
    },
    setReservationForm: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
    clients: [],
    inventory,
  };

  it('lists checked-out items in search results (reservations are for future dates)', () => {
    render(<ReservationModal {...baseProps} />);
    const search = screen.getByPlaceholderText(/Search items by name/);
    fireEvent.change(search, { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha Camera')).toBeInTheDocument();
    expect(screen.getByText('Alpha Backup')).toBeInTheDocument();
    // Current status is surfaced so the user knows the item is out today
    expect(screen.getByText('checked out')).toBeInTheDocument();
  });
});
