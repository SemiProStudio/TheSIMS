// ============================================================================
// PermissionsContext - Context object, hook, and constants
// Provider and UI components live in PermissionsContext.jsx
// ============================================================================

import { createContext, useContext } from 'react';
import { VIEWS } from '../constants.js';

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

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

export default PermissionsContext;
