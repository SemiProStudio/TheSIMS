// =============================================================================
// ItemDetail twin picker sections (audit §5.5 extraction)
//
// RequiredAccessoriesSection and KitContentsSection render through ONE shared
// ItemPickerSection now. These tests pin both sections' rendered content and
// wiring against their pre-extraction output: member rows (name, "ID •
// Category", status badge, view/remove controls with per-section labels),
// each section's own footer, the add-panel flow (search, eligibility, Add
// (n)), and the per-section gating passthrough.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

const permissionState = { editKeys: new Set() };

vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: (key) => permissionState.editKeys.has(key),
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const { default: ItemDetail } = await import('../views/ItemDetail.jsx');

const noop = () => {};

// A kit that also requires an accessory — both picker sections busy at once
const bag = {
  id: 'BAG001',
  name: 'Camera Bag',
  category: 'Bags',
  status: 'available',
  condition: 'good',
  isKit: true,
  kitItems: ['CHG001'],
  requiredAccessories: ['BAT001'],
  reservations: [],
  notes: [],
  reminders: [],
  maintenanceHistory: [],
  checkoutHistory: [],
};

const inventory = [
  bag,
  { id: 'BAT001', name: 'Battery', category: 'Power', status: 'available' },
  { id: 'CHG001', name: 'Charger', category: 'Power', status: 'checked-out' },
  { id: 'TRI001', name: 'Tripod', category: 'Support', status: 'available' },
  // Kits never appear in either picker
  { id: 'BAG002', name: 'Other Bag', category: 'Bags', status: 'available', isKit: true },
];

function renderDetail(overrides = {}) {
  const props = {
    item: bag,
    inventory,
    packages: [],
    specs: {},
    categorySettings: {},
    layoutPrefs: undefined,
    onBack: noop,
    onViewItem: vi.fn(),
    onAddAccessory: vi.fn(),
    onRemoveAccessory: vi.fn(),
    onSetKitStatus: vi.fn(),
    onAddKitItems: vi.fn(),
    onRemoveKitItem: vi.fn(),
    user: { id: 'u1', name: 'Tester' },
    ...overrides,
  };
  render(<ItemDetail {...props} />);
  return props;
}

// The option rows in an open add panel are <label> wrappers
const optionCheckbox = (name) => {
  const label = screen
    .getAllByText(name)
    .map((el) => el.closest('label'))
    .find(Boolean);
  return within(label).getByRole('checkbox');
};

beforeEach(() => {
  permissionState.editKeys = new Set(['gear_list']);
});

describe('member rows (both sections)', () => {
  it('renders the same fields as before: name, "ID • Category", status, controls', () => {
    renderDetail();

    // Accessory row
    expect(screen.getByText('Battery')).toBeInTheDocument();
    expect(screen.getByText('BAT001 • Power')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Battery' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove Battery from required accessories' }),
    ).toBeInTheDocument();

    // Kit member row — same shape, kit-specific remove label
    expect(screen.getByText('Charger')).toBeInTheDocument();
    expect(screen.getByText('CHG001 • Power')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Charger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Charger from kit' })).toBeInTheDocument();

    // Status badges use the shared labels
    expect(screen.getAllByText('Checked Out').length).toBeGreaterThan(0);

    // Each section keeps its own footer
    expect(screen.getByRole('button', { name: 'Add Required Accessory' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Items to Kit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No Longer a Kit' })).toBeInTheDocument();
  });

  it("routes view and remove clicks through each section's own handlers", () => {
    const props = renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'View Battery' }));
    expect(props.onViewItem).toHaveBeenCalledWith('BAT001');
    fireEvent.click(screen.getByRole('button', { name: 'View Charger' }));
    expect(props.onViewItem).toHaveBeenCalledWith('CHG001');

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Battery from required accessories' }),
    );
    expect(props.onRemoveAccessory).toHaveBeenCalledWith('BAG001', 'BAT001');
    expect(props.onRemoveKitItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Charger from kit' }));
    expect(props.onRemoveKitItem).toHaveBeenCalledWith('BAG001', 'CHG001');

    fireEvent.click(screen.getByRole('button', { name: 'No Longer a Kit' }));
    expect(props.onSetKitStatus).toHaveBeenCalledWith('BAG001', false);
  });

  it("keeps each section's empty copy and the non-kit state", () => {
    renderDetail({ item: { ...bag, isKit: false, kitItems: [], requiredAccessories: [] } });
    expect(screen.getByText('No required accessories defined')).toBeInTheDocument();
    expect(screen.getByText(/This item is not a kit/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert to Kit' })).toBeInTheDocument();
  });

  it('shows the kit empty state for a kit with no members', () => {
    renderDetail({ item: { ...bag, kitItems: [] } });
    expect(screen.getByText('This kit is empty')).toBeInTheDocument();
  });
});

describe('add panel (accessories)', () => {
  it('excludes self, current members, and kits; search narrows; Add (n) submits', () => {
    const props = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Add Required Accessory' }));

    // Eligible: Charger, Tripod. Battery (already required), BAG001 (self)
    // and Other Bag (a kit) never appear.
    expect(screen.getByText('Tripod')).toBeInTheDocument();
    expect(screen.getAllByText('Charger')).toHaveLength(2); // kit row + option
    expect(screen.getAllByText('Battery')).toHaveLength(1); // member row only
    expect(screen.queryByText('Other Bag')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add (0)' })).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Search items...'), {
      target: { value: 'tri' },
    });
    expect(screen.getAllByText('Charger')).toHaveLength(1); // filtered out of the panel

    fireEvent.click(optionCheckbox('Tripod'));
    const addButton = screen.getByRole('button', { name: 'Add (1)' });
    expect(addButton).not.toBeDisabled();
    fireEvent.click(addButton);

    expect(props.onAddAccessory).toHaveBeenCalledWith('BAG001', ['TRI001']);
    // Panel closes and resets after a successful add
    expect(screen.queryByPlaceholderText('Search items...')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Required Accessory' })).toBeInTheDocument();
  });

  it('Cancel closes the panel and clears search and selection', () => {
    const props = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Add Required Accessory' }));
    fireEvent.change(screen.getByPlaceholderText('Search items...'), {
      target: { value: 'tri' },
    });
    fireEvent.click(optionCheckbox('Tripod'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(props.onAddAccessory).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Search items...')).not.toBeInTheDocument();

    // Reopen: selection and query are gone
    fireEvent.click(screen.getByRole('button', { name: 'Add Required Accessory' }));
    expect(screen.getByPlaceholderText('Search items...')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Add (0)' })).toBeDisabled();
  });
});

describe('add panel (kit contents)', () => {
  it('same machinery, kit membership and handler', () => {
    const props = renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Add Items to Kit' }));

    // Eligible here: Battery (required accessory but not a kit member) and
    // Tripod; Charger (member), self, and the other kit are excluded.
    expect(screen.getAllByText('Battery')).toHaveLength(2); // accessory row + option
    expect(screen.getAllByText('Charger')).toHaveLength(1); // member row only
    expect(screen.queryByText('Other Bag')).not.toBeInTheDocument();

    fireEvent.click(optionCheckbox('Battery'));
    fireEvent.click(screen.getByRole('button', { name: 'Add (1)' }));

    expect(props.onAddKitItems).toHaveBeenCalledWith('BAG001', ['BAT001']);
    expect(props.onAddAccessory).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Add Items to Kit' })).toBeInTheDocument();
  });
});

describe('gating passthrough', () => {
  it('view-only: rows stay readable, all write controls are gone', () => {
    permissionState.editKeys = new Set();
    renderDetail();

    expect(screen.getByText('BAT001 • Power')).toBeInTheDocument();
    expect(screen.getByText('CHG001 • Power')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Required Accessory' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Items to Kit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'No Longer a Kit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument();
  });
});
