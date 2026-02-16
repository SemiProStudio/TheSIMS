// ============================================================================
// Packages View Component
// Manages package templates - create, edit, view packages
// ============================================================================

import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Plus, Package, Trash2, ChevronRight, Edit2, AlertTriangle, Lightbulb } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme.js';
import { formatMoney, getStatusColor } from '../utils';
import { Badge, Card, CardHeader, Button, SearchInput, EmptyState, ConfirmDialog, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from '../modals/ModalBase.jsx';
import { OptimizedImage } from '../components/OptimizedImage.jsx';
import { useData } from '../contexts/DataContext.js';
import { useToast } from '../contexts/ToastContext.js';

import { error as logError } from '../lib/logger.js';

function PackagesView({
  packages,
  dataContext: propDataContext,
  inventory,
  categorySettings = {},
  onViewItem,
  addAuditLog,
  currentUser,
  initialSelectedPackage = null,
  onPackageSelect,
}) {
  const ctxData = useData();
  const dataContext = propDataContext || ctxData;
  const { addToast } = useToast();
  const [selectedPackage, setSelectedPackageInternal] = useState(initialSelectedPackage);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetailsPrompt, setShowDetailsPrompt] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [packageSearch, setPackageSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null, name: '' });

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formItems, setFormItems] = useState([]);
  const [formItemQuantities, setFormItemQuantities] = useState({});
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

  // Check if an item has quantity tracking
  const hasQuantityTracking = useCallback((item) => {
    const settings = categorySettings?.[item.category];
    return settings?.trackQuantity === true;
  }, [categorySettings]);

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

  // Get unique categories from inventory for filter dropdown
  const availableCategories = useMemo(() => {
    const cats = new Set(individualItems.map(item => item.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [individualItems]);

  // Category filter state for item selection
  const [itemCategoryFilter, setItemCategoryFilter] = useState('all');

  // Filter items for selection (by search AND category)
  const filteredItemsForSelect = useMemo(() => {
    let items = individualItems;

    if (itemCategoryFilter !== 'all') {
      items = items.filter(item => item.category === itemCategoryFilter);
    }

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

  const calculateValue = useCallback((items, quantities = {}) => {
    return items.reduce((sum, item) => {
      const qty = quantities[item.id] || 1;
      return sum + (item.currentValue || 0) * qty;
    }, 0);
  }, []);

  const getTotalItemCount = useCallback((items, quantities = {}) => {
    return items.reduce((sum, item) => sum + (quantities[item.id] || 1), 0);
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
    setFormItemQuantities({});
    setItemSearch('');
    setItemCategoryFilter('all');
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
    setFormItemQuantities({ ...(pkg.itemQuantities || {}) });
    setEditingPackage(pkg);
    setShowCreate(true);
    setSelectedPackage(null);
  }, [setSelectedPackage]);

  // Cancel create/edit - return to package detail if editing
  const handleCancel = useCallback(() => {
    if (editingPackage) {
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

  // Update quantity for a multi-quantity item
  const handleQuantityChange = useCallback((itemId, quantity) => {
    const num = parseInt(quantity, 10);
    if (isNaN(num) || num < 1) {
      setFormItemQuantities(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setFormItemQuantities(prev => ({ ...prev, [itemId]: num }));
    }
  }, []);

  // Validate quantity against available stock
  const getQuantityError = useCallback((item) => {
    if (!hasQuantityTracking(item)) return null;
    const requested = formItemQuantities[item.id] || 1;
    const available = item.quantity ?? 1;
    if (requested > available) {
      return `Only ${available} available`;
    }
    return null;
  }, [formItemQuantities, hasQuantityTracking]);

  // Save package (create or update)
  const handleSave = useCallback(async () => {
    if (!formName.trim() || formItems.length === 0) return;

    // Check for quantity errors
    const hasQtyErrors = formItems.some(id => {
      const item = inventory.find(i => i.id === id);
      return item && getQuantityError(item);
    });
    if (hasQtyErrors) {
      addToast('Fix quantity errors before saving', 'warning');
      return;
    }

    // Build quantities map (only for items that have quantity tracking and qty > 1)
    const quantities = {};
    formItems.forEach(id => {
      const item = inventory.find(i => i.id === id);
      if (item && hasQuantityTracking(item)) {
        const qty = formItemQuantities[id] || 1;
        if (qty > 1) {
          quantities[id] = qty;
        }
      }
    });

    if (editingPackage) {
      // Update existing
      const updates = {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory.trim(),
        items: formItems,
        itemQuantities: quantities,
      };

      if (dataContext?.updatePackage) {
        try {
          await dataContext.updatePackage(editingPackage.id, updates);
          addToast('Package updated', 'success');
          addAuditLog?.({
            type: 'package_updated',
            itemId: editingPackage.id,
            itemType: 'package',
            itemName: updates.name,
            userId: currentUser?.id,
            userName: currentUser?.name,
            description: `Updated package "${updates.name}"`,
          });
        } catch (err) {
          logError('Failed to update package:', err);
          addToast('Failed to update package — changes may not persist', 'error');
          // Fallback to local state
          dataContext.patchPackage(editingPackage.id, updates);
        }
      } else {
        dataContext.patchPackage(editingPackage.id, updates);
      }

      setSelectedPackage({ ...editingPackage, ...updates });
      setShowCreate(false);
      setEditingPackage(null);
      resetForm();
    } else {
      // Create new
      const newPackage = {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory.trim(),
        items: formItems,
        itemQuantities: quantities,
        notes: [],
      };

      if (dataContext?.createPackage) {
        try {
          const createdPackage = await dataContext.createPackage(newPackage);
          addToast('Package created', 'success');
          addAuditLog?.({
            type: 'package_created',
            itemId: createdPackage.id,
            itemType: 'package',
            itemName: newPackage.name,
            userId: currentUser?.id,
            userName: currentUser?.name,
            description: `Created package "${newPackage.name}"`,
          });
          setSelectedPackage(createdPackage);
          setShowCreate(false);
          resetForm();
        } catch (err) {
          logError('Failed to create package:', err);
          addToast('Failed to create package', 'error');
        }
      } else {
        // Fallback - generate local ID if no DB
        const existingNumbers = packages
          .map(p => p.id?.match?.(/^PKG-(\d+)$/))
          .filter(Boolean)
          .map(m => parseInt(m[1], 10));
        const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        const localId = `PKG-${String(nextNum).padStart(3, '0')}`;
        const localPackage = { ...newPackage, id: localId };
        dataContext.addLocalPackage(localPackage);
        setSelectedPackage(localPackage);
        setShowCreate(false);
        resetForm();
      }
    }
  }, [formName, formDescription, formCategory, formItems, formItemQuantities, editingPackage,
      setSelectedPackage, resetForm, packages, dataContext, inventory, addToast, addAuditLog,
      currentUser, hasQuantityTracking, getQuantityError]);

  // Delete package
  const handleDeleteClick = useCallback((pkg) => {
    setConfirmDelete({ isOpen: true, id: pkg.id, name: pkg.name });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { id, name } = confirmDelete;

    if (dataContext?.deletePackage) {
      try {
        await dataContext.deletePackage(id);
        addToast('Package deleted', 'success');
        addAuditLog?.({
          type: 'package_deleted',
          itemId: id,
          itemType: 'package',
          itemName: name,
          userId: currentUser?.id,
          userName: currentUser?.name,
          description: `Deleted package "${name}"`,
        });
      } catch (err) {
        logError('Failed to delete package:', err);
        addToast('Failed to delete package', 'error');
        dataContext.removeLocalPackage(id);
      }
    } else {
      dataContext.removeLocalPackage(id);
    }

    setSelectedPackage(null);
    setConfirmDelete({ isOpen: false, id: null, name: '' });
  }, [confirmDelete, setSelectedPackage, dataContext, addToast, addAuditLog, currentUser]);

  // Add suggested accessory to package — persists to DB
  const handleAddSuggested = useCallback(async (itemId) => {
    if (!selectedPackage) return;
    const newItems = [...selectedPackage.items, itemId];
    const updatedPkg = { ...selectedPackage, items: newItems };

    // Optimistic local update
    dataContext.patchPackage(selectedPackage.id, { items: newItems });
    setSelectedPackage(updatedPkg);

    // Persist to DB
    if (dataContext?.updatePackage) {
      try {
        await dataContext.updatePackage(selectedPackage.id, { items: newItems });
      } catch (err) {
        logError('Failed to add suggested accessory:', err);
        addToast('Failed to save — change may not persist', 'warning');
        // Revert
        dataContext.patchPackage(selectedPackage.id, { items: selectedPackage.items });
        setSelectedPackage(selectedPackage);
      }
    }
  }, [selectedPackage, setSelectedPackage, dataContext, addToast]);

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
        <PageHeader title="Packages" />

        <Modal isOpen onClose={() => { setShowDetailsPrompt(false); resetForm(); }}>
          <ModalHeader title="New Package" onClose={() => { setShowDetailsPrompt(false); resetForm(); }} />
          <div style={{ padding: spacing[4] }}>
            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>
                Package Name <span style={{ color: colors.danger }}>*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={e => { setFormName(e.target.value); setNameError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleDetailsSubmit()}
                placeholder="e.g., Wedding Photography Package"
                style={{
                  ...styles.input,
                  ...(nameError ? { borderColor: colors.danger } : {}),
                }}
                autoFocus
              />
              {nameError && (
                <div style={{ color: colors.danger, fontSize: typography.fontSize.xs, marginTop: spacing[1] }}>
                  {nameError}
                </div>
              )}
            </div>

            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Describe what this package is for..."
                rows={3}
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>Category</label>
              <input
                type="text"
                value={formCategory}
                onChange={e => setFormCategory(e.target.value)}
                placeholder="e.g., Cameras, Audio, Lighting"
                style={styles.input}
              />
            </div>
          </div>
          <div style={{ padding: `0 ${spacing[4]}px ${spacing[4]}px`, display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => { setShowDetailsPrompt(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleDetailsSubmit} disabled={isNameEmpty}>Continue to Select Items</Button>
          </div>
        </Modal>
      </>
    );
  }

  // ============================================================================
  // Create/Edit View (Item Selection)
  // ============================================================================
  if (showCreate) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        <PageHeader
          title={editingPackage ? `Edit: ${formName}` : `Create: ${formName}`}
          subtitle={`${formItems.length} items selected${formDescription ? ` • ${formDescription}` : ''}`}
          action={
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
          }
        />

        <Card padding={false} style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: 'calc(100vh - 180px)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${spacing[3]}px ${spacing[4]}px`,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0, flexWrap: 'wrap', gap: spacing[2],
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Package size={16} color={colors.primary} />
              <strong style={{ color: colors.textPrimary }}>Select Items</strong>
              <Badge text={`${formItems.length} selected`} color={colors.primary} size="sm" />
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
              <SearchInput
                value={itemSearch}
                onChange={setItemSearch}
                onClear={() => setItemSearch('')}
                placeholder="Search items..."
              />
            </div>
          </div>
          <div style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0 }}>
            {filteredItemsForSelect.length === 0 ? (
              <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textMuted }}>
                No items found{itemCategoryFilter !== 'all' ? ` in ${itemCategoryFilter}` : ''}
                {itemSearch && ` matching "${itemSearch}"`}
              </div>
            ) : (
              filteredItemsForSelect.map(item => {
                const isSelected = formItems.includes(item.id);
                const showQuantity = hasQuantityTracking(item);
                const qtyError = isSelected ? getQuantityError(item) : null;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: spacing[3],
                      padding: `${spacing[3]}px ${spacing[4]}px`,
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: 'pointer',
                      background: isSelected ? `${colors.primary}11` : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        {item.id} • {item.category}
                        {showQuantity && item.quantity != null && ` • ${item.quantity} in stock`}
                      </div>
                    </div>
                    {showQuantity && isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <label style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Qty:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.quantity ?? undefined}
                          value={formItemQuantities[item.id] || 1}
                          onChange={e => handleQuantityChange(item.id, e.target.value)}
                          style={{
                            ...styles.input,
                            width: 60, padding: `${spacing[1]}px ${spacing[2]}px`,
                            textAlign: 'center',
                            ...(qtyError ? { borderColor: colors.danger } : {}),
                          }}
                        />
                        {qtyError && (
                          <span style={{ fontSize: typography.fontSize.xs, color: colors.danger, whiteSpace: 'nowrap' }}>
                            {qtyError}
                          </span>
                        )}
                      </div>
                    )}
                    <Badge text={item.status} color={getStatusColor(item.status)} size="sm" />
                  </div>
                );
              })
            )}
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
    const pkgQuantities = selectedPackage.itemQuantities || {};
    const packageValue = calculateValue(packageItems, pkgQuantities);
    const allAvailable = allItemsAvailable(packageItems);
    const suggestedAccessories = getSuggestedAccessories(selectedPackage);

    return (
      <div>
        <PageHeader
          title={selectedPackage.name}
          subtitle={`${selectedPackage.id} • ${getTotalItemCount(packageItems, pkgQuantities)} items • ${formatMoney(packageValue)} total value`}
          onBack={() => setSelectedPackage(null)}
          backLabel="Back to Packages"
          action={
            <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
              <Button variant="secondary" onClick={() => handleStartEdit(selectedPackage)} icon={Edit2}>Edit</Button>
              <button
                onClick={() => handleDeleteClick(selectedPackage)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: borderRadius.md,
                  border: `1px solid ${colors.borderLight}`, background: 'transparent',
                  cursor: 'pointer', color: colors.danger,
                }}
                title="Delete package"
              >
                <Trash2 size={16} />
              </button>
            </div>
          }
        />

        {selectedPackage.description && (
          <p style={{ color: colors.textSecondary, marginBottom: spacing[4], fontSize: typography.fontSize.sm }}>{selectedPackage.description}</p>
        )}

        {!allAvailable && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: spacing[2],
            padding: spacing[3], marginBottom: spacing[4],
            background: `${colors.checkedOut}15`, borderRadius: borderRadius.md,
            border: `1px solid ${colors.checkedOut}40`, color: colors.checkedOut,
            fontSize: typography.fontSize.sm,
          }}>
            <AlertTriangle size={16} />
            <span>Some items in this package are not available</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: spacing[4], flex: 1, minHeight: 0 }}>
          {/* Package Contents */}
          <Card padding={false} style={{ flex: 2, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <CardHeader title={`Package Contents (${getTotalItemCount(packageItems, pkgQuantities)})`} icon={Package} />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {packageItems.map(item => {
                const qty = pkgQuantities[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => handleViewItem(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: spacing[3],
                      padding: `${spacing[3]}px ${spacing[4]}px`,
                      borderBottom: `1px solid ${colors.borderLight}`,
                      cursor: 'pointer',
                    }}
                  >
                    {item.image ? (
                      <OptimizedImage
                        src={item.image}
                        alt={item.name}
                        size="thumbnail"
                        width={40}
                        height={40}
                        style={{ borderRadius: borderRadius.md, flexShrink: 0 }}
                        objectFit="cover"
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: borderRadius.md,
                        background: colors.bgLight, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Package size={16} color={colors.textMuted} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: spacing[1], marginBottom: 2 }}>
                        <Badge text={item.id} color={colors.primary} />
                        <Badge text={item.category} color={colors.accent2} />
                        {qty && qty > 1 && <Badge text={`×${qty}`} color={colors.accent1} />}
                      </div>
                      <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary, fontSize: typography.fontSize.sm }}>
                        {item.name}
                      </div>
                    </div>
                    <Badge text={item.status} color={getStatusColor(item.status)} />
                    <ChevronRight size={16} color={colors.textMuted} />
                  </div>
                );
              })}
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
      <PageHeader
        title="Packages"
        action={<Button onClick={handleStartCreate} icon={Plus}>Create Package</Button>}
      />

      <div style={{ marginBottom: spacing[4], maxWidth: 300 }}>
        <SearchInput value={packageSearch} onChange={setPackageSearch} onClear={() => setPackageSearch('')} placeholder="Search packages..." />
      </div>

      <div style={{ borderBottom: `1px solid ${colors.border}`, marginBottom: spacing[4] }} />

      {filteredPackages.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Packages Found"
          description={packages.length === 0 ? "Packages group individual items together for specific jobs or purposes." : "No packages match your search."}
          action={packages.length === 0 && <Button onClick={handleStartCreate} icon={Plus}>Create Your First Package</Button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: spacing[4] }}>
          {filteredPackages.map(pkg => {
            const packageItems = getPackageItems(pkg);
            const packageValue = calculateValue(packageItems, pkg.itemQuantities || {});
            const allAvailable = allItemsAvailable(packageItems);
            return (
              <Card key={pkg.id} onClick={() => setSelectedPackage(pkg)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                    <Package size={18} color={colors.accent2} />
                    <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>{pkg.name}</h3>
                  </div>
                  {!allAvailable && <AlertTriangle size={16} color={colors.checkedOut} />}
                </div>
                <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2], flexWrap: 'wrap' }}>
                  <Badge text={pkg.id} color={colors.accent2} />
                  <Badge text={`${getTotalItemCount(packageItems, pkg.itemQuantities || {})} items`} color={colors.accent1} />
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
