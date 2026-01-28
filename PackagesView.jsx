// ============================================================================
// Packages View Component
// Manages package templates - create, edit, view packages
// ============================================================================

import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Package, Trash2, ArrowLeft, ChevronRight, Edit2, AlertTriangle, Lightbulb } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from './theme.js';
import { formatMoney, getStatusColor } from './utils.js';
import { Badge, Card, CardHeader, Button, SearchInput, EmptyState, ConfirmDialog } from './components/ui.jsx';

function PackagesView({ 
  packages, 
  setPackages, 
  inventory, 
  onViewItem,
  initialSelectedPackage = null,
  onPackageSelect,
}) {
  const [selectedPackage, setSelectedPackageInternal] = useState(initialSelectedPackage);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetailsPrompt, setShowDetailsPrompt] = useState(false); // Details popup
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageSearch, setPackageSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });
  
  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formItems, setFormItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [nameError, setNameError] = useState('');

  // Wrapper to sync with parent state
  const setSelectedPackage = useCallback((pkg) => {
    setSelectedPackageInternal(pkg);
    if (onPackageSelect) onPackageSelect(pkg);
  }, [onPackageSelect]);

  // Sync with initialSelectedPackage prop changes
  useEffect(() => {
    if (initialSelectedPackage) {
      setSelectedPackageInternal(initialSelectedPackage);
    }
  }, [initialSelectedPackage]);

  // Get individual items (non-kits) for selection
  const individualItems = useMemo(() => inventory.filter(item => !item.isKit), [inventory]);

  // Filter packages by search
  const filteredPackages = useMemo(() => {
    if (!packageSearch.trim()) return packages;
    const q = packageSearch.toLowerCase();
    return packages.filter(pkg => 
      pkg.name.toLowerCase().includes(q) || 
      pkg.id.toLowerCase().includes(q) ||
      (pkg.description && pkg.description.toLowerCase().includes(q))
    );
  }, [packages, packageSearch]);

  // Filter items for selection
  const filteredItemsForSelect = useMemo(() => {
    if (!itemSearch.trim()) return individualItems;
    const q = itemSearch.toLowerCase();
    return individualItems.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.id.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [individualItems, itemSearch]);

  // Get items for a package
  const getPackageItems = useCallback((pkg) => {
    if (!pkg.items) return [];
    return pkg.items.map(id => inventory.find(i => i.id === id)).filter(Boolean);
  }, [inventory]);

  // Get suggested accessories for a package based on requiredAccessories
  const getSuggestedAccessories = useCallback((pkg) => {
    const packageItemIds = new Set(pkg.items || []);
    const suggestions = [];
    const seenIds = new Set();

    pkg.items?.forEach(itemId => {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;

      if (item.requiredAccessories && item.requiredAccessories.length > 0) {
        item.requiredAccessories.forEach(accId => {
          if (!packageItemIds.has(accId) && !seenIds.has(accId)) {
            const accessory = inventory.find(i => i.id === accId);
            if (accessory) {
              suggestions.push({ item: accessory, reason: `Required for ${item.name}` });
              seenIds.add(accId);
            }
          }
        });
      }
    });

    return suggestions;
  }, [inventory]);

  const calculateValue = useCallback((items) => {
    return items.reduce((sum, item) => sum + (item.currentValue || 0), 0);
  }, []);

  const allItemsAvailable = useCallback((items) => {
    return items.every(item => item.status === 'available');
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('');
    setFormDescription('');
    setFormCategory('');
    setFormItems([]);
    setItemSearch('');
    setNameError('');
  }, []);

  // Open create mode - show details prompt first
  const handleStartCreate = useCallback(() => {
    resetForm();
    setEditingPackage(null);
    setShowDetailsPrompt(true);
  }, [resetForm]);

  // Handle details prompt submission
  const handleDetailsSubmit = useCallback(() => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setNameError('Package name is required');
      return;
    }
    // Check for duplicate name (case-insensitive)
    const isDuplicate = packages.some(pkg => 
      pkg.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setNameError('A package with this name already exists');
      return;
    }
    setShowDetailsPrompt(false);
    setShowCreate(true);
  }, [formName, packages]);

  // Open edit mode - go straight to item selection (details already exist)
  const handleStartEdit = useCallback((pkg) => {
    setFormName(pkg.name);
    setFormDescription(pkg.description || '');
    setFormCategory(pkg.category || '');
    setFormItems([...pkg.items]);
    setEditingPackage(pkg);
    setShowCreate(true);
    setSelectedPackage(null);
  }, [setSelectedPackage]);

  // Cancel create/edit - return to package detail if editing
  const handleCancel = useCallback(() => {
    if (editingPackage) {
      // Return to the package detail view
      const pkg = packages.find(p => p.id === editingPackage.id);
      if (pkg) {
        setSelectedPackage(pkg);
      }
    }
    setShowCreate(false);
    setShowDetailsPrompt(false);
    setEditingPackage(null);
    resetForm();
  }, [resetForm, editingPackage, packages, setSelectedPackage]);

  // Toggle item selection
  const handleToggleItem = useCallback((itemId) => {
    setFormItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Save package (create or update)
  const handleSave = useCallback(() => {
    if (!formName.trim() || formItems.length === 0) return;

    if (editingPackage) {
      // Update existing
      const updatedPkg = { 
        ...editingPackage, 
        name: formName.trim(), 
        description: formDescription.trim(), 
        category: formCategory.trim(), 
        items: formItems 
      };
      setPackages(prev => prev.map(pkg => 
        pkg.id === editingPackage.id ? updatedPkg : pkg
      ));
      // Return to the updated package detail
      setSelectedPackage(updatedPkg);
      setShowCreate(false);
      setEditingPackage(null);
      resetForm();
    } else {
      // Generate simple sequential ID like PKG-001, PKG-002, etc.
      const existingNumbers = packages
        .map(p => p.id.match(/^PKG-(\d+)$/))
        .filter(Boolean)
        .map(m => parseInt(m[1], 10));
      const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const newId = `PKG-${String(nextNum).padStart(3, '0')}`;
      
      // Create new
      const newPackage = {
        id: newId,
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory.trim(),
        items: formItems,
        notes: [],
      };
      setPackages(prev => [...prev, newPackage]);
      // Show the new package
      setSelectedPackage(newPackage);
      setShowCreate(false);
      resetForm();
    }
  }, [formName, formDescription, formCategory, formItems, editingPackage, setPackages, setSelectedPackage, resetForm, packages]);

  // Delete package - close detail first, then show confirm
  const handleDeleteClick = useCallback((pkg) => {
    setConfirmDelete({ isOpen: true, id: pkg.id, name: pkg.name });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    const { id } = confirmDelete;
    setPackages(prev => prev.filter(p => p.id !== id));
    setSelectedPackage(null);
    setConfirmDelete({ isOpen: false, id: null, name: '' });
  }, [confirmDelete, setPackages, setSelectedPackage]);

  // Add suggested accessory to package
  const handleAddSuggested = useCallback((itemId) => {
    if (!selectedPackage) return;
    const newItems = [...selectedPackage.items, itemId];
    setPackages(prev => prev.map(pkg => 
      pkg.id === selectedPackage.id 
        ? { ...pkg, items: newItems }
        : pkg
    ));
    setSelectedPackage(prev => ({ ...prev, items: newItems }));
  }, [selectedPackage, setPackages, setSelectedPackage]);

  // Handle viewing item with proper back context
  const handleViewItem = useCallback((itemId) => {
    if (onViewItem) {
      onViewItem(itemId, { 
        returnTo: 'package', 
        packageId: selectedPackage?.id,
        backLabel: 'Back to Package'
      });
    }
  }, [onViewItem, selectedPackage]);

  // ============================================================================
  // Details Prompt Modal (for Create)
  // ============================================================================
  if (showDetailsPrompt) {
    const isNameEmpty = !formName.trim();
    return (
      <>
        <div className="page-header">
          <h2 className="page-title">Packages</h2>
        </div>
        
        <div className="modal-backdrop" style={styles.modal}>
          <div style={{ ...styles.modalBox, maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: spacing[4], borderBottom: `1px solid ${colors.borderLight}` }}>
              <h3 style={{ margin: 0, color: colors.textPrimary }}>New Package</h3>
            </div>
            <div style={{ padding: spacing[4] }}>
              <div className="form-section">
                <label className={`form-label ${isNameEmpty ? 'label-required-empty' : ''}`}>
                  Package Name <span className="required-indicator">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => { setFormName(e.target.value); setNameError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleDetailsSubmit()}
                  placeholder="e.g., Wedding Photography Package"
                  className={`input ${isNameEmpty ? 'input-required-empty' : ''}`}
                  autoFocus
                />
                {nameError && <span className="required-error-text">{nameError}</span>}
              </div>

              <div className="form-section">
                <label className="form-label">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Describe what this package is for..."
                  rows={3}
                  className="input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="form-section">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="e.g., Cameras, Audio, Lighting"
                  className="input"
                />
              </div>
            </div>
            <div style={{ padding: spacing[4], paddingTop: 0, display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setShowDetailsPrompt(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleDetailsSubmit} disabled={isNameEmpty}>Continue to Select Items</Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ============================================================================
  // Create/Edit View (Item Selection Only)
  // ============================================================================
  if (showCreate) {
    return (
      <div className="view-container">
        <div className="page-header">
          <div>
            <h2 className="page-title">{editingPackage ? `Edit: ${formName}` : `Create: ${formName}`}</h2>
            <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: 4 }}>
              {formItems.length} items selected
              {formDescription && <span> • {formDescription}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: spacing[2] }}>
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={formItems.length === 0}
              icon={editingPackage ? Edit2 : Plus}
            >
              {editingPackage ? 'Save Changes' : 'Create Package'}
            </Button>
          </div>
        </div>

        <Card padding={false} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div className="panel-header">
            <div className="panel-header-title">
              <Package size={16} color={colors.primary} />
              <strong>Select Items</strong>
              <span className="panel-header-count">{formItems.length} selected</span>
            </div>
            <SearchInput 
              value={itemSearch} 
              onChange={setItemSearch} 
              onClear={() => setItemSearch('')}
              placeholder="Search items..." 
            />
          </div>
          <div className="selection-list">
            {filteredItemsForSelect.map(item => (
              <div 
                key={item.id}
                className={`selection-item ${formItems.includes(item.id) ? 'selected' : ''}`}
                onClick={() => handleToggleItem(item.id)}
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={formItems.includes(item.id)}
                  onChange={() => handleToggleItem(item.id)}
                />
                <div className="selection-item-info">
                  <div className="selection-item-name">{item.name}</div>
                  <div className="selection-item-meta">{item.id} • {item.category}</div>
                </div>
                <Badge text={item.status} color={getStatusColor(item.status)} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // Package Detail View
  // ============================================================================
  if (selectedPackage) {
    const packageItems = getPackageItems(selectedPackage);
    const packageValue = calculateValue(packageItems);
    const allAvailable = allItemsAvailable(packageItems);
    const suggestedAccessories = getSuggestedAccessories(selectedPackage);

    return (
      <div className="view-container">
        <div className="detail-header">
          <div className="detail-header-left">
            <button className="btn-icon" onClick={() => setSelectedPackage(null)}>
              <ArrowLeft size={18} />
            </button>
            <div className="detail-header-info">
              <h2>
                {selectedPackage.name}
                <Badge text="Package" color={colors.accent2} style={{ marginLeft: 8 }} />
              </h2>
              <div className="detail-header-meta">
                {selectedPackage.id} • {packageItems.length} items • {formatMoney(packageValue)} total value
              </div>
            </div>
          </div>
          <div className="detail-header-actions">
            <Button variant="secondary" onClick={() => handleStartEdit(selectedPackage)} icon={Edit2}>Edit</Button>
            <button className="btn-icon danger" onClick={() => handleDeleteClick(selectedPackage)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {selectedPackage.description && (
          <p style={{ color: colors.textSecondary, marginBottom: spacing[4], fontSize: typography.fontSize.sm }}>{selectedPackage.description}</p>
        )}

        {!allAvailable && (
          <div className="alert-warning">
            <AlertTriangle size={16} />
            <span>Some items in this package are not available</span>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: spacing[4], flex: 1, minHeight: 0 }}>
          {/* Package Contents */}
          <Card padding={false} style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CardHeader title={`Package Contents (${packageItems.length})`} icon={Package} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {packageItems.map(item => (
                <div key={item.id} className="list-item" onClick={() => handleViewItem(item.id)}>
                  {item.image ? (
                    <img src={item.image} alt="" className="list-item-image" />
                  ) : (
                    <div className="list-item-image-placeholder">
                      <Package size={16} color={colors.textMuted} />
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

          {/* Suggested Accessories */}
          {suggestedAccessories.length > 0 && (
            <Card padding={false} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              <CardHeader title={`Suggested Accessories (${suggestedAccessories.length})`} icon={Lightbulb} />
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {suggestedAccessories.map(({ item, reason }) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: spacing[2], padding: `${spacing[3]}px ${spacing[4]}px`, borderBottom: `1px solid ${colors.borderLight}` }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleViewItem(item.id)}>
                      <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>{item.name}</div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>{reason}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => handleAddSuggested(item.id)} icon={Plus}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Confirm dialog rendered here so it shows properly */}
        <ConfirmDialog
          isOpen={confirmDelete.isOpen}
          title="Delete Package"
          message={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete({ isOpen: false, id: null, name: '' })}
        />
      </div>
    );
  }

  // ============================================================================
  // Package List View
  // ============================================================================
  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Packages</h2>
        <Button onClick={handleStartCreate} icon={Plus}>Create Package</Button>
      </div>

      <div style={{ marginBottom: spacing[4], maxWidth: 300 }}>
        <SearchInput value={packageSearch} onChange={setPackageSearch} onClear={() => setPackageSearch('')} placeholder="Search packages..." />
      </div>
      
      {filteredPackages.length === 0 ? (
        <EmptyState 
          icon={Package} 
          title="No Packages Found" 
          description={packages.length === 0 ? "Packages group individual items together for specific jobs or purposes." : "No packages match your search."} 
          action={packages.length === 0 && <Button onClick={handleStartCreate} icon={Plus}>Create Your First Package</Button>}
        />
      ) : (
        <div className="card-grid">
          {filteredPackages.map(pkg => {
            const packageItems = getPackageItems(pkg);
            const packageValue = calculateValue(packageItems);
            const allAvailable = allItemsAvailable(packageItems);
            return (
              <Card key={pkg.id} onClick={() => setSelectedPackage(pkg)} className="card-clickable">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Package size={18} color={colors.accent2} />
                    <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>{pkg.name}</h3>
                  </div>
                  {!allAvailable && <AlertTriangle size={16} color={colors.checkedOut} />}
                </div>
                <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2], flexWrap: 'wrap' }}>
                  <Badge text={pkg.id} color={colors.accent2} />
                  <Badge text={`${packageItems.length} items`} color={colors.accent1} />
                  <Badge text={formatMoney(packageValue)} color={colors.available} />
                </div>
                {pkg.description && (
                  <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pkg.description}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

export default memo(PackagesView);
