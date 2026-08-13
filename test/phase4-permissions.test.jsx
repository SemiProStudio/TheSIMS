// =============================================================================
// Phase 4 — Permission enforcement tests (previously ZERO coverage)
//
// The evaluation flagged that a regression letting standard users reach admin
// functions would ship green. These exercise the REAL PermissionsProvider with
// the REAL DEFAULT_ROLES definitions.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { PermissionsProvider, PermissionGate } from '../contexts/PermissionsContext.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { DEFAULT_ROLES, PERMISSION_LEVELS } from '../constants.js';

function renderPermissions(currentUser, roles = DEFAULT_ROLES) {
  const wrapper = ({ children }) => (
    <PermissionsProvider currentUser={currentUser} roles={roles}>
      {children}
    </PermissionsProvider>
  );
  return renderHook(() => usePermissions(), { wrapper });
}

describe('hasPermission — deny by default', () => {
  it('denies everything when there is no current user', () => {
    const { result } = renderPermissions(null);
    expect(result.current.hasPermission('gear_list')).toBe(false);
    expect(result.current.canView('dashboard')).toBe(false);
    expect(result.current.getPermissionLevel('gear_list')).toBe(PERMISSION_LEVELS.HIDE);
  });

  it('denies everything when the roles list is empty', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_admin' }, []);
    expect(result.current.hasPermission('gear_list')).toBe(false);
  });

  it('treats a function missing from the role permissions as hidden', () => {
    const { result } = renderPermissions(
      { id: 'u1', roleId: 'custom' },
      [{ id: 'custom', permissions: { dashboard: PERMISSION_LEVELS.VIEW } }],
    );
    expect(result.current.canView('dashboard')).toBe(true);
    expect(result.current.canView('admin_users')).toBe(false);
    expect(result.current.getPermissionLevel('admin_users')).toBe(PERMISSION_LEVELS.HIDE);
  });
});

describe('hasPermission — role boundaries (real DEFAULT_ROLES)', () => {
  it('admin can edit admin functions', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_admin' });
    expect(result.current.canEdit('admin_users')).toBe(true);
    expect(result.current.canEdit('admin_roles')).toBe(true);
    expect(result.current.canEdit('gear_list')).toBe(true);
  });

  it('standard user can view but NOT edit the gear list', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_user' });
    expect(result.current.canView('gear_list')).toBe(true);
    expect(result.current.canEdit('gear_list')).toBe(false);
  });

  it('standard user cannot see or edit ANY admin function', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_user' });
    const adminFunctions = [
      'admin_users',
      'admin_categories',
      'admin_specs',
      'admin_locations',
      'admin_layout',
      'admin_notifications',
      'admin_roles',
      'admin_audit',
      'reports',
    ];
    for (const fn of adminFunctions) {
      expect(result.current.canView(fn), `${fn} should be hidden`).toBe(false);
      expect(result.current.canEdit(fn), `${fn} should not be editable`).toBe(false);
    }
  });

  it('manager can view admin_users but not edit it', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_manager' });
    expect(result.current.canView('admin_users')).toBe(true);
    expect(result.current.canEdit('admin_users')).toBe(false);
    expect(result.current.canView('admin_roles')).toBe(false);
  });

  it('viewer cannot access clients or labels', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_viewer' });
    expect(result.current.canView('clients')).toBe(false);
    expect(result.current.canView('labels')).toBe(false);
    expect(result.current.canView('gear_list')).toBe(true);
  });
});

describe('hasPermission — role resolution', () => {
  it('resolves the role from snake_case role_id (database shape)', () => {
    const { result } = renderPermissions({ id: 'u1', role_id: 'role_admin' });
    expect(result.current.canEdit('admin_users')).toBe(true);
  });

  it('falls back to role_user for an unknown role id', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_does_not_exist' });
    expect(result.current.canView('gear_list')).toBe(true);
    expect(result.current.canEdit('gear_list')).toBe(false);
    expect(result.current.canView('admin_users')).toBe(false);
  });

  it('uses an embedded role object from a Supabase join directly', () => {
    const { result } = renderPermissions({
      id: 'u1',
      roleId: 'role_user', // would resolve to standard user...
      role: { id: 'role_custom', permissions: { admin_users: PERMISSION_LEVELS.EDIT } },
    });
    // ...but the embedded role object wins
    expect(result.current.canEdit('admin_users')).toBe(true);
  });

  it('edit level satisfies a view requirement (hierarchy)', () => {
    const { result } = renderPermissions({ id: 'u1', roleId: 'role_admin' });
    expect(result.current.hasPermission('gear_list', PERMISSION_LEVELS.VIEW)).toBe(true);
    expect(result.current.isHidden('gear_list')).toBe(false);
  });
});

describe('PermissionGate', () => {
  function gate(user, props) {
    return render(
      <PermissionsProvider currentUser={user} roles={DEFAULT_ROLES}>
        <PermissionGate {...props}>
          <div>secret content</div>
        </PermissionGate>
      </PermissionsProvider>,
    );
  }

  it('renders children when the user has view access', () => {
    gate({ id: 'u1', roleId: 'role_user' }, { permission: 'gear_list' });
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('renders the fallback when the function is hidden', () => {
    gate(
      { id: 'u1', roleId: 'role_user' },
      { permission: 'admin_users', fallback: <div>no access</div> },
    );
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
    expect(screen.getByText('no access')).toBeInTheDocument();
  });

  it('requireEdit blocks a view-only user', () => {
    gate({ id: 'u1', roleId: 'role_user' }, { permission: 'gear_list', requireEdit: true });
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
