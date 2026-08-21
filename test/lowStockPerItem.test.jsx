// =============================================================================
// Low-stock reminders are a per-item opt-in (2026-08-21)
// - Item Details: the reminder row only exists in quantity-tracked
//   categories; editors get a switch, viewers see the state; the threshold
//   row appears only while the reminder is on
// - Forms: LowStockFields is off by default and reveals the threshold when
//   enabled; the category editor no longer offers a threshold
// - Dashboard: the Low Stock panel lists only opted-in items
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const permissionState = { editKeys: new Set() };
vi.mock('../contexts/PermissionsContext.js', () => ({
  usePermissions: () => ({
    canEdit: (key) => permissionState.editKeys.has(key),
    canView: () => true,
    hasPermission: () => true,
  }),
}));

const { default: ItemDetail } = await import('../views/ItemDetail.jsx');
const { default: LowStockFields } = await import('../components/LowStockFields.jsx');

const noop = () => {};
const item = (overrides = {}) => ({
  id: 'CO1001',
  name: 'Gaff Tape',
  category: 'Consumables',
  status: 'available',
  condition: 'good',
  quantity: 2,
  reorderPoint: 5,
  lowStockAlert: false,
  reservations: [],
  notes: [],
  reminders: [],
  maintenanceHistory: [],
  checkoutHistory: [],
  requiredAccessories: [],
  ...overrides,
});
const baseProps = {
  inventory: [],
  packages: [],
  specs: {},
  categorySettings: { Consumables: { trackQuantity: true }, Cameras: { trackQuantity: false } },
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

describe('ItemDetail low-stock reminder row', () => {
  it('is absent for categories that do not track quantity', () => {
    render(<ItemDetail {...baseProps} item={item({ category: 'Cameras' })} onSetLowStockAlert={noop} />);
    expect(screen.queryByText('Low Stock Reminder')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Low stock reminder' })).not.toBeInTheDocument();
  });

  it('shows Off with no threshold row by default, and no switch for viewers', () => {
    render(<ItemDetail {...baseProps} item={item()} onSetLowStockAlert={noop} />);
    expect(screen.getByText('Low Stock Reminder')).toBeInTheDocument();
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.queryByText('Alert At Or Below')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Low stock reminder' })).not.toBeInTheDocument();
  });

  it('gives editors a switch that reports the new state', () => {
    permissionState.editKeys = new Set(['gear_list']);
    const onSetLowStockAlert = vi.fn();
    render(<ItemDetail {...baseProps} item={item()} onSetLowStockAlert={onSetLowStockAlert} />);
    const sw = screen.getByRole('switch', { name: 'Low stock reminder' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(onSetLowStockAlert).toHaveBeenCalledWith(true);
  });

  it('shows the threshold and "low now" once the reminder is on', () => {
    render(
      <ItemDetail {...baseProps} item={item({ lowStockAlert: true, quantity: 2, reorderPoint: 5 })} />,
    );
    expect(screen.getByText('On — low now')).toBeInTheDocument();
    expect(screen.getByText('Alert At Or Below')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('warns when the reminder is on but no threshold is set', () => {
    render(<ItemDetail {...baseProps} item={item({ lowStockAlert: true, reorderPoint: 0 })} />);
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByText(/Not set/)).toBeInTheDocument();
  });
});

describe('LowStockFields (Add / Edit forms)', () => {
  it('is off by default and hides the threshold until enabled', () => {
    const onChange = vi.fn();
    render(<LowStockFields enabled={false} threshold={0} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: /Low stock reminder/ });
    expect(box).not.toBeChecked();
    expect(screen.queryByLabelText('Alert when quantity is at or below')).not.toBeInTheDocument();
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith({ lowStockAlert: true });
  });

  it('reveals the threshold when enabled and patches reorderPoint', () => {
    const onChange = vi.fn();
    render(<LowStockFields enabled threshold={0} onChange={onChange} />);
    const input = screen.getByLabelText('Alert when quantity is at or below');
    expect(screen.getByText(/Set a threshold above 0/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '4' } });
    expect(onChange).toHaveBeenCalledWith({ reorderPoint: 4 });
  });

  it('never lets the threshold go negative', () => {
    const onChange = vi.fn();
    render(<LowStockFields enabled threshold={3} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Alert when quantity is at or below'), {
      target: { value: '-2' },
    });
    expect(onChange).toHaveBeenCalledWith({ reorderPoint: 0 });
  });
});
