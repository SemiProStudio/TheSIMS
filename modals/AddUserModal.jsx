// ============================================================================
// Add User Modal
// Modal for adding new users to the system
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import { spacing } from '../theme.js';
import { Button, Input } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';

export const AddUserModal = memo(function AddUserModal({
  onSave,
  onClose,
  existingEmails = [],
  roles = [],
}) {
  // Build role options from dynamic roles prop, with sensible fallback
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.id, label: r.name }))
      : [
          { value: 'role_user', label: 'Standard User' },
          { value: 'role_admin', label: 'Administrator' },
        ];

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: 'role_user',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = 'Invalid email format';
    else if (existingEmails.includes(form.email.toLowerCase()))
      newErrors.email = 'Email already exists';
    if (!form.password.trim()) newErrors.password = 'Password is required';
    else if (form.password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Find the role name for the selected roleId (for audit log)
  const selectedRole = roleOptions.find((r) => r.value === form.roleId);

  const handleSave = () => {
    if (validate()) {
      onSave({
        id: `u${Date.now()}`,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        roleId: form.roleId,
        roleName: selectedRole?.label || 'User',
        avatar: form.name.trim().charAt(0).toUpperCase(),
      });
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={450}>
      <ModalHeader title="Add User" onClose={onClose} />
      <div style={{ padding: spacing[4] }}>
        <Input
          label="Name"
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Full name"
          error={errors.name}
          containerStyle={{ marginBottom: spacing[3] }}
        />

        <Input
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="user@example.com"
          error={errors.email}
          containerStyle={{ marginBottom: spacing[3] }}
        />

        <Input
          label="Password"
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Minimum 6 characters"
          error={errors.password}
          containerStyle={{ marginBottom: spacing[3] }}
        />

        <div>
          <label className="label">Role</label>
          <Select
            value={form.roleId}
            onChange={(e) => setForm((prev) => ({ ...prev, roleId: e.target.value }))}
            options={roleOptions}
            aria-label="Role"
          />
        </div>
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} icon={Plus}>
          Add User
        </Button>
      </ModalFooter>
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
  /** Available roles from the system (from DataContext) */
  roles: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
};
