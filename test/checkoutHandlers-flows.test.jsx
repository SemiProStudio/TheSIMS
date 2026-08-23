// =============================================================================
// useCheckoutHandlers — the write paths not covered by checkoutHandlers.test
// (failure contracts + return-email recipient) and phase2-handlers-integrity
// (updateMaintenanceStatus persistence):
//
// - batch check-out / check-in: per-item persistence, partial failure, the
//   reserved-today status, selection refresh
// - single check-out: selection refresh, confirmation email, email failure
//   reporting, borrower user-id resolution
// - single check-in: status derivation (damage > reservation > available),
//   damage report to admins, damage → maintenance handoff
// - saveMaintenance: optimistic add/edit, temp-id swap, rollback on failure
// - updateMaintenanceStatus: needs-attention → available when the last open
//   record completes, and the branches where it must not
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));
vi.mock('../lib/logger.js', () => ({ error: vi.fn(), warn: vi.fn(), log: vi.fn() }));

const { useCheckoutHandlers } = await import('../hooks/handlers/useCheckoutHandlers.js');
const { STATUS, MODALS } = await import('../constants.js');
const { getTodayISO } = await import('../utils/index.js');

const TODAY = getTodayISO();
// updateMaintenanceStatus stamps completed_date from toISOString() (UTC day),
// which differs from the local TODAY after ~19:00 in the Americas
const TODAY_UTC = new Date().toISOString().slice(0, 10);

const available = { id: 'IT1', name: 'Camera', status: STATUS.AVAILABLE, condition: 'good' };
const checkedOut = {
  id: 'IT2',
  name: 'Lens',
  status: STATUS.CHECKED_OUT,
  condition: 'good',
  checkedOutTo: 'Jordan',
  checkoutClientId: null,
  reservations: [],
};
const checkedOutReservedToday = {
  id: 'IT3',
  name: 'Light',
  status: STATUS.CHECKED_OUT,
  condition: 'fair',
  checkedOutTo: 'Jordan',
  reservations: [{ id: 'R1', startDate: TODAY, endDate: TODAY }],
};

function makeDataContext(overrides = {}) {
  return {
    checkInItem: vi.fn().mockResolvedValue({}),
    checkOutItem: vi.fn().mockResolvedValue({}),
    getClientById: vi.fn().mockResolvedValue(null),
    sendCheckinEmail: vi.fn().mockResolvedValue({ success: true }),
    sendCheckoutEmail: vi.fn().mockResolvedValue({ success: true }),
    sendDamageReportEmail: vi.fn().mockResolvedValue({ success: true }),
    patchInventoryItem: vi.fn(),
    addMaintenance: vi.fn().mockResolvedValue({ id: 'db-m1' }),
    updateMaintenance: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
    users: [],
    ...overrides,
  };
}

function setup({
  inventory = [available, checkedOut, checkedOutReservedToday],
  selectedItem = null,
  dataContext = makeDataContext(),
  currentUser = { id: 'u1', name: 'Admin', profile: { businessName: 'Semi Pro' } },
} = {}) {
  const deps = {
    inventory,
    selectedItem,
    setSelectedItem: vi.fn(),
    dataContext,
    currentUser,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    addAuditLog: vi.fn(),
    addChangeLog: vi.fn(),
  };
  const hook = renderHook(() => useCheckoutHandlers(deps));
  return { hook, deps, dataContext };
}

const lastUpdate = (setter, prev) => {
  const u = setter.mock.calls.at(-1)[0];
  return typeof u === 'function' ? u(prev) : u;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// Batch check-out
// =============================================================================

describe('processBatchCheckout', () => {
  it('persists each item, logs per item, toasts once and closes', async () => {
    const { hook, deps, dataContext } = setup();
    let outcome;
    await act(async () => {
      outcome = await hook.result.current.processBatchCheckout({
        items: [available, { id: 'IT9' }],
        borrowerName: 'Jordan',
        project: 'Shoot',
        dueDate: '2026-09-01',
      });
    });

    expect(outcome).toEqual({ done: 2, failed: [] });
    expect(dataContext.checkOutItem).toHaveBeenCalledTimes(2);
    expect(dataContext.checkOutItem).toHaveBeenCalledWith('IT1', {
      userId: null,
      userName: 'Jordan',
      clientId: null,
      clientName: null,
      project: 'Shoot',
      dueBack: '2026-09-01',
    });
    expect(deps.addAuditLog).toHaveBeenCalledTimes(2);
    expect(deps.addAuditLog.mock.calls[1][0].description).toBe('IT9 checked out to Jordan');
    expect(deps.addChangeLog.mock.calls[0][0]).toMatchObject({
      type: 'checkout',
      itemId: 'IT1',
      description: 'Checked out to Jordan for Shoot',
    });
    expect(mockAddToast).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith('2 items checked out to Jordan', 'success');
    expect(deps.closeModal).toHaveBeenCalled();
  });

  it('continues past a failed item and reports both outcomes', async () => {
    const dataContext = makeDataContext({
      checkOutItem: vi
        .fn()
        .mockRejectedValueOnce(new Error('already out'))
        .mockResolvedValueOnce({}),
    });
    const { hook, deps } = setup({ dataContext });
    let outcome;
    await act(async () => {
      outcome = await hook.result.current.processBatchCheckout({
        items: [available, checkedOut],
        borrowerName: 'Jordan',
        dueDate: '2026-09-01',
      });
    });
    expect(outcome).toEqual({ done: 1, failed: ['Camera'] });
    expect(deps.addAuditLog).toHaveBeenCalledTimes(1);
    expect(deps.addChangeLog.mock.calls[0][0].description).toBe(
      'Checked out to Jordan for unspecified project',
    );
    expect(mockAddToast).toHaveBeenCalledWith('1 item checked out to Jordan', 'success');
    expect(mockAddToast).toHaveBeenCalledWith('Failed to check out: Camera', 'error');
  });

  it('toasts only the failure when nothing succeeded', async () => {
    const dataContext = makeDataContext({
      checkOutItem: vi.fn().mockRejectedValue(new Error('x')),
    });
    const { hook } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processBatchCheckout({
        items: [{ id: 'IT9' }],
        borrowerName: 'Jordan',
        dueDate: '2026-09-01',
      });
    });
    expect(mockAddToast).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith('Failed to check out: IT9', 'error');
  });

  it('refreshes the selected item and resolves the borrower as a SIMS user by name', async () => {
    const dataContext = makeDataContext({ users: [{ id: 'u7', name: 'Jordan', email: 'j@x' }] });
    const { hook, deps } = setup({ dataContext, selectedItem: available });
    await act(async () => {
      await hook.result.current.processBatchCheckout({
        items: [available],
        borrowerName: 'Jordan',
        clientName: null,
        dueDate: '2026-09-01',
      });
    });
    expect(dataContext.checkOutItem.mock.calls[0][1].userId).toBe('u7');
    expect(lastUpdate(deps.setSelectedItem, available)).toMatchObject({
      status: STATUS.CHECKED_OUT,
      checkedOutTo: 'Jordan',
      dueBack: '2026-09-01',
      checkoutClientId: null,
    });
  });

  it('never attributes a client checkout to a user id', async () => {
    const dataContext = makeDataContext({ users: [{ id: 'u7', name: 'Jordan' }] });
    const { hook } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processBatchCheckout({
        items: [available],
        borrowerName: 'Jordan',
        clientId: 'CL1',
        clientName: 'Acme',
        dueDate: '2026-09-01',
      });
    });
    expect(dataContext.checkOutItem.mock.calls[0][1]).toMatchObject({
      userId: null,
      clientId: 'CL1',
      clientName: 'Acme',
    });
  });
});

// =============================================================================
// Single check-out
// =============================================================================

describe('processCheckout', () => {
  const checkoutData = {
    itemId: 'IT1',
    borrowerName: 'Jordan',
    borrowerEmail: 'jordan@example.com',
    clientId: null,
    clientName: null,
    project: 'Shoot',
    projectType: 'Commercial',
    dueDate: '2026-09-01',
    checkedOutDate: TODAY,
  };

  it('refreshes the selection, logs, emails the borrower and clears modal state', async () => {
    const { hook, deps, dataContext } = setup({ selectedItem: available });
    act(() => hook.result.current.openCheckoutModal('IT1'));
    expect(deps.openModal).toHaveBeenCalledWith(MODALS.CHECK_OUT);
    expect(hook.result.current.checkoutItem).toEqual(available);

    await act(async () => {
      await hook.result.current.processCheckout(checkoutData);
    });

    expect(lastUpdate(deps.setSelectedItem, { ...available, checkoutCount: 2 })).toMatchObject({
      status: STATUS.CHECKED_OUT,
      checkedOutTo: 'Jordan',
      checkedOutToUserId: 'u1',
      checkoutProject: 'Shoot',
      checkoutProjectType: 'Commercial',
      checkoutCount: 3,
    });
    expect(deps.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Camera checked out to Jordan', user: 'Admin' }),
    );
    expect(dataContext.sendCheckoutEmail).toHaveBeenCalledWith({
      borrowerEmail: 'jordan@example.com',
      borrowerName: 'Jordan',
      item: available,
      checkoutDate: TODAY,
      dueDate: '2026-09-01',
      project: 'Shoot',
      companyName: 'Semi Pro',
    });
    expect(mockAddToast).toHaveBeenCalledWith('Camera checked out to Jordan', 'success');
    expect(deps.closeModal).toHaveBeenCalled();
    expect(hook.result.current.checkoutItem).toBeNull();
  });

  it('warns the operator when the confirmation email fails, without failing the checkout', async () => {
    const dataContext = makeDataContext({
      sendCheckoutEmail: vi.fn().mockResolvedValue({ success: false, error: 'no provider' }),
    });
    const { hook, deps } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processCheckout(checkoutData);
    });
    expect(deps.closeModal).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      'Checkout confirmation email could not be sent: no provider',
      'warning',
    );
  });

  it('stays quiet for a skipped email and survives a rejected send', async () => {
    const dataContext = makeDataContext({
      sendCheckoutEmail: vi.fn().mockRejectedValue(new Error('boom')),
    });
    const { hook } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processCheckout(checkoutData);
    });
    expect(mockAddToast).toHaveBeenCalledTimes(1); // only the success toast
    expect(mockAddToast).toHaveBeenCalledWith('Item checked out to Jordan', 'success');
  });

  it('sends no email without an address and describes an unknown item by id', async () => {
    const { hook, deps, dataContext } = setup();
    await act(async () => {
      await hook.result.current.processCheckout({
        ...checkoutData,
        itemId: 'IT9',
        borrowerEmail: '',
        project: '',
      });
    });
    expect(dataContext.sendCheckoutEmail).not.toHaveBeenCalled();
    expect(deps.addChangeLog.mock.calls[0][0]).toMatchObject({
      itemName: 'IT9',
      description: 'Checked out to Jordan for unspecified project',
    });
    expect(deps.setSelectedItem).not.toHaveBeenCalled();
  });

  it('openCheckoutModal ignores unknown ids', () => {
    const { hook, deps } = setup();
    act(() => hook.result.current.openCheckoutModal('NOPE'));
    expect(deps.openModal).not.toHaveBeenCalled();
    expect(hook.result.current.checkoutItem).toBeNull();
  });
});

// =============================================================================
// Single check-in
// =============================================================================

describe('processCheckin', () => {
  const base = {
    itemId: 'IT2',
    returnedBy: 'Jordan',
    condition: 'good',
    conditionChanged: false,
    conditionAtCheckout: 'good',
    conditionNotes: '',
    returnNotes: '',
    damageReported: false,
    damageDescription: '',
    returnDate: TODAY,
  };

  it('returns to AVAILABLE, refreshes the selection and clears borrower fields', async () => {
    const { hook, deps, dataContext } = setup({ selectedItem: checkedOut });
    await act(async () => {
      await hook.result.current.processCheckin(base);
    });
    expect(dataContext.checkInItem).toHaveBeenCalledWith('IT2', {
      returnedBy: 'Jordan',
      userId: 'u1',
      condition: 'good',
      conditionNotes: '',
      returnNotes: '',
      damageReported: false,
      damageDescription: '',
      returnStatus: undefined,
    });
    expect(lastUpdate(deps.setSelectedItem, checkedOut)).toMatchObject({
      status: STATUS.AVAILABLE,
      checkedOutTo: null,
      dueBack: null,
      checkoutClientId: null,
    });
    expect(deps.addChangeLog.mock.calls[0][0].changes).toEqual([
      { field: 'status', oldValue: STATUS.CHECKED_OUT, newValue: STATUS.AVAILABLE },
      { field: 'returnedBy', newValue: 'Jordan' },
    ]);
    expect(deps.openModal).not.toHaveBeenCalled();
  });

  it('returns to RESERVED when a confirmed reservation covers today', async () => {
    const { hook, deps, dataContext } = setup();
    await act(async () => {
      await hook.result.current.processCheckin({ ...base, itemId: 'IT3' });
    });
    expect(dataContext.checkInItem.mock.calls[0][1].returnStatus).toBe(STATUS.RESERVED);
    expect(deps.addChangeLog.mock.calls[0][0].changes[0].newValue).toBe(STATUS.RESERVED);
  });

  it('records a condition change in the change log', async () => {
    const { hook, deps } = setup();
    await act(async () => {
      await hook.result.current.processCheckin({
        ...base,
        condition: 'fair',
        conditionChanged: true,
        conditionAtCheckout: 'good',
      });
    });
    const entry = deps.addChangeLog.mock.calls[0][0];
    expect(entry.description).toBe('Returned by Jordan (condition: good → fair)');
    expect(entry.changes).toContainEqual({
      field: 'condition',
      oldValue: 'good',
      newValue: 'fair',
    });
  });

  it('damage wins over a reservation, alerts admins and hands off to a repair record', async () => {
    const dataContext = makeDataContext({
      users: [
        { id: 'a1', name: 'Boss', roleId: 'role_admin', email: 'boss@x' },
        { id: 'a2', name: 'NoMail', roleId: 'role_admin' },
        { id: 'u2', name: 'Staff', roleId: 'role_user', email: 's@x' },
      ],
    });
    const { hook, deps } = setup({ dataContext });
    act(() => hook.result.current.openCheckinModal('IT3'));

    await act(async () => {
      await hook.result.current.processCheckin({
        ...base,
        itemId: 'IT3',
        damageReported: true,
        damageDescription: 'Cracked housing',
      });
    });

    expect(deps.addChangeLog.mock.calls[0][0].changes[0].newValue).toBe(STATUS.NEEDS_ATTENTION);
    expect(deps.addAuditLog.mock.calls[0][0].description).toBe(
      'Light returned by Jordan (damage reported)',
    );
    expect(dataContext.sendDamageReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        admins: [dataContext.users[0]],
        reportedBy: 'Jordan',
        borrowerName: 'Jordan',
        description: 'Cracked housing',
        companyName: 'Semi Pro',
      }),
    );

    // handoff: a fresh Repair record pre-filled with the description
    expect(hook.result.current.maintenanceItem).toEqual(checkedOutReservedToday);
    expect(hook.result.current.editingMaintenanceRecord).toBeNull();
    expect(hook.result.current.maintenancePrefill).toEqual({
      type: 'Repair',
      description: 'Cracked housing',
    });
    expect(deps.openModal).toHaveBeenCalledWith(MODALS.MAINTENANCE);
    expect(mockAddToast).toHaveBeenCalledWith(
      'Damage reported — log the repair, or cancel to skip',
      'info',
    );
    expect(hook.result.current.checkinItemData).toBeNull();
  });

  it('uses the return notes as the repair description and skips the admin email without admins', async () => {
    const dataContext = makeDataContext({
      users: [{ id: 'u2', roleId: 'role_user', email: 's@x' }],
    });
    const { hook } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processCheckin({
        ...base,
        damageReported: true,
        returnNotes: 'Scratched lens',
      });
    });
    expect(dataContext.sendDamageReportEmail).not.toHaveBeenCalled();
    expect(hook.result.current.maintenancePrefill.description).toBe('Scratched lens');
  });

  it('reports a failed return-confirmation email as a warning', async () => {
    const dataContext = makeDataContext({
      users: [{ id: 'u7', name: 'Jordan', email: 'jordan@x' }],
      sendCheckinEmail: vi.fn().mockResolvedValue({ success: false, error: 'bounced' }),
    });
    const { hook } = setup({ dataContext });
    await act(async () => {
      await hook.result.current.processCheckin(base);
    });
    expect(dataContext.sendCheckinEmail).toHaveBeenCalledWith(
      expect.objectContaining({ borrowerEmail: 'jordan@x', borrowerName: 'Jordan' }),
    );
    expect(mockAddToast).toHaveBeenCalledWith(
      'Return confirmation email could not be sent: bounced',
      'warning',
    );
  });

  it('handles an item that is no longer in the inventory', async () => {
    const { hook, deps, dataContext } = setup({ inventory: [] });
    await act(async () => {
      await hook.result.current.processCheckin({ ...base, itemId: 'GONE', damageReported: true });
    });
    expect(dataContext.checkInItem).toHaveBeenCalledWith('GONE', expect.any(Object));
    expect(deps.addChangeLog.mock.calls[0][0].itemName).toBe('GONE');
    expect(hook.result.current.maintenanceItem).toEqual({
      id: 'GONE',
      name: 'GONE',
      maintenanceHistory: [],
    });
  });
});

// =============================================================================
// Batch check-in
// =============================================================================

describe('processBatchCheckin', () => {
  it('checks in only the checked-out targets, keeps their condition, derives reserved/available', async () => {
    const { hook, deps, dataContext } = setup({ selectedItem: checkedOut });
    let outcome;
    await act(async () => {
      outcome = await hook.result.current.processBatchCheckin({
        itemIds: ['IT1', 'IT2', 'IT3'],
        returnNotes: 'End of job',
      });
    });

    expect(outcome).toEqual({ done: 2, failed: [] });
    expect(dataContext.checkInItem.mock.calls.map((c) => c[0])).toEqual(['IT2', 'IT3']);
    expect(dataContext.checkInItem.mock.calls[0][1]).toMatchObject({
      returnedBy: 'Admin',
      userId: 'u1',
      condition: 'good',
      returnNotes: 'End of job',
      damageReported: false,
      returnStatus: undefined,
    });
    expect(dataContext.checkInItem.mock.calls[1][1]).toMatchObject({
      condition: 'fair',
      returnStatus: STATUS.RESERVED,
    });
    expect(deps.addChangeLog.mock.calls[1][0].changes[0].newValue).toBe(STATUS.RESERVED);
    expect(lastUpdate(deps.setSelectedItem, checkedOut)).toMatchObject({
      status: STATUS.AVAILABLE,
      checkedOutTo: null,
    });
    expect(mockAddToast).toHaveBeenCalledWith('2 items checked in', 'success');
    expect(deps.closeModal).toHaveBeenCalled();
  });

  it('continues past a failure and reports it', async () => {
    const dataContext = makeDataContext({
      checkInItem: vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({}),
    });
    const { hook, deps } = setup({ dataContext });
    let outcome;
    await act(async () => {
      outcome = await hook.result.current.processBatchCheckin({ itemIds: ['IT2', 'IT3'] });
    });
    expect(outcome).toEqual({ done: 1, failed: ['Lens'] });
    expect(deps.addAuditLog).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith('1 item checked in', 'success');
    expect(mockAddToast).toHaveBeenCalledWith('Failed to check in: Lens', 'error');
  });

  it('derives the operator name from the email when the profile has none', async () => {
    const { hook, dataContext } = setup({ currentUser: { id: 'u1', email: 'ops@studio.com' } });
    await act(async () => {
      await hook.result.current.processBatchCheckin({ itemIds: ['IT2'] });
    });
    expect(dataContext.checkInItem.mock.calls[0][1].returnedBy).toBe('ops');
  });
});

// =============================================================================
// Maintenance
// =============================================================================

describe('saveMaintenance', () => {
  const item = { id: 'IT1', name: 'Camera', maintenanceHistory: [{ id: 'm0', type: 'Cleaning' }] };
  const record = { id: 'temp-1', type: 'Repair', description: 'Fix it', status: 'scheduled' };

  const open = (hook) => act(() => hook.result.current.openMaintenanceModal());

  it('does nothing without a selected item', () => {
    const { hook, deps } = setup();
    open(hook);
    expect(deps.openModal).not.toHaveBeenCalled();
  });

  it('adds optimistically, persists, swaps the temp id, logs and closes', async () => {
    const { hook, deps, dataContext } = setup({ inventory: [item], selectedItem: item });
    open(hook);
    expect(deps.openModal).toHaveBeenCalledWith(MODALS.MAINTENANCE);
    expect(hook.result.current.maintenanceItem).toEqual(item);

    await act(async () => {
      await hook.result.current.saveMaintenance(record);
    });

    const { patchInventoryItem, addMaintenance } = dataContext;
    const optimistic = patchInventoryItem.mock.calls[0][1](item);
    expect(optimistic.maintenanceHistory.map((m) => m.id)).toEqual(['m0', 'temp-1']);
    expect(deps.setSelectedItem.mock.calls[0][0](item).maintenanceHistory).toHaveLength(2);
    expect(addMaintenance).toHaveBeenCalledWith('IT1', record);

    const swapped = patchInventoryItem.mock.calls[1][1]({
      maintenanceHistory: optimistic.maintenanceHistory,
    });
    expect(swapped.maintenanceHistory.map((m) => m.id)).toEqual(['m0', 'db-m1']);
    expect(
      lastUpdate(deps.setSelectedItem, { maintenanceHistory: optimistic.maintenanceHistory })
        .maintenanceHistory[1].id,
    ).toBe('db-m1');

    expect(deps.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'maintenance_added',
        description: 'Added Repair for Camera',
      }),
    );
    expect(deps.addChangeLog.mock.calls[0][0].changes[0].newValue).toBe('Repair - Fix it');
    expect(deps.closeModal).toHaveBeenCalled();
    expect(hook.result.current.maintenanceItem).toBeNull();
  });

  it('edits in place through updateMaintenance without an id swap', async () => {
    const existing = { id: 'm0', type: 'Cleaning', status: 'scheduled' };
    const { hook, deps, dataContext } = setup({ inventory: [item], selectedItem: item });
    open(hook);
    act(() => hook.result.current.setEditingMaintenanceRecord(existing));
    const edited = { ...existing, status: 'completed' };

    await act(async () => {
      await hook.result.current.saveMaintenance(edited);
    });

    expect(dataContext.updateMaintenance).toHaveBeenCalledWith('m0', edited);
    expect(dataContext.addMaintenance).not.toHaveBeenCalled();
    expect(dataContext.patchInventoryItem).toHaveBeenCalledTimes(1);
    expect(dataContext.patchInventoryItem.mock.calls[0][1](item).maintenanceHistory).toEqual([
      edited,
    ]);
    expect(deps.addAuditLog.mock.calls[0][0].type).toBe('maintenance_updated');
    expect(deps.addChangeLog.mock.calls[0][0].changes[0].newValue).toBe('Cleaning - completed');
    expect(hook.result.current.editingMaintenanceRecord).toBeNull();
  });

  it('rolls back, toasts and keeps the modal open when the persist fails', async () => {
    const dataContext = makeDataContext({
      addMaintenance: vi.fn().mockRejectedValue(new Error('RLS')),
    });
    const { hook, deps } = setup({ inventory: [item], selectedItem: item, dataContext });
    open(hook);
    await act(async () => {
      await hook.result.current.saveMaintenance(record);
    });

    expect(dataContext.patchInventoryItem).toHaveBeenLastCalledWith('IT1', {
      maintenanceHistory: item.maintenanceHistory,
    });
    expect(
      lastUpdate(deps.setSelectedItem, { maintenanceHistory: ['dirty'] }).maintenanceHistory,
    ).toEqual(item.maintenanceHistory);
    expect(mockAddToast).toHaveBeenCalledWith('Maintenance save failed: RLS', 'error');
    expect(deps.addAuditLog).not.toHaveBeenCalled();
    expect(deps.closeModal).not.toHaveBeenCalled();
    expect(hook.result.current.maintenanceItem).toEqual(item);
  });

  it('skips the swap when the DB returns the same id and ignores a missing history', async () => {
    const bare = { id: 'IT1', name: 'Camera' };
    const dataContext = makeDataContext({
      addMaintenance: vi.fn().mockResolvedValue({ id: 'temp-1' }),
    });
    const { hook, dataContext: dc } = setup({ inventory: [bare], selectedItem: bare, dataContext });
    open(hook);
    await act(async () => {
      await hook.result.current.saveMaintenance(record);
    });
    expect(dc.patchInventoryItem).toHaveBeenCalledTimes(1);
    expect(dc.patchInventoryItem.mock.calls[0][1](bare).maintenanceHistory).toEqual([record]);
  });

  it('does nothing when no maintenance item is set', async () => {
    const { hook, dataContext } = setup();
    await act(async () => {
      await hook.result.current.saveMaintenance(record);
    });
    expect(dataContext.addMaintenance).not.toHaveBeenCalled();
  });
});

describe('updateMaintenanceStatus — needs-attention release', () => {
  const openRepair = { id: 'm1', type: 'Repair', status: 'in-progress' };
  const otherOpen = { id: 'm2', type: 'Cleaning', status: 'scheduled' };

  it('returns the item to Available when the last open record completes', async () => {
    const item = {
      id: 'IT1',
      name: 'Camera',
      status: STATUS.NEEDS_ATTENTION,
      maintenanceHistory: [openRepair, { id: 'm9', status: 'cancelled' }],
    };
    const { hook, deps, dataContext } = setup({ inventory: [item], selectedItem: item });
    await act(async () => {
      await hook.result.current.updateMaintenanceStatus('m1', 'completed');
    });

    expect(dataContext.updateMaintenance).toHaveBeenCalledWith('m1', {
      status: 'completed',
      completed_date: TODAY_UTC,
    });
    expect(dataContext.updateItem).toHaveBeenCalledWith('IT1', { status: STATUS.AVAILABLE });
    expect(lastUpdate(deps.setSelectedItem, item).status).toBe(STATUS.AVAILABLE);
    expect(lastUpdate(deps.setSelectedItem, { id: 'OTHER' })).toEqual({ id: 'OTHER' });
    expect(mockAddToast).toHaveBeenCalledWith('Camera marked Available again', 'success');
  });

  it('keeps needs-attention while another record is still open', async () => {
    const item = {
      id: 'IT1',
      status: STATUS.NEEDS_ATTENTION,
      maintenanceHistory: [openRepair, otherOpen],
    };
    const { hook, dataContext } = setup({ inventory: [item], selectedItem: item });
    await act(async () => {
      await hook.result.current.updateMaintenanceStatus('m1', 'completed');
    });
    expect(dataContext.updateItem).not.toHaveBeenCalled();
  });

  it('does not touch the status of an item that was not flagged', async () => {
    const item = { id: 'IT1', status: STATUS.AVAILABLE, maintenanceHistory: [openRepair] };
    const { hook, dataContext } = setup({ inventory: [item], selectedItem: item });
    await act(async () => {
      await hook.result.current.updateMaintenanceStatus('m1', 'in-progress');
    });
    expect(dataContext.updateMaintenance).toHaveBeenCalledWith('m1', { status: 'in-progress' });
    expect(dataContext.updateItem).not.toHaveBeenCalled();
  });

  it('leaves the completed record in place when the status release fails', async () => {
    const item = {
      id: 'IT1',
      name: 'Camera',
      status: STATUS.NEEDS_ATTENTION,
      maintenanceHistory: [openRepair],
    };
    const dataContext = makeDataContext({ updateItem: vi.fn().mockRejectedValue(new Error('x')) });
    const { hook, deps } = setup({ inventory: [item], selectedItem: item, dataContext });
    await act(async () => {
      await hook.result.current.updateMaintenanceStatus('m1', 'completed');
    });
    expect(deps.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'maintenance_status_changed' }),
    );
    expect(mockAddToast).not.toHaveBeenCalledWith('Camera marked Available again', 'success');
  });

  it('does nothing without a selected item', async () => {
    const { hook, dataContext } = setup();
    await act(async () => {
      await hook.result.current.updateMaintenanceStatus('m1', 'completed');
    });
    expect(dataContext.updateMaintenance).not.toHaveBeenCalled();
  });
});
