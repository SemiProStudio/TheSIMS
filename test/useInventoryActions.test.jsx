// =============================================================================
// useInventoryActions — direct tests of the inventory write paths
//
// These are the branches that decide whether a row is written, in what order
// relative to storage uploads, and what is rolled back or surfaced when a
// step fails. The E2E suite covers the happy paths through the UI; this file
// scripts the dataContext/storage collaborators so every failure branch runs.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockAddToast, mockGenerateId, mockUploadPending, mockDeleteImage } = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  mockGenerateId: vi.fn(),
  mockUploadPending: vi.fn(),
  mockDeleteImage: vi.fn(),
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/services.js', () => ({
  inventoryService: { generateId: mockGenerateId },
}));

// The hook lazy-imports storage helpers from lib/index.js so the upload code
// stays out of the main bundle; mock the module it resolves to.
vi.mock('../lib/index.js', () => ({
  storageService: { uploadPending: mockUploadPending, deleteImage: mockDeleteImage },
  isStorageUrl: (url) => typeof url === 'string' && url.includes('/storage/v1/object/public/'),
  getStoragePathFromUrl: (url) =>
    url.split('/storage/v1/object/public/equipment-images/')[1] || null,
}));

vi.mock('../lib/logger.js', () => ({ error: vi.fn(), warn: vi.fn(), log: vi.fn() }));

const { useInventoryActions } = await import('../hooks/useInventoryActions.js');
const { VIEWS, MODALS, STATUS } = await import('../constants.js');

const STORAGE_URL =
  'https://x.supabase.co/storage/v1/object/public/equipment-images/CA1001/old.jpg';

const baseForm = {
  name: 'New Camera',
  brand: 'Sony',
  category: 'Cameras',
  location: 'Shelf A',
  purchaseDate: '2026-01-01',
  purchasePrice: '1200',
  currentValue: '',
  serialNumber: 'SN-1',
  condition: 'Excellent',
  image: null,
  pendingImage: null,
  specs: { 'Sensor Type': 'Full Frame', Ignored: 'not a declared spec' },
  quantity: '2',
  reorderPoint: '1',
  lowStockAlert: true,
};

function buildParams(overrides = {}) {
  return {
    dataContext: {
      createItem: vi.fn().mockResolvedValue(undefined),
      updateItem: vi.fn().mockResolvedValue(undefined),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      addAuditLog: vi.fn(),
    },
    setSelectedItem: vi.fn(),
    setCurrentView: vi.fn(),
    setChangeLog: vi.fn(),
    showConfirm: vi.fn(),
    inventory: [
      {
        id: 'CA1001',
        name: 'Old Camera',
        brand: 'Sony',
        category: 'Cameras',
        location: 'Shelf A',
        condition: 'Excellent',
        status: 'available',
        image: STORAGE_URL,
        purchasePrice: 1200,
        currentValue: 0,
        quantity: 2,
        reorderPoint: 1,
      },
      { id: 'LE1001', name: 'Lens', category: 'Lenses', status: 'available', location: 'Shelf B' },
    ],
    currentUser: { id: 'u1', name: 'Tester' },
    currentView: VIEWS.GEAR_LIST,
    specs: { Cameras: [{ name: 'Sensor Type' }, { name: 'Lens Mount' }] },
    editingItemId: null,
    setEditingItemId: vi.fn(),
    itemForm: { ...baseForm },
    setItemForm: vi.fn(),
    resetItemForm: vi.fn(),
    closeModal: vi.fn(),
    openModal: vi.fn(),
    ...overrides,
  };
}

/** Run a state updater the way React would, returning what it produces. */
function applyUpdater(mockSetter, prev) {
  const updater = mockSetter.mock.calls.at(-1)[0];
  return typeof updater === 'function' ? updater(prev) : updater;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateId.mockResolvedValue('CA1099');
  mockUploadPending.mockResolvedValue({ url: 'https://x/new.jpg' });
  mockDeleteImage.mockResolvedValue(undefined);
});

// =============================================================================
// createItem
// =============================================================================

describe('createItem', () => {
  it('builds the row from the form, persists it, logs, toasts and closes', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));

    let created;
    await act(async () => {
      created = await result.current.createItem();
    });

    expect(mockGenerateId).toHaveBeenCalledWith('CA');
    expect(params.dataContext.createItem).toHaveBeenCalledTimes(1);
    const row = params.dataContext.createItem.mock.calls[0][0];
    expect(row).toMatchObject({
      id: 'CA1099',
      name: 'New Camera',
      status: STATUS.AVAILABLE,
      purchasePrice: 1200,
      currentValue: 1200, // falls back to purchase price
      quantity: 2,
      reorderPoint: 1,
      lowStockAlert: true,
      image: null,
      specs: { 'Sensor Type': 'Full Frame' }, // undeclared spec dropped
      notes: [],
      reservations: [],
    });
    expect(row).not.toHaveProperty('pendingImage');
    expect(created).toBe(row);

    expect(params.setChangeLog).toHaveBeenCalledTimes(1);
    const log = applyUpdater(params.setChangeLog, []);
    expect(log[0]).toMatchObject({ type: 'created', itemId: 'CA1099', user: 'Tester' });
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'item_created', itemId: 'CA1099', user: 'Tester' }),
    );
    expect(params.closeModal).toHaveBeenCalled();
    expect(params.resetItemForm).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('New Camera added to inventory', 'success');
    expect(params.setCurrentView).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('falls back to a local id when the generate_item_id RPC is unreachable', async () => {
    mockGenerateId.mockRejectedValue(new Error('network'));
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await result.current.createItem();
    });

    const row = params.dataContext.createItem.mock.calls[0][0];
    expect(row.id).toMatch(/^CA\d{4}$/);
    expect(row.id).not.toBe('CA1001'); // never collides with an existing id
  });

  it('uses the OT prefix for a category without one', async () => {
    const params = buildParams({
      itemForm: { ...baseForm, category: 'Mystery' },
      specs: {},
    });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.createItem();
    });
    expect(mockGenerateId).toHaveBeenCalledWith('OT');
    expect(params.dataContext.createItem.mock.calls[0][0].specs).toEqual({});
  });

  it('uploads a pending photo only AFTER the row exists, then patches the url', async () => {
    const order = [];
    const params = buildParams({ itemForm: { ...baseForm, pendingImage: { blob: 'x' } } });
    params.dataContext.createItem.mockImplementation(async () => order.push('create'));
    mockUploadPending.mockImplementation(async () => {
      order.push('upload');
      return { url: 'https://x/uploaded.jpg' };
    });
    params.dataContext.updateItem.mockImplementation(async () => order.push('patch'));

    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.createItem();
    });

    expect(order).toEqual(['create', 'upload', 'patch']);
    expect(params.dataContext.createItem.mock.calls[0][0].image).toBeNull();
    expect(mockUploadPending).toHaveBeenCalledWith({ blob: 'x' }, 'CA1099');
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CA1099', {
      image: 'https://x/uploaded.jpg',
    });
  });

  it('keeps the created item and warns when the photo upload fails', async () => {
    mockUploadPending.mockRejectedValue(new Error('bucket down'));
    const params = buildParams({ itemForm: { ...baseForm, pendingImage: { blob: 'x' } } });
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await expect(result.current.createItem()).resolves.toBeTruthy();
    });

    expect(params.dataContext.createItem).toHaveBeenCalledTimes(1);
    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringMatching(/photo could not be uploaded/),
      'warning',
    );
    expect(params.closeModal).toHaveBeenCalled(); // the item itself was saved
    expect(result.current.error).toBeNull();
  });

  it('navigates back to the gear list when created from the Add Item page', async () => {
    const params = buildParams({ currentView: VIEWS.ADD_ITEM });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.createItem();
    });
    expect(params.setCurrentView).toHaveBeenCalledWith(VIEWS.GEAR_LIST);
  });

  it('surfaces a database failure: error state, toast, rethrow, modal stays open, no upload', async () => {
    const params = buildParams({ itemForm: { ...baseForm, pendingImage: { blob: 'x' } } });
    params.dataContext.createItem.mockRejectedValue(new Error('row write failed'));
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await expect(result.current.createItem()).rejects.toThrow('row write failed');
    });

    expect(mockUploadPending).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(params.setChangeLog).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('row write failed', 'error');
    expect(result.current.error).toBe('row write failed');
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('falls back to generic messages when the error has none', async () => {
    const params = buildParams();
    params.dataContext.createItem.mockRejectedValue({});
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await expect(result.current.createItem()).rejects.toEqual({});
    });
    expect(result.current.error).toBe('Failed to create item');
    expect(mockAddToast).toHaveBeenCalledWith('Operation failed', 'error');
  });

  it('attributes logs to "Unknown" without a current user', async () => {
    const params = buildParams({ currentUser: null });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.createItem();
    });
    expect(applyUpdater(params.setChangeLog, [])[0].user).toBe('Unknown');
    expect(params.dataContext.addAuditLog.mock.calls[0][0].user).toBe('Unknown');
  });

  it('tolerates a dataContext without addAuditLog', async () => {
    const params = buildParams();
    delete params.dataContext.addAuditLog;
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await expect(result.current.createItem()).resolves.toBeTruthy();
    });
  });
});

// =============================================================================
// updateItem
// =============================================================================

describe('updateItem', () => {
  const editing = (formOverrides = {}, overrides = {}) =>
    buildParams({
      editingItemId: 'CA1001',
      itemForm: { ...baseForm, name: 'Renamed Camera', image: STORAGE_URL, ...formOverrides },
      ...overrides,
    });

  it('persists the form, tracks changed fields, refreshes the selection and closes', async () => {
    const params = editing();
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await result.current.updateItem();
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledTimes(1);
    const [id, updates] = params.dataContext.updateItem.mock.calls[0];
    expect(id).toBe('CA1001');
    expect(updates).toMatchObject({
      name: 'Renamed Camera',
      purchasePrice: 1200,
      currentValue: 0, // update does NOT fall back to purchase price
      quantity: 2,
      lowStockAlert: true,
      specs: { 'Sensor Type': 'Full Frame' },
    });
    expect(updates).not.toHaveProperty('pendingImage');

    const log = applyUpdater(params.setChangeLog, []);
    expect(log[0].type).toBe('updated');
    expect(log[0].changes).toEqual([
      { field: 'name', oldValue: 'Old Camera', newValue: 'Renamed Camera' },
      { field: 'serialNumber', oldValue: undefined, newValue: 'SN-1' },
      { field: 'purchaseDate', oldValue: undefined, newValue: '2026-01-01' },
    ]);
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'item_updated',
        description: 'Updated item: Renamed Camera (name, serialNumber, purchaseDate)',
      }),
    );

    // selectedItem is refreshed only when it IS the edited item
    expect(
      applyUpdater(params.setSelectedItem, { id: 'CA1001', name: 'Old Camera' }),
    ).toMatchObject({
      id: 'CA1001',
      name: 'Renamed Camera',
    });
    expect(applyUpdater(params.setSelectedItem, { id: 'LE1001' })).toEqual({ id: 'LE1001' });

    expect(mockDeleteImage).not.toHaveBeenCalled(); // image unchanged
    expect(params.closeModal).toHaveBeenCalled();
    expect(params.setEditingItemId).toHaveBeenCalledWith(null);
    expect(mockAddToast).toHaveBeenCalledWith('Item updated', 'success');
  });

  it('writes no change log when nothing tracked changed', async () => {
    const params = editing({
      name: 'Old Camera',
      serialNumber: '',
      purchaseDate: '',
      quantity: 2,
      reorderPoint: 1,
    });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.updateItem();
    });
    expect(params.dataContext.updateItem).toHaveBeenCalled();
    expect(params.setChangeLog).not.toHaveBeenCalled();
    expect(params.dataContext.addAuditLog).not.toHaveBeenCalled();
  });

  it('uploads a new photo BEFORE the row write and removes the old object only after', async () => {
    const order = [];
    const params = editing({ pendingImage: { blob: 'new' } });
    mockUploadPending.mockImplementation(async () => {
      order.push('upload');
      return { url: 'https://x/new.jpg' };
    });
    params.dataContext.updateItem.mockImplementation(async () => order.push('write'));
    mockDeleteImage.mockImplementation(async () => order.push('delete-old'));

    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.updateItem();
    });

    expect(order).toEqual(['upload', 'write', 'delete-old']);
    expect(mockUploadPending).toHaveBeenCalledWith({ blob: 'new' }, 'CA1001');
    expect(params.dataContext.updateItem.mock.calls[0][1].image).toBe('https://x/new.jpg');
    expect(mockDeleteImage).toHaveBeenCalledWith('CA1001/old.jpg');
    const log = applyUpdater(params.setChangeLog, []);
    expect(log[0].changes).toContainEqual({
      field: 'image',
      oldValue: 'had image',
      newValue: 'image updated',
    });
  });

  it('leaves the row untouched and the modal open when the photo upload fails', async () => {
    mockUploadPending.mockRejectedValue(new Error('upload timed out'));
    const params = editing({ pendingImage: { blob: 'new' } });
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await expect(result.current.updateItem()).rejects.toThrow('upload timed out');
    });

    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(params.setEditingItemId).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('upload timed out', 'error');
    expect(result.current.error).toBe('upload timed out');
  });

  it('does not delete the old image when the row write fails', async () => {
    const params = editing({ pendingImage: { blob: 'new' } });
    params.dataContext.updateItem.mockRejectedValue(new Error('RLS'));
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await expect(result.current.updateItem()).rejects.toThrow('RLS');
    });

    expect(mockUploadPending).toHaveBeenCalled(); // upload happened first by design
    expect(mockDeleteImage).not.toHaveBeenCalled();
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
  });

  it('logs an image removal and cleans up storage when the photo is cleared', async () => {
    const params = editing({ image: null });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.updateItem();
    });
    expect(mockDeleteImage).toHaveBeenCalledWith('CA1001/old.jpg');
    const log = applyUpdater(params.setChangeLog, []);
    expect(log[0].changes).toContainEqual({
      field: 'image',
      oldValue: 'had image',
      newValue: 'image removed',
    });
  });

  it('skips storage cleanup for a previous image that is not a storage object', async () => {
    const params = editing({ image: 'https://elsewhere/new.png' });
    params.inventory[0].image = 'https://cdn.example/external.png';
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.updateItem();
    });
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('swallows a failed old-image delete (orphan at worst)', async () => {
    mockDeleteImage.mockRejectedValue(new Error('gone already'));
    const params = editing({ image: null });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await expect(result.current.updateItem()).resolves.toBeUndefined();
    });
    expect(params.closeModal).toHaveBeenCalled();
  });

  it('still saves when the original item is no longer in the local inventory', async () => {
    const params = editing({}, { inventory: [] });
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.updateItem();
    });
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CA1001', expect.any(Object));
    expect(params.setChangeLog).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });
});

// =============================================================================
// deleteItem (confirm flow)
// =============================================================================

describe('deleteItem', () => {
  it('clears the selection and returns to the gear list when the selected item is deleted', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.deleteItem('CA1001'));
    const { onConfirm, variant } = params.showConfirm.mock.calls[0][0];
    expect(variant).toBe('danger');
    await act(async () => {
      await onConfirm();
    });

    expect(params.dataContext.deleteItem).toHaveBeenCalledWith('CA1001');
    expect(applyUpdater(params.setSelectedItem, { id: 'CA1001' })).toBeNull();
    expect(params.setCurrentView).toHaveBeenCalledWith(VIEWS.GEAR_LIST);
    expect(applyUpdater(params.setSelectedItem, { id: 'LE1001' })).toEqual({ id: 'LE1001' });
    expect(applyUpdater(params.setChangeLog, [])[0]).toMatchObject({
      type: 'deleted',
      itemName: 'Old Camera',
    });
    expect(mockAddToast).toHaveBeenCalledWith('Old Camera deleted', 'success');
  });

  it('reports a failed delete without rethrowing (the confirm dialog owns the promise)', async () => {
    const params = buildParams();
    params.dataContext.deleteItem.mockRejectedValue(new Error('has reservations'));
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.deleteItem('CA1001'));
    const { onConfirm } = params.showConfirm.mock.calls[0][0];
    await act(async () => {
      await expect(onConfirm()).resolves.toBeUndefined();
    });
    expect(params.setChangeLog).not.toHaveBeenCalled();
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('has reservations', 'error');
    expect(result.current.error).toBe('has reservations');
  });

  it('labels an unknown id honestly', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.deleteItem('NOPE'));
    await act(async () => {
      await params.showConfirm.mock.calls[0][0].onConfirm();
    });
    expect(applyUpdater(params.setChangeLog, [])[0].description).toBe('Deleted item: NOPE');
    expect(mockAddToast).toHaveBeenCalledWith('Item deleted', 'success');
  });
});

// =============================================================================
// Bulk operations
// =============================================================================

describe('bulk actions', () => {
  it.each([
    ['status', MODALS.BULK_STATUS],
    ['checkin', MODALS.BULK_CHECK_IN],
    ['location', MODALS.BULK_LOCATION],
    ['category', MODALS.BULK_CATEGORY],
    ['delete', MODALS.BULK_DELETE],
  ])('handleBulkAction(%s) records the ids and opens %s', (action, modal) => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction(action, ['CA1001', 'LE1001']));
    expect(params.openModal).toHaveBeenCalledWith(modal);
    expect(result.current.bulkActionIds).toEqual(['CA1001', 'LE1001']);
  });

  it('ignores an unknown bulk action but still records the ids', () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('teleport', ['CA1001']));
    expect(params.openModal).not.toHaveBeenCalled();
    expect(result.current.bulkActionIds).toEqual(['CA1001']);
  });

  it('applyBulkStatus updates each known item, skips unknown ids, logs and clears', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('status', ['CA1001', 'GHOST', 'LE1001']));
    await act(async () => {
      await result.current.applyBulkStatus('maintenance');
    });

    expect(params.dataContext.updateItem.mock.calls).toEqual([
      ['CA1001', { status: 'maintenance' }],
      ['LE1001', { status: 'maintenance' }],
    ]);
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.type).toBe('bulk_update');
    expect(log.changes).toEqual([
      { field: 'CA1001 (Old Camera)', oldValue: 'available', newValue: 'maintenance' },
      { field: 'LE1001 (Lens)', oldValue: 'available', newValue: 'maintenance' },
    ]);
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bulk_status_change' }),
    );
    expect(mockAddToast).toHaveBeenCalledWith('Status updated for 3 items', 'success');
    expect(params.closeModal).toHaveBeenCalled();
    expect(result.current.bulkActionIds).toEqual([]);
  });

  it('applyBulkStatus stops at the first failure and keeps the selection', async () => {
    const params = buildParams();
    params.dataContext.updateItem
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('second write failed'));
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('status', ['CA1001', 'LE1001']));
    await act(async () => {
      await result.current.applyBulkStatus('retired');
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledTimes(2);
    expect(params.setChangeLog).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(result.current.bulkActionIds).toEqual(['CA1001', 'LE1001']);
    expect(result.current.error).toBe('second write failed');
    expect(mockAddToast).toHaveBeenCalledWith('second write failed', 'error');
  });

  it('applyBulkLocation writes the location and logs "-" for items without one', async () => {
    const params = buildParams();
    delete params.inventory[1].location;
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('location', ['CA1001', 'LE1001']));
    await act(async () => {
      await result.current.applyBulkLocation('Van');
    });
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('LE1001', { location: 'Van' });
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.changes[1]).toEqual({ field: 'LE1001 (Lens)', oldValue: '-', newValue: 'Van' });
    expect(mockAddToast).toHaveBeenCalledWith('Location updated for 2 items', 'success');
  });

  it('applyBulkLocation reports a failure and keeps the modal open', async () => {
    const params = buildParams();
    params.dataContext.updateItem.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('location', ['CA1001']));
    await act(async () => {
      await result.current.applyBulkLocation('Van');
    });
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(result.current.error).toBe('nope');
  });

  it('applyBulkCategory resets specs along with the category', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('category', ['CA1001']));
    await act(async () => {
      await result.current.applyBulkCategory('Lighting');
    });
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CA1001', {
      category: 'Lighting',
      specs: {},
    });
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.changes).toEqual([
      { field: 'CA1001 (Old Camera)', oldValue: 'Cameras', newValue: 'Lighting' },
    ]);
    expect(params.dataContext.addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'bulk_category_change' }),
    );
  });

  it('applyBulkCategory reports a failure', async () => {
    const params = buildParams();
    params.dataContext.updateItem.mockRejectedValue({});
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('category', ['CA1001']));
    await act(async () => {
      await result.current.applyBulkCategory('Lighting');
    });
    expect(result.current.error).toBe('Failed to update items');
    expect(mockAddToast).toHaveBeenCalledWith('Operation failed', 'error');
  });

  it('applyBulkDelete removes every id, clears a deleted selection and logs each row', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('delete', ['CA1001', 'LE1001']));
    await act(async () => {
      await result.current.applyBulkDelete();
    });

    expect(params.dataContext.deleteItem.mock.calls.map((c) => c[0])).toEqual(['CA1001', 'LE1001']);
    expect(applyUpdater(params.setSelectedItem, { id: 'LE1001' })).toBeNull();
    expect(params.setCurrentView).toHaveBeenCalledWith(VIEWS.GEAR_LIST);
    expect(applyUpdater(params.setSelectedItem, { id: 'OTHER' })).toEqual({ id: 'OTHER' });
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.type).toBe('bulk_delete');
    expect(log.changes.map((c) => c.oldValue)).toEqual(['CA1001 - Old Camera', 'LE1001 - Lens']);
    expect(mockAddToast).toHaveBeenCalledWith('2 items deleted', 'success');
    expect(result.current.bulkActionIds).toEqual([]);
  });

  it('applyBulkDelete reports a failure and keeps the selection', async () => {
    const params = buildParams();
    params.dataContext.deleteItem.mockRejectedValue(new Error('fk violation'));
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.handleBulkAction('delete', ['CA1001']));
    await act(async () => {
      await result.current.applyBulkDelete();
    });
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(result.current.bulkActionIds).toEqual(['CA1001']);
    expect(result.current.error).toBe('fk violation');
  });
});

// =============================================================================
// openEditItem / applyBulkPhoto
// =============================================================================

describe('openEditItem', () => {
  it('maps the item onto the form with defaults for missing fields', () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    act(() => result.current.openEditItem({ id: 'X1', name: 'Bare', specs: { a: 1 } }));

    expect(params.setEditingItemId).toHaveBeenCalledWith('X1');
    expect(params.setItemForm).toHaveBeenCalledWith({
      name: 'Bare',
      brand: '',
      category: 'Cameras',
      location: '',
      purchaseDate: '',
      purchasePrice: '',
      currentValue: '',
      serialNumber: '',
      condition: 'Excellent',
      image: null,
      pendingImage: null,
      specs: { a: 1 },
      quantity: 1,
      reorderPoint: 0,
      lowStockAlert: false,
    });
    expect(params.openModal).toHaveBeenCalledWith(MODALS.EDIT_ITEM);
  });

  it('keeps explicit zero quantity/reorder values and copies specs', () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    const specs = { a: 1 };
    act(() =>
      result.current.openEditItem({
        id: 'X1',
        quantity: 0,
        reorderPoint: 0,
        lowStockAlert: 1,
        specs,
      }),
    );
    const form = params.setItemForm.mock.calls[0][0];
    expect(form.quantity).toBe(0);
    expect(form.reorderPoint).toBe(0);
    expect(form.lowStockAlert).toBe(true);
    expect(form.specs).toEqual(specs);
    expect(form.specs).not.toBe(specs);
  });
});

describe('applyBulkPhoto', () => {
  it('persists first, refreshes the selection, logs, then removes the old storage object', async () => {
    const order = [];
    const params = buildParams();
    params.dataContext.updateItem.mockImplementation(async () => order.push('write'));
    mockDeleteImage.mockImplementation(async () => order.push('delete'));
    const { result } = renderHook(() => useInventoryActions(params));

    await act(async () => {
      await result.current.applyBulkPhoto('CA1001', 'https://x/bulk.jpg');
    });

    expect(order).toEqual(['write', 'delete']);
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CA1001', {
      image: 'https://x/bulk.jpg',
    });
    expect(applyUpdater(params.setSelectedItem, { id: 'CA1001', image: 'old' })).toEqual({
      id: 'CA1001',
      image: 'https://x/bulk.jpg',
    });
    expect(applyUpdater(params.setSelectedItem, { id: 'LE1001' })).toEqual({ id: 'LE1001' });
    expect(mockDeleteImage).toHaveBeenCalledWith('CA1001/old.jpg');
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.description).toBe('Photo replaced via Bulk Photos');
    expect(log.changes[0]).toEqual({
      field: 'image',
      oldValue: 'had image',
      newValue: 'image updated',
    });
  });

  it('logs "added" and skips cleanup for an item without a photo', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await result.current.applyBulkPhoto('LE1001', 'https://x/bulk.jpg');
    });
    expect(mockDeleteImage).not.toHaveBeenCalled();
    const log = applyUpdater(params.setChangeLog, [])[0];
    expect(log.description).toBe('Photo added via Bulk Photos');
    expect(log.changes[0].oldValue).toBe('no image');
  });

  it('does not touch storage when the row write fails', async () => {
    const params = buildParams();
    params.dataContext.updateItem.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useInventoryActions(params));
    await act(async () => {
      await expect(result.current.applyBulkPhoto('CA1001', 'https://x/bulk.jpg')).rejects.toThrow(
        'denied',
      );
    });
    expect(mockDeleteImage).not.toHaveBeenCalled();
    expect(params.setChangeLog).not.toHaveBeenCalled();
  });
});
