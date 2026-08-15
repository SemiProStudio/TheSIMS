// ============================================================================
// Admin Handlers (Users & Roles)
// Extracted from AppViews inline handlers — every operation persists FIRST
// and only then patches local state, so a failed server write can no longer
// show a success that silently reverts on reload. Audit entries are written
// only for operations that actually landed.
// ============================================================================
import { useCallback } from 'react';
import { rolesService, usersService } from '../../lib/services.js';
import { generateId } from '../../utils';
import { error as logError } from '../../lib/logger.js';
import { useToast } from '../../contexts/ToastContext.js';

const DEFAULT_ROLE_ID = 'role_user';

export function useAdminHandlers({ users, roles, currentUser, dataContext, addAuditLog }) {
  const { addToast } = useToast();

  // Patch a user's role locally, including the joined role object the UI
  // renders (patching roleId alone left a stale role badge)
  const patchUserRole = useCallback(
    (userId, roleId) => {
      const role = roles.find((r) => r.id === roleId);
      dataContext.patchUser(userId, {
        roleId,
        role: role ? { id: role.id, name: role.name, permissions: role.permissions } : undefined,
      });
    },
    [roles, dataContext],
  );

  const saveRole = useCallback(
    async (roleData) => {
      const existing = roles.find((r) => r.id === roleData.id);
      if (existing) {
        try {
          await rolesService.update(roleData.id, {
            name: roleData.name,
            description: roleData.description || '',
            permissions: roleData.permissions || {},
          });
        } catch (err) {
          logError('Failed to update role:', err);
          addToast('Failed to update role', 'error');
          return false;
        }
        dataContext.patchRole(roleData.id, roleData);
        addAuditLog({
          type: 'role_updated',
          description: `Role updated: ${roleData.name}`,
          user: currentUser?.name || 'Unknown',
        });
      } else {
        const newRole = { ...roleData, id: roleData.id || `role_${generateId()}` };
        try {
          await rolesService.create({
            id: newRole.id,
            name: newRole.name,
            description: newRole.description || '',
            is_system: false,
            permissions: newRole.permissions || {},
          });
        } catch (err) {
          logError('Failed to create role:', err);
          addToast('Failed to create role', 'error');
          return false;
        }
        dataContext.addLocalRole(newRole);
        addAuditLog({
          type: 'role_created',
          description: `Role created: ${newRole.name}`,
          user: currentUser?.name || 'Unknown',
        });
      }
      return true;
    },
    [roles, dataContext, addAuditLog, addToast, currentUser],
  );

  const deleteRole = useCallback(
    async (roleId) => {
      const deletedRole = roles.find((r) => r.id === roleId);
      // Deleting your own role silently demotes YOU to Standard User — the
      // lockout guard only protects the literal admin role, so a custom
      // admin-capable role could strand its last holder
      if (roleId === (currentUser?.roleId || currentUser?.role_id)) {
        addToast('You cannot delete the role you are currently assigned.', 'error');
        return false;
      }
      const affected = (users || []).filter((u) => u.roleId === roleId || u.role_id === roleId);
      try {
        // users.role_id is a plain FK with no cascade: users MUST be
        // reassigned before the role row is deleted, or the DB rejects the
        // delete (the old code deleted first and always failed here)
        for (const u of affected) {
          await usersService.updateRole(u.id, DEFAULT_ROLE_ID);
        }
        await rolesService.delete(roleId);
      } catch (err) {
        logError('Failed to delete role:', err);
        addToast('Failed to delete role', 'error');
        return false;
      }
      affected.forEach((u) => patchUserRole(u.id, DEFAULT_ROLE_ID));
      dataContext.removeLocalRole(roleId);
      addAuditLog({
        type: 'role_deleted',
        description: `Role deleted: ${deletedRole?.name || roleId}`,
        user: currentUser?.name || 'Unknown',
      });
      return true;
    },
    [roles, users, dataContext, addAuditLog, addToast, currentUser, patchUserRole],
  );

  const assignUsersToRole = useCallback(
    async (roleId, userIds) => {
      const selectedSet = new Set(userIds);
      const previouslyAssigned = (users || []).filter(
        (u) => u.roleId === roleId || u.role_id === roleId,
      );
      const unassigned = previouslyAssigned.filter((u) => !selectedSet.has(u.id));
      try {
        for (const userId of userIds) {
          await usersService.updateRole(userId, roleId);
        }
        for (const u of unassigned) {
          await usersService.updateRole(u.id, DEFAULT_ROLE_ID);
        }
      } catch (err) {
        logError('Failed to assign users:', err);
        addToast('Failed to assign users to role', 'error');
        return false;
      }
      userIds.forEach((userId) => patchUserRole(userId, roleId));
      unassigned.forEach((u) => patchUserRole(u.id, DEFAULT_ROLE_ID));
      return true;
    },
    [users, addToast, patchUserRole],
  );

  const changeUserRole = useCallback(
    async (userId, roleId) => {
      const user = users.find((u) => u.id === userId);
      const role = roles.find((r) => r.id === roleId);
      try {
        await usersService.updateRole(userId, roleId);
      } catch (err) {
        logError('Failed to change user role:', err);
        addToast('Failed to change role', 'error');
        return false;
      }
      patchUserRole(userId, roleId);
      addAuditLog({
        type: 'user_role_changed',
        description: `Role changed for ${user?.name || userId}: ${role?.name || roleId}`,
        user: currentUser?.name || 'Unknown',
        itemId: userId,
      });
      return true;
    },
    [users, roles, addAuditLog, addToast, currentUser, patchUserRole],
  );

  const deleteUser = useCallback(
    async (userId) => {
      const userToDelete = (users || []).find((u) => u.id === userId);
      try {
        await usersService.delete(userId);
      } catch (err) {
        logError('Failed to delete user:', err);
        addToast('Failed to delete user', 'error');
        return false;
      }
      dataContext.removeLocalUser(userId);
      addAuditLog({
        type: 'user_deleted',
        description: `User deleted: ${userToDelete?.name || userId}`,
        user: currentUser?.name || 'Unknown',
        itemId: userId,
      });
      return true;
    },
    [users, dataContext, addAuditLog, addToast, currentUser],
  );

  return { saveRole, deleteRole, assignUsersToRole, changeUserRole, deleteUser };
}
