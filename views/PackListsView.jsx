// ============================================================================
// Pack Lists View Component
// Create job-specific lists from packages and/or individual items
// Supports quantity input for items with quantity tracking
// ============================================================================

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import jsQR from 'jsqr';
import { Plus, Trash2, ArrowLeft, Download, Printer, Copy, Box, Layers, ChevronRight, ChevronDown, ChevronUp, Edit2, CheckSquare, Square, ScanLine, X } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, generateId, getStatusColor } from '../utils';
import { Badge, Card, CardHeader, Button, SearchInput, EmptyState, ConfirmDialog, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { useData } from '../contexts/DataContext.js';
import { useToast } from '../contexts/ToastContext.js';

import { error as logError } from '../lib/logger.js';
import { openPrintWindow } from '../lib/printUtil.js';

function PackListsView({ 
  packLists, 
  dataContext: propDataContext, 
  inventory, 
  packages,
  categorySettings,
  onViewItem,
  addAuditLog,
  currentUser,
  initialSelectedList = null,
  onListSelect,
}) {
  const ctxData = useData();
  const dataContext = propDataContext || ctxData;
  const { addToast } = useToast();
  const [selectedListInternal, setSelectedListInternal] = useState(initialSelectedList);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showScanToPack, setShowScanToPack] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  // Wrapper to sync with parent state
  const setSelectedList = useCallback((list) => {
    setSelectedListInternal(list);
    if (onListSelect) onListSelect(list);
  }, [onListSelect]);

  // Sync with initialSelectedList prop changes
  React.useEffect(() => {
    if (initialSelectedList) {
      setSelectedListInternal(initialSelectedList);
    }
  }, [initialSelectedList]);

  // Alias for internal use
  const selectedList = selectedListInternal;
  
  // List search state
  const [packListSearch, setPackListSearch] = useState('');
  
  // Create form state
  const [listName, setListName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [packageSearch, setPackageSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');
  const [expandedPackages, setExpandedPackages] = useState(new Set());
  const [editingList, setEditingList] = useState(null);
  
  // Export options
  const [exportSort, setExportSort] = useState('category');
  const [exportFontSize, setExportFontSize] = useState('M');
  const [exportFormat, setExportFormat] = useState('print');

  // Get individual items (non-kits)
  const individualItems = useMemo(() => inventory.filter(item => !item.isKit), [inventory]);

  // Get unique categories for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set(individualItems.map(item => item.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [individualItems]);

  // Check if an item has quantity tracking
  const hasQuantityTracking = useCallback((item) => {
    const settings = categorySettings?.[item.category];
    return settings?.trackQuantity === true;
  }, [categorySettings]);

  // Build a map of itemId -> package IDs that contain it
  const itemToPackagesMap = useMemo(() => {
    const map = new Map();
    packages.forEach(pkg => {
      (pkg.items || []).forEach(itemId => {
        if (!map.has(itemId)) map.set(itemId, []);
        map.get(itemId).push(pkg.id);
      });
    });
    return map;
  }, [packages]);

  // Filter packages
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;
    const q = packageSearch.toLowerCase();
    return packages.filter(pkg => 
      pkg.name.toLowerCase().includes(q) || pkg.id.toLowerCase().includes(q)
    );
  }, [packages, packageSearch]);

  // Filter pack lists by search
  const filteredPackLists = useMemo(() => {
    if (!packListSearch.trim()) return packLists;
    const q = packListSearch.toLowerCase();
    return packLists.filter(list => 
      list.name.toLowerCase().includes(q)
    );
  }, [packLists, packListSearch]);

  // Filter items - by category and search
  const filteredItems = useMemo(() => {
    let items = individualItems;
    
    // Filter by category first
    if (itemCategoryFilter !== 'all') {
      items = items.filter(item => item.category === itemCategoryFilter);
    }
    
    // Then filter by search
    if (itemSearch.trim()) {
      const q = itemSearch.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    
    return items;
  }, [individualItems, itemSearch, itemCategoryFilter]);

  // Calculate package selection states
  const getPackageSelectionState = useCallback((pkgId) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg || !pkg.items || pkg.items.length === 0) return 'none';
    
    // If explicitly selected as a package
    if (selectedPackageIds.includes(pkgId)) return 'full';
    
    // Check if items are individually selected
    const selectedCount = pkg.items.filter(id => selectedItemIds.includes(id)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === pkg.items.length) return 'full';
    return 'partial';
  }, [packages, selectedPackageIds, selectedItemIds]);

  // Toggle package selection: Partial clicks to Full, Full clicks to None
  const handleTogglePackage = useCallback((pkgId) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;

    const currentState = getPackageSelectionState(pkgId);
    
    if (currentState === 'full') {
      // Full -> Deselect: remove from packages list and remove all items
      setSelectedPackageIds(prev => prev.filter(id => id !== pkgId));
      setSelectedItemIds(prev => prev.filter(id => !pkg.items.includes(id)));
    } else {
      // None or Partial -> Full: add to packages list and add all items
      setSelectedPackageIds(prev => prev.includes(pkgId) ? prev : [...prev, pkgId]);
      setSelectedItemIds(prev => [...new Set([...prev, ...pkg.items])]);
    }
  }, [packages, getPackageSelectionState]);

  // Toggle individual item selection
  const handleToggleItem = useCallback((itemId) => {
    setSelectedItemIds(prev => {
      const isRemoving = prev.includes(itemId);
      const newSelected = isRemoving
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];

      // Update package selections based on new item state
      const pkgIds = itemToPackagesMap.get(itemId) || [];
      pkgIds.forEach(pkgId => {
        const pkg = packages.find(p => p.id === pkgId);
        if (!pkg) return;

        const allSelected = pkg.items.every(id => newSelected.includes(id));

        if (allSelected && !isRemoving) {
          setSelectedPackageIds(prevPkgs =>
            prevPkgs.includes(pkgId) ? prevPkgs : [...prevPkgs, pkgId]
          );
        } else if (!allSelected) {
          setSelectedPackageIds(prevPkgs => prevPkgs.filter(id => id !== pkgId));
        }
      });

      return newSelected;
    });
  }, [itemToPackagesMap, packages]);

  // Update quantity for an item
  const handleQuantityChange = useCallback((itemId, quantity) => {
    const num = parseInt(quantity, 10);
    if (isNaN(num) || num < 1) {
      setItemQuantities(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setItemQuantities(prev => ({ ...prev, [itemId]: num }));
    }
  }, []);

  // Toggle package expansion
  const togglePackageExpansion = useCallback((pkgId, e) => {
    e.stopPropagation();
    setExpandedPackages(prev => {
      const next = new Set(prev);
      if (next.has(pkgId)) next.delete(pkgId);
      else next.add(pkgId);
      return next;
    });
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setListName('');
    setNameError('');
    setSelectedPackageIds([]);
    setSelectedItemIds([]);
    setItemQuantities({});
    setPackageSearch('');
    setItemSearch('');
    setItemCategoryFilter('all');
    setExpandedPackages(new Set());
    setEditingList(null);
  }, []);

  // Cancel create/edit - return to pack list detail if editing
  const handleCancel = useCallback(() => {
    if (editingList) {
      // Return to the pack list detail view
      const list = packLists.find(pl => pl.id === editingList.id);
      if (list) {
        setSelectedList(list);
      }
    }
    setShowCreate(false);
    setShowNamePrompt(false);
    resetForm();
  }, [resetForm, editingList, packLists, setSelectedList]);

  // Handle name prompt submission
  const handleNameSubmit = useCallback(() => {
    const trimmedName = listName.trim();
    if (!trimmedName) {
      setNameError('Pack list name is required');
      return;
    }
    // Check for duplicate name (case-insensitive)
    const isDuplicate = packLists.some(pl => 
      pl.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setNameError('A pack list with this name already exists');
      return;
    }
    setShowNamePrompt(false);
    setShowCreate(true);
  }, [listName, packLists]);

  // Start creating - show name prompt first
  const handleStartCreate = useCallback(() => {
    resetForm();
    setShowNamePrompt(true);
  }, [resetForm]);

  // Start editing an existing pack list
  const handleStartEdit = useCallback((list) => {
    // Populate form with existing list data
    setListName(list.name);
    setSelectedPackageIds(list.packages || []);
    
    // Extract item IDs and quantities
    const itemIds = (list.items || []).map(item => typeof item === 'string' ? item : item.id);
    setSelectedItemIds(itemIds);
    
    const quantities = {};
    (list.items || []).forEach(item => {
      if (typeof item === 'object' && item.id) {
        quantities[item.id] = item.quantity || 1;
      }
    });
    setItemQuantities(quantities);
    
    setEditingList(list);
    setSelectedList(null);
    setShowCreate(true);
  }, [setSelectedList]);

  // Save pack list (create or update)
  const handleSave = useCallback(async () => {
    if (!listName.trim() || selectedItemIds.length === 0 || isSaving) return;

    setIsSaving(true);
    try {
      if (editingList) {
        // Build clean update payload — only fields the DB accepts
        const items = selectedItemIds.map(id => ({
          id,
          quantity: itemQuantities[id] || 1,
        }));
        const updatePayload = {
          name: listName.trim(),
          packages: [...selectedPackageIds],
          items,
          packedItems: editingList.packedItems || [],
          updated_at: new Date().toISOString(),
        };

        // Persist to Supabase via DataContext
        if (dataContext?.updatePackList) {
          try {
            await dataContext.updatePackList(editingList.id, updatePayload);
          } catch (err) {
            logError('Failed to update pack list:', err);
            dataContext.patchPackList(editingList.id, updatePayload);
          }
        } else {
          dataContext.patchPackList(editingList.id, updatePayload);
        }

        // Log update
        if (addAuditLog) {
          addAuditLog({
            type: 'pack_list_updated',
            description: `Pack list "${updatePayload.name}" updated with ${selectedItemIds.length} items`,
            user: currentUser?.name || 'Unknown',
            packListId: editingList.id
          });
        }

        resetForm();
        setShowCreate(false);
        setSelectedList({ ...editingList, ...updatePayload });
      } else {
        // Create new list - let DB generate the ID
        const newList = {
          name: listName.trim(),
          packages: [...selectedPackageIds],
          items: selectedItemIds.map(id => ({
            id,
            quantity: itemQuantities[id] || 1,
          })),
        };

        // Persist to Supabase via DataContext
        if (dataContext?.createPackList) {
          try {
            const createdList = await dataContext.createPackList(newList);

            // Log creation
            if (addAuditLog) {
              addAuditLog({
                type: 'pack_list_created',
                description: `Pack list "${createdList.name}" created with ${selectedItemIds.length} items`,
                user: currentUser?.name || 'Unknown',
                packListId: createdList.id
              });
            }

            resetForm();
            setShowCreate(false);
            setSelectedList(createdList);
          } catch (err) {
            logError('Failed to create pack list:', err);
          }
        } else {
          // Fallback for no DB - generate local ID
          const localList = { ...newList, id: generateId(), createdAt: new Date().toISOString() };
          dataContext.addLocalPackList(localList);

          if (addAuditLog) {
            addAuditLog({
              type: 'pack_list_created',
              description: `Pack list "${localList.name}" created with ${selectedItemIds.length} items`,
              user: currentUser?.name || 'Unknown',
              packListId: localList.id
            });
          }

          resetForm();
          setShowCreate(false);
          setSelectedList(localList);
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [listName, selectedPackageIds, selectedItemIds, itemQuantities, resetForm, addAuditLog, currentUser, editingList, setSelectedList, dataContext, isSaving]);

  // Delete pack list with audit logging
  const handleDelete = useCallback(async (id) => {
    const list = packLists.find(pl => pl.id === id);
    
    // Persist to Supabase via DataContext
    if (dataContext?.deletePackList) {
      try {
        await dataContext.deletePackList(id);
      } catch (err) {
        logError('Failed to delete pack list:', err);
        dataContext.removeLocalPackList(id);
      }
    } else {
      dataContext.removeLocalPackList(id);
    }
    
    // Log deletion
    if (addAuditLog && list) {
      addAuditLog({
        type: 'pack_list_deleted',
        description: `Pack list "${list.name}" deleted`,
        user: currentUser?.name || 'Unknown',
        packListId: id
      });
    }
    
    if (selectedList?.id === id) setSelectedList(null);
    setConfirmDelete({ isOpen: false, id: null, name: '' });
  }, [selectedList, setSelectedList, addAuditLog, currentUser, packLists, dataContext]);

  // Get items for a pack list
  const getListItems = useCallback((list) => {
    return (list.items || []).map(entry => {
      const item = inventory.find(i => i.id === (entry.id || entry));
      if (!item) return null;
      return { ...item, quantity: entry.quantity || 1 };
    }).filter(Boolean);
  }, [inventory]);

  // Sort items for export
  const getSortedItems = useCallback((items) => {
    return [...items].sort((a, b) => {
      if (exportSort === 'category') return a.category.localeCompare(b.category);
      if (exportSort === 'alphabetical') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [exportSort]);

  // Handle export with category headers
  const handleExport = useCallback(() => {
    if (!selectedList) return;
    const items = getSortedItems(getListItems(selectedList));
    
    if (exportFormat === 'clipboard') {
      const text = items.map(i => `${i.quantity}x\t${i.id}\t${i.name}\t${i.category}`).join('\n');
      navigator.clipboard.writeText(text);
      addToast('Copied to clipboard!', 'success');
    } else {
      const fs = { XS: 10, S: 12, M: 14, L: 16, XL: 18 }[exportFontSize];
      const listPackages = (selectedList.packages || []).map(id => packages.find(p => p.id === id)).filter(Boolean);

      // Group items by category if sorted by category
      let tableContent = '';
      const colCount = exportSort === 'category' ? 5 : 6;
      if (exportSort === 'category') {
        const byCategory = {};
        items.forEach(item => {
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        });

        Object.entries(byCategory).forEach(([category, categoryItems]) => {
          tableContent += `
            <tr class="category-header"><td colspan="${colCount}"><strong>${category}</strong></td></tr>
            ${categoryItems.map(i => `
              <tr>
                <td class="check">☐</td>
                <td class="qty">${i.quantity}</td>
                <td>${i.id}</td>
                <td>${i.name}</td>
                <td>${i.brand || ''}</td>
              </tr>
            `).join('')}
          `;
        });
      } else {
        tableContent = items.map(i => `
          <tr>
            <td class="check">☐</td>
            <td class="qty">${i.quantity}</td>
            <td>${i.id}</td>
            <td>${i.name}</td>
            <td>${i.brand || ''}</td>
            <td>${i.category}</td>
          </tr>
        `).join('');
      }

      const categoryColumn = exportSort !== 'category' ? '<th>Category</th>' : '';
      const packagesLine = listPackages.length > 0
        ? ` | Packages: ${listPackages.map(p => p.name).join(', ')}`
        : '';

      openPrintWindow({
        title: selectedList.name,
        styles: `
          body { font-family: system-ui; font-size: ${fs}px; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; }
          .qty { width: 60px; text-align: center; }
          .check { width: 30px; }
          .category-header {
            background: #e8e8e8;
            page-break-after: avoid;
          }
          .category-header td {
            padding: 12px 8px;
            border-bottom: 2px solid #ccc;
          }
          @media print {
            .category-header { break-after: avoid; }
            tr { break-inside: avoid; }
          }
        `,
        body: `
          <h1>${selectedList.name}</h1>
          <p>Created: ${formatDate(selectedList.createdAt)} | Items: ${items.length}${packagesLine}</p>
          <table>
            <thead><tr><th class="check">✓</th><th class="qty">Qty</th><th>ID</th><th>Name</th><th>Brand</th>${categoryColumn}</tr></thead>
            <tbody>${tableContent}</tbody>
          </table>
        `,
        delay: 0,
      });
    }
    setShowExport(false);
  }, [selectedList, getListItems, getSortedItems, exportFormat, exportFontSize, exportSort, addToast, packages]);

  // Get which packages contain an item
  const getItemPackages = useCallback((itemId) => {
    return (itemToPackagesMap.get(itemId) || [])
      .map(pkgId => packages.find(p => p.id === pkgId))
      .filter(Boolean);
  }, [itemToPackagesMap, packages]);

  // Toggle packed state for an item in the detail view
  const handleTogglePacked = useCallback(async (itemId) => {
    if (!selectedList) return;
    const packedItems = selectedList.packedItems || [];
    const isPacked = packedItems.includes(itemId);
    const newPackedItems = isPacked
      ? packedItems.filter(id => id !== itemId)
      : [...packedItems, itemId];

    // Optimistically update local state
    const updatedList = { ...selectedList, packedItems: newPackedItems };
    setSelectedList(updatedList);
    dataContext.patchPackList(selectedList.id, { packedItems: newPackedItems });

    // Persist to Supabase
    if (dataContext?.updatePackList) {
      try {
        await dataContext.updatePackList(selectedList.id, {
          items: selectedList.items,
          packages: selectedList.packages,
          packedItems: newPackedItems,
        });
      } catch (err) {
        logError('Failed to toggle packed state:', err);
      }
    }
  }, [selectedList, setSelectedList, dataContext]);

  // ============================================================================
  // Name Prompt Modal
  // ============================================================================
  if (showNamePrompt) {
    const isNameEmpty = !listName.trim();
    return (
      <>
        <PageHeader title="Pack Lists" />
        
        <div className="modal-backdrop" style={styles.modal}>
          <div style={{ ...styles.modalBox, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
              <h3 style={{ margin: 0, color: colors.textPrimary }}>New Pack List</h3>
            </div>
            <div style={{ padding: spacing[4] }}>
              <label className={`form-label ${isNameEmpty ? 'label-required-empty' : ''}`}>
                Pack List Name <span className="required-indicator">*</span>
              </label>
              <input
                type="text"
                value={listName}
                onChange={e => { setListName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
                placeholder="e.g., Smith Wedding - Jan 15"
                className={`input ${isNameEmpty ? 'input-required-empty' : ''}`}
                autoFocus
              />
              {nameError && <span className="required-error-text">{nameError}</span>}
            </div>
            <div style={{ padding: spacing[4], paddingTop: 0, display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleNameSubmit} disabled={isNameEmpty}>Continue</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // Create View
  // ============================================================================
  if (showCreate) {
    const isEditing = editingList !== null;
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: 'calc(100vh - 60px)',
        overflow: 'hidden',
        padding: spacing[4]
      }}>
        {/* Header with create/save button and tally at top */}
        <PageHeader
          title={`${isEditing ? 'Edit' : 'Create'} Pack List: ${listName}`}
          subtitle={`${selectedPackageIds.length} packages, ${selectedItemIds.length} items selected`}
          action={
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleSave} disabled={selectedItemIds.length === 0 || isSaving} icon={isEditing ? Edit2 : Plus}>
                {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Pack List'}
              </Button>
            </div>
          }
        />

        {/* Panels with fixed height and scroll */}
        <div style={{ 
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: spacing[4]
        }}>
          {/* Packages Selection */}
          <div className="selection-panel" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            minHeight: 0
          }}>
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <div className="panel-header-title">
                <Layers size={16} color={colors.primary} />
                <strong>Packages</strong>
                <span className="panel-header-count">{selectedPackageIds.length} selected</span>
              </div>
              <SearchInput value={packageSearch} onChange={setPackageSearch} onClear={() => setPackageSearch('')} placeholder="Search packages..." />
            </div>
            <div className="selection-list" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
              {filteredPackages.map(pkg => {
                const selectionState = getPackageSelectionState(pkg.id);
                const isExpanded = expandedPackages.has(pkg.id);
                const pkgItems = pkg.items?.map(id => inventory.find(i => i.id === id)).filter(Boolean) || [];
                
                let itemClass = 'selection-item';
                if (selectionState === 'full') itemClass += ' selected';
                else if (selectionState === 'partial') itemClass += ' partial';
                
                return (
                  <div key={pkg.id}>
                    <div className={itemClass}>
                      <input
                        type="checkbox"
                        checked={selectionState === 'full'}
                        ref={el => { if (el) el.indeterminate = selectionState === 'partial'; }}
                        onChange={() => handleTogglePackage(pkg.id)}
                      />
                      <div className="selection-item-info" onClick={() => handleTogglePackage(pkg.id)} style={{ cursor: 'pointer' }}>
                        <div className="selection-item-name">{pkg.name}</div>
                        <div className="selection-item-meta">
                          {pkgItems.length} items
                          {selectionState === 'partial' && (
                            <span style={{ color: colors.primary, marginLeft: 8 }}>
                              ({pkg.items.filter(id => selectedItemIds.includes(id)).length} selected)
                            </span>
                          )}
                        </div>
                      </div>
                      <button className="btn-icon" onClick={(e) => togglePackageExpansion(pkg.id, e)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="package-expand-content">
                        {pkgItems.map(item => (
                          <div key={item.id} className="package-expand-item">
                            • {item.name} ({item.id})
                            {selectedItemIds.includes(item.id) && <span style={{ color: colors.primary }}> ✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredPackages.length === 0 && (
                <p style={{ color: colors.textMuted, textAlign: 'center', padding: 16 }}>No packages found</p>
              )}
            </div>
          </div>

          {/* Items Selection with Quantities */}
          <div className="selection-panel" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            minHeight: 0
          }}>
            <div className="panel-header" style={{ flexShrink: 0, flexWrap: 'wrap', gap: spacing[2] }}>
              <div className="panel-header-title">
                <Box size={16} color={colors.primary} />
                <strong>Individual Items</strong>
                <span className="panel-header-count">{selectedItemIds.length} selected</span>
              </div>
              <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center', flexWrap: 'wrap' }}>
                <Select
                  value={itemCategoryFilter}
                  onChange={e => setItemCategoryFilter(e.target.value)}
                  options={availableCategories.map(cat => ({
                    value: cat,
                    label: cat === 'all' ? 'All Categories' : cat
                  }))}
                  style={{ minWidth: '160px' }}
                />
                <SearchInput value={itemSearch} onChange={setItemSearch} onClear={() => setItemSearch('')} placeholder="Search items..." />
              </div>
            </div>
            <div className="selection-list" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
              {filteredItems.length === 0 ? (
                <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textMuted }}>
                  No items found{itemCategoryFilter !== 'all' ? ` in ${itemCategoryFilter}` : ''}
                  {itemSearch && ` matching "${itemSearch}"`}
                </div>
              ) : (
                filteredItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                const itemPackages = getItemPackages(item.id);
                const showQuantity = hasQuantityTracking(item);
                
                return (
                  <div 
                    key={item.id} 
                    className={`selection-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleItem(item.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="selection-item-info">
                      <div className="selection-item-name">{item.name}</div>
                      <div className="selection-item-meta">
                        {item.id} • {item.category}
                        {itemPackages.length > 0 && (
                          <span className="from-package">
                            (in: {itemPackages.map(p => p.name).join(', ')})
                          </span>
                        )}
                      </div>
                    </div>
                    {showQuantity && isSelected && (
                      <div className="quantity-input-wrapper" onClick={e => e.stopPropagation()}>
                        <label>Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={itemQuantities[item.id] || 1}
                          onChange={e => handleQuantityChange(item.id, e.target.value)}
                          style={styles.input}
                        />
                      </div>
                    )}
                  </div>
                );
              })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Pack List Detail View
  // ============================================================================
  if (selectedList) {
    const listItems = getListItems(selectedList);
    const sortedItems = getSortedItems(listItems);
    const listPackages = (selectedList.packages || []).map(id => packages.find(p => p.id === id)).filter(Boolean);
    const packedItems = selectedList.packedItems || [];
    const packedCount = listItems.filter(i => packedItems.includes(i.id)).length;
    const packProgress = listItems.length > 0 ? Math.round((packedCount / listItems.length) * 100) : 0;

    return (
      <div className="view-container">
        <div className="detail-header">
          <div className="detail-header-left">
            <button className="btn-icon" onClick={() => setSelectedList(null)}>
              <ArrowLeft size={18} />
            </button>
            <div className="detail-header-info">
              <h2>{selectedList.name}</h2>
              <div className="detail-header-meta">
                Created {formatDate(selectedList.createdAt)} • {listItems.length} items
                {listPackages.length > 0 && ` • ${listPackages.length} packages`}
              </div>
            </div>
          </div>
          <div className="detail-header-actions">
            <Button onClick={() => setShowScanToPack(true)} icon={ScanLine}>Scan to Pack</Button>
            <Button variant="secondary" onClick={() => handleStartEdit(selectedList)} icon={Edit2}>Edit</Button>
            <Button variant="secondary" onClick={() => setShowExport(true)} icon={Download}>Export / Print</Button>
            <button className="btn-icon danger" onClick={() => setConfirmDelete({ isOpen: true, id: selectedList.id, name: selectedList.name })}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Pack progress bar */}
        {listItems.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[1] }}>
              <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.textSecondary }}>
                Pack Progress
              </span>
              <span style={{ fontSize: typography.fontSize.sm, color: packProgress === 100 ? colors.success : colors.textMuted }}>
                {packedCount}/{listItems.length} packed ({packProgress}%)
              </span>
            </div>
            <div style={{ height: 8, borderRadius: borderRadius.full, background: withOpacity(colors.border, 50), overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${packProgress}%`,
                borderRadius: borderRadius.full,
                background: packProgress === 100 ? colors.success : colors.primary,
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Packages included */}
        {listPackages.length > 0 && (
          <div style={{ marginBottom: spacing[4] }}>
            <h4 style={{ margin: `0 0 ${spacing[2]}px`, color: colors.textSecondary, fontSize: typography.fontSize.sm }}>Packages Included:</h4>
            <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' }}>
              {listPackages.map(pkg => (
                <Badge key={pkg.id} text={pkg.name} color={colors.accent2} />
              ))}
            </div>
          </div>
        )}

        <Card padding={false} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <CardHeader title={`Items (${listItems.length})`} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sortedItems.map(item => {
              const isPacked = packedItems.includes(item.id);
              return (
                <div key={item.id} className="list-item" style={{ opacity: isPacked ? 0.7 : 1 }}>
                  <button
                    className="btn-icon"
                    onClick={(e) => { e.stopPropagation(); handleTogglePacked(item.id); }}
                    title={isPacked ? 'Mark as unpacked' : 'Mark as packed'}
                    style={{ color: isPacked ? colors.success : colors.textMuted }}
                  >
                    {isPacked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                  {item.quantity > 1 && (
                    <div style={{
                      minWidth: 32, height: 32, borderRadius: borderRadius.md,
                      background: withOpacity(colors.primary, 20),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: typography.fontWeight.semibold, color: colors.primary, fontSize: typography.fontSize.base,
                    }}>
                      {item.quantity}x
                    </div>
                  )}
                  <div
                    className="list-item-content"
                    style={{ cursor: 'pointer', textDecoration: isPacked ? 'line-through' : 'none' }}
                    onClick={() => onViewItem(item.id, {
                      returnTo: 'packList',
                      packListId: selectedList?.id,
                      backLabel: 'Back to Pack List'
                    })}
                  >
                    <div className="list-item-badges">
                      <Badge text={item.id} color={colors.primary} />
                      <Badge text={item.category} color={colors.accent2} />
                    </div>
                    <div className="list-item-title">
                      {item.name}
                      {item.brand && <span style={{ color: colors.textMuted, fontWeight: typography.fontWeight.normal }}> — {item.brand}</span>}
                    </div>
                  </div>
                  <Badge text={item.status} color={getStatusColor(item.status)} />
                  <ChevronRight size={16} color={colors.textMuted} style={{ cursor: 'pointer' }} onClick={() => onViewItem(item.id, {
                    returnTo: 'packList',
                    packListId: selectedList?.id,
                    backLabel: 'Back to Pack List'
                  })} />
                </div>
              );
            })}
          </div>
        </Card>
        
        {/* Export Modal */}
        {showExport && (
          <div className="modal-backdrop" style={styles.modal} onClick={() => setShowExport(false)}>
            <div onClick={e => e.stopPropagation()} style={{ ...styles.modalBox, maxWidth: 450 }}>
              <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
                <h3 style={{ margin: 0, color: colors.textPrimary }}>Export Pack List</h3>
              </div>
              <div style={{ padding: spacing[4] }}>
                <div className="form-section">
                  <label className="form-label">Sort By</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['category', 'Category'], ['alphabetical', 'A-Z']].map(([v, l]) => (
                      <button key={v} onClick={() => setExportSort(v)} style={{ ...styles.btnSec, flex: 1, justifyContent: 'center', background: exportSort === v ? withOpacity(colors.primary, 30) : 'transparent', borderColor: exportSort === v ? colors.primary : colors.border }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="form-section">
                  <label className="form-label">Font Size</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['XS', 'S', 'M', 'L', 'XL'].map(s => (
                      <button key={s} onClick={() => setExportFontSize(s)} style={{ ...styles.btnSec, flex: 1, justifyContent: 'center', background: exportFontSize === s ? withOpacity(colors.primary, 30) : 'transparent', borderColor: exportFontSize === s ? colors.primary : colors.border }}>{s}</button>
                    ))}
                  </div>
                </div>
                <div className="form-section">
                  <label className="form-label">Format</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[['print', 'Print', Printer], ['clipboard', 'Copy', Copy]].map(([v, l, Icon]) => (
                      <button key={v} onClick={() => setExportFormat(v)} style={{ ...styles.btnSec, flex: 1, justifyContent: 'center', gap: 8, background: exportFormat === v ? withOpacity(colors.primary, 30) : 'transparent', borderColor: exportFormat === v ? colors.primary : colors.border }}><Icon size={14} />{l}</button>
                    ))}
                  </div>
                </div>
                <Button fullWidth onClick={handleExport}>Export</Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Scan to Pack Modal */}
        {showScanToPack && (
          <ScanToPackOverlay
            listItems={listItems}
            packedItems={packedItems}
            onTogglePacked={handleTogglePacked}
            onClose={() => setShowScanToPack(false)}
          />
        )}

        {/* Delete Confirmation */}
        {confirmDelete.isOpen && (
          <ConfirmDialog
            isOpen={confirmDelete.isOpen}
            title="Delete Pack List"
            message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
            onConfirm={() => handleDelete(confirmDelete.id)}
            onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // Pack Lists List View
  // ============================================================================
  
  return (
    <>
      <PageHeader
        title="Pack Lists"
        action={<Button onClick={handleStartCreate} icon={Plus}>Create Pack List</Button>}
      />

      <div style={{ marginBottom: spacing[4], maxWidth: 300 }}>
        <SearchInput value={packListSearch} onChange={setPackListSearch} onClear={() => setPackListSearch('')} placeholder="Search pack lists..." />
      </div>

      <div style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: spacing[4] }} />
      
      {filteredPackLists.length === 0 ? (
        <EmptyState 
          icon={Box} 
          title={packLists.length === 0 ? "No Pack Lists Yet" : "No Pack Lists Found"}
          description={packLists.length === 0 ? "Create a pack list to build a checklist of packages and items for a specific job or project." : "No pack lists match your search."} 
        />
      ) : (
        <div className="card-grid">
          {filteredPackLists.map(list => {
            const listItems = getListItems(list);
            const listPackages = (list.packages || []).map(id => packages.find(p => p.id === id)).filter(Boolean);
            
            return (
              <Card key={list.id} onClick={() => setSelectedList(list)} className="card-clickable">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                  <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>{list.name}</h3>
                  <button 
                    className="btn-icon danger"
                    onClick={e => { e.stopPropagation(); setConfirmDelete({ isOpen: true, id: list.id, name: list.name }); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2], flexWrap: 'wrap' }}>
                  <Badge text={`${listItems.length} items`} color={colors.primary} />
                  {listPackages.length > 0 && <Badge text={`${listPackages.length} packages`} color={colors.accent2} />}
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                  Created {formatDate(list.createdAt)}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        title="Delete Pack List"
        message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
      />
    </>
  );
}

// ============================================================================
// Scan to Pack Overlay
// Full-screen scanner optimized for rapid pack scanning — scans a QR label,
// auto-marks the item as packed, flashes a confirmation, and continues.
// ============================================================================
function ScanToPackOverlay({ listItems, packedItems, onTogglePacked, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanLog, setScanLog] = useState([]); // { id, name, status: 'packed'|'already'|'not-found' }
  const [flashItem, setFlashItem] = useState(null); // briefly shows last scanned item
  const [manualCode, setManualCode] = useState('');
  const lastScannedRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  // Build lookup map of items in this pack list
  const listItemMap = useMemo(() => {
    const map = new Map();
    listItems.forEach(item => {
      map.set(item.id.toLowerCase(), item);
      if (item.serialNumber) map.set(item.serialNumber.toLowerCase(), item);
    });
    return map;
  }, [listItems]);

  const packedCount = listItems.filter(i => packedItems.includes(i.id)).length;

  // Process a scanned/entered code
  const processCode = useCallback((code) => {
    const item = listItemMap.get(code.toLowerCase());

    if (!item) {
      setScanLog(prev => [{ id: code, name: code, status: 'not-found', ts: Date.now() }, ...prev].slice(0, 50));
      setFlashItem({ name: code, status: 'not-found' });
    } else if (packedItems.includes(item.id)) {
      setScanLog(prev => [{ id: item.id, name: item.name, status: 'already', ts: Date.now() }, ...prev].slice(0, 50));
      setFlashItem({ name: item.name, status: 'already' });
    } else {
      onTogglePacked(item.id);
      setScanLog(prev => [{ id: item.id, name: item.name, status: 'packed', ts: Date.now() }, ...prev].slice(0, 50));
      setFlashItem({ name: item.name, status: 'packed' });
    }

    // Clear flash after 1.5s
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlashItem(null), 1500);
  }, [listItemMap, packedItems, onTogglePacked]);

  // Start camera
  const startScanning = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanFrame();
      }
    } catch (err) {
      logError('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera access and try again.'
        : 'Could not access camera. Use manual entry below.');
    }
  };

  // Stop camera
  const stopScanning = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    setScanning(false);
  }, []);

  // Frame scanning loop
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });

      if (qr && qr.data && qr.data !== lastScannedRef.current) {
        lastScannedRef.current = qr.data;
        processCode(qr.data);
        // Reset dedup after 2s so the same code can be re-scanned
        setTimeout(() => { lastScannedRef.current = null; }, 2000);
      }
    }
    animationRef.current = requestAnimationFrame(scanFrame);
  };

  // Manual entry
  const handleManualEntry = useCallback(() => {
    if (!manualCode.trim()) return;
    processCode(manualCode.trim());
    setManualCode('');
  }, [manualCode, processCode]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopScanning();
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, [stopScanning]);

  const flashBg = flashItem?.status === 'packed' ? colors.success
    : flashItem?.status === 'already' ? colors.warning
    : colors.danger;

  return (
    <div className="modal-backdrop" style={{ ...styles.modal, zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...styles.modalBox, maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: colors.textPrimary }}>Scan to Pack</h3>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: 2 }}>
              {packedCount}/{listItems.length} packed
            </div>
          </div>
          <button className="btn-icon" onClick={() => { stopScanning(); onClose(); }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: spacing[4], flex: 1, overflowY: 'auto' }}>
          {/* Camera view */}
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '4/3',
            background: colors.bgDark, borderRadius: borderRadius.lg, overflow: 'hidden',
            marginBottom: spacing[3],
          }}>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: scanning ? 'block' : 'none' }} playsInline muted />

            {scanning && (
              <>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '60%', height: '60%', border: `2px solid ${colors.primary}`, borderRadius: borderRadius.lg, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }} />
                </div>
                <div style={{
                  position: 'absolute', bottom: spacing[2], left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)', padding: `${spacing[1]}px ${spacing[3]}px`,
                  borderRadius: borderRadius.md, color: '#fff', fontSize: typography.fontSize.sm,
                }}>
                  Point camera at QR label...
                </div>
              </>
            )}

            {!scanning && (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: colors.textMuted }}>
                <ScanLine size={48} strokeWidth={1.5} />
                <p style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>Camera not active</p>
              </div>
            )}

            {/* Flash overlay for scan feedback */}
            {flashItem && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: withOpacity(flashBg, 25), transition: 'opacity 0.3s', pointerEvents: 'none',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.8)', color: '#fff', padding: `${spacing[2]}px ${spacing[4]}px`,
                  borderRadius: borderRadius.lg, textAlign: 'center', maxWidth: '80%',
                }}>
                  <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold }}>
                    {flashItem.status === 'packed' ? '✓ Packed!' : flashItem.status === 'already' ? '✓ Already Packed' : '✗ Not in List'}
                  </div>
                  <div style={{ fontSize: typography.fontSize.sm, marginTop: 4, opacity: 0.8 }}>
                    {flashItem.name}
                  </div>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Camera error */}
          {cameraError && (
            <div style={{
              background: withOpacity(colors.danger, 20), border: `1px solid ${withOpacity(colors.danger, 50)}`,
              borderRadius: borderRadius.md, padding: spacing[3], marginBottom: spacing[3],
              color: colors.danger, fontSize: typography.fontSize.sm,
            }}>
              {cameraError}
            </div>
          )}

          {/* Camera control */}
          {!scanning ? (
            <Button fullWidth onClick={startScanning} icon={ScanLine} style={{ marginBottom: spacing[3] }}>
              Start Camera
            </Button>
          ) : (
            <Button fullWidth variant="secondary" onClick={stopScanning} style={{ marginBottom: spacing[3] }}>
              Stop Camera
            </Button>
          )}

          {/* Manual entry */}
          <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: spacing[3], marginBottom: spacing[3] }}>
            <label style={styles.label}>Or enter item ID manually</label>
            <div style={{ display: 'flex', gap: spacing[2] }}>
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualEntry()}
                placeholder="Item ID or Serial Number"
                style={{ ...styles.input, flex: 1 }}
              />
              <Button onClick={handleManualEntry} disabled={!manualCode.trim()}>
                Pack
              </Button>
            </div>
          </div>

          {/* Scan log */}
          {scanLog.length > 0 && (
            <div>
              <label style={{ ...styles.label, marginBottom: spacing[2] }}>Scan History</label>
              <div style={{ maxHeight: 180, overflowY: 'auto', borderRadius: borderRadius.md, border: `1px solid ${colors.borderLight}` }}>
                {scanLog.map((entry, i) => (
                  <div key={`${entry.id}-${entry.ts}`} style={{
                    display: 'flex', alignItems: 'center', gap: spacing[2],
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    borderBottom: i < scanLog.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                    fontSize: typography.fontSize.sm,
                    background: entry.status === 'packed' ? withOpacity(colors.success, 8) : 'transparent',
                  }}>
                    <span style={{
                      color: entry.status === 'packed' ? colors.success : entry.status === 'already' ? colors.warning : colors.danger,
                      fontWeight: typography.fontWeight.semibold, minWidth: 16,
                    }}>
                      {entry.status === 'packed' ? '✓' : entry.status === 'already' ? '–' : '✗'}
                    </span>
                    <span style={{ flex: 1, color: colors.textPrimary }}>{entry.name}</span>
                    <span style={{ color: colors.textMuted, fontSize: typography.fontSize.xs }}>
                      {entry.status === 'packed' ? 'Packed' : entry.status === 'already' ? 'Already packed' : 'Not in list'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ScanToPackOverlay.propTypes = {
  listItems: PropTypes.array.isRequired,
  packedItems: PropTypes.array.isRequired,
  onTogglePacked: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

PackListsView.propTypes = {
  packLists: PropTypes.array.isRequired,
  dataContext: PropTypes.object,
  inventory: PropTypes.array.isRequired,
  packages: PropTypes.array.isRequired,
  categorySettings: PropTypes.object,
  onViewItem: PropTypes.func.isRequired,
  addAuditLog: PropTypes.func,
  currentUser: PropTypes.object,
  initialSelectedList: PropTypes.object,
  onListSelect: PropTypes.func,
};

export default memo(PackListsView);
