// ============================================================================
// Admin Panel View
// Navigation hub for admin functions
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import {
  Users,
  Shield,
  MapPin,
  Sliders,
  FolderTree,
  Clock,
  FileText,
  Upload,
  Download,
  ImagePlus,
} from 'lucide-react';
import { VIEWS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Card } from '../components/ui.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';

export const AdminPanel = memo(function AdminPanel({
  setCurrentView,
  onOpenImport,
  onOpenExport,
  onOpenBulkPhotos,
}) {
  const { canView, canEdit } = usePermissions();

  // Each card carries the same permission its target view requires — the hub
  // used to show all seven to anyone who got in, with clicks landing on
  // "Access restricted" for the ones the role couldn't open. The pure-editor
  // pages (roles/locations/specs/categories) require EDIT, matching
  // EDIT_REQUIRED_VIEWS in the view guard.
  const cards = [
    {
      icon: Users,
      label: 'Manage Users',
      description: 'Add, edit, or remove users',
      action: () => setCurrentView(VIEWS.USERS),
      color: colors.accent1,
      permissionId: 'admin_users',
    },
    {
      icon: Shield,
      label: 'Roles & Permissions',
      description: 'Manage user roles and access',
      action: () => setCurrentView(VIEWS.ROLES_MANAGE),
      color: colors.warning,
      permissionId: 'admin_roles',
      requireEdit: true,
    },
    {
      icon: MapPin,
      label: 'Manage Locations',
      description: 'Buildings, rooms, and storage',
      action: () => setCurrentView(VIEWS.LOCATIONS_MANAGE),
      color: colors.danger,
      permissionId: 'admin_locations',
      requireEdit: true,
    },
    {
      icon: Sliders,
      label: 'Edit Specs',
      description: 'Category specifications',
      action: () => setCurrentView(VIEWS.EDIT_SPECS),
      color: colors.primary,
      permissionId: 'admin_specs',
      requireEdit: true,
    },
    {
      icon: FolderTree,
      label: 'Edit Categories',
      description: 'Equipment categories',
      action: () => setCurrentView(VIEWS.EDIT_CATEGORIES),
      color: colors.accent1,
      permissionId: 'admin_categories',
      requireEdit: true,
    },
    {
      icon: Clock,
      label: 'Change Log',
      description: 'Item & package edit history',
      action: () => setCurrentView(VIEWS.CHANGE_LOG),
      color: colors.accent2,
      permissionId: 'admin_audit',
    },
    {
      icon: FileText,
      label: 'Audit Log',
      description: 'System activity history',
      action: () => setCurrentView(VIEWS.AUDIT_LOG),
      color: colors.accent3,
      permissionId: 'admin_audit',
    },
    // Data tools — moved here from the sidebar nav (they're occasional admin
    // actions, not daily destinations). Same permission gates as before:
    // import follows gear_list EDIT, the full-database export follows
    // admin_users VIEW.
    {
      icon: Upload,
      label: 'Import CSV',
      description: 'Bulk-add inventory from a spreadsheet',
      action: onOpenImport,
      color: colors.accent2,
      permissionId: 'gear_list',
      requireEdit: true,
    },
    {
      icon: ImagePlus,
      label: 'Bulk Photos',
      description: 'Attach many item photos at once, matched by filename',
      action: onOpenBulkPhotos,
      color: colors.accent3,
      permissionId: 'gear_list',
      requireEdit: true,
    },
    {
      icon: Download,
      label: 'Export Data',
      description: 'Full database backup and exports',
      action: onOpenExport,
      color: colors.primary,
      permissionId: 'admin_users',
    },
  ].filter(
    (card) =>
      card.action && (card.requireEdit ? canEdit(card.permissionId) : canView(card.permissionId)),
  );

  return (
    <>
      <h2 style={{ margin: `0 0 ${spacing[6]}px`, color: colors.textPrimary }}>Admin Panel</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: spacing[4],
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="admin-card"
              onClick={card.action}
              style={{
                '--card-accent-color': card.color,
                padding: spacing[5],
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  marginBottom: spacing[3],
                  background: withOpacity(card.color, 15),
                  borderRadius: borderRadius.lg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={24} color={card.color} />
              </div>
              <div
                style={{
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.textPrimary,
                  marginBottom: spacing[1],
                }}
              >
                {card.label}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                {card.description}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
AdminPanel.propTypes = {
  /** Function to change the current view */
  setCurrentView: PropTypes.func.isRequired,
  /** Opens the CSV import modal (card hidden when absent) */
  onOpenImport: PropTypes.func,
  onOpenBulkPhotos: PropTypes.func,
  /** Opens the database export modal (card hidden when absent) */
  onOpenExport: PropTypes.func,
};
