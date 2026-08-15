// =============================================================================
// ItemDetail permission gating (item-detail hardening round)
//
// Every control gates on the SAME key RLS enforces on its write. Two leaks
// survived the permissions round until 2026-08-15:
// - "Add Required Accessory" rendered ungated; a view-only user could open
//   the panel, select items, and click "Add (n)" into a silent no-op
// - the empty image area offered "Click to add image" (the UPLOAD modal) to
//   users whose eventual row write could only fail at RLS
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
  onSelectImage: noop,
  onAddAccessory: noop,
  onRemoveAccessory: noop,
  onCheckout: noop,
  onCheckin: noop,
  onEdit: noop,
  onShowQR: noop,
  user: { id: 'u1', name: 'Tester' },
};

beforeEach(() => {
  permissionState.editKeys = new Set();
});

describe('ItemDetail view-only gating', () => {
  it('hides the accessory add flow, upload affordance, and header write actions', () => {
    render(<ItemDetail {...baseProps} />);

    expect(screen.queryByText('Add Required Accessory')).not.toBeInTheDocument();
    expect(screen.queryByText('Click to add image')).not.toBeInTheDocument();
    expect(screen.getByText('No image')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add item image' })).not.toBeInTheDocument();
    expect(screen.queryByText('Check Out')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.getByText(/view-only access/)).toBeInTheDocument();
  });

  it('shows them all again with gear_list edit', () => {
    permissionState.editKeys = new Set(['gear_list']);
    render(<ItemDetail {...baseProps} />);

    expect(screen.getByText('Add Required Accessory')).toBeInTheDocument();
    expect(screen.getByText('Click to add image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add item image' })).toBeInTheDocument();
    expect(screen.getByText('Check Out')).toBeInTheDocument();
    expect(screen.queryByText(/view-only access/)).not.toBeInTheDocument();
  });

  it('keeps the image preview reachable for view-only users when an image exists', () => {
    render(<ItemDetail {...baseProps} item={{ ...baseProps.item, image: 'https://x/img.jpg' }} />);

    expect(screen.getByRole('button', { name: 'View item image' })).toBeInTheDocument();
  });
});
