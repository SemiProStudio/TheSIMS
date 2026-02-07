// =============================================================================
// Custom Hooks Tests
// Tests for useNavigation, useFilters, useModals, useSidebar
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// =============================================================================
// useNavigation Tests
// =============================================================================

describe('useNavigation', () => {
  // Mock implementation for testing
  const createUseNavigation = () => {
    const { useNavigation } = require('../hooks/useNavigation.js');
    return useNavigation;
  };

  beforeEach(() => {
    // Mock window.history
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with dashboard view', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    expect(result.current.currentView).toBe('dashboard');
  });

  it('should navigate to different view', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.navigate('inventory');
    });
    
    expect(result.current.currentView).toBe('inventory');
  });

  it('should navigate to item detail', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    const item = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.navigateToItem(item);
    });
    
    expect(result.current.currentView).toBe('detail');
    expect(result.current.selectedItem).toEqual(item);
  });

  it('should go back from detail view', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    const item = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.navigateToItem(item);
    });
    
    expect(result.current.currentView).toBe('detail');
    
    act(() => {
      result.current.goBack();
    });
    
    expect(result.current.currentView).toBe('inventory');
    expect(result.current.selectedItem).toBeNull();
  });

  it('should track back context', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    const item = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.navigateToItem(item, 'packages');
    });
    
    expect(result.current.itemBackContext).toBe('packages');
    
    act(() => {
      result.current.goBack();
    });
    
    expect(result.current.currentView).toBe('packages');
  });

  it('should reset navigation state', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    act(() => {
      result.current.navigate('inventory');
      result.current.navigateToItem({ id: '1' });
    });
    
    act(() => {
      result.current.resetNavigation();
    });
    
    expect(result.current.currentView).toBe('dashboard');
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.selectedPackage).toBeNull();
  });

  it('should detect detail view', () => {
    const useNavigation = createUseNavigation();
    const { result } = renderHook(() => useNavigation());
    
    expect(result.current.isDetailView).toBe(false);
    
    act(() => {
      result.current.navigateToItem({ id: '1' });
    });
    
    expect(result.current.isDetailView).toBe(true);
  });
});

// =============================================================================
// useFilters Tests
// =============================================================================

describe('useFilters', () => {
  const createUseFilters = () => {
    const { useFilters } = require('../hooks/useFilters.js');
    return useFilters;
  };

  it('should initialize with default values', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.categoryFilter).toBe('all');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.isGridView).toBe(true);
    expect(result.current.selectedIds).toEqual([]);
  });

  it('should update search query', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.handleSearch('camera');
    });
    
    expect(result.current.searchQuery).toBe('camera');
  });

  it('should clear search', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.handleSearch('camera');
      result.current.clearSearch();
    });
    
    expect(result.current.searchQuery).toBe('');
  });

  it('should update category filter', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.handleCategoryFilter('Camera');
    });
    
    expect(result.current.categoryFilter).toBe('Camera');
  });

  it('should toggle category in multi-select', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.toggleCategory('Camera');
    });
    
    expect(result.current.selectedCategories).toContain('Camera');
    
    act(() => {
      result.current.toggleCategory('Camera');
    });
    
    expect(result.current.selectedCategories).not.toContain('Camera');
  });

  it('should toggle view mode', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    expect(result.current.isGridView).toBe(true);
    
    act(() => {
      result.current.toggleViewMode();
    });
    
    expect(result.current.isGridView).toBe(false);
  });

  it('should manage selection', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.toggleSelection('item-1');
    });
    
    expect(result.current.selectedIds).toContain('item-1');
    expect(result.current.hasSelection).toBe(true);
    expect(result.current.selectionCount).toBe(1);
    
    act(() => {
      result.current.toggleSelection('item-2');
    });
    
    expect(result.current.selectionCount).toBe(2);
    
    act(() => {
      result.current.clearSelection();
    });
    
    expect(result.current.selectedIds).toEqual([]);
    expect(result.current.hasSelection).toBe(false);
  });

  it('should select all', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    const ids = ['item-1', 'item-2', 'item-3'];
    
    act(() => {
      result.current.selectAll(ids);
    });
    
    expect(result.current.selectedIds).toEqual(ids);
    expect(result.current.selectionCount).toBe(3);
  });

  it('should reset all filters', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.handleSearch('test');
      result.current.handleCategoryFilter('Camera');
      result.current.handleStatusFilter('available');
      result.current.toggleSelection('item-1');
    });
    
    act(() => {
      result.current.resetAllFilters();
    });
    
    expect(result.current.searchQuery).toBe('');
    expect(result.current.categoryFilter).toBe('all');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.selectedIds).toEqual([]);
  });

  it('should track active filters', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    expect(result.current.hasActiveFilters).toBe(false);
    
    act(() => {
      result.current.handleSearch('test');
    });
    
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('should create item filter function', () => {
    const useFilters = createUseFilters();
    const { result } = renderHook(() => useFilters());
    
    act(() => {
      result.current.handleSearch('canon');
    });
    
    const filter = result.current.createItemFilter();
    
    const items = [
      { id: '1', name: 'Canon C70', category: 'Camera', status: 'available' },
      { id: '2', name: 'Sony A7', category: 'Camera', status: 'available' },
    ];
    
    const filtered = items.filter(filter);
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('Canon C70');
  });
});

// =============================================================================
// useModals Tests
// =============================================================================

describe('useModals', () => {
  const createUseModals = () => {
    const { useModals } = require('../hooks/useModals.js');
    return useModals;
  };

  it('should initialize with no active modal', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    expect(result.current.activeModal).toBeNull();
    expect(result.current.editingItemId).toBeNull();
  });

  it('should open and close modal', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    act(() => {
      result.current.openModal('add-item');
    });
    
    expect(result.current.activeModal).toBe('add-item');
    expect(result.current.isModalOpen('add-item')).toBe(true);
    
    act(() => {
      result.current.closeModal();
    });
    
    expect(result.current.activeModal).toBeNull();
  });

  it('should open add item modal', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    act(() => {
      result.current.openAddItemModal();
    });
    
    expect(result.current.activeModal).toBe('add-item');
    expect(result.current.editingItemId).toBeNull();
  });

  it('should open edit item modal', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    const item = { id: '1', name: 'Test Item', category: 'Camera' };
    
    act(() => {
      result.current.openEditItemModal(item);
    });
    
    expect(result.current.activeModal).toBe('add-item');
    expect(result.current.editingItemId).toBe('1');
    expect(result.current.itemForm.name).toBe('Test Item');
  });

  it('should update item form', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    act(() => {
      result.current.updateItemForm('name', 'New Name');
    });
    
    expect(result.current.itemForm.name).toBe('New Name');
  });

  it('should reset item form', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    act(() => {
      result.current.updateItemForm('name', 'Test');
      result.current.resetItemForm();
    });
    
    expect(result.current.itemForm.name).toBe('');
    expect(result.current.editingItemId).toBeNull();
  });

  it('should show confirm dialog', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    const onConfirm = vi.fn();
    
    act(() => {
      result.current.showConfirm({
        title: 'Test',
        message: 'Are you sure?',
        onConfirm,
      });
    });
    
    expect(result.current.confirmDialog.isOpen).toBe(true);
    expect(result.current.confirmDialog.title).toBe('Test');
    
    act(() => {
      result.current.handleConfirm();
    });
    
    expect(onConfirm).toHaveBeenCalled();
    expect(result.current.confirmDialog.isOpen).toBe(false);
  });

  it('should show delete confirm with correct variant', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    act(() => {
      result.current.showDeleteConfirm('Test Item', vi.fn());
    });
    
    expect(result.current.confirmDialog.isOpen).toBe(true);
    expect(result.current.confirmDialog.variant).toBe('danger');
    expect(result.current.confirmDialog.confirmText).toBe('Delete');
  });

  it('should handle cancel', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    const onCancel = vi.fn();
    
    act(() => {
      result.current.showConfirm({
        title: 'Test',
        message: 'Are you sure?',
        onCancel,
      });
    });
    
    act(() => {
      result.current.handleCancel();
    });
    
    expect(onCancel).toHaveBeenCalled();
    expect(result.current.confirmDialog.isOpen).toBe(false);
  });

  it('should open check-out modal with item data', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    const item = { id: '1', name: 'Test Item' };
    
    act(() => {
      result.current.openCheckOutModal(item);
    });
    
    expect(result.current.activeModal).toBe('check-out');
    expect(result.current.modalData).toEqual(item);
  });

  it('should open bulk modals with selected ids', () => {
    const useModals = createUseModals();
    const { result } = renderHook(() => useModals());
    
    const ids = ['1', '2', '3'];
    
    act(() => {
      result.current.openBulkDeleteModal(ids);
    });
    
    expect(result.current.activeModal).toBe('bulk-delete');
    expect(result.current.modalData.ids).toEqual(ids);
  });
});

// =============================================================================
// useSidebar Tests
// =============================================================================

describe('useSidebar', () => {
  const createUseSidebar = () => {
    const { useSidebar } = require('../hooks/useSidebar.js');
    return useSidebar;
  };

  beforeEach(() => {
    // Reset localStorage mock to default (null) for each test
    window.localStorage.getItem.mockReturnValue(null);
    window.localStorage.setItem.mockClear();
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
  });

  it('should initialize with default state', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it('should load collapsed state from localStorage', () => {
    window.localStorage.getItem.mockReturnValue('true');
    
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    expect(result.current.sidebarCollapsed).toBe(true);
  });

  it('should toggle sidebar open', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    act(() => {
      result.current.toggleSidebarOpen();
    });
    
    expect(result.current.sidebarOpen).toBe(true);
    
    act(() => {
      result.current.toggleSidebarOpen();
    });
    
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should toggle sidebar collapsed', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    act(() => {
      result.current.toggleSidebarCollapsed();
    });
    
    expect(result.current.sidebarCollapsed).toBe(true);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('sims-sidebar-collapsed', 'true');
  });

  it('should open and close sidebar', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    act(() => {
      result.current.openSidebar();
    });
    
    expect(result.current.sidebarOpen).toBe(true);
    
    act(() => {
      result.current.closeSidebar();
    });
    
    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should collapse and expand sidebar', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    act(() => {
      result.current.collapseSidebar();
    });
    
    expect(result.current.sidebarCollapsed).toBe(true);
    
    act(() => {
      result.current.expandSidebar();
    });
    
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it('should calculate sidebar width', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    expect(result.current.sidebarWidth).toBe(256);
    
    act(() => {
      result.current.collapseSidebar();
    });
    
    expect(result.current.sidebarWidth).toBe(64);
  });

  it('should track isExpanded', () => {
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    expect(result.current.isExpanded).toBe(true);
    
    act(() => {
      result.current.collapseSidebar();
    });
    
    expect(result.current.isExpanded).toBe(false);
  });

  it('should detect mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500 });
    
    const useSidebar = createUseSidebar();
    const { result } = renderHook(() => useSidebar());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.mainContentMargin).toBe(0);
  });
});
