// ============================================================================
// Admin Pages - Full page versions of Add Item, Edit Specs, Edit Categories
// ============================================================================

import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Save, Trash2, GripVertical, Search } from 'lucide-react';
import { CONDITION, DEFAULT_NEW_CATEGORY_SETTINGS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { Card, Badge, Button, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { useItemForm } from '../components/ItemForm.jsx';
import { SmartPasteModal } from '../modals/ItemModal.jsx';

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
  editingItemId
}) {
  const [showSmartPaste, setShowSmartPaste] = useState(false);

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
    setItemForm(prev => ({
      ...prev,
      name: parsed.name || prev.name,
      brand: parsed.brand || prev.brand,
      category: parsed.category || prev.category,
      purchasePrice: parsed.purchasePrice || prev.purchasePrice,
      currentValue: parsed.purchasePrice || prev.currentValue,
      specs: { ...prev.specs, ...parsed.specs }
    }));
  };

  return (
    <>
      <PageHeader 
        title={isEdit ? 'Edit Item' : 'Add New Item'}
        subtitle={isEdit ? `Editing ${itemForm.name || 'item'}` : 'Add a new item to your inventory'}
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
              <div style={{ marginBottom: spacing[5], padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                <Badge text={previewCode} color={colors.primary} />
                <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>Auto-generated ID</span>
              </div>
            )}

            <h3 style={{ margin: `0 0 ${spacing[4]}px`, color: colors.textPrimary, fontSize: typography.fontSize.lg }}>
              Basic Information
            </h3>
            
            {/* Name and Brand */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label style={{ ...styles.label, color: !itemForm.name ? colors.danger : undefined }}>
                  Name <span style={{ color: colors.danger }}>*</span>
                </label>
                <input 
                  value={itemForm.name} 
                  onChange={e => handleChange('name', e.target.value)} 
                  placeholder="e.g., Alpha a7 IV" 
                  style={{ ...styles.input, borderColor: !itemForm.name ? colors.danger : colors.border }} 
                />
              </div>
              <div>
                <label style={{ ...styles.label, color: !itemForm.brand ? colors.danger : undefined }}>
                  Brand <span style={{ color: colors.danger }}>*</span>
                </label>
                <input 
                  value={itemForm.brand} 
                  onChange={e => handleChange('brand', e.target.value)} 
                  placeholder="e.g., Sony" 
                  style={{ ...styles.input, borderColor: !itemForm.brand ? colors.danger : colors.border }} 
                />
              </div>
            </div>

            {/* Category and Condition */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label style={styles.label}>Category</label>
                <Select 
                  value={itemForm.category} 
                  onChange={e => handleChange('category', e.target.value)} 
                  options={categories.map(c => ({ value: c, label: c }))}
                  aria-label="Category"
                />
              </div>
              <div>
                <label style={styles.label}>Condition</label>
                <Select 
                  value={itemForm.condition} 
                  onChange={e => handleChange('condition', e.target.value)} 
                  options={Object.values(CONDITION).map(c => ({ value: c, label: c }))}
                  aria-label="Condition"
                />
              </div>
            </div>
            
            {/* Quantity fields - only if category tracks quantity */}
            {currentCategorySettings.trackQuantity && (
              <div style={{ 
                padding: spacing[4],
                marginBottom: spacing[4],
                background: `${withOpacity(colors.accent2, 10)}`,
                borderRadius: borderRadius.md,
                border: `1px solid ${withOpacity(colors.accent2, 30)}`,
              }}>
                <div className="responsive-form-grid">
                  <div>
                    <label style={styles.label}>
                      Quantity
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.normal, marginLeft: spacing[1] }}>
                        (this category tracks quantities)
                      </span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={itemForm.quantity || 1} 
                      onChange={e => handleChange('quantity', Math.max(0, parseInt(e.target.value) || 0))} 
                      style={styles.input} 
                    />
                  </div>
                  <div>
                    <label style={styles.label}>
                      Reorder Point
                      <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.normal, marginLeft: spacing[1] }}>
                        (alert when below)
                      </span>
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={itemForm.reorderPoint || 0} 
                      onChange={e => handleChange('reorderPoint', Math.max(0, parseInt(e.target.value) || 0))} 
                      style={styles.input} 
                    />
                  </div>
                </div>
              </div>
            )}

            <h3 style={{ margin: `${spacing[5]}px 0 ${spacing[4]}px`, color: colors.textPrimary, fontSize: typography.fontSize.lg }}>
              Value & Location
            </h3>
            
            {/* Purchase Price and Current Value */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label style={styles.label}>Purchase Price</label>
                <input type="number" value={itemForm.purchasePrice} onChange={e => handleChange('purchasePrice', e.target.value)} placeholder="0.00" style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Current Value</label>
                <input type="number" value={itemForm.currentValue} onChange={e => handleChange('currentValue', e.target.value)} placeholder="0.00" style={styles.input} />
              </div>
            </div>

            {/* Location and Serial Number */}
            <div className="responsive-form-grid" style={{ marginBottom: spacing[4] }}>
              <div>
                <label style={styles.label}>Location</label>
                {flattenedLocations.length > 0 ? (
                  <Select 
                    value={itemForm.location || ''} 
                    onChange={e => handleChange('location', e.target.value)} 
                    options={[
                      { value: '', label: 'Select location...' },
                      ...flattenedLocations.map(loc => ({ value: loc.fullPath, label: loc.fullPath }))
                    ]}
                    aria-label="Location"
                  />
                ) : (
                  <input value={itemForm.location} onChange={e => handleChange('location', e.target.value)} placeholder="e.g., Shelf A-1" style={styles.input} />
                )}
              </div>
              <div>
                <label style={{ 
                  ...styles.label, 
                  color: (currentCategorySettings.trackSerialNumbers && !itemForm.serialNumber) || duplicateSerialNumber ? colors.danger : undefined 
                }}>
                  Serial Number
                  {currentCategorySettings.trackSerialNumbers && <span style={{ color: colors.danger, marginLeft: spacing[1] }}>*</span>}
                </label>
                <input 
                  value={itemForm.serialNumber} 
                  onChange={e => handleChange('serialNumber', e.target.value)} 
                  placeholder={currentCategorySettings.trackSerialNumbers ? "Required" : "Optional"} 
                  style={{ 
                    ...styles.input, 
                    borderColor: (currentCategorySettings.trackSerialNumbers && !itemForm.serialNumber) || duplicateSerialNumber ? colors.danger : colors.border 
                  }} 
                />
                {duplicateSerialNumber && (
                  <span style={{ color: colors.danger, fontSize: typography.fontSize.xs, display: 'block', marginTop: spacing[1] }}>
                    Serial number already exists on "{duplicateSerialNumber.name}" ({duplicateSerialNumber.id})
                  </span>
                )}
              </div>
            </div>

            {/* Purchase Date */}
            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>Purchase Date</label>
              <DatePicker 
                value={itemForm.purchaseDate} 
                onChange={e => handleChange('purchaseDate', e.target.value)} 
                placeholder="Select purchase date"
                aria-label="Purchase date"
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end', marginTop: spacing[6], paddingTop: spacing[4], borderTop: `1px solid ${colors.borderLight}` }}>
              <Button variant="secondary" onClick={onBack}>Cancel</Button>
              <Button onClick={onSave} disabled={!isValid} icon={isEdit ? Save : Plus}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
                  <h3 style={{ margin: 0, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>
                    Specifications
                  </h3>
                  <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                    {categorySpecs.filter(s => s.required).length} required / {categorySpecs.length} total
                  </span>
                </div>
                
                {/* Required fields first */}
                {categorySpecs.filter(s => s.required).length > 0 && (
                  <div style={{ marginBottom: spacing[4] }}>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.primary, marginBottom: spacing[2], fontWeight: typography.fontWeight.medium }}>
                      Required Fields
                    </div>
                    {categorySpecs.filter(s => s.required).map(spec => {
                      const isEmpty = !itemForm.specs[spec.name];
                      return (
                        <div key={spec.name} style={{ marginBottom: spacing[3] }}>
                          <label style={{ ...styles.label, color: isEmpty ? colors.danger : undefined }}>
                            {spec.name} <span style={{ color: colors.danger }}>*</span>
                          </label>
                          <input 
                            value={itemForm.specs[spec.name] || ''} 
                            onChange={e => handleSpecChange(spec.name, e.target.value)} 
                            style={{ ...styles.input, borderColor: isEmpty ? colors.danger : colors.border }} 
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Optional fields */}
                {categorySpecs.filter(s => !s.required).length > 0 && (
                  <div>
                    <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing[2] }}>
                      Optional Fields
                    </div>
                    {categorySpecs.filter(s => !s.required).map(spec => (
                      <div key={spec.name} style={{ marginBottom: spacing[3] }}>
                        <label style={styles.label}>{spec.name}</label>
                        <input 
                          value={itemForm.specs[spec.name] || ''} 
                          onChange={e => handleSpecChange(spec.name, e.target.value)} 
                          style={styles.input} 
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

export const SpecsPage = memo(function SpecsPage({ specs, onSave, onBack }) {
  const [editSpecs, setEditSpecs] = useState(structuredClone(specs));
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(specs)[0] || '');
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyRequired, setShowOnlyRequired] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newlyAddedIndex, setNewlyAddedIndex] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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
    setEditSpecs(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map((field, i) => 
        i === index ? { ...field, [key]: value } : field
      )
    }));
  };

  const handleAddField = () => {
    const name = newFieldName.trim();
    if (!name) return;
    
    const newIndex = (editSpecs[selectedCategory] || []).length;
    setEditSpecs(prev => ({
      ...prev,
      [selectedCategory]: [...(prev[selectedCategory] || []), { name, required: false }]
    }));
    setNewFieldName('');
    setShowAddForm(false);
    setSearchFilter('');
    setShowOnlyRequired(false);
    setNewlyAddedIndex(newIndex);
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewFieldName('');
  };

  const removeField = (index) => {
    setEditSpecs(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].filter((_, i) => i !== index)
    }));
    if (newlyAddedIndex === index) setNewlyAddedIndex(null);
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

    setEditSpecs(prev => {
      const arr = [...prev[selectedCategory]];
      const [draggedItem] = arr.splice(draggedIndex, 1);
      arr.splice(targetIndex, 0, draggedItem);
      return { ...prev, [selectedCategory]: arr };
    });
    setDragOverIndex(null);
  };

  const toggleAllRequired = (value) => {
    setEditSpecs(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map(field => ({ ...field, required: value }))
    }));
  };

  const currentSpecs = editSpecs[selectedCategory] || [];
  
  const filteredSpecs = currentSpecs
    .map((field, index) => ({ ...field, originalIndex: index }))
    .filter(field => {
      if (searchFilter && !field.name.toLowerCase().includes(searchFilter.toLowerCase())) return false;
      if (showOnlyRequired && !field.required) return false;
      return true;
    });

  const requiredCount = currentSpecs.filter(f => f.required).length;
  const canDrag = !searchFilter && !showOnlyRequired;

  const handleSave = () => {
    onSave(editSpecs);
    onBack();
  };

  return (
    <>
      <PageHeader 
        title="Edit Specifications"
        subtitle="Define the specification fields for each equipment category"
        onBack={onBack}
        backLabel="Back to Admin"
        action={
          <Button onClick={handleSave} icon={Save}>Save Changes</Button>
        }
      />

      <div className="responsive-two-col">
        {/* Main Content */}
        <Card>
          <div style={{ padding: spacing[5] }}>
            {/* Category selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing[3], marginBottom: spacing[4] }}>
              <div>
                <label style={styles.label}>Category</label>
                <Select 
                  value={selectedCategory} 
                  onChange={e => { setSelectedCategory(e.target.value); setSearchFilter(''); }}
                  options={Object.keys(editSpecs).map(cat => ({ 
                    value: cat, 
                    label: `${cat} (${editSpecs[cat]?.length || 0} fields)` 
                  }))}
                  aria-label="Category"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{ padding: `${spacing[2]}px ${spacing[3]}px`, background: colors.bgLight, borderRadius: borderRadius.md, fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                  {requiredCount} required / {currentSpecs.length} total
                </div>
              </div>
            </div>

            {/* Add New Field */}
            <div style={{ marginBottom: spacing[4] }}>
              {!showAddForm ? (
                <Button variant="secondary" onClick={() => setShowAddForm(true)} icon={Plus} style={{ width: '100%', justifyContent: 'center' }}>
                  New Specification Field
                </Button>
              ) : (
                <div style={{ padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, border: `1px solid ${withOpacity(colors.primary, 30)}` }}>
                  <label style={styles.label}>New Field Name</label>
                  <div style={{ display: 'flex', gap: spacing[2] }}>
                    <input
                      ref={addInputRef}
                      type="text"
                      value={newFieldName}
                      onChange={e => setNewFieldName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddField();
                        if (e.key === 'Escape') handleCancelAdd();
                      }}
                      placeholder="Enter field name..."
                      style={{ ...styles.input, flex: 1 }}
                    />
                    <Button onClick={handleAddField} icon={Plus}>Add</Button>
                    <Button variant="secondary" onClick={handleCancelAdd}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Search & Filters */}
            <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[4], alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: spacing[3], top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }} />
                <input
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Filter fields..."
                  style={{ ...styles.input, paddingLeft: spacing[8] }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer', fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                <input type="checkbox" checked={showOnlyRequired} onChange={e => setShowOnlyRequired(e.target.checked)} />
                Required only
              </label>
            </div>

            {/* Fields List */}
            <div ref={listRef} style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {filteredSpecs.length === 0 ? (
                <div style={{ textAlign: 'center', color: colors.textMuted, padding: spacing[6] }}>
                  {searchFilter || showOnlyRequired ? 'No fields match your filter' : 'No specification fields defined'}
                </div>
              ) : (
                filteredSpecs.map((field, displayIndex) => {
                  const isNew = field.originalIndex === newlyAddedIndex;
                  const isDragOver = dragOverIndex === field.originalIndex;
                  
                  return (
                    <div
                      key={field.originalIndex}
                      ref={isNew ? newItemRef : null}
                      draggable={canDrag}
                      onDragStart={e => canDrag && handleDragStart(e, field.originalIndex)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => canDrag && handleDragOver(e, field.originalIndex)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => canDrag && handleDrop(e, field.originalIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[3],
                        padding: spacing[3],
                        background: isNew ? `${withOpacity(colors.success, 15)}` : isDragOver ? `${withOpacity(colors.primary, 15)}` : colors.bgLight,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing[2],
                        border: isDragOver ? `2px dashed ${colors.primary}` : isNew ? `1px solid ${withOpacity(colors.success, 50)}` : `1px solid transparent`,
                        cursor: canDrag ? 'grab' : 'default',
                        transition: 'all 150ms ease'
                      }}
                    >
                      {canDrag && (
                        <GripVertical size={16} color={colors.textMuted} style={{ flexShrink: 0, cursor: 'grab' }} />
                      )}
                      <input
                        type="text"
                        value={field.name}
                        onChange={e => handleFieldChange(field.originalIndex, 'name', e.target.value)}
                        style={{ ...styles.input, flex: 1 }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: spacing[1], cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={e => handleFieldChange(field.originalIndex, 'required', e.target.checked)}
                        />
                        <span style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary }}>Required</span>
                      </label>
                      <button
                        onClick={() => removeField(field.originalIndex)}
                        style={{ background: 'none', border: 'none', padding: spacing[1], cursor: 'pointer', color: colors.danger, display: 'flex' }}
                      >
                        <Trash2 size={16} />
                      </button>
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
              <h3 style={{ margin: `0 0 ${spacing[4]}px`, fontSize: typography.fontSize.lg, color: colors.textPrimary }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                <Button variant="secondary" onClick={() => toggleAllRequired(true)} style={{ justifyContent: 'center' }}>
                  Mark All Required
                </Button>
                <Button variant="secondary" onClick={() => toggleAllRequired(false)} style={{ justifyContent: 'center' }}>
                  Mark All Optional
                </Button>
              </div>
              
              <div style={{ marginTop: spacing[5], padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md }}>
                <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                  <strong style={{ color: colors.textPrimary }}>Tip:</strong> Drag fields to reorder them. Required fields appear first when adding items.
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
  onBack 
}) {
  const [editCategories, setEditCategories] = useState([...categories]);
  const [editSettings, setEditSettings] = useState(structuredClone(categorySettings || {}));
  const [editSpecs, setEditSpecs] = useState(structuredClone(specs));
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const addInputRef = useRef(null);
  const dragNodeRef = useRef(null);

  useEffect(() => {
    if (showAddForm && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddForm]);

  const getCategoryCount = (category) => inventory.filter(i => i.category === category).length;

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name || editCategories.includes(name)) return;
    
    setEditCategories(prev => [...prev, name]);
    setEditSpecs(prev => ({ ...prev, [name]: [] }));
    setEditSettings(prev => ({ ...prev, [name]: { ...DEFAULT_NEW_CATEGORY_SETTINGS } }));
    setNewCategoryName('');
    setShowAddForm(false);
  };

  const handleRemoveCategory = (category) => {
    const count = getCategoryCount(category);
    if (count > 0) {
      alert(`Cannot delete category "${category}" because it has ${count} item(s). Reassign items first.`);
      return;
    }
    setEditCategories(prev => prev.filter(c => c !== category));
    setEditSpecs(prev => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
    setEditSettings(prev => {
      const copy = { ...prev };
      delete copy[category];
      return copy;
    });
  };

  const handleRenameCategory = (oldName, newName) => {
    if (!newName.trim() || (newName !== oldName && editCategories.includes(newName))) return;
    
    setEditCategories(prev => prev.map(c => c === oldName ? newName : c));
    setEditSpecs(prev => {
      const copy = { ...prev };
      if (oldName !== newName) {
        copy[newName] = copy[oldName] || [];
        delete copy[oldName];
      }
      return copy;
    });
    setEditSettings(prev => {
      const copy = { ...prev };
      if (oldName !== newName) {
        copy[newName] = copy[oldName] || { ...DEFAULT_NEW_CATEGORY_SETTINGS };
        delete copy[oldName];
      }
      return copy;
    });
  };

  const handleSettingChange = (category, setting, value) => {
    setEditSettings(prev => ({
      ...prev,
      [category]: { ...(prev[category] || {}), [setting]: value }
    }));
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

    setEditCategories(prev => {
      const arr = [...prev];
      const [draggedItem] = arr.splice(draggedIndex, 1);
      arr.splice(targetIndex, 0, draggedItem);
      return arr;
    });
    setDragOverIndex(null);
  };

  const handleSave = () => {
    onSave(editCategories, editSpecs, editSettings);
    onBack();
  };

  return (
    <>
      <PageHeader 
        title="Edit Categories"
        subtitle="Manage equipment categories and their settings"
        onBack={onBack}
        backLabel="Back to Admin"
        action={
          <Button onClick={handleSave} icon={Save}>Save Changes</Button>
        }
      />

      <Card>
        <div style={{ padding: spacing[5] }}>
          {/* Add New Category */}
          <div style={{ marginBottom: spacing[5] }}>
            {!showAddForm ? (
              <Button variant="secondary" onClick={() => setShowAddForm(true)} icon={Plus} style={{ width: '100%', justifyContent: 'center' }}>
                Add New Category
              </Button>
            ) : (
              <div style={{ padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, border: `1px solid ${withOpacity(colors.primary, 30)}` }}>
                <label style={styles.label}>New Category Name</label>
                <div style={{ display: 'flex', gap: spacing[2] }}>
                  <input
                    ref={addInputRef}
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddCategory();
                      if (e.key === 'Escape') { setShowAddForm(false); setNewCategoryName(''); }
                    }}
                    placeholder="Enter category name..."
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <Button onClick={handleAddCategory} icon={Plus}>Add</Button>
                  <Button variant="secondary" onClick={() => { setShowAddForm(false); setNewCategoryName(''); }}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Categories List */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {editCategories.map((category, index) => {
              const count = getCategoryCount(category);
              const settings = editSettings[category] || {};
              const isDragOver = dragOverIndex === index;
              
              return (
                <div
                  key={category}
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, index)}
                  style={{
                    padding: spacing[4],
                    background: isDragOver ? `${withOpacity(colors.primary, 15)}` : colors.bgLight,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing[3],
                    border: isDragOver ? `2px dashed ${colors.primary}` : `1px solid ${colors.borderLight}`,
                    cursor: 'grab',
                    transition: 'all 150ms ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[3] }}>
                    <GripVertical size={16} color={colors.textMuted} style={{ flexShrink: 0, cursor: 'grab' }} />
                    <input
                      type="text"
                      value={category}
                      onChange={e => handleRenameCategory(category, e.target.value)}
                      style={{ ...styles.input, flex: 1, fontWeight: typography.fontWeight.medium }}
                    />
                    <Badge text={`${count} items`} color={count > 0 ? colors.primary : colors.textMuted} />
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      disabled={count > 0}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        padding: spacing[1], 
                        cursor: count > 0 ? 'not-allowed' : 'pointer', 
                        color: count > 0 ? colors.textMuted : colors.danger,
                        opacity: count > 0 ? 0.5 : 1,
                        display: 'flex'
                      }}
                      title={count > 0 ? `Cannot delete - has ${count} item(s)` : 'Delete category'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Category Settings */}
                  <div style={{ display: 'flex', gap: spacing[4], flexWrap: 'wrap', paddingLeft: spacing[7] }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer', fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={settings.trackQuantity || false}
                        onChange={e => handleSettingChange(category, 'trackQuantity', e.target.checked)}
                      />
                      Track Quantity
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer', fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                      <input
                        type="checkbox"
                        checked={settings.trackSerialNumbers !== false}
                        onChange={e => handleSettingChange(category, 'trackSerialNumbers', e.target.checked)}
                      />
                      Require Serial #
                    </label>
                    {settings.trackQuantity && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                        <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>Low stock alert:</span>
                        <input
                          type="number"
                          min="0"
                          value={settings.lowStockThreshold || 0}
                          onChange={e => handleSettingChange(category, 'lowStockThreshold', parseInt(e.target.value) || 0)}
                          style={{ ...styles.input, width: 60, padding: spacing[1], textAlign: 'center' }}
                        />
                      </div>
                    )}
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
