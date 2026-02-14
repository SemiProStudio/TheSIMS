// ============================================================================
// Roles Manager Component
// Manage user roles and permissions
// ============================================================================

import { memo, useState, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, Save, X, Users, Eye, EyeOff, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity, zIndex } from '../theme.js';
import { APP_FUNCTIONS, PERMISSION_LEVELS } from '../constants.js';
import { Button, Card, Badge } from '../components/ui.jsx';
import { generateId } from '../utils';

// Permission level badge colors
const getPermissionColor = (level) => {
  switch (level) {
    case PERMISSION_LEVELS.EDIT: return colors.success;
    case PERMISSION_LEVELS.VIEW: return colors.primary;
    case PERMISSION_LEVELS.HIDE: return colors.textMuted;
    default: return colors.textMuted;
  }
};

// Permission level icon
const PermissionIcon = ({ level, size = 16 }) => {
  switch (level) {
    case PERMISSION_LEVELS.EDIT: return <Pencil size={size} />;
    case PERMISSION_LEVELS.VIEW: return <Eye size={size} />;
    case PERMISSION_LEVELS.HIDE: return <EyeOff size={size} />;
    default: return <EyeOff size={size} />;
  }
};

// Permission selector button
const PermissionButton = memo(function PermissionButton({ level, isActive, onClick, disabled }) {
  const color = getPermissionColor(level);
  const labels = {
    [PERMISSION_LEVELS.EDIT]: 'Edit',
    [PERMISSION_LEVELS.VIEW]: 'View',
    [PERMISSION_LEVELS.HIDE]: 'Hide',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[1],
        padding: `${spacing[1]}px ${spacing[2]}px`,
        border: `1px solid ${isActive ? color : colors.border}`,
        borderRadius: borderRadius.md,
        background: isActive ? withOpacity(color, 20) : 'transparent',
        color: isActive ? color : colors.textMuted,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: typography.fontSize.xs,
        fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <PermissionIcon level={level} size={12} />
      {labels[level]}
    </button>
  );
});

// Function permission row in editor
const FunctionPermissionRow = memo(function FunctionPermissionRow({ 
  func, 
  currentPermission, 
  onChange, 
  disabled 
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `${spacing[2]}px ${spacing[3]}px`,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: typography.fontWeight.medium, 
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
        }}>
          {func.name}
        </div>
        <div style={{ 
          fontSize: typography.fontSize.xs, 
          color: colors.textMuted,
        }}>
          {func.description}
        </div>
      </div>
      <div style={{ display: 'flex', gap: spacing[1] }}>
        {Object.values(PERMISSION_LEVELS).map(level => (
          <PermissionButton
            key={level}
            level={level}
            isActive={currentPermission === level}
            onClick={() => onChange(func.id, level)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
});

// Role card component
const RoleCard = memo(function RoleCard({ role, onEdit, onDelete, onAssign, userCount }) {
  const [expanded, setExpanded] = useState(false);
  
  const permissionCounts = Object.values(role.permissions).reduce((acc, level) => {
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card style={{ marginBottom: spacing[3] }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing[3],
      }}>
        {/* Left side: Expand button + Icon + Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
          {/* Expand/Collapse button - far left */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="role-btn"
            style={{
              background: 'none',
              border: 'none',
              padding: spacing[1],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: colors.textMuted,
              borderRadius: borderRadius.md,
            }}
            title={expanded ? "Collapse permissions" : "Expand permissions"}
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
          
          {/* Shield icon */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.lg,
            background: `${withOpacity(colors.primary, 15)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.primary,
          }}>
            <Shield size={20} />
          </div>
          
          {/* Role info */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: spacing[2],
            }}>
              <span style={{ 
                fontWeight: typography.fontWeight.semibold, 
                color: colors.textPrimary,
              }}>
                {role.name}
              </span>
              {role.isSystem && (
                <Badge text="System" color={colors.textMuted} size="xs" />
              )}
            </div>
            <div style={{ 
              fontSize: typography.fontSize.sm, 
              color: colors.textMuted,
              marginTop: 2,
            }}>
              {role.description}
            </div>
            <div style={{ 
              display: 'flex', 
              gap: spacing[2], 
              marginTop: spacing[1],
              fontSize: typography.fontSize.xs,
            }}>
              <span style={{ color: colors.success }}>
                {permissionCounts[PERMISSION_LEVELS.EDIT] || 0} Edit
              </span>
              <span style={{ color: colors.primary }}>
                {permissionCounts[PERMISSION_LEVELS.VIEW] || 0} View
              </span>
              <span style={{ color: colors.textMuted }}>
                {permissionCounts[PERMISSION_LEVELS.HIDE] || 0} Hidden
              </span>
              <span style={{ color: colors.accent2 }}>
                • {userCount} user{userCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        
        {/* Right side: Action buttons only */}
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
          <Button size="sm" variant="secondary" onClick={() => onAssign(role)} icon={Users}>
            Assign
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(role)} icon={Edit2}>
            Edit
          </Button>
          {!role.isSystem && (
            <Button size="sm" variant="secondary" danger onClick={() => onDelete(role)} icon={Trash2}>
              Delete
            </Button>
          )}
        </div>
      </div>
      
      {expanded && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          padding: spacing[3],
          background: colors.bgDark,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: spacing[2],
          }}>
            {Object.values(APP_FUNCTIONS).map(func => {
              const permission = role.permissions[func.id] || PERMISSION_LEVELS.HIDE;
              return (
                <div 
                  key={func.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    background: colors.bgLight,
                    borderRadius: borderRadius.md,
                  }}
                >
                  <span style={{ 
                    fontSize: typography.fontSize.sm,
                    color: permission === PERMISSION_LEVELS.HIDE ? colors.textMuted : colors.textPrimary,
                  }}>
                    {func.name}
                  </span>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[1],
                    color: getPermissionColor(permission),
                    fontSize: typography.fontSize.xs,
                  }}>
                    <PermissionIcon level={permission} size={14} />
                    <span style={{ textTransform: 'capitalize' }}>{permission}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
});

// Role editor component
const RoleEditor = memo(function RoleEditor({ role, onSave, onCancel }) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [permissions, setPermissions] = useState(
    role?.permissions || 
    Object.keys(APP_FUNCTIONS).reduce((acc, key) => {
      acc[APP_FUNCTIONS[key].id] = PERMISSION_LEVELS.VIEW;
      return acc;
    }, {})
  );
  
  const isEdit = !!role?.id;
  const isSystem = role?.isSystem;
  
  const handlePermissionChange = useCallback((funcId, level) => {
    setPermissions(prev => ({ ...prev, [funcId]: level }));
  }, []);
  
  const handleSave = () => {
    if (!name.trim()) return;
    
    onSave({
      id: role?.id || `role_${generateId()}`,
      name: name.trim(),
      description: description.trim(),
      isSystem: role?.isSystem || false,
      permissions,
    });
  };
  
  const setAllPermissions = (level) => {
    const newPerms = {};
    Object.values(APP_FUNCTIONS).forEach(func => {
      newPerms[func.id] = level;
    });
    setPermissions(newPerms);
  };

  // Group functions by category
  const functionGroups = [
    { name: 'Main Features', funcs: ['dashboard', 'gear_list', 'item_details', 'schedule', 'pack_lists', 'clients', 'search', 'labels', 'reports'] },
    { name: 'Administration', funcs: ['admin_users', 'admin_categories', 'admin_specs', 'admin_locations', 'admin_themes', 'admin_layout', 'admin_notifications', 'admin_roles', 'admin_audit'] },
  ];

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing[4],
      }}>
        <h3 style={{ margin: 0, color: colors.textPrimary }}>
          {isEdit ? 'Edit Role' : 'Create New Role'}
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textMuted,
            padding: spacing[1],
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Name and Description */}
      <div style={{ marginBottom: spacing[4] }}>
        <div style={{ marginBottom: spacing[3] }}>
          <label style={{ ...styles.label, color: !name && !isSystem ? colors.danger : undefined }}>
            Role Name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Equipment Manager"
            disabled={isSystem}
            style={{
              ...styles.input,
              opacity: isSystem ? 0.7 : 1,
              borderColor: !name && !isSystem ? colors.danger : colors.border,
            }}
          />
          {isSystem && (
            <p style={{ 
              fontSize: typography.fontSize.xs, 
              color: colors.textMuted,
              margin: `${spacing[1]}px 0 0`,
            }}>
              System role names cannot be changed
            </p>
          )}
        </div>
        <div>
          <label style={styles.label}>Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description of this role"
            style={styles.input}
          />
        </div>
      </div>

      {/* Quick Set Buttons */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing[2],
        marginBottom: spacing[3],
        padding: spacing[2],
        background: colors.bgDark,
        borderRadius: borderRadius.md,
      }}>
        <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
          Quick set all:
        </span>
        <Button size="sm" variant="secondary" onClick={() => setAllPermissions(PERMISSION_LEVELS.EDIT)}>
          All Edit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAllPermissions(PERMISSION_LEVELS.VIEW)}>
          All View
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAllPermissions(PERMISSION_LEVELS.HIDE)}>
          All Hide
        </Button>
      </div>

      {/* Permissions Matrix */}
      <div style={{
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing[4],
      }}>
        {functionGroups.map((group, groupIdx) => (
          <div key={group.name}>
            <div style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              background: colors.bgDark,
              borderBottom: `1px solid ${colors.border}`,
              borderTop: groupIdx > 0 ? `1px solid ${colors.border}` : 'none',
            }}>
              <span style={{ 
                fontWeight: typography.fontWeight.semibold,
                color: colors.textPrimary,
                fontSize: typography.fontSize.sm,
              }}>
                {group.name}
              </span>
            </div>
            {group.funcs.map(funcId => {
              const func = Object.values(APP_FUNCTIONS).find(f => f.id === funcId);
              if (!func) return null;
              return (
                <FunctionPermissionRow
                  key={func.id}
                  func={func}
                  currentPermission={permissions[func.id] || PERMISSION_LEVELS.HIDE}
                  onChange={handlePermissionChange}
                  disabled={false}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim()} icon={Save}>
          {isEdit ? 'Save Changes' : 'Create Role'}
        </Button>
      </div>
    </div>
  );
});

// User Assignment Modal
const UserAssignmentModal = memo(function UserAssignmentModal({ role, users = [], onSave, onClose }) {
  const [selectedUsers, setSelectedUsers] = useState(
    new Set((users || []).filter(u => u.roleId === role.id || u.role_id === role.id).map(u => u.id))
  );

  const toggleUser = (userId) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSave = () => {
    onSave(role.id, [...selectedUsers]);
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: zIndex.modal,
    }}>
      <div style={{
        background: colors.bgLight,
        borderRadius: borderRadius.xl,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: spacing[4],
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ margin: 0, color: colors.textPrimary }}>Assign Users to Role</h3>
            <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
              {role.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.textMuted,
              padding: spacing[1],
            }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: spacing[3] }}>
          {(users || []).map(user => (
            <label
              key={user.id}
              className="list-item-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[3],
                padding: spacing[2],
                borderRadius: borderRadius.md,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={selectedUsers.has(user.id)}
                onChange={() => toggleUser(user.id)}
                style={{ width: 18, height: 18 }}
              />
              <div>
                <div style={{ fontWeight: typography.fontWeight.medium, color: colors.textPrimary }}>
                  {user.name}
                </div>
                <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                  {user.email}
                </div>
              </div>
            </label>
          ))}
        </div>
        
        <div style={{
          padding: spacing[4],
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          gap: spacing[3],
          justifyContent: 'flex-end',
        }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} icon={Save}>Save Assignments</Button>
        </div>
      </div>
    </div>
  );
});

// Main Roles Manager Component
function RolesManager({ roles = [], users = [], onSaveRole, onDeleteRole, onAssignUsers, onBack: _onBack }) {
  const [editingRole, setEditingRole] = useState(null);
  const [assigningRole, setAssigningRole] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleCreateNew = () => {
    setEditingRole(null);
    setShowEditor(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setShowEditor(true);
  };

  const handleSave = (roleData) => {
    onSaveRole?.(roleData);
    setShowEditor(false);
    setEditingRole(null);
  };

  const handleDelete = (role) => {
    if (window.confirm(`Are you sure you want to delete the "${role.name}" role? Users with this role will need to be reassigned.`)) {
      onDeleteRole?.(role.id);
    }
  };

  const getUserCount = (roleId) => {
    return (users || []).filter(u => u.roleId === roleId || u.role_id === roleId).length;
  };

  if (showEditor) {
    return (
      <RoleEditor
        role={editingRole}
        onSave={handleSave}
        onCancel={() => {
          setShowEditor(false);
          setEditingRole(null);
        }}
      />
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing[6],
      }}>
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>Roles & Permissions</h2>
          <p style={{ margin: `${spacing[1]}px 0 0`, color: colors.textMuted, fontSize: typography.fontSize.sm }}>
            Create and manage user roles with granular permission control
          </p>
        </div>
        <Button onClick={handleCreateNew} icon={Plus}>
          Create Role
        </Button>
      </div>

      {/* Permission Legend */}
      <Card style={{ marginBottom: spacing[4], padding: spacing[3] }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: spacing[4],
          flexWrap: 'wrap',
        }}>
          <span style={{ 
            fontWeight: typography.fontWeight.medium, 
            color: colors.textPrimary,
            fontSize: typography.fontSize.sm,
          }}>
            Permission Levels:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], color: colors.success }}>
            <Pencil size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>Edit - Full access to view and modify</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], color: colors.primary }}>
            <Eye size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>View - Read-only access</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1], color: colors.textMuted }}>
            <EyeOff size={14} />
            <span style={{ fontSize: typography.fontSize.sm }}>Hide - No access, hidden from navigation</span>
          </div>
        </div>
      </Card>

      {/* Roles List */}
      {(roles || []).map(role => (
        <RoleCard
          key={role.id}
          role={role}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAssign={setAssigningRole}
          userCount={getUserCount(role.id)}
        />
      ))}

      {/* User Assignment Modal */}
      {assigningRole && (
        <UserAssignmentModal
          role={assigningRole}
          users={users || []}
          onSave={onAssignUsers}
          onClose={() => setAssigningRole(null)}
        />
      )}
    </>
  );
}

export default memo(RolesManager);
