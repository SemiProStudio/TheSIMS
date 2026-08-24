// ============================================================================
// Permissions Context
// Provides permission checking throughout the app
// ============================================================================

import { useMemo, useCallback } from 'react';
import { PERMISSION_LEVELS, APP_FUNCTIONS } from '../constants.js';
import { typography, borderRadius } from '../theme.js';
import PermissionsContext, { usePermissions } from './PermissionsContext.js';

export function PermissionsProvider({ children, currentUser, roles }) {
  // Get the user's role
  const userRole = useMemo(() => {
    if (!currentUser) return null;

    // If user has an embedded role object from Supabase join, use it directly
    if (currentUser.role && typeof currentUser.role === 'object' && currentUser.role.permissions) {
      return currentUser.role;
    }

    // Otherwise, look up role from roles array
    if (!roles || roles.length === 0) return null;

    // Support both roleId (frontend) and role_id (database) naming
    const userRoleId = currentUser.roleId || currentUser.role_id;

    // Find user's assigned role, or fall back to role_user (most restrictive standard role)
    return (
      roles.find((r) => r.id === userRoleId) || roles.find((r) => r.id === 'role_user') || null
    );
  }, [currentUser, roles]);

  // Check if user has at least the specified permission level for a function
  const hasPermission = useCallback(
    (functionId, requiredLevel = PERMISSION_LEVELS.VIEW) => {
      // If no role found, deny all access
      if (!userRole) {
        return false;
      }

      const permission = userRole.permissions[functionId];

      // If permission not defined, default to hide
      if (!permission) return false;

      // Permission hierarchy: edit > view > hide
      const levels = {
        [PERMISSION_LEVELS.HIDE]: 0,
        [PERMISSION_LEVELS.VIEW]: 1,
        [PERMISSION_LEVELS.EDIT]: 2,
      };

      const requiredLevelNum = levels[requiredLevel] || 0;
      const userLevelNum = levels[permission] || 0;

      return userLevelNum >= requiredLevelNum;
    },
    [userRole],
  );

  // Check if a function is visible (not hidden)
  const canView = useCallback(
    (functionId) => {
      return hasPermission(functionId, PERMISSION_LEVELS.VIEW);
    },
    [hasPermission],
  );

  // Check if user can edit a function
  const canEdit = useCallback(
    (functionId) => {
      return hasPermission(functionId, PERMISSION_LEVELS.EDIT);
    },
    [hasPermission],
  );

  // Check if a function is hidden
  const isHidden = useCallback(
    (functionId) => {
      return !hasPermission(functionId, PERMISSION_LEVELS.VIEW);
    },
    [hasPermission],
  );

  // Get the permission level for a function
  const getPermissionLevel = useCallback(
    (functionId) => {
      if (!userRole) {
        return PERMISSION_LEVELS.HIDE;
      }
      return userRole.permissions[functionId] || PERMISSION_LEVELS.HIDE;
    },
    [userRole],
  );

  // Get all visible functions
  const visibleFunctions = useMemo(() => {
    return Object.values(APP_FUNCTIONS).filter((func) => canView(func.id));
  }, [canView]);

  const value = useMemo(
    () => ({
      userRole,
      hasPermission,
      canView,
      canEdit,
      isHidden,
      getPermissionLevel,
      visibleFunctions,
      PERMISSION_LEVELS,
    }),
    [userRole, hasPermission, canView, canEdit, isHidden, getPermissionLevel, visibleFunctions],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

// Component to show view-only message
export function ViewOnlyBanner({ functionId }) {
  const { canEdit } = usePermissions();

  if (canEdit(functionId)) return null;

  return (
    <div
      style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: borderRadius.md,
        padding: '8px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#3b82f6',
        fontSize: typography.fontSize.base,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>You have view-only access. Some actions may be restricted.</span>
    </div>
  );
}

// Permission gate component - renders children only if permission is met
// Use this in JSX: <PermissionGate permission="admin_users">{children}</PermissionGate>
export function PermissionGate({ permission, requireEdit = false, fallback = null, children }) {
  const { canView, canEdit } = usePermissions();

  const hasPermission = requireEdit ? canEdit(permission) : canView(permission);

  if (!hasPermission) {
    return fallback;
  }

  return children;
}

