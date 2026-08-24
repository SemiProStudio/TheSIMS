// =============================================================================
// ItemDetail section layout (item-detail hardening round)
//
// Desktop: sections alternate into two columns by configured order.
// ≤900px (the .responsive-two-col stacking breakpoint): ONE column in true
// order — stacking the two column divs whole used to scramble a customized
// order to 0,2,4,…,1,3,5 (Reservations, order 1, rendered 7th on a phone).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: () => true,
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const mediaState = { matches: false };

const { default: ItemDetail } = await import('../views/ItemDetail.jsx');

const noop = () => {};
const props = {
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

// Default section order — all 12 sections render (Checkout History shows an
// empty state rather than self-hiding since the polish batch)
const DEFAULT_ORDER = [
  'Specifications',
  'Reservations',
  'Notes',
  'Reminders',
  'Required Accessories',
  'Kit Contents',
  'Packages',
  'Maintenance',
  'Item Timeline',
  'Checkout History',
  'Value & Purchase',
  'Depreciation',
];

const renderedTitles = (container) =>
  [...container.querySelectorAll('.collapsible-toggle')].map((el) =>
    DEFAULT_ORDER.find((t) => el.textContent.includes(t)),
  );

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: mediaState.matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

describe('ItemDetail section columns', () => {
  it('renders one column in true configured order at the mobile breakpoint', () => {
    mediaState.matches = true;
    const { container } = render(<ItemDetail {...props} />);

    expect(renderedTitles(container)).toEqual(DEFAULT_ORDER);
  });

  it('alternates sections into two columns on desktop', () => {
    mediaState.matches = false;
    const { container } = render(<ItemDetail {...props} />);

    // DOM order = left column (even indexes) then right column (odd indexes)
    const evens = DEFAULT_ORDER.filter((_, i) => i % 2 === 0);
    const odds = DEFAULT_ORDER.filter((_, i) => i % 2 === 1);
    expect(renderedTitles(container)).toEqual([...evens, ...odds]);
  });
});

describe('off-catalog specs render (2026-08-24 wiring sweep)', () => {
  it('shows stored spec values outside the category catalog — e.g. Smart Paste Model #', () => {
    const { getByText } = render(
      <ItemDetail
        {...props}
        item={{ ...props.item, specs: { Model: 'ILCE-7SM3', 'Legacy Key': 'kept' } }}
      />,
    );
    // No catalog is defined for Cameras in this harness (specs: {}), so both
    // keys are off-catalog — they used to be stored but displayed nowhere
    expect(getByText('Model')).toBeInTheDocument();
    expect(getByText('ILCE-7SM3')).toBeInTheDocument();
    expect(getByText('Legacy Key')).toBeInTheDocument();
    expect(getByText('kept')).toBeInTheDocument();
  });
});
