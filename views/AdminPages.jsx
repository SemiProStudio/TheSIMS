// ============================================================================
// Admin Pages - Full page versions of Add Item, Edit Specs, Edit Categories
// ============================================================================

import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Plus, Save, Trash2, GripVertical, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { CONDITION, DEFAULT_NEW_CATEGORY_SETTINGS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Card, Badge, Button, PageHeader, Input } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { useItemForm } from '../components/ItemForm.jsx';
import { SpecFieldInput } from '../components/SpecFieldInput.jsx';
import ImageField from '../components/ImageField.jsx';
import LowStockFields from '../components/LowStockFields.jsx';
import { SmartPasteModal } from '../modals/smartPaste/SmartPasteModal.jsx';
import { applySmartPastePayload } from '../lib/smartPaste/applyPayload.js';

// ============================================================================
// Touch-accessible reorder buttons — HTML5 drag-and-drop never fires on touch
// devices, so draggable rows also get explicit move up/down controls.
// ============================================================================

function RowMoveButtons({ onMoveUp, onMoveDown, isFirst, isLast }) {
  const buttonStyle = (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12, // 16px icon + padding = 40px touch target
    margin: '-8px 0', // don't let the 40px target inflate row height
    background: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.textMuted,
    opacity: disabled ? 0.35 : 1,
    cursor: disabled ? 'default' : 'pointer',
    flexShrink: 0,
  });
  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveUp();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        draggable={false}
        disabled={isFirst}
        aria-label="Move up"
        style={buttonStyle(isFirst)}
      >
        <ChevronUp size={16} />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMoveDown();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        draggable={false}
        disabled={isLast}
        aria-label="Move down"
        style={buttonStyle(isLast)}
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// Add/Edit Item Page
// ============================================================================

export const ItemFormPage = memo(function ItemFormPage({
  isEdit,
  itemForm,
  setItemForm,
  specs,
  categories,
  categorySettings,
  locations,
  inventory,
  onSave,
  onBack,
  editingItemId,
}) {
  const [showSmartPaste, setShowSmartPaste] = useState(false);

  const handleImageChange = useCallback(
    ({ value, pending }) => {
      setItemForm((prev) => ({ ...prev, image: value, pendingImage: pending }));
    },
    [setItemForm],
  );

  // Use the shared ItemForm hook for validation and computed values
  const {
    isValid,
    previewCode,
    duplicateSerialNumber,
    categorySpecs,
    currentCategorySettings,
    flattenedLocations,
    handleChange,
    handleSpecChange,
  } = useItemForm({
    isEdit,
    itemId: editingItemId,
    itemForm,
    setItemForm,
    specs,
    categorySettings,
    locations,
    inventory,
  });

  const handleSmartPasteApply = (parsed) => {
    setItemForm((prev) => applySmartPastePayload(prev, parsed));
  };

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit Item' : 'Add Item'}
        subtitle={
          isEdit ? `Editing ${itemForm.name || 'item'}` : 'Add a new item to your inventory'
        }
        onBack={onBack}
        backLabel="Back to Gear List"
      />

      <div className="responsive-two-col" style={{ paddingBottom: spacing[6] }}>
        {/* Main Form */}
        <Card>
          <div style={{ padding: spacing[5] }}>
            {/* Smart Paste Button */}
            <div style={{ marginBottom: spacing[5] }}>
              <Button
                variant="secondary"
                onClick={() => setShowSmartPaste(true)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                📋 Smart Paste - {isEdit ? 'Update from Product Page' : 'Import from Product Page'}
              </Button>
            </div>

            {/* Preview Code Badge */}
            {!isEdit && previewCode && (
              <div
                style={{
                  marginBottom: spacing[5],
                  padding: spacing[3],
                  background: `${withOpacity(colors.primary, 10)}`,
                  borderRadius: borderRadius.md,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}
              >
                <Badge text={previewCode} color={colors.primary} />
                <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
                  Auto-generated ID
                </span>
              </div>
            )}

            <h3
              style={{
                margin: `0 0 ${spacing[4]}px`,
                color: colors.textPrimary,
                fontSize: typography.fontSize.lg,
              }}
            >
              Basic Information
            </h3>

            {/* Photo — any size; downscaled client-side and uploaded on save */}
            <ImageField
              value={itemForm.image}
              pending={itemForm.pendingImage}
              onChange={handleImageChange}
              inputId="item-form-image-upload"
              cropTitle="Crop item image"
            />

            {/* Name and Brand */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <Input
                label="Name"
                required
                value={itemForm.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Alpha a7 IV"
                className={!itemForm.name ? 'input-error' : undefined}
              />
              <Input
                label="Brand"
                required
                value={itemForm.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="e.g., Sony"
                className={!itemForm.brand ? 'input-error' : undefined}
              />
            </div>

            {/* Category and Condition */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label className="label">Category</label>
                <Select
                  value={itemForm.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  aria-label="Category"
                />
              </div>
              <div>
                <label className="label">Condition</label>
                <Select
                  value={itemForm.condition}
                  onChange={(e) => handleChange('condition', e.target.value)}
                  options={Object.values(CONDITION).map((c) => ({ value: c, label: c }))}
                  aria-label="Condition"
                />
              </div>
            </div>

            {/* Quantity fields - only if category tracks quantity */}
            {currentCategorySettings.trackQuantity && (
              <div
                style={{
                  padding: spacing[4],
                  marginBottom: spacing[4],
                  background: `${withOpacity(colors.accent2, 10)}`,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${withOpacity(colors.accent2, 30)}`,
                }}
              >
                <div className="responsive-form-grid">
                  <Input
                    label={
                      <>
                        Quantity
                        <span
                          style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.textMuted,
                            fontWeight: typography.fontWeight.normal,
                            marginLeft: spacing[1],
                          }}
                        >
                          (this category tracks quantities)
                        </span>
                      </>
                    }
                    type="number"
                    min="0"
                    value={itemForm.quantity || 1}
                    onChange={(e) =>
                      handleChange('quantity', Math.max(0, parseInt(e.target.value) || 0))
                    }
                  />
                </div>
                <div style={{ marginTop: spacing[3] }}>
                  <LowStockFields
                    enabled={itemForm.lowStockAlert}
                    threshold={itemForm.reorderPoint}
                    onChange={(patch) =>
                      Object.entries(patch).forEach(([key, value]) => handleChange(key, value))
                    }
                    inputId="item-form-low-stock-threshold"
                  />
                </div>
              </div>
            )}

            <h3
              style={{
                margin: `${spacing[5]}px 0 ${spacing[4]}px`,
                color: colors.textPrimary,
                fontSize: typography.fontSize.lg,
              }}
            >
              Value & Location
            </h3>

            {/* Purchase Price and Current Value */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <Input
                label="Purchase Price"
                type="number"
                value={itemForm.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', e.target.value)}
                placeholder="0.00"
              />
              <Input
                label="Current Value"
                type="number"
                value={itemForm.currentValue}
                onChange={(e) => handleChange('currentValue', e.target.value)}
                placeholder="0.00"
              />
            </div>

            {/* Location and Serial Number */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label className="label">Location</label>
                {flattenedLocations.length > 0 ? (
                  <Select
                    value={itemForm.location || ''}
                    onChange={(e) => handleChange('location', e.target.value)}
                    options={[
                      { value: '', label: 'Select location...' },
                      ...flattenedLocations.map((loc) => ({
                        value: loc.fullPath,
                        label: loc.fullPath,
                      })),
                    ]}
                    aria-label="Location"
                  />
                ) : (
                  <Input
                    value={itemForm.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    placeholder="e.g., Shelf A-1"
                  />
                )}
              </div>
              <Input
                label="Serial Number"
                required={currentCategorySettings.trackSerialNumbers}
                value={itemForm.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                placeholder={currentCategorySettings.trackSerialNumbers ? 'Required' : 'Optional'}
                className={
                  currentCategorySettings.trackSerialNumbers && !itemForm.serialNumber
                    ? 'input-error'
                    : undefined
                }
                error={
                  duplicateSerialNumber
                    ? `Serial number already exists on "${duplicateSerialNumber.name}" (${duplicateSerialNumber.id})`
                    : undefined
                }
              />
            </div>

            {/* Purchase Date */}
            <div style={{ marginBottom: spacing[4] }}>
              <label className="label">Purchase Date</label>
              <DatePicker
                value={itemForm.purchaseDate}
                onChange={(e) => handleChange('purchaseDate', e.target.value)}
                placeholder="Select purchase date"
                aria-label="Purchase date"
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: spacing[3],
                justifyContent: 'flex-end',
                marginTop: spacing[6],
                paddingTop: spacing[4],
                borderTop: `1px solid ${colors.borderLight}`,
              }}
            >
              <Button variant="secondary" onClick={onBack}>
                Cancel
              </Button>
              <Button
                // The hook toasts and rethrows on failure — swallow to avoid
                // an unhandled rejection on every failed save
                onClick={() => Promise.resolve(onSave()).catch(() => {})}
                disabled={!isValid}
                icon={isEdit ? Save : Plus}
              >
                {isEdit ? 'Save Changes' : 'Add Item'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Specifications Sidebar */}
        <div>
          {categorySpecs.length > 0 && (
            <Card>
              <div style={{ padding: spacing[5] }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[4],
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: typography.fontSize.lg,
                      color: colors.textPrimary,
                    }}
                  >
                    Specifications
                  </h3>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {categorySpecs.filter((s) => s.required).length} required /{' '}
                    {categorySpecs.length} total
                  </span>
                </div>

                {/* Required fields first */}
                {categorySpecs.filter((s) => s.required).length > 0 && (
                  <div style={{ marginBottom: spacing[4] }}>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.primary,
                        marginBottom: spacing[2],
                        fontWeight: typography.fontWeight.medium,
                      }}
                    >
                      Required Fields
                    </div>
                    {categorySpecs
                      .filter((s) => s.required)
                      .map((spec) => {
                        const isEmpty = !itemForm.specs[spec.name];
                        return (
                          <div key={spec.name} style={{ marginBottom: spacing[3] }}>
                            <label
                              style={{
                                ...styles.label,
                                color: isEmpty ? colors.danger : undefined,
                              }}
                            >
                              {spec.name} <span style={{ color: colors.danger }}>*</span>
                            </label>
                            <SpecFieldInput
                              spec={spec}
                              value={itemForm.specs[spec.name] || ''}
                              onChange={(val) => handleSpecChange(spec.name, val)}
                              invalid={isEmpty}
                            />
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Optional fields */}
                {categorySpecs.filter((s) => !s.required).length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                        marginBottom: spacing[2],
                      }}
                    >
                      Optional Fields
                    </div>
                    {categorySpecs
                      .filter((s) => !s.required)
                      .map((spec) => (
                        <div key={spec.name} style={{ marginBottom: spacing[3] }}>
                          <label style={styles.label}>{spec.name}</label>
                          <SpecFieldInput
                            spec={spec}
                            value={itemForm.specs[spec.name] || ''}
                            onChange={(val) => handleSpecChange(spec.name, val)}
                          />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>

      {showSmartPaste && (
        <SmartPasteModal
          specs={specs}
          currentCategory={itemForm.category || ''}
          onApply={handleSmartPasteApply}
          onClose={() => setShowSmartPaste(false)}
        />
      )}
    </>
  );
});

// ============================================================================
// Edit Specifications Page
// ============================================================================

export const SpecsPage = memo(function SpecsPage({ specs, onSave, onBack, showConfirm }) {
  const [editSpecs, setEditSpecs] = useState(structuredClone(specs));
  const [dirty, setDirty] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(specs)[0] || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newlyAddedIndex, setNewlyAddedIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // Track field renames per category: { category: { oldFieldName: newFieldName } }
  const [fieldRenames, setFieldRenames] = useState({});
  const listRef = useRef(null);
  const newItemRef = useRef(null);
  const addInputRef = useRef(null);
  const dragNodeRef = useRef(null);

  // Auto-scroll to newly added item
  useEffect(() => {
    if (newlyAddedIndex !== null && newItemRef.current) {
      newItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = newItemRef.current.querySelector('input[type="text"]');
      if (input) {
        setTimeout(() => input.focus(), 100);
      }
      const timer = setTimeout(() => setNewlyAddedIndex(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedIndex]);

  // Focus input when add form is shown
  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddForm]);

  const handleFieldChange = (index, key, value) => {
    // Track field name renames so items can be updated
    if (key === 'name') {
      const oldName = editSpecs[selectedCategory]?.[index]?.name;
      if (oldName && oldName !== value) {
        setFieldRenames((prev) => {
          const catRenames = { ...(prev[selectedCategory] || {}) };
          // Find original name (handle chained renames)
          const originalName = Object.keys(catRenames).find((k) => catRenames[k] === oldName);
          const origSpecs = specs[selectedCategory] || [];
          if (originalName) {
            catRenames[originalName] = value;
          } else if (origSpecs.some((f) => f.name === oldName)) {
            catRenames[oldName] = value;
          }
          return { ...prev, [selectedCategory]: catRenames };
        });
      }
    }
    setEditSpecs((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((field, i) =>
        i === index ? { ...field, [key]: value } : field,
      ),
    }));
    setDirty(true);
  };

  const [duplicateError, setDuplicateError] = useState('');

  const isDuplicateFieldName = useCallback(
    (name, excludeIndex = -1) => {
      const trimmed = name.trim().toLowerCase();
      if (!trimmed) return false;
      return (editSpecs[selectedCategory] || []).some(
        (field, i) => i !== excludeIndex && field.name.trim().toLowerCase() === trimmed,
      );
    },
    [editSpecs, selectedCategory],
  );

  const handleAddField = () => {
    const name = newFieldName.trim();
    if (!name) return;

    if (isDuplicateFieldName(name)) {
      setDuplicateError(`"${name}" already exists in this category`);
      return;
    }

    setDuplicateError('');
    const newIndex = (editSpecs[selectedCategory] || []).length;
    setEditSpecs((prev) => ({
      ...prev,
      [selectedCategory]: [
        ...(prev[selectedCategory] || []),
        { name, required: false, type: 'text', unit: null, options: null },
      ],
    }));
    setNewFieldName('');
    setShowAddForm(false);
    setSearchFilter('');
    setShowOnlyRequired(false);
    setNewlyAddedIndex(newIndex);
    setDirty(true);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewFieldName('');
    setDuplicateError('');
  };

  const removeField = (index) => {
    setEditSpecs((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].filter((_, i) => i !== index),
    }));
    if (newlyAddedIndex === index) setNewlyAddedIndex(null);
    setDirty(true);
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && index !== draggedIndex) setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    setEditSpecs((prev) => {
      const arr = [...prev[selectedCategory]];
      const [draggedItem] = arr.splice(draggedIndex, 1);
      arr.splice(targetIndex, 0, draggedItem);
      return { ...prev, [selectedCategory]: arr };
    });
    setDragOverIndex(null);
    setDirty(true);
  };

  // Touch-accessible move — same reorder as handleDrop, one step at a time
  const moveField = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= (editSpecs[selectedCategory] || []).length) return;
    setEditSpecs((prev) => {
      const arr = [...prev[selectedCategory]];
      const [moved] = arr.splice(index, 1);
      arr.splice(targetIndex, 0, moved);
      return { ...prev, [selectedCategory]: arr };
    });
    setDirty(true);
  };

  const toggleAllRequired = (value) => {
    setEditSpecs((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((field) => ({ ...field, required: value })),
    }));
    setDirty(true);
  };

  const currentSpecs = editSpecs[selectedCategory] || [];

  const filteredSpecs = currentSpecs
    .map((field, index) => ({ ...field, originalIndex: index }))
    .filter((field) => {
      if (searchFilter && !field.name.toLowerCase().includes(searchFilter.toLowerCase()))
        return false;
      if (showOnlyRequired && !field.required) return false;
      return true;
    });

  const requiredCount = currentSpecs.filter((f) => f.required).length;
  const canDrag = !searchFilter && !showOnlyRequired;

  // Check for any duplicate field names across all categories
  const hasDuplicates = useMemo(() => {
    return Object.values(editSpecs).some((fields) => {
      const names = fields.map((f) => f.name.trim().toLowerCase()).filter(Boolean);
      return names.length !== new Set(names).size;
    });
  }, [editSpecs]);

  const handleSave = async () => {
    if (hasDuplicates) return;
    // Enum options are edited as a raw comma-separated draft (optionsText) —
    // parsing on every keystroke ate the comma as it was typed. Convert to
    // arrays only now, at save time.
    const normalized = Object.fromEntries(
      Object.entries(editSpecs).map(([cat, fields]) => [
        cat,
        fields.map(({ optionsText, ...field }) => ({
          ...field,
          options:
            optionsText !== undefined
              ? optionsText
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              : field.options,
        })),
      ]),
    );
    // Await and stay on failure — leaving immediately discarded the edits
    // while the save's error toast landed on the wrong page
    try {
      await onSave(normalized, fieldRenames);
    } catch {
      return; // onSave already rolled back and toasted
    }
    onBack();
  };

  // Leaving with unsaved edits silently discarded them — confirm first
  const handleBack = () => {
    if (!dirty) {
      onBack();
      return;
    }
    if (showConfirm) {
      showConfirm({
        title: 'Discard Changes?',
        message: 'You have unsaved specification changes. Leave without saving?',
        confirmText: 'Discard',
        variant: 'danger',
        onConfirm: onBack,
      });
    } else {
      onBack();
    }
  };

  return (
    <>
      <PageHeader
        title="Edit Specifications"
        subtitle="Define the specification fields for each equipment category"
        onBack={handleBack}
        backLabel="Back to Admin"
        action={
          <Button onClick={handleSave} icon={Save} disabled={hasDuplicates}>
            {hasDuplicates ? 'Fix Duplicates' : 'Save Changes'}
          </Button>
        }
      />

      <div className="responsive-two-col">
        {/* Main Content */}
        <Card>
          <div style={{ padding: spacing[5] }}>
            {/* Category selector */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: spacing[3],
                marginBottom: spacing[4],
              }}
            >
              <div>
                <label className="label">Category</label>
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSearchFilter('');
                  }}
                  options={Object.keys(editSpecs).map((cat) => ({
                    value: cat,
                    label: `${cat} (${editSpecs[cat]?.length || 0} fields)`,
                  }))}
                  aria-label="Category"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    padding: `${spacing[2]}px ${spacing[3]}px`,
                    background: colors.bgLight,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary,
                  }}
                >
                  {requiredCount} required / {currentSpecs.length} total
                </div>
              </div>
            </div>

            {/* Add New Field */}
            <div style={{ marginBottom: spacing[4] }}>
              {!showAddForm ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowAddForm(true)}
                  icon={Plus}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  New Specification Field
                </Button>
              ) : (
                <div
                  style={{
                    padding: spacing[3],
                    background: `${withOpacity(colors.primary, 10)}`,
                    borderRadius: borderRadius.md,
                    border: `1px solid ${withOpacity(colors.primary, 30)}`,
                  }}
                >
                  <label className="label">New Field Name</label>
                  <div style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-start' }}>
                    <Input
                      ref={addInputRef}
                      type="text"
                      value={newFieldName}
                      onChange={(e) => {
                        setNewFieldName(e.target.value);
                        setDuplicateError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddField();
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                      placeholder="Enter field name..."
                      error={duplicateError || undefined}
                      containerStyle={{ flex: 1 }}
                    />
                    <Button onClick={handleAddField} icon={Plus}>
                      Add
                    </Button>
                    <Button variant="secondary" onClick={handleCancelAdd}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Search & Filters */}
            <div
              style={{
                display: 'flex',
                gap: spacing[3],
                marginBottom: spacing[4],
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: spacing[3],
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.textMuted,
                  }}
                />
                <input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter fields..."
                  style={{ ...styles.input, paddingLeft: spacing[8] }}
                />
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                }}
              >
                <input
                  type="checkbox"
                  checked={showOnlyRequired}
                  onChange={(e) => setShowOnlyRequired(e.target.checked)}
                  style={{ accentColor: colors.primary }}
                />
                Required only
              </label>
            </div>

            {/* Fields List */}
            <div ref={listRef} style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {filteredSpecs.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textMuted, padding: spacing[6] }}>
                  {searchFilter || showOnlyRequired
                    ? 'No fields match your filter'
                    : 'No specification fields defined'}
                </div>
              ) : (
                filteredSpecs.map((field) => {
                  const isNew = field.originalIndex === newlyAddedIndex;
                  const isDragOver = dragOverIndex === field.originalIndex;

                  return (
                    <div
                      key={field.originalIndex}
                      ref={isNew ? newItemRef : null}
                      draggable={canDrag}
                      onDragStart={(e) => canDrag && handleDragStart(e, field.originalIndex)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => canDrag && handleDragOver(e, field.originalIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => canDrag && handleDrop(e, field.originalIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: spacing[3],
                        padding: spacing[3],
                        background: isNew
                          ? `${withOpacity(colors.success, 15)}`
                          : isDragOver
                            ? `${withOpacity(colors.primary, 15)}`
                            : colors.bgLight,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing[2],
                        border: isDragOver
                          ? `2px dashed ${colors.primary}`
                          : isNew
                            ? `1px solid ${withOpacity(colors.success, 50)}`
                            : `1px solid transparent`,
                        cursor: canDrag ? 'grab' : 'default',
                        transition: 'all 150ms ease',
                      }}
                    >
                      {canDrag && (
                        <>
                          <GripVertical
                            size={16}
                            color={colors.textMuted}
                            style={{ flexShrink: 0, cursor: 'grab' }}
                          />
                          <RowMoveButtons
                            onMoveUp={() => moveField(field.originalIndex, -1)}
                            onMoveDown={() => moveField(field.originalIndex, 1)}
                            isFirst={field.originalIndex === 0}
                            isLast={field.originalIndex === currentSpecs.length - 1}
                          />
                        </>
                      )}
                      {(() => {
                        const isDup = isDuplicateFieldName(field.name, field.originalIndex);
                        return (
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                handleFieldChange(field.originalIndex, 'name', e.target.value)
                              }
                              style={{
                                ...styles.input,
                                width: '100%',
                                borderColor: isDup ? colors.danger : undefined,
                              }}
                            />
                            {isDup && (
                              <div
                                style={{
                                  fontSize: typography.fontSize.xs,
                                  color: colors.danger,
                                  marginTop: 2,
                                }}
                              >
                                Duplicate field name
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <Select
                        value={field.type || 'text'}
                        onChange={(e) =>
                          handleFieldChange(field.originalIndex, 'type', e.target.value)
                        }
                        options={[
                          { value: 'text', label: 'Text' },
                          { value: 'number', label: 'Number' },
                          { value: 'boolean', label: 'Yes/No' },
                          { value: 'enum', label: 'List' },
                        ]}
                        compact
                        style={{ width: 110, flexShrink: 0 }}
                        aria-label={`${field.name || 'Field'} type`}
                      />
                      {(field.type || 'text') === 'number' && (
                        <input
                          type="text"
                          value={field.unit || ''}
                          onChange={(e) =>
                            handleFieldChange(field.originalIndex, 'unit', e.target.value)
                          }
                          placeholder="unit"
                          style={{ ...styles.input, width: 64, flexShrink: 0 }}
                          aria-label={`${field.name || 'Field'} unit`}
                        />
                      )}
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing[1],
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            handleFieldChange(field.originalIndex, 'required', e.target.checked)
                          }
                          style={{ accentColor: colors.primary }}
                        />
                        <span
                          style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}
                        >
                          Required
                        </span>
                      </label>
                      <button
                        onClick={() => removeField(field.originalIndex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: spacing[1],
                          cursor: 'pointer',
                          color: colors.danger,
                          display: 'flex',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      {field.type === 'enum' && (
                        <div style={{ flexBasis: '100%', paddingLeft: canDrag ? 28 : 0 }}>
                          <input
                            type="text"
                            value={
                              field.optionsText !== undefined
                                ? field.optionsText
                                : (field.options || []).join(', ')
                            }
                            onChange={(e) =>
                              handleFieldChange(field.originalIndex, 'optionsText', e.target.value)
                            }
                            placeholder="List options, comma separated (e.g. Sony E, Canon RF, PL)"
                            style={{
                              ...styles.input,
                              width: '100%',
                              fontSize: typography.fontSize.xs,
                            }}
                            aria-label={`${field.name || 'Field'} options`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div>
          <Card>
            <div style={{ padding: spacing[5] }}>
              <h3
                style={{
                  margin: `0 0 ${spacing[4]}px`,
                  fontSize: typography.fontSize.lg,
                  color: colors.textPrimary,
                }}
              >
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <Button
                  variant="secondary"
                  onClick={() => toggleAllRequired(true)}
                  style={{ justifyContent: 'center' }}
                >
                  Mark All Required
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toggleAllRequired(false)}
                  style={{ justifyContent: 'center' }}
                >
                  Mark All Optional
                </Button>
              </div>

              <div
                style={{
                  marginTop: spacing[5],
                  padding: spacing[3],
                  background: `${withOpacity(colors.primary, 10)}`,
                  borderRadius: borderRadius.md,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary,
                  }}
                >
                  <strong style={{ color: colors.textPrimary }}>Tip:</strong> Drag fields to reorder
                  them. Required fields appear first when adding items.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
});

// ============================================================================
// Edit Categories Page
// ============================================================================

export const CategoriesPage = memo(function CategoriesPage({
  categories,
  inventory,
  specs,
  categorySettings,
  onSave,
  onBack,
  showConfirm,
}) {
  // Rows carry a STABLE key (the original category name, or a synthetic key
  // for added rows). The old implementation keyed rows AND the specs/settings
  // maps by the live name: every rename keystroke remounted the row (losing
  // input focus after one character), and renaming a category onto another
  // one's name clobbered that category's specs in the edit buffer. Keys never
  // change while editing; names are remapped only at save.
  const [rows, setRows] = useState(() =>
    categories.map((name) => ({ key: name, name, isNew: false })),
  );
  const [specsByKey, setSpecsByKey] = useState(() => structuredClone(specs));
  const [settingsByKey, setSettingsByKey] = useState(() => structuredClone(categorySettings || {}));
  const [dirty, setDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const addInputRef = useRef(null);
  const dragNodeRef = useRef(null);
  const newKeyCounter = useRef(0);

  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddForm]);

  // Items still reference the ORIGINAL name until save — count by the key
  // for existing rows so an unsaved rename doesn't zero the guard
  const getCategoryCount = (row) =>
    inventory.filter((i) => i.category === (row.isNew ? row.name : row.key)).length;

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (rows.some((r) => r.name.trim().toLowerCase() === name.toLowerCase())) {
      setCategoryError(`"${name}" already exists`);
      return;
    }

    setCategoryError('');
    newKeyCounter.current += 1;
    const key = `__new_${newKeyCounter.current}__`;
    setRows((prev) => [...prev, { key, name, isNew: true }]);
    setSpecsByKey((prev) => ({ ...prev, [key]: [] }));
    setSettingsByKey((prev) => ({ ...prev, [key]: { ...DEFAULT_NEW_CATEGORY_SETTINGS } }));
    setNewCategoryName('');
    setShowAddForm(false);
    setDirty(true);
  };

  const handleRemoveCategory = (row) => {
    const count = getCategoryCount(row);
    if (count > 0) {
      setCategoryError(
        `Cannot delete "${row.name}" — it has ${count} item(s). Reassign items first.`,
      );
      return;
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key));
    setDirty(true);
  };

  const handleRenameCategory = (key, newName) => {
    // Plain name update — specs/settings stay keyed by the stable key, so
    // nothing is moved (or clobbered) until save
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, name: newName } : r)));
    setDirty(true);
  };

  const hasDuplicateCategories = useMemo(() => {
    const names = rows.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
    return names.length !== new Set(names).size;
  }, [rows]);

  const hasEmptyNames = useMemo(() => rows.some((r) => !r.name.trim()), [rows]);

  const isDuplicateCategory = (name, index) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return rows.some((r, i) => i !== index && r.name.trim().toLowerCase() === trimmed);
  };

  const handleSettingChange = (key, setting, value) => {
    setSettingsByKey((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [setting]: value },
    }));
    setDirty(true);
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.target;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    }
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && index !== draggedIndex) setDragOverIndex(index);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDragOverIndex(null);
      return;
    }

    setRows((prev) => {
      const arr = [...prev];
      const [draggedItem] = arr.splice(draggedIndex, 1);
      arr.splice(targetIndex, 0, draggedItem);
      return arr;
    });
    setDragOverIndex(null);
    setDirty(true);
  };

  // Touch-accessible move — same reorder as handleDrop, one step at a time
  const moveRow = (index, delta) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    setRows((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(index, 1);
      arr.splice(targetIndex, 0, moved);
      return arr;
    });
    setDirty(true);
  };

  const handleSave = () => {
    if (hasDuplicateCategories || hasEmptyNames) return;
    // Remap the stable-keyed edit state to final names, and report renames
    // (original → new) so items and DB rows can follow
    const newCategories = [];
    const newSpecs = {};
    const newSettings = {};
    const categoryRenames = {};
    rows.forEach((row) => {
      const name = row.name.trim();
      newCategories.push(name);
      newSpecs[name] = specsByKey[row.key] || [];
      newSettings[name] = settingsByKey[row.key] || { ...DEFAULT_NEW_CATEGORY_SETTINGS };
      if (!row.isNew && row.key !== name) {
        categoryRenames[row.key] = name;
      }
    });
    // Await and stay on failure — leaving immediately discarded the edits
    // while the save's error toast landed on the wrong page
    Promise.resolve(onSave(newCategories, newSpecs, newSettings, categoryRenames)).then(
      () => onBack(),
      () => {}, // onSave already rolled back and toasted
    );
  };

  // Leaving with unsaved edits silently discarded them — confirm first
  const handleBack = () => {
    if (!dirty) {
      onBack();
      return;
    }
    if (showConfirm) {
      showConfirm({
        title: 'Discard Changes?',
        message: 'You have unsaved category changes. Leave without saving?',
        confirmText: 'Discard',
        variant: 'danger',
        onConfirm: onBack,
      });
    } else {
      onBack();
    }
  };

  return (
    <>
      <PageHeader
        title="Edit Categories"
        subtitle="Manage equipment categories and their settings"
        onBack={handleBack}
        backLabel="Back to Admin"
        action={
          <Button
            onClick={handleSave}
            icon={Save}
            disabled={hasDuplicateCategories || hasEmptyNames}
          >
            {hasDuplicateCategories ? 'Fix Duplicates' : 'Save Changes'}
          </Button>
        }
      />

      <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          style={{
            padding: spacing[5],
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {/* Add New Category */}
          <div style={{ marginBottom: spacing[5], flexShrink: 0 }}>
            {!showAddForm ? (
              <Button
                variant="secondary"
                onClick={() => setShowAddForm(true)}
                icon={Plus}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Add New Category
              </Button>
            ) : (
              <div
                style={{
                  padding: spacing[3],
                  background: `${withOpacity(colors.primary, 10)}`,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${withOpacity(colors.primary, 30)}`,
                }}
              >
                <label className="label">New Category Name</label>
                <div style={{ display: 'flex', gap: spacing[2], alignItems: 'flex-start' }}>
                  <Input
                    ref={addInputRef}
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') {
                        setShowAddForm(false);
                        setNewCategoryName('');
                        setCategoryError('');
                      }
                    }}
                    placeholder="Enter category name..."
                    error={categoryError || undefined}
                    containerStyle={{ flex: 1 }}
                  />
                  <Button onClick={handleAddCategory} icon={Plus}>
                    Add
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategoryName('');
                      setCategoryError('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Categories List */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {rows.map((row, index) => {
              const category = row.name;
              const count = getCategoryCount(row);
              const settings = settingsByKey[row.key] || {};
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={row.key}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  style={{
                    padding: spacing[4],
                    background: isDragOver ? `${withOpacity(colors.primary, 15)}` : colors.bgLight,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing[3],
                    border: isDragOver
                      ? `2px dashed ${colors.primary}`
                      : `1px solid ${colors.borderLight}`,
                    cursor: 'grab',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      marginBottom: spacing[3],
                    }}
                  >
                    <GripVertical
                      size={16}
                      color={colors.textMuted}
                      style={{ flexShrink: 0, cursor: 'grab' }}
                    />
                    <RowMoveButtons
                      onMoveUp={() => moveRow(index, -1)}
                      onMoveDown={() => moveRow(index, 1)}
                      isFirst={index === 0}
                      isLast={index === rows.length - 1}
                    />
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        value={category}
                        onChange={(e) => handleRenameCategory(row.key, e.target.value)}
                        aria-label={`Category name (${row.isNew ? 'new' : row.key})`}
                        style={{
                          ...styles.input,
                          width: '100%',
                          fontWeight: typography.fontWeight.medium,
                          borderColor: isDuplicateCategory(category, index)
                            ? colors.danger
                            : undefined,
                        }}
                      />
                      {isDuplicateCategory(category, index) && (
                        <div
                          style={{
                            fontSize: typography.fontSize.xs,
                            color: colors.danger,
                            marginTop: 2,
                          }}
                        >
                          Duplicate category name
                        </div>
                      )}
                    </div>
                    <Badge
                      text={`${count} items`}
                      color={count > 0 ? colors.primary : colors.textMuted}
                    />
                    <button
                      onClick={() => handleRemoveCategory(row)}
                      disabled={count > 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: spacing[1],
                        cursor: count > 0 ? 'not-allowed' : 'pointer',
                        color: count > 0 ? colors.textMuted : colors.danger,
                        opacity: count > 0 ? 0.5 : 1,
                        display: 'flex',
                      }}
                      title={count > 0 ? `Cannot delete - has ${count} item(s)` : 'Delete category'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Category Settings */}
                  <div
                    style={{
                      display: 'flex',
                      gap: spacing[4],
                      flexWrap: 'wrap',
                      paddingLeft: spacing[7],
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.trackQuantity || false}
                        onChange={(e) =>
                          handleSettingChange(row.key, 'trackQuantity', e.target.checked)
                        }
                        style={{ accentColor: colors.primary }}
                      />
                      Track Quantity
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={settings.trackSerialNumbers !== false}
                        onChange={(e) =>
                          handleSettingChange(row.key, 'trackSerialNumbers', e.target.checked)
                        }
                        style={{ accentColor: colors.primary }}
                      />
                      Require Serial #
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </>
  );
});

export default { ItemFormPage, SpecsPage, CategoriesPage };
