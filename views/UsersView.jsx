// ============================================================================
// Users Panel View
// User management interface
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Plus, Trash2 } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { Badge, Card, Button, PageHeader } from '../components/ui.jsx';

export const UsersPanel = memo(function UsersPanel({ 
  users, 
  currentUserId, 
  onAddUser, 
  onDeleteUser, 
  onBack 
}) {
  return (
    <>
      <PageHeader 
        title="Manage Users" 
        subtitle={`${users.length} users`}
        onBack={onBack}
        backLabel="Back to Admin"
        action={<Button onClick={onAddUser} icon={Plus}>Add User</Button>}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {users.map(u => (
          <Card key={u.id} style={{ padding: spacing[4], display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: borderRadius.lg, 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: typography.fontWeight.semibold, 
              color: '#fff', 
              fontSize: typography.fontSize.lg 
            }}>
              {u.avatar || u.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>{u.name}</div>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>{u.email}</div>
            </div>
            <Badge 
              text={u.role?.name || u.roleId || 'User'} 
              color={(u.role?.name === 'Admin' || u.roleId === 'role_admin') ? colors.danger : colors.available} 
            />
            <Button 
              variant="secondary" 
              danger 
              onClick={() => onDeleteUser(u.id)} 
              disabled={u.id === currentUserId} 
              icon={Trash2} 
              style={{ opacity: u.id === currentUserId ? 0.3 : 1 }} 
            />
          </Card>
        ))}
      </div>
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
UsersPanel.propTypes = {
  /** Array of user objects */
  users: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    email: PropTypes.string,
    role: PropTypes.string,
    avatar: PropTypes.string,
  })).isRequired,
  /** ID of currently logged in user (cannot delete self) */
  currentUserId: PropTypes.string,
  /** Callback to open add user modal */
  onAddUser: PropTypes.func.isRequired,
  /** Callback to delete a user */
  onDeleteUser: PropTypes.func.isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
