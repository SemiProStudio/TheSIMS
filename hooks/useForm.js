// =============================================================================
// useForm Hook
// Reusable form state management with validation support
// =============================================================================

import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing form state, validation, and submission
 * 
 * @param {Object} options - Configuration options
 * @param {Object} options.initialValues - Initial form values
 * @param {Function} options.validate - Validation function (values) => errors
 * @param {Function} options.onSubmit - Submit handler (values) => Promise
 * @param {boolean} options.validateOnChange - Whether to validate on each change
 * @param {boolean} options.validateOnBlur - Whether to validate on blur
 * @returns {Object} Form state and handlers
 * 
 * @example
 * const form = useForm({
 *   initialValues: { name: '', email: '' },
 *   validate: (values) => {
 *     const errors = {};
 *     if (!values.name) errors.name = 'Required';
 *     if (!values.email) errors.email = 'Required';
 *     return errors;
 *   },
 *   onSubmit: async (values) => {
 *     await saveData(values);
 *   },
 * });
 * 
 * <form onSubmit={form.handleSubmit}>
 *   <input {...form.getFieldProps('name')} />
 *   {form.errors.name && <span>{form.errors.name}</span>}
 * </form>
 */
export function useForm({
  initialValues = {},
  validate,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true,
} = {}) {
  // Form state
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [submitError, setSubmitError] = useState(null);

  // ============================================================================
  // Validation
  // ============================================================================

  const runValidation = useCallback((valuesToValidate) => {
    if (!validate) return {};
    const validationErrors = validate(valuesToValidate);
    return validationErrors || {};
  }, [validate]);

  const validateField = useCallback((name, value) => {
    if (!validate) return;
    const allValues = { ...values, [name]: value };
    const allErrors = runValidation(allValues);
    setErrors(prev => ({
      ...prev,
      [name]: allErrors[name] || null,
    }));
  }, [values, validate, runValidation]);

  const validateForm = useCallback(() => {
    const validationErrors = runValidation(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [values, runValidation]);

  // ============================================================================
  // Field Handlers
  // ============================================================================

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    // Clear submit error when user starts typing
    if (submitError) setSubmitError(null);
    
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Validate on change if enabled
    if (validateOnChange) {
      validateField(name, newValue);
    }
  }, [errors, submitError, validateOnChange, validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate on blur if enabled
    if (validateOnBlur) {
      validateField(name, value);
    }
  }, [validateOnBlur, validateField]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  // ============================================================================
  // Form Handlers
  // ============================================================================

  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    setSubmitCount(prev => prev + 1);
    setSubmitError(null);
    
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Validate
    const isValid = validateForm();
    if (!isValid) {
      // Focus first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`);
        element?.focus();
      }
      return;
    }
    
    // Submit
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        setSubmitError(error.message || 'Submission failed');
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validateForm, errors, onSubmit]);

  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitCount(0);
    setSubmitError(null);
  }, [initialValues]);

  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // ============================================================================
  // Field Props Helper
  // ============================================================================

  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] ?? '',
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': errors[name] ? 'true' : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  }), [values, handleChange, handleBlur, errors]);

  const getFieldMeta = useCallback((name) => ({
    value: values[name],
    error: errors[name],
    touched: touched[name],
    hasError: !!(touched[name] && errors[name]),
  }), [values, errors, touched]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const isDirty = useMemo(() => {
    return Object.keys(values).some(key => values[key] !== initialValues[key]);
  }, [values, initialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const hasErrors = useMemo(() => {
    return Object.keys(errors).some(key => errors[key]);
  }, [errors]);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // State
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    submitError,
    isDirty,
    isValid,
    hasErrors,

    // Field handlers
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError,
    setFieldTouched,

    // Form handlers
    handleSubmit,
    resetForm,
    setFormValues,
    validateForm,
    validateField,

    // Helpers
    getFieldProps,
    getFieldMeta,
  };
}

/**
 * Create a validation function from a schema object
 * 
 * @param {Object} schema - Validation rules for each field
 * @returns {Function} Validation function
 * 
 * @example
 * const validate = createValidator({
 *   name: [
 *     { required: true, message: 'Name is required' },
 *     { minLength: 2, message: 'Name must be at least 2 characters' },
 *   ],
 *   email: [
 *     { required: true, message: 'Email is required' },
 *     { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
 *   ],
 * });
 */
export function createValidator(schema) {
  return (values) => {
    const errors = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = values[field];
      
      for (const rule of rules) {
        // Required check
        if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
          errors[field] = rule.message || `${field} is required`;
          break;
        }
        
        // Skip other validations if value is empty and not required
        if (!value && !rule.required) continue;
        
        // Min length
        if (rule.minLength && value.length < rule.minLength) {
          errors[field] = rule.message || `${field} must be at least ${rule.minLength} characters`;
          break;
        }
        
        // Max length
        if (rule.maxLength && value.length > rule.maxLength) {
          errors[field] = rule.message || `${field} must be no more than ${rule.maxLength} characters`;
          break;
        }
        
        // Pattern
        if (rule.pattern && !rule.pattern.test(value)) {
          errors[field] = rule.message || `${field} format is invalid`;
          break;
        }
        
        // Custom validator
        if (rule.validate) {
          const customError = rule.validate(value, values);
          if (customError) {
            errors[field] = customError;
            break;
          }
        }
        
        // Min value (for numbers)
        if (rule.min !== undefined && parseFloat(value) < rule.min) {
          errors[field] = rule.message || `${field} must be at least ${rule.min}`;
          break;
        }
        
        // Max value (for numbers)
        if (rule.max !== undefined && parseFloat(value) > rule.max) {
          errors[field] = rule.message || `${field} must be no more than ${rule.max}`;
          break;
        }
      }
    }
    
    return errors;
  };
}

export default useForm;
