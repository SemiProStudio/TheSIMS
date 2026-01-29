// ============================================================================
// Pack Lists View Component
// Create job-specific lists from packages and/or individual items
// Supports quantity input for items with quantity tracking
// ============================================================================

import React, { memo, useState, useCallback, useMemo } from 'react';
import { Plus, Package, Trash2, ArrowLeft, Download, Printer, Copy, Box, Layers, ChevronRight, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from './theme.js';
import { formatDate, generateId, getStatusColor } from './utils.js';
import { Badge, Card, CardHeader, Button, SearchInput, EmptyState, ConfirmDialog } from './components/ui.jsx';
import { useData } from './lib/DataContext.jsx';

function PackListsView({ 
  packLists, 
  setPackLists, 
  inventory, 
  packages,
  categorySettings,
  onViewItem,
  addAuditLog,
  currentUser,
  initialSelectedList = null,
  onListSelect,
}) {
  const dataContext = useData();
  const [selectedListInternal, setSelectedListInternal] = useState(initialSelectedList);
  const [showCreate, setShowCreate] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [showExport, setShowExport] = useState(false);
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
  
  // Create form state
  const [listName, setListName] = useState('');
  const [nameError, setNameError] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [itemQuantities, setItemQuantities] = useState({});
  const [packageSearch, setPackageSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [expandedPackages, setExpandedPackages] = useState(new Set());
  const [editingList, setEditingList] = useState(null);
  
  // Export options
  const [exportSort, setExportSort] = useState('category');
  const [exportFontSize, setExportFontSize] = useState('M');
  const [exportFormat, setExportFormat] = useState('print');

  // Get individual items (non-kits)
  const individualItems = useMemo(() => inventory.filter(item => !item.isKit), [inventory]);

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

  // Filter items - show ALL items
  const filteredItems = useMemo(() => {
    if (!itemSearch.trim()) return individualItems;
    const q = itemSearch.toLowerCase();
    return individualItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.id.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [individualItems, itemSearch]);

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
      const newSelected = prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId];
      
      // Update package selections based on new item state
      const pkgIds = itemToPackagesMap.get(itemId) || [];
      pkgIds.forEach(pkgId => {
        const pkg = packages.find(p => p.id === pkgId);
        if (!pkg) return;
        
        const allSelected = pkg.items.every(id => 
          id === itemId ? !prev.includes(itemId) : newSelected.includes(id)
        );
        
        if (allSelected && !prev.includes(itemId)) {
          setSelectedPackageIds(prevPkgs => 
            prevPkgs.includes(pkgId) ? prevPkgs : [...prevPkgs, pkgId]
          );
        } else if (!allSelected && selectedPackageIds.includes(pkgId)) {
          setSelectedPackageIds(prevPkgs => prevPkgs.filter(id => id !== pkgId));
        }
      });
      
      return newSelected;
    });
  }, [itemToPackagesMap, packages, selectedPackageIds]);

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
    if (!listName.trim() || selectedItemIds.length === 0) return;

    if (editingList) {
      // Update existing list
      const updatedList = {
        ...editingList,
        name: listName.trim(),
        packages: [...selectedPackageIds],
        items: selectedItemIds.map(id => ({
          id,
          quantity: itemQuantities[id] || 1,
        })),
        updatedAt: new Date().toISOString(),
      };

      // Persist to Supabase via DataContext
      if (dataContext?.updatePackList) {
        try {
          await dataContext.updatePackList(editingList.id, updatedList);
        } catch (err) {
          console.error('Failed to update pack list:', err);
          setPackLists(prev => prev.map(pl => pl.id === editingList.id ? updatedList : pl));
        }
      } else {
        setPackLists(prev => prev.map(pl => pl.id === editingList.id ? updatedList : pl));
      }
      
      // Log update
      if (addAuditLog) {
        addAuditLog({
          type: 'pack_list_updated',
          description: `Pack list "${updatedList.name}" updated with ${selectedItemIds.length} items`,
          user: currentUser?.name || 'Unknown',
          packListId: updatedList.id
        });
      }
      
      resetForm();
      setShowCreate(false);
      setSelectedList(updatedList);
    } else {
      // Create new list
      const newList = {
        id: generateId(),
        name: listName.trim(),
        createdAt: new Date().toISOString(),
        packages: [...selectedPackageIds],
        items: selectedItemIds.map(id => ({
          id,
          quantity: itemQuantities[id] || 1,
        })),
      };

      // Persist to Supabase via DataContext
      if (dataContext?.createPackList) {
        try {
          await dataContext.createPackList(newList);
        } catch (err) {
          console.error('Failed to create pack list:', err);
          setPackLists(prev => [...prev, newList]);
        }
      } else {
        setPackLists(prev => [...prev, newList]);
      }
      
      // Log creation
      if (addAuditLog) {
        addAuditLog({
          type: 'pack_list_created',
          description: `Pack list "${newList.name}" created with ${selectedItemIds.length} items`,
          user: currentUser?.name || 'Unknown',
          packListId: newList.id
        });
      }
      
      resetForm();
      setShowCreate(false);
      setSelectedList(newList);
    }
  }, [listName, selectedPackageIds, selectedItemIds, itemQuantities, setPackLists, resetForm, addAuditLog, currentUser, editingList, setSelectedList, dataContext]);

  // Delete pack list with audit logging
  const handleDelete = useCallback(async (id) => {
    const list = packLists.find(pl => pl.id === id);
    
    // Persist to Supabase via DataContext
    if (dataContext?.deletePackList) {
      try {
        await dataContext.deletePackList(id);
      } catch (err) {
        console.error('Failed to delete pack list:', err);
        setPackLists(prev => prev.filter(pl => pl.id !== id));
      }
    } else {
      setPackLists(prev => prev.filter(pl => pl.id !== id));
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
  }, [setPackLists, selectedList, addAuditLog, currentUser, packLists, dataContext]);

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
      alert('Copied to clipboard!');
    } else {
      const fs = { XS: 10, S: 12, M: 14, L: 16, XL: 18 }[exportFontSize];
      const w = window.open('', '_blank');
      
      // Group items by category if sorted by category
      let tableContent = '';
      if (exportSort === 'category') {
        // Group by category with headers
        const byCategory = {};
        items.forEach(item => {
          if (!byCategory[item.category]) byCategory[item.category] = [];
          byCategory[item.category].push(item);
        });
        
        Object.entries(byCategory).forEach(([category, categoryItems]) => {
          tableContent += `
            <tr class="category-header"><td colspan="4"><strong>${category}</strong></td></tr>
            ${categoryItems.map(i => `
              <tr>
                <td class="check">☐</td>
                <td class="qty">${i.quantity}</td>
                <td>${i.id}</td>
                <td>${i.name}</td>
              </tr>
            `).join('')}
          `;
        });
      } else {
        // Alphabetical - show category column
        tableContent = items.map(i => `
          <tr>
            <td class="check">☐</td>
            <td class="qty">${i.quantity}</td>
            <td>${i.id}</td>
            <td>${i.name}</td>
            <td>${i.category}</td>
          </tr>
        `).join('');
      }
      
      const categoryColumn = exportSort !== 'category' ? '<th>Category</th>' : '';
      
      w.document.write(`<!DOCTYPE html><html><head><title>${selectedList.name}</title>
        <style>
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
        </style>
        </head><body>
        <h1>${selectedList.name}</h1>
        <p>Created: ${formatDate(selectedList.createdAt)} | Items: ${items.length}</p>
        <table>
          <thead><tr><th class="check">✓</th><th class="qty">Qty</th><th>ID</th><th>Name</th>${categoryColumn}</tr></thead>
          <tbody>${tableContent}</tbody>
        </table>
        </body></html>`);
      w.document.close();
      w.print();
    }
    setShowExport(false);
  }, [selectedList, getListItems, getSortedItems, exportFormat, exportFontSize, exportSort]);

  // Get which packages contain an item
  const getItemPackages = useCallback((itemId) => {
    return (itemToPackagesMap.get(itemId) || [])
      .map(pkgId => packages.find(p => p.id === pkgId))
      .filter(Boolean);
  }, [itemToPackagesMap, packages]);

  // ============================================================================
  // Name Prompt Modal
  // ============================================================================
  if (showNamePrompt) {
    const isNameEmpty = !listName.trim();
    return (
      <>
        <div className="page-header">
          <h2 className="page-title">Pack Lists</h2>
        </div>
        
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
      <div className="view-container">
        {/* Header with create/save button and tally at top */}
        <div className="page-header">
          <div>
            <h2 className="page-title">{isEditing ? 'Edit' : 'Create'} Pack List: {listName}</h2>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: 4 }}>
              {selectedPackageIds.length} packages, {selectedItemIds.length} items selected
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={selectedItemIds.length === 0} icon={isEditing ? Edit2 : Plus}>
              {isEditing ? 'Save Changes' : 'Create Pack List'}
            </Button>
          </div>
        </div>

        {/* Panels with fixed height and scroll */}
        <div className="two-panel-grid" style={{ flex: 1, minHeight: 0 }}>
          {/* Packages Selection */}
          <div className="selection-panel">
            <div className="panel-header">
              <div className="panel-header-title">
                <Layers size={16} color={colors.primary} />
                <strong>Packages</strong>
                <span className="panel-header-count">{selectedPackageIds.length} selected</span>
              </div>
              <SearchInput value={packageSearch} onChange={setPackageSearch} onClear={() => setPackageSearch('')} placeholder="Search packages..." />
            </div>
            <div className="selection-list">
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
          <div className="selection-panel">
            <div className="panel-header">
              <div className="panel-header-title">
                <Box size={16} color={colors.primary} />
                <strong>Individual Items</strong>
                <span className="panel-header-count">{selectedItemIds.length} selected</span>
              </div>
              <SearchInput value={itemSearch} onChange={setItemSearch} onClear={() => setItemSearch('')} placeholder="Search items..." />
            </div>
            <div className="selection-list">
              {filteredItems.map(item => {
                const isSelected = selectedItemIds.includes(item.id);
                const itemPackages = getItemPackages(item.id);
                const showQuantity = hasQuantityTracking(item);
                
                return (
                  <div key={item.id} className={`selection-item ${isSelected ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
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
                      <div className="quantity-input-wrapper">
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
              })}
              {filteredItems.length === 0 && (
                <p style={{ color: colors.textMuted, textAlign: 'center', padding: 16 }}>No items found</p>
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
            <Button variant="secondary" onClick={() => handleStartEdit(selectedList)} icon={Edit2}>Edit</Button>
            <Button onClick={() => setShowExport(true)} icon={Download}>Export / Print</Button>
            <button className="btn-icon danger" onClick={() => setConfirmDelete({ isOpen: true, id: selectedList.id, name: selectedList.name })}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

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
            {sortedItems.map(item => (
              <div key={item.id} className="list-item" onClick={() => onViewItem(item.id, {
                returnTo: 'packList',
                packListId: selectedList?.id,
                backLabel: 'Back to Pack List'
              })}>
                {item.quantity > 1 && (
                  <div style={{ 
                    minWidth: 32, height: 32, borderRadius: 6,
                    background: withOpacity(colors.primary, 20),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, color: colors.primary, fontSize: 13,
                  }}>
                    {item.quantity}x
                  </div>
                )}
                <div className="list-item-content">
                  <div className="list-item-badges">
                    <Badge text={item.id} color={colors.primary} />
                    <Badge text={item.category} color={colors.accent2} />
                  </div>
                  <div className="list-item-title">{item.name}</div>
                </div>
                <Badge text={item.status} color={getStatusColor(item.status)} />
                <ChevronRight size={16} color={colors.textMuted} />
              </div>
            ))}
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
        
        {/* Delete Confirmation */}
        {confirmDelete.isOpen && (
          <ConfirmDialog
            isOpen={confirmDelete.isOpen}
            title="Delete Pack List"
            message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
            onConfirm={() => { handleDelete(confirmDelete.id); setSelectedList(null); }}
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
      <div className="page-header">
        <h2 className="page-title">Pack Lists</h2>
        <Button onClick={handleStartCreate} icon={Plus}>Create Pack List</Button>
      </div>
      
      {packLists.length === 0 ? (
        <EmptyState 
          icon={Box} 
          title="No Pack Lists Yet" 
          description="Create a pack list to build a checklist of packages and items for a specific job or project." 
        />
      ) : (
        <div className="card-grid">
          {packLists.map(list => {
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

export default memo(PackListsView);
