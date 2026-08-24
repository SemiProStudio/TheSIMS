// =============================================================================
// useCheckoutHandlers — Test Suite
// Pins the check-in/checkout hardening round:
// - a FAILED check-in/checkout keeps the modal open with its state intact
//   (previously the finally block closed it, so failures looked like dead
//   buttons and threw away typed notes)
// - the return-confirmation email resolves its recipient from the linked
//   client or a matching user record (checkout_history stores no email, so
//   the old lookup never sent anything)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockAddToast } = vi.hoisted(() => ({ mockAddToast: vi.fn() }));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

const { useCheckoutHandlers } = await import('../hooks/handlers/useCheckoutHandlers.js');

const checkedOutItem = {
  id: 'IT1',
  name: 'Probe Item',
  status: 'checked-out',
  checkedOutTo: 'Jordan',
  checkoutClientId: null,
};

const checkinData = {
  itemId: 'IT1',
  returnedBy: 'Jordan',
  condition: 'good',
  conditionChanged: false,
  conditionAtCheckout: 'good',
  conditionNotes: '',
  returnNotes: '',
  damageReported: false,
  damageDescription: '',
  returnDate: '2026-08-12',
};

const checkoutData = {
  itemId: 'IT1',
  borrowerName: 'Jordan',
  borrowerEmail: '',
  clientId: null,
  clientName: null,
  project: 'Test Shoot',
  projectType: 'Other',
  dueDate: '2026-08-20',
  checkedOutDate: '2026-08-12',
};

function makeDataContext(overrides = {}) {
  return {
    checkInItem: vi.fn().mockResolvedValue({}),
    checkOutItem: vi.fn().mockResolvedValue({}),
    getClientById: vi.fn().mockResolvedValue(null),
    sendCheckinEmail: vi.fn().mockResolvedValue({}),
    sendCheckoutEmail: vi.fn().mockResolvedValue({}),
    users: [],
    ...overrides,
  };
}

function setup({ item = checkedOutItem, dataContext = makeDataContext() } = {}) {
  const deps = {
    inventory: [item],
    selectedItem: null,
    setSelectedItem: vi.fn(),
    dataContext,
    currentUser: { id: 'u1', name: 'Admin' },
    openModal: vi.fn(),
    closeModal: vi.fn(),
    addAuditLog: vi.fn(),
    addChangeLog: vi.fn(),
  };
  const hook = renderHook(() => useCheckoutHandlers(deps));
  return { hook, deps, dataContext };
}

beforeEach(() => {
  mockAddToast.mockClear();
});

describe('processCheckin failure path', () => {
  it('keeps the modal open and its item state intact', async () => {
    const dataContext = makeDataContext({
      checkInItem: vi.fn().mockRejectedValue(new Error('RLS says no')),
    });
    const { hook, deps } = setup({ dataContext });

    act(() => hook.result.current.openCheckinModal('IT1'));
    expect(hook.result.current.checkinItemData).not.toBeNull();

    await act(async () => {
      await hook.result.current.processCheckin(checkinData);
    });

    expect(mockAddToast).toHaveBeenCalledWith('Check-in failed: RLS says no', 'error');
    expect(deps.closeModal).not.toHaveBeenCalled(); // modal survives
    expect(hook.result.current.checkinItemData).not.toBeNull(); // item kept
    expect(deps.addAuditLog).not.toHaveBeenCalled(); // no logs for a failure
  });
});

describe('processCheckin success path', () => {
  it('closes the modal, clears state, and logs', async () => {
    const { hook, deps } = setup();

    act(() => hook.result.current.openCheckinModal('IT1'));
    await act(async () => {
      await hook.result.current.processCheckin(checkinData);
    });

    expect(deps.closeModal).toHaveBeenCalledTimes(1);
    expect(hook.result.current.checkinItemData).toBeNull();
    expect(deps.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'item_checkin' }),
    );
    expect(mockAddToast).toHaveBeenCalledWith('Probe Item checked in successfully', 'success');
  });
});

describe('processCheckin return-confirmation email', () => {
  it('emails the linked client when the checkout has one', async () => {
    const dataContext = makeDataContext({
      getClientById: vi.fn().mockResolvedValue({ id: 'CL1', email: 'client@example.com' }),
    });
    const { hook } = setup({
      item: { ...checkedOutItem, checkoutClientId: 'CL1' },
      dataContext,
    });

    await act(async () => {
      await hook.result.current.processCheckin(checkinData);
    });

    expect(dataContext.getClientById).toHaveBeenCalledWith('CL1');
    expect(dataContext.sendCheckinEmail).toHaveBeenCalledWith(
      expect.objectContaining({ borrowerEmail: 'client@example.com', borrowerName: 'Jordan' }),
    );
  });

  it('falls back to a user record matching the borrower name', async () => {
    const dataContext = makeDataContext({
      users: [{ id: 'u2', name: 'Jordan', email: 'jordan@example.com' }],
    });
    const { hook } = setup({ dataContext });

    await act(async () => {
      await hook.result.current.processCheckin(checkinData);
    });

    expect(dataContext.sendCheckinEmail).toHaveBeenCalledWith(
      expect.objectContaining({ borrowerEmail: 'jordan@example.com' }),
    );
  });

  it('sends nothing when no email can be resolved', async () => {
    const { hook, dataContext } = setup();

    await act(async () => {
      await hook.result.current.processCheckin(checkinData);
    });

    expect(dataContext.sendCheckinEmail).not.toHaveBeenCalled();
  });
});

describe('processCheckout failure path', () => {
  it('keeps the modal open with its item intact', async () => {
    const dataContext = makeDataContext({
      checkOutItem: vi.fn().mockRejectedValue(new Error('offline')),
    });
    const { hook, deps } = setup({
      item: { ...checkedOutItem, status: 'available', checkedOutTo: null },
      dataContext,
    });

    act(() => hook.result.current.openCheckoutModal('IT1'));
    await act(async () => {
      await hook.result.current.processCheckout(checkoutData);
    });

    expect(mockAddToast).toHaveBeenCalledWith('Checkout failed: offline', 'error');
    expect(deps.closeModal).not.toHaveBeenCalled();
    expect(hook.result.current.checkoutItem).not.toBeNull();
    expect(deps.addAuditLog).not.toHaveBeenCalled();
  });

  it('still closes the modal on success', async () => {
    const { hook, deps } = setup({
      item: { ...checkedOutItem, status: 'available', checkedOutTo: null },
    });

    act(() => hook.result.current.openCheckoutModal('IT1'));
    await act(async () => {
      await hook.result.current.processCheckout(checkoutData);
    });

    expect(deps.closeModal).toHaveBeenCalledTimes(1);
    expect(hook.result.current.checkoutItem).toBeNull();
  });
});
