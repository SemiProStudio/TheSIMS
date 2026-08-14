// ============================================================================
// PermissionsContext - Context object, hook, and constants
// Provider and UI components live in PermissionsContext.jsx
// ============================================================================

import { createContext, useContext } from 'react';
import { VIEWS } from '../constants.js';

const PermissionsContext = createContext(null);

// Mapping of views to their required permission function IDs.
// Consumed by canAccessView below — AppViews refuses to render a view the
// role can't see, so hiding a sidebar button is never the only barrier
// (scanner results, QR deep links, and stale state all route directly).
export const VIEW_PERMISSIONS = {
  [VIEWS.DASHBOARD]: 'dashboard',
  [VIEWS.GEAR_LIST]: 'gear_list',
  [VIEWS.GEAR_DETAIL]: 'item_details',
  [VIEWS.PACKAGES]: 'gear_list',
  [VIEWS.PACKAGE_DETAIL]: 'item_details',
  [VIEWS.PACK_LISTS]: 'pack_lists',
  [VIEWS.SCHEDULE]: 'schedule',
  [VIEWS.RESERVATION_DETAIL]: 'schedule',
  [VIEWS.SEARCH]: 'search',
  [VIEWS.LABELS]: 'labels',
  [VIEWS.CLIENTS]: 'clients',
  [VIEWS.CLIENT_DETAIL]: 'clients',
  [VIEWS.REPORTS]: 'reports',
  [VIEWS.ADMIN]: 'admin_users', // Special-cased: ANY admin permission (see canAccessView)
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
  [VIEWS.INVENTORY_REPORT]: 'reports',
  [VIEWS.ACTIVITY_REPORT]: 'reports',
  [VIEWS.ALERTS_REPORT]: 'reports',
  // THEME_SELECTOR, NOTIFICATIONS, and the CUSTOMIZE_* views intentionally
  // unmapped: theme, notification preferences, and layout customization are
  // per-user personalization since the profile round (their stale
  // admin_notifications / admin_layout mappings predate it), so they're
  // available to everyone.
};

// The Admin hub is reachable with ANY admin permission (mirrors the
// sidebar's hasAnyAdminAccess) — a role with only, say, category access
// still needs the hub to get there.
const ADMIN_HUB_PERMISSIONS = [
  'admin_users',
  'admin_categories',
  'admin_specs',
  'admin_locations',
  'admin_roles',
  'admin_layout',
  'admin_notifications',
  'admin_audit',
];

/**
 * Whether the current role may render a view. Pure — pass canView/canEdit
 * from usePermissions. Unmapped views (theme selector) are personal and
 * always allowed.
 */
export function canAccessView(view, { canView, canEdit }) {
  if (view === VIEWS.ADMIN) return ADMIN_HUB_PERMISSIONS.some((p) => canView(p));
  const permission = VIEW_PERMISSIONS[view];
  if (!permission) return true;
  if (view === VIEWS.ADD_ITEM) return canEdit(permission);
  return canView(permission);
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

export default PermissionsContext;
