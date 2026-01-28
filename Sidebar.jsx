// ============================================================================
// Sidebar Navigation Component
// ============================================================================

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Calendar, Package, QrCode, Settings,
  BarChart3, Home, LogOut, Layers, ClipboardList, User, ChevronDown,
  ScanLine, Upload, Download, Bell, Palette, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { VIEWS } from './constants.js';
import { colors, spacing, borderRadius, typography, withOpacity, zIndex } from './theme.js';
import { useTheme } from './ThemeContext.jsx';
import { usePermissions } from './PermissionsContext.jsx';
import { announcePageChange } from './utils/accessibility.js';

// Navigation button component
const NavButton = memo(function NavButton({ icon: Icon, label, viewId, currentView, onClick, colorVar, collapsed }) {
  const isActive = currentView === viewId;
  // Use CSS variable directly - falls back to --primary if not set
  const activeColor = colorVar ? `var(${colorVar}, var(--primary))` : 'var(--primary)';
  
  return (
    <button
      onClick={() => onClick(viewId)}
      className="sidebar-nav-btn"
      title={collapsed ? label : undefined}
      type="button"
      aria-label={collapsed ? label : undefined}
      aria-current={isActive ? 'page' : undefined}
      style={{
        '--nav-active-color': activeColor,
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : spacing[3],
        width: '100%',
        padding: `${spacing[3]}px ${collapsed ? spacing[3] : spacing[4]}px`,
        background: isActive ? `color-mix(in srgb, ${activeColor} 20%, transparent)` : 'transparent',
        border: 'none',
        borderRadius: borderRadius.lg,
        color: isActive ? activeColor : colors.textSecondary,
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: typography.fontSize.sm,
        fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <Icon size={18} aria-hidden="true" style={{ color: isActive ? activeColor : 'inherit', flexShrink: 0 }} />
      <span className="sidebar-nav-label" style={{
        opacity: collapsed ? 0 : 1,
        width: collapsed ? 0 : 'auto',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </button>
  );
});

// Main navigation items with color keys and permission IDs
const mainNavItems = [
  { icon: Home, label: 'Dashboard', viewId: VIEWS.DASHBOARD, colorVar: '--sidebar-item1', permissionId: 'dashboard' },
  { icon: Package, label: 'Gear List', viewId: VIEWS.GEAR_LIST, colorVar: '--sidebar-item2', permissionId: 'gear_list' },
  { icon: Layers, label: 'Packages', viewId: VIEWS.PACKAGES, colorVar: '--sidebar-item3', permissionId: 'pack_lists' },
  { icon: ClipboardList, label: 'Pack Lists', viewId: VIEWS.PACK_LISTS, colorVar: '--sidebar-item4', permissionId: 'pack_lists' },
  { icon: Calendar, label: 'Schedule', viewId: VIEWS.SCHEDULE, colorVar: '--sidebar-item5', permissionId: 'schedule' },
  { icon: QrCode, label: 'Labels', viewId: VIEWS.LABELS, colorVar: '--sidebar-item6', permissionId: 'labels' },
  { icon: User, label: 'Clients', viewId: VIEWS.CLIENTS, colorVar: '--sidebar-item1', permissionId: 'clients' },
  { icon: Search, label: 'Search', viewId: VIEWS.SEARCH, colorVar: '--sidebar-item3', permissionId: 'search' },
];

// Admin navigation items
const adminNavItems = [
  { icon: Settings, label: 'Admin Panel', viewId: VIEWS.ADMIN, colorVar: '--sidebar-item1', permissionId: 'admin_users' },
  { icon: BarChart3, label: 'Reports', viewId: VIEWS.REPORTS, colorVar: '--sidebar-item2', permissionId: 'reports' },
];

// View ID to label mapping for announcements
const VIEW_LABELS = {
  [VIEWS.DASHBOARD]: 'Dashboard',
  [VIEWS.GEAR_LIST]: 'Gear List',
  [VIEWS.GEAR_DETAIL]: 'Gear Details',
  [VIEWS.PACKAGES]: 'Packages',
  [VIEWS.PACK_LISTS]: 'Pack Lists',
  [VIEWS.SCHEDULE]: 'Schedule',
  [VIEWS.LABELS]: 'Labels',
  [VIEWS.CLIENTS]: 'Clients',
  [VIEWS.CLIENT_DETAIL]: 'Client Details',
  [VIEWS.SEARCH]: 'Search',
  [VIEWS.ADMIN]: 'Admin Panel',
  [VIEWS.REPORTS]: 'Reports',
  [VIEWS.ADD_ITEM]: 'Add Item',
  [VIEWS.EDIT_SPECS]: 'Edit Specifications',
  [VIEWS.EDIT_CATEGORIES]: 'Edit Categories',
  [VIEWS.THEME_SELECTOR]: 'Theme Selector',
  [VIEWS.USERS]: 'User Management',
  [VIEWS.AUDIT_LOG]: 'Audit Log',
  [VIEWS.MAINTENANCE_REPORT]: 'Maintenance Report',
  [VIEWS.INSURANCE_REPORT]: 'Insurance Report',
  [VIEWS.LOCATIONS_MANAGE]: 'Location Management',
  [VIEWS.CUSTOMIZE_DASHBOARD]: 'Customize Dashboard',
  [VIEWS.CUSTOMIZE_ITEM_DETAIL]: 'Customize Item Detail',
  [VIEWS.RESERVATION_DETAIL]: 'Reservation Details',
  [VIEWS.NOTIFICATIONS]: 'Notifications',
};

function Sidebar({ currentView, setCurrentView, user, onLogout, onOpenProfile, onOpenScanner, onOpenImport, onOpenExport, isOpen, onClose, collapsed, onToggleCollapse }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { themeId, availableThemes } = useTheme();
  const { canView, canEdit } = usePermissions();
  const userMenuRef = useRef(null);

  // Filter nav items based on permissions
  const visibleMainNavItems = mainNavItems.filter(item => canView(item.permissionId));
  const visibleAdminNavItems = adminNavItems.filter(item => canView(item.permissionId));
  
  // Check if user can access any admin features
  const hasAnyAdminAccess = visibleAdminNavItems.length > 0 || 
    canView('admin_users') || canView('admin_categories') || canView('admin_specs') || 
    canView('admin_locations') || canView('admin_roles') || canView('admin_audit');

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  // Announce view changes to screen readers
  const previousViewRef = useRef(currentView);
  useEffect(() => {
    if (currentView !== previousViewRef.current) {
      const viewLabel = VIEW_LABELS[currentView] || currentView;
      announcePageChange(viewLabel);
      previousViewRef.current = currentView;
    }
  }, [currentView]);

  const handleNavClick = useCallback((viewId) => {
    setCurrentView(viewId);
  }, [setCurrentView]);

  return (
    <aside 
      className={`app-sidebar ${isOpen ? 'sidebar-open' : ''} ${collapsed ? 'collapsed' : ''}`} 
      role="navigation"
      aria-label="Main navigation"
      style={{
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: colors.bgMedium,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: zIndex.fixed
      }}
    >
      {/* Collapse toggle button */}
      {onToggleCollapse && (
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          type="button"
        >
          {collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronLeft size={14} aria-hidden="true" />}
        </button>
      )}
      
      {/* Logo */}
      <div style={{
        padding: collapsed ? spacing[3] : spacing[5],
        borderBottom: `1px solid ${colors.borderLight}`,
        transition: 'padding 0.3s ease',
      }}>
        <div className="sidebar-logo" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          transition: 'justify-content 0.3s ease',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : spacing[3],
            transition: 'gap 0.3s ease',
          }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <img 
              src="/moe.png" 
              alt="SIMS" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
          <div className="sidebar-logo-text" style={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: 'opacity 0.2s ease, width 0.2s ease',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.textPrimary
            }}>
              S.I.M.S.
            </h1>
            <p style={{
              margin: 0,
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              lineHeight: 1.3
            }}>
              The SemiPro Inventory<br/>Management System
            </p>
          </div>
          </div>
          {/* Close button for mobile */}
          {onClose && !collapsed && (
            <button
              className="sidebar-close-btn"
              onClick={onClose}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                color: colors.textMuted,
                cursor: 'pointer',
                padding: spacing[2],
              }}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav style={{
        flex: 1,
        padding: spacing[3],
        overflowY: 'auto'
      }}>
        <div style={{ marginBottom: spacing[4] }}>
          {visibleMainNavItems.map(item => (
            <NavButton
              key={item.viewId}
              icon={item.icon}
              label={item.label}
              viewId={item.viewId}
              currentView={currentView}
              onClick={handleNavClick}
              colorVar={item.colorVar}
              collapsed={collapsed}
            />
          ))}
          
          {/* Scan QR Code - in main nav */}
          <button
            onClick={onOpenScanner}
            className="sidebar-nav-btn"
            title={collapsed ? 'Scan QR Code' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : spacing[3],
              width: '100%',
              padding: `${spacing[3]}px ${collapsed ? spacing[3] : spacing[4]}px`,
              background: 'transparent',
              border: 'none',
              borderRadius: borderRadius.lg,
              color: colors.textSecondary,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: typography.fontSize.sm,
              transition: 'all 150ms ease',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <ScanLine size={18} style={{ flexShrink: 0 }} />
            <span className="sidebar-nav-label" style={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease, width 0.2s ease',
            }}>
              Scan QR Code
            </span>
          </button>
        </div>

        {/* Admin Section */}
        {hasAnyAdminAccess && (
          <div style={{
            borderTop: `1px solid ${colors.borderLight}`,
            paddingTop: spacing[4]
          }}>
            <p className="sidebar-section-title" style={{
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: `0 ${collapsed ? spacing[3] : spacing[4]}px`,
              marginBottom: spacing[2],
              opacity: collapsed ? 0 : 1,
              height: collapsed ? 0 : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, height 0.2s ease, padding 0.2s ease',
            }}>
              Admin
            </p>
            {visibleAdminNavItems.map(item => (
              <NavButton
                key={item.viewId}
                icon={item.icon}
                label={item.label}
                viewId={item.viewId}
                currentView={currentView}
                onClick={handleNavClick}
                colorVar={item.colorVar}
                collapsed={collapsed}
              />
            ))}
            
            {/* Import CSV - Admin only */}
            {canEdit('gear_list') && (
            <button
              onClick={onOpenImport}
              className="sidebar-nav-btn"
              title={collapsed ? 'Import CSV' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : spacing[3],
                width: '100%',
                padding: `${spacing[3]}px ${collapsed ? spacing[3] : spacing[4]}px`,
                background: 'transparent',
                border: 'none',
                borderRadius: borderRadius.lg,
                color: colors.textSecondary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                transition: 'all 150ms ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <Upload size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-nav-label" style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s ease, width 0.2s ease',
              }}>
                Import CSV
              </span>
            </button>
            )}
            
            {/* Export Data - Admin only */}
            {canView('gear_list') && (
            <button
              onClick={onOpenExport}
              className="sidebar-nav-btn"
              title={collapsed ? 'Export Data' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : spacing[3],
                width: '100%',
                padding: `${spacing[3]}px ${collapsed ? spacing[3] : spacing[4]}px`,
                background: 'transparent',
                border: 'none',
                borderRadius: borderRadius.lg,
                color: colors.textSecondary,
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: typography.fontSize.sm,
                transition: 'all 150ms ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
            >
              <Download size={18} style={{ flexShrink: 0 }} />
              <span className="sidebar-nav-label" style={{
                opacity: collapsed ? 0 : 1,
                width: collapsed ? 0 : 'auto',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.2s ease, width 0.2s ease',
              }}>
                Export Data
              </span>
            </button>
            )}
          </div>
        )}
      </nav>

      {/* User Section */}
      <div className="sidebar-user-section" style={{
        borderTop: `1px solid ${colors.borderLight}`,
        padding: spacing[3],
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div ref={userMenuRef} style={{ position: 'relative', width: collapsed ? 'auto' : '100%' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={collapsed ? user?.name : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : spacing[3],
              width: collapsed ? 'auto' : '100%',
              padding: spacing[3],
              background: showUserMenu ? `${withOpacity(colors.primary, 10)}` : 'transparent',
              border: 'none',
              borderRadius: borderRadius.lg,
              cursor: 'pointer',
              textAlign: 'left',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.md,
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: typography.fontWeight.semibold,
              color: colors.textPrimary,
              fontSize: typography.fontSize.sm,
              flexShrink: 0,
            }}>
              {user?.avatar || user?.name?.charAt(0) || '?'}
            </div>
            <div className="sidebar-user-info" style={{ 
              flex: 1, 
              minWidth: 0,
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto',
              overflow: 'hidden',
              transition: 'opacity 0.2s ease, width 0.2s ease',
            }}>
              <div style={{
                fontWeight: typography.fontWeight.medium,
                color: colors.textPrimary,
                fontSize: typography.fontSize.sm,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name}
              </div>
              <div style={{
                fontSize: typography.fontSize.xs,
                color: colors.textMuted,
                textTransform: 'capitalize'
              }}>
                {user?.role?.name || user?.roleId || 'User'}
              </div>
            </div>
            {!collapsed && (
              <ChevronDown
                size={16}
                color={colors.textMuted}
                style={{
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 150ms ease'
                }}
              />
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="sidebar-user-menu" style={{
              position: 'absolute',
              bottom: '100%',
              left: collapsed ? '50%' : 0,
              right: collapsed ? 'auto' : 0,
              transform: collapsed ? 'translateX(-50%)' : 'none',
              marginBottom: spacing[2],
              background: colors.bgLight,
              border: `1px solid ${colors.border}`,
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              minWidth: collapsed ? 180 : 'auto',
            }}>
              <button
                onClick={() => { onOpenProfile(); setShowUserMenu(false); }}
                className="user-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  width: '100%',
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'none',
                  border: 'none',
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  textAlign: 'left'
                }}
              >
                <User size={16} />
                Profile Settings
              </button>
              
              {/* Theme Selector */}
              <button
                onClick={() => { setCurrentView(VIEWS.THEME_SELECTOR); setShowUserMenu(false); }}
                className="user-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing[2],
                  width: '100%',
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'none',
                  border: 'none',
                  borderTop: `1px solid ${colors.borderLight}`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  textAlign: 'left'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <Palette size={16} />
                  Theme
                </span>
                <span style={{ 
                  fontSize: typography.fontSize.xs, 
                  color: colors.textMuted,
                  textTransform: 'capitalize'
                }}>
                  {availableThemes.find(t => t.id === themeId)?.name || 'Dark'}
                </span>
              </button>
              
              <button
                onClick={() => { setCurrentView(VIEWS.NOTIFICATIONS); setShowUserMenu(false); }}
                className="user-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  width: '100%',
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'none',
                  border: 'none',
                  borderTop: `1px solid ${colors.borderLight}`,
                  color: colors.textPrimary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  textAlign: 'left'
                }}
              >
                <Bell size={16} />
                Notification Settings
              </button>
              <button
                onClick={onLogout}
                className="user-menu-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  width: '100%',
                  padding: `${spacing[3]}px ${spacing[4]}px`,
                  background: 'none',
                  border: 'none',
                  borderTop: `1px solid ${colors.borderLight}`,
                  color: colors.danger,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  textAlign: 'left'
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default memo(Sidebar);
