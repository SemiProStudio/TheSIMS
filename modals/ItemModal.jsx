// ============================================================================
// Item Modal
// Add and edit inventory items with Smart Paste support
// ============================================================================

import React, { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { CONDITION } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { useItemForm } from '../ItemForm.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

// ============================================================================
// Smart Paste Parser - Extracts product info from pasted text
// ============================================================================
const parseProductText = (text, specsConfig) => {
  const result = {
    name: '',
    brand: '',
    category: '',
    purchasePrice: '',
    specs: {}
  };
  
  if (!text || typeof text !== 'string') return result;
  
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  // Common spec patterns: "Key: Value", "Key\tValue", "Key - Value", "Key | Value"
  const specPatterns = [
    /^([^:]+):\s*(.+)$/,           // Key: Value
    /^([^\t]+)\t+(.+)$/,           // Key\tValue
    /^([^-]{2,})\s+-\s+(.+)$/,     // Key - Value (min 2 chars for key to avoid "f-stop" issues)
    /^([^|]+)\s*\|\s*(.+)$/,       // Key | Value
  ];
  
  // Known brand names for detection
  const knownBrands = [
    'Sony', 'Canon', 'Nikon', 'Panasonic', 'Blackmagic', 'RED', 'ARRI', 'Fujifilm', 'Leica',
    'Zeiss', 'Sigma', 'Tamron', 'Tokina', 'Rokinon', 'Samyang', 'Voigtlander',
    'Sennheiser', 'Rode', 'Shure', 'Audio-Technica', 'Zoom', 'Tascam', 'Sound Devices',
    'Aputure', 'Godox', 'Profoto', 'Broncolor', 'Litepanels', 'Kino Flo',
    'DJI', 'Zhiyun', 'Manfrotto', 'Gitzo', 'Sachtler', 'Tilta', 'SmallRig', 'Wooden Camera',
    'Atomos', 'SmallHD', 'Teradek', 'Hollyland', 'SanDisk', 'Samsung', 'Lexar', 'ProGrade',
    'Apple', 'Adobe', 'Blackmagic Design', 'Davinci', 'Avid'
  ];
  
  // Category keywords mapping
  const categoryKeywords = {
    'Cameras': ['camera', 'camcorder', 'cinema camera', 'mirrorless', 'dslr', 'sensor', 'video camera'],
    'Lenses': ['lens', 'mm', 'focal length', 'aperture', 'f/', 'prime', 'zoom lens', 'wide angle', 'telephoto'],
    'Lighting': ['light', 'led', 'strobe', 'flash', 'softbox', 'panel', 'fresnel', 'rgb', 'bi-color', 'watt'],
    'Audio': ['microphone', 'mic', 'audio', 'recorder', 'wireless', 'lavalier', 'shotgun', 'boom', 'preamp'],
    'Support': ['tripod', 'monopod', 'gimbal', 'stabilizer', 'head', 'slider', 'dolly', 'jib', 'crane', 'rig'],
    'Accessories': ['battery', 'charger', 'cable', 'adapter', 'mount', 'cage', 'filter', 'hood'],
    'Storage': ['card', 'ssd', 'drive', 'memory', 'cfast', 'sd card', 'storage', 'tb', 'gb'],
    'Monitors': ['monitor', 'display', 'screen', 'viewfinder', 'evf', 'hdmi'],
    'Power': ['battery', 'v-mount', 'gold mount', 'power', 'charger', 'ac adapter']
  };
  
  // Build dynamic spec aliases from specsConfig
  const specAliases = {};
  
  if (specsConfig) {
    Object.entries(specsConfig).forEach(([category, specList]) => {
      if (Array.isArray(specList)) {
        specList.forEach(spec => {
          const name = spec.name;
          if (name) {
            specAliases[name.toLowerCase()] = name;
            
            const nameLower = name.toLowerCase();
            const words = nameLower.split(' ');
            if (words.length > 1) {
              words.forEach(word => {
                if (word.length > 3) {
                  specAliases[word] = name;
                }
              });
            }
            
            // Common alternative phrasings
            const variations = {
              'sensor type': ['sensor', 'image sensor', 'sensor size'],
              'resolution': ['effective pixels', 'megapixels', 'mp', 'pixels'],
              'video capability': ['video', 'video recording', 'movie recording', 'max video', '4k', '8k'],
              'mount type': ['lens mount', 'mount', 'camera mount'],
              'focal length': ['zoom range', 'focal range'],
              'aperture': ['maximum aperture', 'max aperture', 'f-stop', 'f/'],
              'light type': ['lamp type', 'bulb type'],
              'wattage': ['power', 'output', 'watts', 'power output'],
              'color temperature': ['color temp', 'cct', 'kelvin'],
              'polar pattern': ['pickup pattern', 'pattern'],
              'microphone type': ['mic type', 'transducer'],
              'connector type': ['connector', 'connection', 'output connector', 'input/output'],
              'max payload': ['payload', 'payload capacity', 'max load', 'load capacity'],
              'capacity': ['storage capacity', 'size', 'storage size'],
              'compatibility': ['compatible with', 'works with'],
              'weight': ['body weight', 'total weight'],
              'dimensions': ['size', 'body size', 'measurements']
            };
            
            Object.entries(variations).forEach(([key, alts]) => {
              if (nameLower === key || nameLower.includes(key)) {
                alts.forEach(alt => {
                  specAliases[alt] = name;
                });
              }
            });
          }
        });
      }
    });
  }
  
  // Extract price
  const priceMatch = text.match(/\$[\d,]+\.?\d*/);
  if (priceMatch) {
    result.purchasePrice = priceMatch[0].replace(/[$,]/g, '');
  }
  
  // Try to find brand
  const textLower = text.toLowerCase();
  for (const brand of knownBrands) {
    if (textLower.includes(brand.toLowerCase())) {
      result.brand = brand;
      break;
    }
  }
  
  // Try to detect category
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        result.category = category;
        break;
      }
    }
    if (result.category) break;
  }
  
  // Parse each line for specs
  const extractedSpecs = {};
  
  for (const line of lines) {
    if (line.length < 3 || line.length > 200) continue;
    if (/^(home|shop|cart|login|sign|menu|search|filter|sort)/i.test(line)) continue;
    
    for (const pattern of specPatterns) {
      const match = line.match(pattern);
      if (match) {
        let [, key, value] = match;
        key = key.trim().toLowerCase();
        value = value.trim();
        
        if (value.startsWith('http') || value.length > 100) continue;
        
        let normalizedKey = specAliases[key];
        
        if (!normalizedKey) {
          for (const [alias, specName] of Object.entries(specAliases)) {
            if (key.includes(alias) || alias.includes(key)) {
              normalizedKey = specName;
              break;
            }
          }
        }
        
        if (!normalizedKey) {
          normalizedKey = key.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        
        if (normalizedKey && value) {
          extractedSpecs[normalizedKey] = value;
        }
        break;
      }
    }
    
    // Check if this line might be a product name
    if (!result.name && line.length > 5 && line.length < 100 && !line.includes(':') && !line.includes('\t')) {
      const hasBrand = knownBrands.some(b => line.toLowerCase().includes(b.toLowerCase()));
      const hasProductWords = /camera|lens|light|mic|tripod|monitor|recorder/i.test(line);
      if (hasBrand || hasProductWords) {
        result.name = line;
      }
    }
  }
  
  result.specs = extractedSpecs;
  
  return result;
};

// ============================================================================
// Smart Paste Modal Component
// ============================================================================
const SmartPasteModal = memo(function SmartPasteModal({ specs, onApply, onClose }) {
  const [pastedText, setPastedText] = useState('');
  const [preview, setPreview] = useState(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  
  const handleParse = () => {
    const parsed = parseProductText(pastedText, specs);
    setPreview(parsed);
  };
  
  const handleApply = () => {
    if (preview) {
      onApply(preview);
      onClose();
    }
  };
  
  const specCount = preview ? Object.keys(preview.specs).length : 0;
  
  const specFieldsList = specs ? [...new Set(
    Object.values(specs).flatMap(specList => 
      Array.isArray(specList) ? specList.map(s => s.name) : []
    )
  )].slice(0, 8) : [];
  
  return (
    <Modal onClose={onClose} maxWidth={650}>
      <ModalHeader title="Smart Paste - Import Product Info" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing[2] }}>
          Copy product specifications from B&H, Adorama, or manufacturer websites and paste below. 
          The system will extract relevant information automatically.
        </p>
        
        {specFieldsList.length > 0 && (
          <p style={{ color: colors.textMuted, fontSize: typography.fontSize.xs, marginBottom: spacing[3] }}>
            Looking for: {specFieldsList.join(', ')}{specFieldsList.length >= 8 ? '...' : ''}
          </p>
        )}
        
        <textarea
          ref={textareaRef}
          value={pastedText}
          onChange={e => { setPastedText(e.target.value); setPreview(null); }}
          placeholder="Paste product text here...

Example:
Sony Alpha a7 IV Mirrorless Camera
Sensor Type: Full-Frame BSI CMOS
Resolution: 33MP
Video: 4K 60p
Mount: Sony E
Price: $2,498.00"
          style={{
            ...styles.input,
            width: '100%',
            minHeight: 150,
            fontFamily: 'monospace',
            fontSize: typography.fontSize.sm,
            resize: 'vertical'
          }}
        />
        
        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], marginBottom: spacing[3] }}>
          <Button variant="secondary" onClick={handleParse} disabled={!pastedText.trim()}>
            Parse Text
          </Button>
          {preview && (
            <span style={{ color: colors.success, fontSize: typography.fontSize.sm, display: 'flex', alignItems: 'center' }}>
              ✓ Found {specCount} specs
            </span>
          )}
        </div>
        
        {preview && (
          <div style={{ 
            background: colors.bgLight, 
            borderRadius: borderRadius.md, 
            padding: spacing[3],
            marginBottom: spacing[3],
            maxHeight: 200,
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: typography.fontSize.sm, marginBottom: spacing[2] }}>
              <strong style={{ color: colors.textPrimary }}>Preview:</strong>
            </div>
            {preview.name && (
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
                <span style={{ color: colors.textMuted }}>Name:</span> {preview.name}
              </div>
            )}
            {preview.brand && (
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
                <span style={{ color: colors.textMuted }}>Brand:</span> {preview.brand}
              </div>
            )}
            {preview.category && (
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
                <span style={{ color: colors.textMuted }}>Category:</span> {preview.category}
              </div>
            )}
            {preview.purchasePrice && (
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary, marginBottom: spacing[1] }}>
                <span style={{ color: colors.textMuted }}>Price:</span> ${preview.purchasePrice}
              </div>
            )}
            {specCount > 0 && (
              <>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted, marginTop: spacing[2], marginBottom: spacing[1] }}>
                  Specifications:
                </div>
                {Object.entries(preview.specs).slice(0, 10).map(([key, value]) => (
                  <div key={key} style={{ fontSize: typography.fontSize.xs, color: colors.textSecondary, marginLeft: spacing[2] }}>
                    • {key}: {value}
                  </div>
                ))}
                {specCount > 10 && (
                  <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginLeft: spacing[2] }}>
                    ... and {specCount - 10} more
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!preview} icon={Plus}>
            Apply to Form
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// Item Modal (Add/Edit)
// ============================================================================
export const ItemModal = memo(function ItemModal({ isEdit, itemId, itemForm, setItemForm, specs, categories, categorySettings, locations, inventory, onSave, onClose, onDelete }) {
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  
  // Use the shared ItemForm hook for validation and computed values
  const {
    isValid,
    errors,
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
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing[3],
              padding: spacing[3],
              border: `1px dashed ${colors.border}`,
              borderRadius: borderRadius.md,
              background: colors.bgLight,
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
                      Image attached
                    </p>
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
                      accept="image/*"
                      id="item-image-upload"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            handleChange('image', event.target.result);
                          };
                          reader.readAsDataURL(file);
                        }
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
              <select value={itemForm.category} onChange={e => handleChange('category', e.target.value)} style={styles.select}>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Condition</label>
              <select value={itemForm.condition} onChange={e => handleChange('condition', e.target.value)} style={styles.select}>
                {Object.values(CONDITION).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          
          {/* Quantity fields - only if category tracks quantity */}
          {currentCategorySettings.trackQuantity && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: spacing[3], 
              marginBottom: spacing[3],
              padding: spacing[3],
              background: `${withOpacity(colors.accent2, 10)}`,
              borderRadius: borderRadius.md,
              border: `1px solid ${withOpacity(colors.accent2, 30)}`,
            }}>
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
                <select
                  value={itemForm.location || ''}
                  onChange={e => handleChange('location', e.target.value)}
                  style={styles.select}
                >
                  <option value="">Select location...</option>
                  {flattenedLocations.map(loc => (
                    <option key={loc.id} value={loc.fullPath}>{loc.fullPath}</option>
                  ))}
                </select>
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
            <input type="date" value={itemForm.purchaseDate} onChange={e => handleChange('purchaseDate', e.target.value)} style={styles.input} />
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

SmartPasteModal.propTypes = {
  /** Spec configuration for parsing */
  specs: specConfigShape,
  /** Callback when parsed data is applied */
  onApply: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};

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
