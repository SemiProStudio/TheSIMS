// ============================================================================
// Users Panel View
// User management interface
// ============================================================================

import { memo } from 'react';

import { Plus, Trash2 } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme';
import { Badge, Card, Button, PageHeader } from '../components/ui';

interface UsersPanelProps {
  users: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    avatar?: string;
  }[];
  currentUserId?: string;
  onAddUser: () => void;
  onDeleteUser: (userId: string) => void;
  onBack: () => void;
}

const userAvatarStyle = {
  ...styles.flexColCenter,
  width: 44,
  height: 44,
  borderRadius: borderRadius.lg,
  background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
  fontWeight: typography.fontWeight.semibold,
  color: '#fff',
  fontSize: typography.fontSize.lg,
};

export const UsersPanel = memo<UsersPanelProps>(function UsersPanel({
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
      <div style={{ ...styles.flexCol, gap: spacing[3] }}>
        {users.map(u => (
          <Card key={u.id} style={{ ...styles.flexCenter, padding: spacing[4], gap: spacing[3] }}>
            <div style={userAvatarStyle}>
              {u.avatar || u.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.subheading}>{u.name}</div>
              <div style={styles.textSmMuted}>{u.email}</div>
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

