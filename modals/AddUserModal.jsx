// ============================================================================
// Add User Modal
// Modal for adding new users to the system
// ============================================================================

import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import { colors, styles, spacing, typography } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

export const AddUserModal = memo(function AddUserModal({ onSave, onClose, existingEmails = [] }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format';
    else if (existingEmails.includes(form.email.toLowerCase())) newErrors.email = 'Email already exists';
    if (!form.password.trim()) newErrors.password = 'Password is required';
    else if (form.password.length < 4) newErrors.password = 'Password must be at least 4 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({
        id: `u${Date.now()}`,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        roleId: form.role === 'admin' ? 'role_admin' : 'role_user',
        avatar: form.name.trim().charAt(0).toUpperCase(),
      });
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <ModalHeader title="Add User" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: !form.name || errors.name ? colors.danger : undefined }}>
            Name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Full name"
            style={{ ...styles.input, borderColor: !form.name || errors.name ? colors.danger : colors.border }}
          />
          {errors.name && <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{errors.name}</span>}
        </div>
        
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: !form.email || errors.email ? colors.danger : undefined }}>
            Email <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="user@example.com"
            style={{ ...styles.input, borderColor: !form.email || errors.email ? colors.danger : colors.border }}
          />
          {errors.email && <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{errors.email}</span>}
        </div>
        
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: !form.password || errors.password ? colors.danger : undefined }}>
            Password <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
            placeholder="Minimum 4 characters"
            style={{ ...styles.input, borderColor: !form.password || errors.password ? colors.danger : colors.border }}
          />
          {errors.password && <span style={{ color: colors.danger, fontSize: typography.fontSize.xs }}>{errors.password}</span>}
        </div>
        
        <div style={{ marginBottom: spacing[4] }}>
          <label style={styles.label}>Role</label>
          <Select
            value={form.role}
            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
            aria-label="Role"
          />
        </div>
        
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} icon={Plus}>Add User</Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
AddUserModal.propTypes = {
  /** Callback when user is saved with user data */
  onSave: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
  /** List of existing emails for duplicate validation */
  existingEmails: PropTypes.arrayOf(PropTypes.string),
};
