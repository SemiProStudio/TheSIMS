// =============================================================================
// RolesManager — Test Suite
// Pins the roles hardening: the Administrator system role can never lose
// Edit on user/role management (self-lockout guard), system roles hide
// Delete, deletion asks for confirmation, and the page has a back button.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import RolesManager from '../views/RolesManager.jsx';
import { LOCKED_ADMIN_PERMISSIONS } from '../constants.js';
import { PERMISSION_LEVELS } from '../constants.js';

const roles = [
  {
    id: 'role_admin',
    name: 'Administrator',
    description: 'Full access',
    isSystem: true,
    permissions: { admin_users: 'edit', admin_roles: 'edit', gear_list: 'edit' },
  },
  {
    id: 'role_crew',
    name: 'Crew',
    description: 'Field crew',
    isSystem: false,
    permissions: { gear_list: 'view' },
  },
];

const users = [
  { id: 'u1', name: 'Admin', email: 'a@x.com', roleId: 'role_admin' },
  { id: 'u2', name: 'Jordan', email: 'j@x.com', roleId: 'role_crew' },
];

function renderRoles(overrides = {}) {
  const props = {
    roles,
    users,
    onSaveRole: vi.fn(),
    onDeleteRole: vi.fn(),
    onAssignUsers: vi.fn(),
    showConfirm: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<RolesManager {...props} />);
  return props;
}

describe('RolesManager page', () => {
  it('has a back button (used to be the only admin page without one)', () => {
    const props = renderRoles();
    fireEvent.click(screen.getByText('Back to Admin'));
    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  it('hides Delete for system roles and confirms deletion for custom ones', () => {
    const props = renderRoles();
    const adminCard = screen.getByText('Administrator').closest('.card');
    const crewCard = screen.getByText('Crew').closest('.card');

    expect(within(adminCard).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();

    fireEvent.click(within(crewCard).getByRole('button', { name: /Delete/ }));
    expect(props.onDeleteRole).not.toHaveBeenCalled(); // confirm first
    expect(props.showConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Delete Role' }),
    );
  });
});

describe('Administrator lockout guard', () => {
  const openAdminEditor = () => {
    const adminCard = screen.getByText('Administrator').closest('.card');
    fireEvent.click(within(adminCard).getByRole('button', { name: /Edit/ }));
  };

  it('locks user & role management permissions in the editor', () => {
    renderRoles();
    openAdminEditor();

    // The locked rows explain themselves and their buttons are disabled
    const lockNotes = screen.getAllByText(/Locked to Edit/);
    expect(lockNotes).toHaveLength(LOCKED_ADMIN_PERMISSIONS.length);
    const userMgmtRow = lockNotes[0].closest('div').parentElement.parentElement;
    within(userMgmtRow)
      .getAllByRole('button')
      .forEach((btn) => expect(btn).toBeDisabled());
  });

  it('"All Hide" cannot strip the locked permissions from the save payload', () => {
    const props = renderRoles();
    openAdminEditor();

    fireEvent.click(screen.getByRole('button', { name: 'All Hide' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    const saved = props.onSaveRole.mock.calls[0][0];
    LOCKED_ADMIN_PERMISSIONS.forEach((funcId) => {
      expect(saved.permissions[funcId]).toBe(PERMISSION_LEVELS.EDIT);
    });
    // Everything else was allowed to change
    expect(saved.permissions.gear_list).toBe(PERMISSION_LEVELS.HIDE);
  });

  it('custom roles remain fully editable', () => {
    const props = renderRoles();
    const crewCard = screen.getByText('Crew').closest('.card');
    fireEvent.click(within(crewCard).getByRole('button', { name: /Edit/ }));

    fireEvent.click(screen.getByRole('button', { name: 'All Hide' }));
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/ }));

    const saved = props.onSaveRole.mock.calls[0][0];
    expect(saved.permissions.admin_users).toBe(PERMISSION_LEVELS.HIDE);
  });
});
