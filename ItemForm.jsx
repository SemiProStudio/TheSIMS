import { useMemo, useState, useCallback } from 'react';
import { generateItemCode, flattenLocations } from './utils.js';
import { validateItem } from './lib/validators.js';

import { warn } from './lib/logger.js';

// ============================================================================
// useItemForm - Custom hook for item form validation and computed values
// Used by both ItemModal (compact) and ItemFormPage (full page)
// ============================================================================

export function useItemForm({
  isEdit,
  itemId,
  itemForm,
  setItemForm,
  specs,
  categorySettings,
  locations,
  inventory,
  categories = [],
}) {
  // Validation errors state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const categorySpecs = specs[itemForm.category] || [];
  
  // Generate item code only once per category - memoize to prevent regeneration on every render
  const existingIds = useMemo(() => inventory.map(i => i.id), [inventory]);
  const existingCodes = useMemo(() => inventory.map(i => i.code).filter(Boolean), [inventory]);
  
  const previewCode = useMemo(() => {
    if (isEdit) return null;
    return generateItemCode(itemForm.category, existingIds);
  }, [isEdit, itemForm.category, existingIds]);
  
  // Check for duplicate serial number
  const duplicateSerialNumber = useMemo(() => {
    if (!itemForm.serialNumber?.trim()) return null;
    const serialLower = itemForm.serialNumber.trim().toLowerCase();
    const duplicate = inventory.find(item => 
      item.serialNumber?.toLowerCase() === serialLower && 
      item.id !== itemId // Exclude current item when editing
    );
    // Debug: log if the "duplicate" appears to be the item itself
    if (duplicate && isEdit) {
      if (import.meta.env.DEV) {
        warn('[useItemForm] Serial duplicate check:', {
          itemId,
          duplicateId: duplicate.id,
          duplicateName: duplicate.name,
          formName: itemForm.name,
          match: duplicate.id === itemId,
        });
      }
      // Safety: if the duplicate has the same name as the form, it's the item itself
      if (duplicate.name === itemForm.name) return null;
    }
    return duplicate;
  }, [itemForm.serialNumber, itemForm.name, isEdit, inventory, itemId]);
  
  // Get settings for the selected category
  const currentCategorySettings = categorySettings?.[itemForm.category] || { 
    trackQuantity: false, 
    trackSerialNumbers: true,
    lowStockThreshold: 0 
  };
  
  // Check if all required specification fields are filled
  const requiredSpecsFilled = useMemo(() => {
    const requiredSpecs = categorySpecs.filter(s => s.required);
    return requiredSpecs.every(spec => itemForm.specs[spec.name]?.trim());
  }, [categorySpecs, itemForm.specs]);
  
  // Check if serial number is required and filled
  const serialNumberValid = !currentCategorySettings.trackSerialNumbers || itemForm.serialNumber?.trim();
  
  // Run full validation using validators.js
  const validation = useMemo(() => {
    return validateItem(itemForm, {
      existingCodes,
      editingId: itemId,
      customCategories: categories,
    });
  }, [itemForm, existingCodes, itemId, categories]);
  
  // Combined validation (basic + validators.js)
  const isValid = itemForm.name?.trim() && 
                  itemForm.brand?.trim() && 
                  !duplicateSerialNumber && 
                  requiredSpecsFilled &&
                  serialNumberValid &&
                  validation.isValid;

  // Flatten locations for selector
  const flattenedLocations = useMemo(() => {
    if (!locations) return [];
    return flattenLocations(locations);
  }, [locations]);

  // Change handlers with error clearing
  const handleChange = useCallback((field, value) => {
    setItemForm(prev => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    setTouched(prev => ({ ...prev, [field]: true }));
  }, [setItemForm, errors]);
  
  const handleSpecChange = useCallback((name, value) => {
    setItemForm(prev => ({ ...prev, specs: { ...prev.specs, [name]: value } }));
  }, [setItemForm]);
  
  // Validate a single field on blur
  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Get error from validation result
    if (validation.errors[field]) {
      setErrors(prev => ({ ...prev, [field]: validation.errors[field] }));
    }
  }, [validation.errors]);
  
  // Validate all fields (call before submit)
  const validateAll = useCallback(() => {
    // Mark all fields as touched
    const allTouched = Object.keys(itemForm).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Set all errors from validation
    const allErrors = { ...validation.errors };
    
    // Add custom errors
    if (duplicateSerialNumber) {
      allErrors.serialNumber = `Serial number already exists on "${duplicateSerialNumber.name}"`;
    }
    if (!requiredSpecsFilled) {
      allErrors.specs = 'Please fill in all required specifications';
    }
    if (currentCategorySettings.trackSerialNumbers && !itemForm.serialNumber?.trim()) {
      allErrors.serialNumber = 'Serial number is required for this category';
    }
    
    setErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  }, [itemForm, validation.errors, duplicateSerialNumber, requiredSpecsFilled, currentCategorySettings]);
  
  // Get error for a field (only show if touched)
  const getFieldError = useCallback((field) => {
    if (!touched[field]) return null;
    return errors[field] || validation.errors[field] || null;
  }, [touched, errors, validation.errors]);
  
  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    // Validation
    isValid,
    errors,
    touched,
    validation,
    
    // Validation helpers
    getFieldError,
    validateAll,
    clearErrors,
    handleBlur,
    
    // Computed values
    previewCode,
    duplicateSerialNumber,
    categorySpecs,
    currentCategorySettings,
    flattenedLocations,
    
    // Handlers
    handleChange,
    handleSpecChange,
  };
}

export default useItemForm;
