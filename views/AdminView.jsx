// ============================================================================
// Admin Panel View
// Navigation hub for admin functions
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Users, Shield, MapPin, Sliders, FolderTree, Clock, FileText } from 'lucide-react';
import { VIEWS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Card } from '../components/ui.jsx';

export const AdminPanel = memo(function AdminPanel({ setCurrentView }) {
  const cards = [
    { icon: Users, label: 'Manage Users', description: 'Add, edit, or remove users', action: () => setCurrentView(VIEWS.USERS), color: colors.accent1 },
    { icon: Shield, label: 'Roles & Permissions', description: 'Manage user roles and access', action: () => setCurrentView(VIEWS.ROLES_MANAGE), color: colors.warning },
    { icon: MapPin, label: 'Manage Locations', description: 'Buildings, rooms, and storage', action: () => setCurrentView(VIEWS.LOCATIONS_MANAGE), color: colors.danger },
    { icon: Sliders, label: 'Edit Specs', description: 'Category specifications', action: () => setCurrentView(VIEWS.EDIT_SPECS), color: colors.primary },
    { icon: FolderTree, label: 'Edit Categories', description: 'Equipment categories', action: () => setCurrentView(VIEWS.EDIT_CATEGORIES), color: colors.accent1 },
    { icon: Clock, label: 'Change Log', description: 'Item & package edit history', action: () => setCurrentView(VIEWS.CHANGE_LOG), color: colors.accent2 },
    { icon: FileText, label: 'Audit Log', description: 'System activity history', action: () => setCurrentView(VIEWS.AUDIT_LOG), color: colors.accent3 }
  ];
  
  return (
    <>
      <h2 style={{ margin: `0 0 ${spacing[6]}px`, color: colors.textPrimary }}>Admin Panel</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: spacing[4] }}>
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card 
              key={i} 
              className="admin-card"
              onClick={card.action} 
              style={{ 
                '--card-accent-color': card.color,
                padding: spacing[5], 
                cursor: 'pointer',
              }}
            >
              <div style={{ 
                width: 48, 
                height: 48, 
                marginBottom: spacing[3], 
                background: withOpacity(card.color, 15), 
                borderRadius: borderRadius.lg, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
              }}>
                <Icon size={24} color={card.color} />
              </div>
              <div style={{ fontWeight: typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: spacing[1] }}>
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
};
