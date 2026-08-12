// =============================================================================
// UsersPanel — Test Suite
// Pins the users hardening: roles are editable in place, and the current
// user can neither delete nor demote themselves.
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsersPanel } from '../views/UsersView.jsx';

const roles = [
  { id: 'role_admin', name: 'Administrator' },
  { id: 'role_user', name: 'Standard User' },
];
const users = [
  { id: 'u1', name: 'Admin', email: 'a@x.com', roleId: 'role_admin' },
  { id: 'u2', name: 'Jordan', email: 'j@x.com', roleId: 'role_user' },
];

function renderPanel(overrides = {}) {
  const props = {
    users,
    roles,
    currentUserId: 'u1',
    onAddUser: vi.fn(),
    onChangeRole: vi.fn(),
    onDeleteUser: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<UsersPanel {...props} />);
  return props;
}

describe('UsersPanel', () => {
  it("lets an admin change another user's role in place", () => {
    const props = renderPanel();
    fireEvent.click(screen.getByLabelText('Role for Jordan'));
    fireEvent.click(screen.getByRole('option', { name: 'Administrator' }));
    expect(props.onChangeRole).toHaveBeenCalledWith('u2', 'role_admin');
  });

  it('protects the current user from self-demotion and self-deletion', () => {
    renderPanel();
    expect(screen.getByLabelText('Role for Admin')).toBeDisabled();
    expect(screen.getByLabelText('Delete Admin')).toBeDisabled();
    expect(screen.getByText('(you)')).toBeInTheDocument();
  });

  it('delete asks the parent (which confirms) for other users', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByLabelText('Delete Jordan'));
    expect(props.onDeleteUser).toHaveBeenCalledWith('u2');
  });
});
