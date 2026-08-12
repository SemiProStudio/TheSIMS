// =============================================================================
// useAdminHandlers — Test Suite
// Pins the persist-first contract for user/role admin operations:
// - role deletion reassigns users BEFORE deleting the role (users.role_id is
//   a plain FK — the old delete-first order was rejected by the DB)
// - failures leave local state untouched and write no audit entries
// - role changes patch the joined role object, not just roleId
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockAddToast, callOrder } = vi.hoisted(() => ({
  mockAddToast: vi.fn(),
  callOrder: [],
}));

vi.mock('../contexts/ToastContext.js', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../lib/services.js', () => ({
  rolesService: {
    create: vi.fn(async () => callOrder.push('roles.create')),
    update: vi.fn(async () => callOrder.push('roles.update')),
    delete: vi.fn(async () => callOrder.push('roles.delete')),
  },
  usersService: {
    updateRole: vi.fn(async (id) => callOrder.push(`users.updateRole:${id}`)),
    delete: vi.fn(async () => callOrder.push('users.delete')),
  },
}));

const { useAdminHandlers } = await import('../hooks/handlers/useAdminHandlers.js');
const { rolesService, usersService } = await import('../lib/services.js');

const roles = [
  { id: 'role_admin', name: 'Administrator', permissions: {} },
  { id: 'role_user', name: 'Standard User', permissions: {} },
  { id: 'role_crew', name: 'Crew', permissions: {} },
];
const users = [
  { id: 'u1', name: 'Admin', roleId: 'role_admin' },
  { id: 'u2', name: 'Jordan', roleId: 'role_crew' },
  { id: 'u3', name: 'Sam', roleId: 'role_crew' },
];

function setup() {
  const dataContext = {
    patchRole: vi.fn(),
    addLocalRole: vi.fn(),
    removeLocalRole: vi.fn(),
    patchUser: vi.fn(),
    removeLocalUser: vi.fn(),
  };
  const addAuditLog = vi.fn();
  const hook = renderHook(() =>
    useAdminHandlers({
      users,
      roles,
      currentUser: { id: 'u1', name: 'Admin' },
      dataContext,
      addAuditLog,
    }),
  );
  return { hook, dataContext, addAuditLog };
}

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;
});

describe('deleteRole', () => {
  it('reassigns every affected user BEFORE deleting the role', async () => {
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.deleteRole('role_crew');
    });

    expect(callOrder).toEqual(['users.updateRole:u2', 'users.updateRole:u3', 'roles.delete']);
    expect(dataContext.removeLocalRole).toHaveBeenCalledWith('role_crew');
    expect(dataContext.patchUser).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ roleId: 'role_user' }),
    );
    expect(addAuditLog).toHaveBeenCalledWith(expect.objectContaining({ type: 'role_deleted' }));
  });

  it('leaves local state untouched when the delete fails', async () => {
    rolesService.delete.mockRejectedValueOnce(new Error('nope'));
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.deleteRole('role_crew');
    });

    expect(dataContext.removeLocalRole).not.toHaveBeenCalled();
    expect(dataContext.patchUser).not.toHaveBeenCalled();
    expect(addAuditLog).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Failed to delete role', 'error');
  });
});

describe('saveRole', () => {
  it('creates via the service before touching local state', async () => {
    const { hook, dataContext } = setup();
    await act(async () => {
      await hook.result.current.saveRole({ name: 'New Role', permissions: {} });
    });
    expect(rolesService.create).toHaveBeenCalled();
    expect(dataContext.addLocalRole).toHaveBeenCalled();
  });

  it('does not add the role locally when creation fails', async () => {
    rolesService.create.mockRejectedValueOnce(new Error('nope'));
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.saveRole({ name: 'New Role', permissions: {} });
    });
    expect(dataContext.addLocalRole).not.toHaveBeenCalled();
    expect(addAuditLog).not.toHaveBeenCalled();
  });

  it('does not patch an existing role when the update fails', async () => {
    rolesService.update.mockRejectedValueOnce(new Error('nope'));
    const { hook, dataContext } = setup();
    await act(async () => {
      await hook.result.current.saveRole({ id: 'role_crew', name: 'Crew 2', permissions: {} });
    });
    expect(dataContext.patchRole).not.toHaveBeenCalled();
  });
});

describe('changeUserRole', () => {
  it('persists, then patches roleId AND the joined role object', async () => {
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.changeUserRole('u2', 'role_admin');
    });

    expect(usersService.updateRole).toHaveBeenCalledWith('u2', 'role_admin');
    expect(dataContext.patchUser).toHaveBeenCalledWith('u2', {
      roleId: 'role_admin',
      role: { id: 'role_admin', name: 'Administrator', permissions: {} },
    });
    expect(addAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user_role_changed' }),
    );
  });

  it('patches nothing when persistence fails', async () => {
    usersService.updateRole.mockRejectedValueOnce(new Error('nope'));
    const { hook, dataContext } = setup();
    await act(async () => {
      await hook.result.current.changeUserRole('u2', 'role_admin');
    });
    expect(dataContext.patchUser).not.toHaveBeenCalled();
  });
});

describe('deleteUser', () => {
  it('removes locally and audits only after the DB delete lands', async () => {
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.deleteUser('u2');
    });
    expect(usersService.delete).toHaveBeenCalledWith('u2');
    expect(dataContext.removeLocalUser).toHaveBeenCalledWith('u2');
    expect(addAuditLog).toHaveBeenCalledWith(expect.objectContaining({ type: 'user_deleted' }));
  });

  it('keeps the user when the delete fails (no phantom removal, no audit)', async () => {
    usersService.delete.mockRejectedValueOnce(new Error('nope'));
    const { hook, dataContext, addAuditLog } = setup();
    await act(async () => {
      await hook.result.current.deleteUser('u2');
    });
    expect(dataContext.removeLocalUser).not.toHaveBeenCalled();
    expect(addAuditLog).not.toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Failed to delete user', 'error');
  });
});

describe('assignUsersToRole', () => {
  it('persists assignments and un-assignments, then patches local state', async () => {
    const { hook, dataContext } = setup();
    // u2 keeps crew, u3 is deselected → back to role_user, u1 newly added
    await act(async () => {
      await hook.result.current.assignUsersToRole('role_crew', ['u1', 'u2']);
    });

    expect(usersService.updateRole).toHaveBeenCalledWith('u1', 'role_crew');
    expect(usersService.updateRole).toHaveBeenCalledWith('u2', 'role_crew');
    expect(usersService.updateRole).toHaveBeenCalledWith('u3', 'role_user');
    expect(dataContext.patchUser).toHaveBeenCalledWith(
      'u3',
      expect.objectContaining({ roleId: 'role_user' }),
    );
  });
});
