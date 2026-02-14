// ============================================================================
// Item Modal
// Add and edit inventory items with Smart Paste support
// ============================================================================

import { memo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { CONDITION } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { DatePicker } from '../components/DatePicker.jsx';
import { useItemForm } from '../components/ItemForm.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import ImageCropEditor from '../components/ImageCropEditor.jsx';
import { SmartPasteModal } from './SmartPasteModal.jsx';

// Re-export SmartPasteModal for consumers who import from ItemModal
export { SmartPasteModal };

// ============================================================================
// Item Modal (Add/Edit)
// ============================================================================
export const ItemModal = memo(function ItemModal({ isEdit, itemId, itemForm, setItemForm, specs, categories, categorySettings, locations, inventory, onSave, onClose, onDelete }) {
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Use the shared ItemForm hook for validation and computed values
  const {
    isValid,
    getFieldError,
    validateAll,
    handleBlur,
    previewCode,
    duplicateSerialNumber,
    categorySpecs,
    currentCategorySettings,
    flattenedLocations,
    handleChange,
    handleSpecChange,
  } = useItemForm({
    isEdit,
    itemId,
    itemForm,
    setItemForm,
    specs,
    categorySettings,
    locations,
    inventory,
    categories,
  });
  
  // Image crop handler — uploads to Supabase Storage when editing, stores base64 for new items
  const handleCropComplete = useCallback(async (croppedDataUrl) => {
    setCropSrc(null);
    
    if (isEdit && itemId) {
      setImageUploading(true);
      try {
        const { storageService } = await import('../lib/index.js');
        const result = await storageService.uploadFromDataUrl(croppedDataUrl, itemId);
        handleChange('image', result.url);
      } catch (err) {
        handleChange('image', croppedDataUrl);
      } finally {
        setImageUploading(false);
      }
    } else {
      handleChange('image', croppedDataUrl);
    }
  }, [isEdit, itemId, handleChange]);

  // Handle save with validation
  const handleSave = () => {
    if (validateAll()) {
      onSave();
    }
  };
  
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
  
  // Helper to render field error
  const FieldError = ({ field }) => {
    const error = getFieldError(field);
    if (!error) return null;
    return (
      <span style={{ 
        color: colors.danger, 
        fontSize: typography.fontSize.xs, 
        marginTop: spacing[1],
        display: 'block'
      }}>
        {error}
      </span>
    );
  };

  return (
    <>
      <Modal onClose={onClose} maxWidth={600}>
        <ModalHeader title={isEdit ? 'Edit Item' : 'Add Item'} onClose={onClose} />
        <div style={{ padding: spacing[4], maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Smart Paste Button */}
          <div style={{ marginBottom: spacing[4] }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowSmartPaste(true)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              📋 Smart Paste - {isEdit ? 'Update from Product Page' : 'Import from Product Page'}
            </Button>
            {isEdit && (
              <p style={{ 
                color: colors.textMuted, 
                fontSize: typography.fontSize.xs, 
                margin: `${spacing[1]}px 0 0`, 
                textAlign: 'center' 
              }}>
                Paste specs to fill in missing fields or update existing ones
              </p>
            )}
          </div>
          
          {/* Preview Code Badge */}
          {!isEdit && previewCode && (
            <div style={{ marginBottom: spacing[4], padding: spacing[3], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, display: 'flex', alignItems: 'center', gap: spacing[2] }}>
              <Badge text={previewCode} color={colors.primary} />
              <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>Auto-generated ID</span>
            </div>
          )}
          
          {/* Image Upload Section */}
          <div style={{ marginBottom: spacing[4] }}>
            <label style={styles.label}>Image (Optional)</label>
            
            {cropSrc ? (
              /* Crop editor mode */
              <ImageCropEditor
                imageSrc={cropSrc}
                onCropComplete={handleCropComplete}
                onCancel={() => setCropSrc(null)}
                outputSize={600}
                cropShape="square"
                title="Crop item image"
              />
            ) : (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing[3],
              padding: spacing[3],
              border: `1px dashed ${colors.border}`,
              borderRadius: borderRadius.md,
              background: colors.bgLight,
              opacity: imageUploading ? 0.6 : 1,
            }}>
              {itemForm.image ? (
                <>
                  <img 
                    src={itemForm.image} 
                    alt="Item preview" 
                    style={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'cover', 
                      borderRadius: borderRadius.md 
                    }} 
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                      {imageUploading ? 'Uploading...' : 'Image attached'}
                    </p>
                    <button
                      onClick={() => setCropSrc(itemForm.image)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.primary,
                        fontSize: typography.fontSize.sm,
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: spacing[1],
                      }}
                    >
                      Resize / Crop
                    </button>
                    <button
                      onClick={() => handleChange('image', null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.danger,
                        fontSize: typography.fontSize.sm,
                        cursor: 'pointer',
                        padding: 0,
                        marginTop: spacing[1],
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[1],
                      }}
                    >
                      <X size={14} /> Remove image
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: withOpacity(colors.primary, 10),
                    borderRadius: borderRadius.md,
                    color: colors.textMuted,
                  }}>
                    <Upload size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      id="item-image-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) return;
                          if (!file.type.startsWith('image/')) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setCropSrc(event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
                        if (e.target) e.target.value = '';
                      }}
                    />
                    <label 
                      htmlFor="item-image-upload"
                      style={{
                        ...styles.btnSec,
                        display: 'inline-flex',
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                      }}
                    >
                      <Upload size={14} style={{ marginRight: spacing[1] }} />
                      Choose Image
                    </label>
                    <p style={{ 
                      margin: `${spacing[1]}px 0 0`, 
                      fontSize: typography.fontSize.xs, 
                      color: colors.textMuted 
                    }}>
                      JPG, PNG, or WebP (max 5MB)
                    </p>
                  </div>
                </>
              )}
            </div>
            )}
          </div>
          
          {/* Name and Brand */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
            <div>
              <label style={{ ...styles.label, color: getFieldError('name') ? colors.danger : undefined }}>
                Name <span style={{ color: colors.danger }}>*</span>
              </label>
              <input 
                name="name"
                value={itemForm.name} 
                onChange={e => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g., Alpha a7 IV" 
                style={{ ...styles.input, borderColor: getFieldError('name') ? colors.danger : colors.border }}
                aria-invalid={getFieldError('name') ? 'true' : undefined}
                aria-describedby={getFieldError('name') ? 'name-error' : undefined}
              />
              <FieldError field="name" />
            </div>
            <div>
              <label style={{ ...styles.label, color: getFieldError('brand') ? colors.danger : undefined }}>
                Brand <span style={{ color: colors.danger }}>*</span>
              </label>
              <input 
                name="brand"
                value={itemForm.brand} 
                onChange={e => handleChange('brand', e.target.value)}
                onBlur={() => handleBlur('brand')}
                placeholder="e.g., Sony" 
                style={{ ...styles.input, borderColor: getFieldError('brand') ? colors.danger : colors.border }}
                aria-invalid={getFieldError('brand') ? 'true' : undefined}
                aria-describedby={getFieldError('brand') ? 'brand-error' : undefined}
              />
              <FieldError field="brand" />
            </div>
          </div>
          
          {/* Category and Condition */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
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
          
          {/* Quantity field - only if category tracks quantity */}
          {currentCategorySettings.trackQuantity && (
            <div style={{ marginBottom: spacing[3] }}>
              <label style={styles.label}>
                Quantity
              </label>
              <input 
                type="number" 
                min="0"
                value={itemForm.quantity || 1} 
                onChange={e => handleChange('quantity', Math.max(0, parseInt(e.target.value) || 0))} 
                style={{
                  ...styles.input,
                  maxWidth: '150px'
                }} 
              />
            </div>
          )}
          
          {/* Reorder Point field - only for Consumables category */}
          {currentCategorySettings.trackReorderPoint && (
            <div style={{ marginBottom: spacing[3] }}>
              <label style={styles.label}>
                Reorder Point
                <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, fontWeight: typography.fontWeight.normal, marginLeft: spacing[2] }}>
                  (alert when quantity falls below this)
                </span>
              </label>
              <input 
                type="number" 
                min="0"
                value={itemForm.reorderPoint || 0} 
                onChange={e => handleChange('reorderPoint', Math.max(0, parseInt(e.target.value) || 0))} 
                style={{
                  ...styles.input,
                  maxWidth: '150px'
                }} 
              />
            </div>
          )}
          
          {/* Purchase Price and Current Value */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3], marginBottom: spacing[3] }}>
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
                {currentCategorySettings.trackSerialNumbers && (
                  <span style={{ color: colors.danger, marginLeft: spacing[1] }}>*</span>
                )}
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
          <div style={{ marginBottom: spacing[3] }}>
            <label style={styles.label}>Purchase Date</label>
            <DatePicker 
              value={itemForm.purchaseDate} 
              onChange={e => handleChange('purchaseDate', e.target.value)} 
              placeholder="Select purchase date"
              aria-label="Purchase date"
            />
          </div>
          
          {/* Specifications */}
          {categorySpecs.length > 0 && (
            <div style={{ borderTop: `1px solid ${colors.borderLight}`, paddingTop: spacing[4], marginTop: spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[3] }}>
                <h4 style={{ margin: 0, fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                  Specifications ({categorySpecs.length} fields)
                </h4>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                  {categorySpecs.filter(s => s.required).length} required
                </span>
              </div>
              
              {/* Required fields first */}
              {categorySpecs.filter(s => s.required).length > 0 && (
                <div style={{ marginBottom: spacing[4] }}>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.primary, marginBottom: spacing[2], fontWeight: typography.fontWeight.medium }}>
                    Required Fields
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                    {categorySpecs.filter(s => s.required).map(spec => {
                      const isEmpty = !itemForm.specs[spec.name];
                      return (
                        <div key={spec.name}>
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
                </div>
              )}
              
              {/* Optional fields */}
              {categorySpecs.filter(s => !s.required).length > 0 && (
                <div>
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing[2] }}>
                    Optional Fields
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                    {categorySpecs.filter(s => !s.required).map(spec => (
                      <div key={spec.name}>
                        <label style={styles.label}>{spec.name}</label>
                        <input 
                          value={itemForm.specs[spec.name] || ''} 
                          onChange={e => handleSpecChange(spec.name, e.target.value)} 
                          style={styles.input} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Action Buttons in fixed footer */}
        <div style={{ 
          padding: spacing[4], 
          borderTop: `1px solid ${colors.borderLight}`,
          display: 'flex', 
          gap: spacing[3], 
          justifyContent: 'space-between',
          background: colors.bgMedium,
        }}>
          {isEdit && onDelete && itemId ? (
            <Button variant="secondary" danger onClick={() => { onClose(); onDelete(itemId); }} icon={Trash2}>Delete Item</Button>
          ) : (
            <div />
          )}
          <div style={{ display: 'flex', gap: spacing[3] }}>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!isValid} icon={isEdit ? Save : Plus}>{isEdit ? 'Save Changes' : 'Add Item'}</Button>
          </div>
        </div>
      </Modal>
      
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
// PropTypes
// ============================================================================

/** Shape for item form data */
const itemFormShape = PropTypes.shape({
  name: PropTypes.string,
  brand: PropTypes.string,
  category: PropTypes.string,
  condition: PropTypes.string,
  purchasePrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currentValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  location: PropTypes.string,
  serialNumber: PropTypes.string,
  purchaseDate: PropTypes.string,
  quantity: PropTypes.number,
  reorderPoint: PropTypes.number,
  specs: PropTypes.object,
});

/** Shape for spec configuration */
const specConfigShape = PropTypes.objectOf(
  PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    required: PropTypes.bool,
  }))
);

/** Shape for category settings */
const categorySettingsShape = PropTypes.objectOf(PropTypes.shape({
  trackSerialNumbers: PropTypes.bool,
  trackQuantity: PropTypes.bool,
}));

/** Shape for location */
const locationShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  children: PropTypes.array,
});

/** Shape for inventory item */
const inventoryItemShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  serialNumber: PropTypes.string,
});

ItemModal.propTypes = {
  /** Whether this is editing an existing item */
  isEdit: PropTypes.bool,
  /** ID of item being edited (required if isEdit is true) */
  itemId: PropTypes.string,
  /** Current form data */
  itemForm: itemFormShape.isRequired,
  /** Setter for form data */
  setItemForm: PropTypes.func.isRequired,
  /** Spec configuration by category */
  specs: specConfigShape,
  /** Available categories */
  categories: PropTypes.arrayOf(PropTypes.string).isRequired,
  /** Category-specific settings */
  categorySettings: categorySettingsShape,
  /** Available locations */
  locations: PropTypes.arrayOf(locationShape),
  /** Current inventory (for duplicate detection) */
  inventory: PropTypes.arrayOf(inventoryItemShape),
  /** Callback when save is clicked */
  onSave: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
  /** Callback to delete item (optional) */
  onDelete: PropTypes.func,
};
