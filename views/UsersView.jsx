// ============================================================================
// Users Panel View
// User management interface
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { Card, Button, PageHeader } from '../components/ui.jsx';
import { Select } from '../components/Select.jsx';

export const UsersPanel = memo(function UsersPanel({
  users,
  roles = [],
  currentUserId,
  onAddUser,
  onChangeRole,
  onDeleteUser,
  onBack,
}) {
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.id, label: r.name }))
      : [
          { value: 'role_user', label: 'Standard User' },
          { value: 'role_admin', label: 'Administrator' },
        ];

  return (
    <>
      <PageHeader
        title="Manage Users"
        subtitle={`${users.length} users`}
        onBack={onBack}
        backLabel="Back to Admin"
        action={
          <Button onClick={onAddUser} icon={Plus}>
            Add User
          </Button>
        }
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <Card
              key={u.id}
              style={{
                padding: spacing[4],
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: borderRadius.lg,
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: typography.fontWeight.semibold,
                  color: '#fff',
                  fontSize: typography.fontSize.lg,
                }}
              >
                {u.avatar || u.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}
                >
                  {u.name}
                  {isSelf && (
                    <span
                      style={{
                        marginLeft: spacing[2],
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted,
                      }}
                    >
                      (you)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                  {u.email}
                </div>
              </div>
              {/* Role is editable in place — changing it used to require the
                  Roles page's Assign dialog, which nobody found */}
              <Select
                value={u.roleId || u.role_id || 'role_user'}
                onChange={(e) => onChangeRole?.(u.id, e.target.value)}
                options={roleOptions}
                disabled={isSelf}
                aria-label={`Role for ${u.name}`}
                style={{ minWidth: 170 }}
              />
              <Button
                variant="secondary"
                danger
                onClick={() => onDeleteUser(u.id)}
                disabled={isSelf}
                icon={Trash2}
                aria-label={`Delete ${u.name}`}
                style={{ opacity: isSelf ? 0.3 : 1 }}
              />
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
UsersPanel.propTypes = {
  /** Array of user objects */
  users: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string,
      roleId: PropTypes.string,
      avatar: PropTypes.string,
    }),
  ).isRequired,
  /** Available roles (for the inline role selector) */
  roles: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  ),
  /** ID of currently logged in user (cannot delete or demote self) */
  currentUserId: PropTypes.string,
  /** Callback to open add user modal */
  onAddUser: PropTypes.func.isRequired,
  /** Callback when a user's role is changed: (userId, roleId) */
  onChangeRole: PropTypes.func,
  /** Callback to delete a user */
  onDeleteUser: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
