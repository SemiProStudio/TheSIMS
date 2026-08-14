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
import { usePermissions, canAccessView } from '../contexts/PermissionsContext.js';
import { DEFAULT_ROLES, PERMISSION_LEVELS, VIEWS } from '../constants.js';

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
    const { result } = renderPermissions({ id: 'u1', roleId: 'custom' }, [
      { id: 'custom', permissions: { dashboard: PERMISSION_LEVELS.VIEW } },
    ]);
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

// =============================================================================
// canAccessView — the navigation guard (QR round)
// Sidebar hiding is not a barrier: the scanner, deep links, and restored
// state set currentView directly. These pin the render-time guard.
// =============================================================================

describe('canAccessView (navigation guard)', () => {
  const guards = (currentUser, roles = DEFAULT_ROLES) => {
    const { result } = renderPermissions(currentUser, roles);
    const { canView, canEdit } = result.current;
    return (view) => canAccessView(view, { canView, canEdit });
  };

  it('lets the standard user into views their role can see', () => {
    const allowed = guards({ id: 'u1', roleId: 'role_user' });
    expect(allowed(VIEWS.DASHBOARD)).toBe(true);
    expect(allowed(VIEWS.GEAR_DETAIL)).toBe(true);
    expect(allowed(VIEWS.SCHEDULE)).toBe(true);
  });

  it('blocks direct navigation to views hidden from the role', () => {
    const allowed = guards({ id: 'u1', roleId: 'role_user' });
    expect(allowed(VIEWS.REPORTS)).toBe(false);
    expect(allowed(VIEWS.USERS)).toBe(false);
    expect(allowed(VIEWS.ROLES_MANAGE)).toBe(false);
  });

  it('ADD_ITEM requires EDIT, not just VIEW (role_user has gear_list VIEW)', () => {
    expect(guards({ id: 'u1', roleId: 'role_user' })(VIEWS.ADD_ITEM)).toBe(false);
    expect(guards({ id: 'u1', roleId: 'role_admin' })(VIEWS.ADD_ITEM)).toBe(true);
  });

  it('personal views stay open to everyone (theme, notifications, layout)', () => {
    const allowed = guards({ id: 'u1', roleId: 'role_user' });
    expect(allowed(VIEWS.THEME_SELECTOR)).toBe(true);
    expect(allowed(VIEWS.NOTIFICATIONS)).toBe(true);
    expect(allowed(VIEWS.CUSTOMIZE_DASHBOARD)).toBe(true);
  });

  it('the Admin hub opens for ANY admin permission (mirrors the sidebar)', () => {
    const roles = [
      ...DEFAULT_ROLES,
      {
        id: 'role_cat_only',
        permissions: {
          dashboard: PERMISSION_LEVELS.VIEW,
          admin_categories: PERMISSION_LEVELS.EDIT,
        },
      },
    ];
    expect(guards({ id: 'u1', roleId: 'role_cat_only' }, roles)(VIEWS.ADMIN)).toBe(true);
    expect(guards({ id: 'u1', roleId: 'role_user' })(VIEWS.ADMIN)).toBe(false);
  });

  it('reservation detail follows the schedule permission', () => {
    const roles = [{ id: 'role_no_schedule', permissions: { dashboard: PERMISSION_LEVELS.VIEW } }];
    expect(guards({ id: 'u1', roleId: 'role_user' })(VIEWS.RESERVATION_DETAIL)).toBe(true);
    expect(guards({ id: 'u1', roleId: 'role_no_schedule' }, roles)(VIEWS.RESERVATION_DETAIL)).toBe(
      false,
    );
  });

  // Pure-editor admin pages require EDIT — view-level permission only ever
  // rendered editors whose saves failed at the database (whole-app round)
  it('admin editors require EDIT: Manager (view-level admin perms) is refused', () => {
    const allowed = guards({ id: 'u1', roleId: 'role_manager' });
    expect(allowed(VIEWS.EDIT_SPECS)).toBe(false);
    expect(allowed(VIEWS.EDIT_CATEGORIES)).toBe(false);
    expect(allowed(VIEWS.ROLES_MANAGE)).toBe(false);

    const admin = guards({ id: 'u1', roleId: 'role_admin' });
    expect(admin(VIEWS.EDIT_SPECS)).toBe(true);
    expect(admin(VIEWS.EDIT_CATEGORIES)).toBe(true);
    expect(admin(VIEWS.ROLES_MANAGE)).toBe(true);
  });

  it('Manager keeps the read-consumable admin surfaces (users directory, logs)', () => {
    const allowed = guards({ id: 'u1', roleId: 'role_manager' });
    expect(allowed(VIEWS.USERS)).toBe(true);
    expect(allowed(VIEWS.AUDIT_LOG)).toBe(true);
    expect(allowed(VIEWS.ADMIN)).toBe(true);
  });

  it('stale admin_layout/admin_notifications keys no longer open the hub', () => {
    // Legacy role rows can still carry the retired keys — they became
    // per-user personalization, so they grant no admin access
    const roles = [
      {
        id: 'role_legacy',
        permissions: {
          dashboard: PERMISSION_LEVELS.VIEW,
          admin_layout: PERMISSION_LEVELS.EDIT,
          admin_notifications: PERMISSION_LEVELS.EDIT,
        },
      },
    ];
    expect(guards({ id: 'u1', roleId: 'role_legacy' }, roles)(VIEWS.ADMIN)).toBe(false);
  });
});
