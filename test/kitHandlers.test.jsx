// =============================================================================
// Accessories & image handlers — persistence honesty
// (whole-app hardening round, HONEST-1/HONEST-5)
//
// - Required accessories must PERSIST through the real update path: the old
//   handlers only patched React state (no DB column existed), so accessory
//   lists vanished on reload while the change log claimed success
// - selectImage must persist BEFORE deleting the old storage object: the old
//   ordering destroyed the object first, so a failed DB write left every
//   other client pointing at a dead image URL
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKitHandlers } from '../hooks/handlers/useKitHandlers.js';

const { addToastMock, deleteImageMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
  deleteImageMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('../lib/index.js', () => ({
  storageService: { deleteImage: deleteImageMock },
  isStorageUrl: (url) => url?.includes('supabase.co/storage'),
  getStoragePathFromUrl: (url) => url?.split('/storage/')[1] || null,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function buildParams(overrides = {}) {
  return {
    inventory: [
      { id: 'CAM001', name: 'Camera', requiredAccessories: ['BAT001'] },
      { id: 'BAT001', name: 'Battery' },
      { id: 'CHG001', name: 'Charger' },
    ],
    selectedItem: { id: 'CAM001', name: 'Camera', requiredAccessories: ['BAT001'] },
    setSelectedItem: vi.fn(),
    dataContext: {
      updateItem: vi.fn().mockResolvedValue({}),
    },
    closeModal: vi.fn(),
    addChangeLog: vi.fn(),
    ...overrides,
  };
}

describe('kit contents (setKitStatus / addKitItems / removeKitItem)', () => {
  const kitInventory = [
    { id: 'BAG001', name: 'Camera Bag', isKit: true, kitItems: ['CAM001'] },
    { id: 'CAM001', name: 'Camera' },
    { id: 'CHG001', name: 'Charger' },
    { id: 'BAG002', name: 'Other Bag', isKit: true, kitItems: [] },
  ];

  function buildKitParams(overrides = {}) {
    return buildParams({
      inventory: kitInventory,
      selectedItem: { id: 'BAG001', name: 'Camera Bag', isKit: true, kitItems: ['CAM001'] },
      ...overrides,
    });
  }

  it('setKitStatus persists the flag and logs, keeping contents on demote', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.setKitStatus('BAG001', false);
    });

    // Only isKit is written — kit_contents survives so re-promoting restores
    expect(params.dataContext.updateItem).toHaveBeenCalledWith('BAG001', { isKit: false });
    expect(params.setSelectedItem).toHaveBeenCalled();
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
  });

  it('setKitStatus is a no-op when the flag already matches', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.setKitStatus('BAG001', true);
    });

    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });

  it('setKitStatus failure: toast, no state patch, no change log', async () => {
    const params = buildKitParams();
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('RLS denied'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.setKitStatus('BAG001', false);
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('kit status'), 'error');
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });

  it('addKitItems merges, dedupes, and drops self and other kits', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      // CAM001 already a member, BAG001 is self, BAG002 is a kit — only
      // CHG001 survives the guards
      await result.current.addKitItems('BAG001', ['CHG001', 'CAM001', 'BAG001', 'BAG002']);
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('BAG001', {
      kitItems: ['CAM001', 'CHG001'],
    });
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
  });

  it('addKitItems is a no-op when every id is filtered out', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.addKitItems('BAG001', ['CAM001', 'BAG002']);
    });

    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
  });

  it('addKitItems failure: toast, no change log', async () => {
    const params = buildKitParams();
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.addKitItems('BAG001', ['CHG001']);
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('kit contents'), 'error');
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });

  it('removeKitItem persists the pruned list and logs the removal', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.removeKitItem('BAG001', 'CAM001');
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('BAG001', { kitItems: [] });
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
  });

  it('removeKitItem is a no-op for a non-member', async () => {
    const params = buildKitParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.removeKitItem('BAG001', 'CHG001');
    });

    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
  });
});

describe('addRequiredAccessories', () => {
  it('persists the merged list through dataContext.updateItem before logging', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.addRequiredAccessories('CAM001', ['CHG001']);
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CAM001', {
      requiredAccessories: ['BAT001', 'CHG001'],
    });
    expect(params.setSelectedItem).toHaveBeenCalled();
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
  });

  it('dedupes ids already required', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.addRequiredAccessories('CAM001', ['BAT001', 'CHG001']);
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CAM001', {
      requiredAccessories: ['BAT001', 'CHG001'],
    });
  });

  it('on failure: toasts, keeps selectedItem, writes no change log', async () => {
    const params = buildParams();
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('RLS denied'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.addRequiredAccessories('CAM001', ['CHG001']);
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('Could not save'), 'error');
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });
});

describe('removeRequiredAccessory', () => {
  it('persists the pruned list and logs the removal', async () => {
    const params = buildParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.removeRequiredAccessory('CAM001', 'BAT001');
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CAM001', {
      requiredAccessories: [],
    });
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
  });

  it('on failure: toasts and skips the change log', async () => {
    const params = buildParams();
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.removeRequiredAccessory('CAM001', 'BAT001');
    });

    expect(addToastMock).toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });
});

describe('selectImage', () => {
  const OLD_URL = 'https://x.supabase.co/storage/item-images/old.jpg';

  it('persists first, then deletes the old storage object, then closes', async () => {
    const callOrder = [];
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', image: OLD_URL },
    });
    params.dataContext.updateItem.mockImplementation(async () => {
      callOrder.push('update');
      return {};
    });
    deleteImageMock.mockImplementation(async () => {
      callOrder.push('delete');
    });
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.selectImage('https://x.supabase.co/storage/item-images/new.jpg');
    });

    expect(callOrder).toEqual(['update', 'delete']);
    expect(deleteImageMock).toHaveBeenCalledWith('item-images/old.jpg');
    expect(params.closeModal).toHaveBeenCalled();
  });

  it('on DB failure: old image survives, modal stays open, user is told', async () => {
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', image: OLD_URL },
    });
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('write failed'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.selectImage('https://x.supabase.co/storage/item-images/new.jpg');
    });

    // The old ordering deleted the storage object first — a failed write then
    // left the DB pointing at a destroyed image
    expect(deleteImageMock).not.toHaveBeenCalled();
    expect(params.closeModal).not.toHaveBeenCalled();
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('image'), 'error');
  });

  it('does not delete storage when the image is unchanged', async () => {
    const params = buildParams({
      selectedItem: { id: 'CAM001', name: 'Camera', image: OLD_URL },
    });
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.selectImage(OLD_URL);
    });

    expect(deleteImageMock).not.toHaveBeenCalled();
    expect(params.closeModal).toHaveBeenCalled();
  });
});

// =============================================================================
// updateItemValue — the depreciation calculator's "Update Current Value"
// wrote only local state until 2026-08-15 (looked applied, reverted on
// reload). Same persist-first contract as every other inventory write here.
// =============================================================================
describe('updateItemValue', () => {
  function buildValueParams(overrides = {}) {
    return buildParams({
      inventory: [{ id: 'CAM001', name: 'Camera', currentValue: 2800 }],
      selectedItem: { id: 'CAM001', name: 'Camera', currentValue: 2800 },
      ...overrides,
    });
  }

  it('persists via updateItem, mirrors selectedItem, and logs the change', async () => {
    const params = buildValueParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.updateItemValue('CAM001', 1502);
    });

    expect(params.dataContext.updateItem).toHaveBeenCalledWith('CAM001', { currentValue: 1502 });
    expect(params.setSelectedItem).toHaveBeenCalled();
    expect(params.addChangeLog).toHaveBeenCalledTimes(1);
    const logged = params.addChangeLog.mock.calls[0][0];
    expect(logged.changes[0]).toEqual({ field: 'currentValue', oldValue: 2800, newValue: 1502 });
  });

  it('failure: toast, no selectedItem mirror, no change log', async () => {
    const params = buildValueParams();
    params.dataContext.updateItem.mockRejectedValueOnce(new Error('RLS denied'));
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.updateItemValue('CAM001', 1502);
    });

    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('current value'), 'error');
    expect(params.setSelectedItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });

  it('no-ops on unchanged, non-finite, or unknown-item values', async () => {
    const params = buildValueParams();
    const { result } = renderHook(() => useKitHandlers(params));

    await act(async () => {
      await result.current.updateItemValue('CAM001', 2800); // unchanged
      await result.current.updateItemValue('CAM001', NaN);
      await result.current.updateItemValue('NOPE01', 1000); // not in inventory
    });

    expect(params.dataContext.updateItem).not.toHaveBeenCalled();
    expect(params.addChangeLog).not.toHaveBeenCalled();
  });
});
