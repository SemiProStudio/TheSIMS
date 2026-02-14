// ============================================================================
// Permissions Context
// Provides permission checking throughout the app
// ============================================================================

import { createContext, useContext, useMemo, useCallback } from 'react';
import { PERMISSION_LEVELS, APP_FUNCTIONS, VIEWS } from '../constants';
import { typography, borderRadius } from '../theme';

const PermissionsContext = createContext(null);

// Mapping of views to their required permission function IDs
export const VIEW_PERMISSIONS = {
  [VIEWS.DASHBOARD]: 'dashboard',
  [VIEWS.GEAR_LIST]: 'gear_list',
  [VIEWS.GEAR_DETAIL]: 'item_details',
  [VIEWS.PACKAGES]: 'gear_list',
  [VIEWS.PACKAGE_DETAIL]: 'item_details',
  [VIEWS.PACK_LISTS]: 'pack_lists',
  [VIEWS.SCHEDULE]: 'schedule',
  [VIEWS.SEARCH]: 'search',
  [VIEWS.LABELS]: 'labels',
  [VIEWS.CLIENTS]: 'clients',
  [VIEWS.CLIENT_DETAIL]: 'clients',
  [VIEWS.REPORTS]: 'reports',
  [VIEWS.ADMIN]: 'admin_users', // Requires at least one admin permission
  [VIEWS.USERS]: 'admin_users',
  [VIEWS.AUDIT_LOG]: 'admin_audit',
  [VIEWS.CHANGE_LOG]: 'admin_audit',
  [VIEWS.EDIT_SPECS]: 'admin_specs',
  [VIEWS.EDIT_CATEGORIES]: 'admin_categories',
  [VIEWS.ADD_ITEM]: 'gear_list', // Requires edit permission
  [VIEWS.LOCATIONS_MANAGE]: 'admin_locations',
  [VIEWS.ROLES_MANAGE]: 'admin_roles',
  [VIEWS.MAINTENANCE_REPORT]: 'reports',
  [VIEWS.INSURANCE_REPORT]: 'reports',
  [VIEWS.CLIENT_REPORT]: 'reports',
  [VIEWS.THEME_SELECTOR]: 'admin_themes',
  [VIEWS.NOTIFICATIONS]: 'admin_notifications',
  [VIEWS.CUSTOMIZE_DASHBOARD]: 'admin_layout',
  [VIEWS.CUSTOMIZE_ITEM_DETAIL]: 'admin_layout',
};

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
    return roles.find(r => r.id === userRoleId) || 
           roles.find(r => r.id === 'role_user') || 
           null;
  }, [currentUser, roles]);

  // Check if user has at least the specified permission level for a function
  const hasPermission = useCallback((functionId, requiredLevel = PERMISSION_LEVELS.VIEW) => {
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
  }, [userRole, currentUser]);

  // Check if a function is visible (not hidden)
  const canView = useCallback((functionId) => {
    return hasPermission(functionId, PERMISSION_LEVELS.VIEW);
  }, [hasPermission]);

  // Check if user can edit a function
  const canEdit = useCallback((functionId) => {
    return hasPermission(functionId, PERMISSION_LEVELS.EDIT);
  }, [hasPermission]);

  // Check if a function is hidden
  const isHidden = useCallback((functionId) => {
    return !hasPermission(functionId, PERMISSION_LEVELS.VIEW);
  }, [hasPermission]);

  // Get the permission level for a function
  const getPermissionLevel = useCallback((functionId) => {
    if (!userRole) {
      return PERMISSION_LEVELS.HIDE;
    }
    return userRole.permissions[functionId] || PERMISSION_LEVELS.HIDE;
  }, [userRole]);

  // Get all visible functions
  const visibleFunctions = useMemo(() => {
    return Object.values(APP_FUNCTIONS).filter(func => canView(func.id));
  }, [canView]);

  const value = useMemo(() => ({
    userRole,
    hasPermission,
    canView,
    canEdit,
    isHidden,
    getPermissionLevel,
    visibleFunctions,
    PERMISSION_LEVELS,
  }), [userRole, hasPermission, canView, canEdit, isHidden, getPermissionLevel, visibleFunctions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

// Higher-order component to protect routes/components
export function withPermission(WrappedComponent, functionId, requiredLevel = PERMISSION_LEVELS.VIEW) {
  return function PermissionProtectedComponent(props) {
    const { hasPermission, getPermissionLevel } = usePermissions();
    
    if (!hasPermission(functionId, requiredLevel)) {
      return <AccessDenied functionId={functionId} currentLevel={getPermissionLevel(functionId)} requiredLevel={requiredLevel} />;
    }
    
    return <WrappedComponent {...props} />;
  };
}

// Access denied component
export function AccessDenied({ functionId, currentLevel, requiredLevel, message }) {
  const funcInfo = APP_FUNCTIONS[Object.keys(APP_FUNCTIONS).find(k => APP_FUNCTIONS[k].id === functionId)];
  
  const levelMessages = {
    [PERMISSION_LEVELS.VIEW]: 'view',
    [PERMISSION_LEVELS.EDIT]: 'edit',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        color: '#ef4444',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 style={{ margin: '0 0 8px', color: '#1f2937', fontSize: typography.fontSize.xl }}>
        Access Restricted
      </h3>
      <p style={{ margin: '0 0 16px', color: '#6b7280', maxWidth: 400 }}>
        {message || (
          currentLevel === PERMISSION_LEVELS.HIDE
            ? `You don't have permission to access ${funcInfo?.name || 'this feature'}.`
            : `You have ${currentLevel} access to ${funcInfo?.name || 'this feature'}, but ${levelMessages[requiredLevel]} access is required for this action.`
        )}
      </p>
      <p style={{ margin: 0, color: '#9ca3af', fontSize: typography.fontSize.base }}>
        Contact your administrator if you need access.
      </p>
    </div>
  );
}

// Component to show view-only message
export function ViewOnlyBanner({ functionId }) {
  const { canEdit } = usePermissions();
  
  if (canEdit(functionId)) return null;
  
  return (
    <div style={{
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
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

// Button wrapper that disables based on permissions
export function PermissionButton({ functionId, children, onClick, ...props }) {
  const { canEdit, getPermissionLevel } = usePermissions();
  const hasEditAccess = canEdit(functionId);
  
  const handleClick = (e) => {
    if (!hasEditAccess) {
      e.preventDefault();
      alert(`You don't have permission to perform this action. Your current access level is "${getPermissionLevel(functionId)}".`);
      return;
    }
    onClick?.(e);
  };
  
  return (
    <button
      {...props}
      onClick={handleClick}
      style={{
        ...props.style,
        opacity: hasEditAccess ? 1 : 0.5,
        cursor: hasEditAccess ? 'pointer' : 'not-allowed',
      }}
      title={hasEditAccess ? props.title : 'You don\'t have permission for this action'}
    >
      {children}
    </button>
  );
}

export default PermissionsContext;
