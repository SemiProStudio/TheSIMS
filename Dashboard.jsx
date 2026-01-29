// ============================================================================
// Dashboard Component
// Supports collapsible sections with user-customizable order and visibility
// ============================================================================

import React, { memo, useState, useMemo, useEffect } from 'react';
import {
  Package, CheckCircle, Clock, AlertTriangle, Calendar,
  ChevronRight, Search, Bell, TrendingDown, Layout
} from 'lucide-react';
import { STATUS, DASHBOARD_SECTIONS } from './constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from './theme.js';
import { formatDate, getStatusColor, getTodayISO, isReminderDue } from './utils.js';
import { Badge, StatCard, SearchInput, Button, CollapsibleSection } from './components/ui.jsx';
import { usePermissions } from './PermissionsContext.jsx';

// Panel color CSS variables for dashboard sections
const PANEL_COLORS = {
  stats: 'var(--panel-stats)',
  search: 'var(--panel-search)',
  alerts: 'var(--panel-alerts)',
  reminders: 'var(--panel-reminders)',
  lowStock: 'var(--panel-lowstock)',
  reservations: 'var(--panel-reservations)',
};

function Dashboard({
  inventory = [],
  categorySettings = {},
  layoutPrefs,
  onViewItem,
  onViewReservation,
  onFilteredView,
  onViewAlerts,
  onViewOverdue,
  onViewLowStock,
  onViewReservations,
  onCustomizeLayout,
  onToggleCollapse,
}) {
  const [quickSearch, setQuickSearch] = useState('');
  
  // Permissions
  const { canEdit } = usePermissions();
  const canEditDashboard = canEdit('dashboard');
  
  // Local state for collapsed sections (for immediate UI response)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const initial = {};
    Object.values(DASHBOARD_SECTIONS).forEach(s => {
      initial[s.id] = layoutPrefs?.sections?.[s.id]?.collapsed || false;
    });
    return initial;
  });

  // Sync with layoutPrefs when they change externally
  useEffect(() => {
    if (layoutPrefs?.sections) {
      setCollapsedSections(prev => {
        const updated = { ...prev };
        Object.keys(layoutPrefs.sections).forEach(id => {
          if (layoutPrefs.sections[id]?.collapsed !== undefined) {
            updated[id] = layoutPrefs.sections[id].collapsed;
          }
        });
        return updated;
      });
    }
  }, [layoutPrefs]);

  // Get section preferences with defaults
  const getSectionPref = (sectionId) => {
    const defaultSection = Object.values(DASHBOARD_SECTIONS).find(s => s.id === sectionId);
    const pref = layoutPrefs?.sections?.[sectionId];
    return {
      visible: pref?.visible !== false,
      order: pref?.order ?? defaultSection?.order ?? 99,
    };
  };

  // Check if section should be shown
  const showSection = (sectionId) => getSectionPref(sectionId).visible;
  
  // Check if section is collapsed (use local state)
  const isCollapsed = (sectionId) => collapsedSections[sectionId] || false;
  
  // Handle collapse toggle - update local state immediately, then notify parent
  const toggleCollapse = (sectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
    // Also notify parent to persist
    if (onToggleCollapse) {
      onToggleCollapse('dashboard', sectionId);
    }
  };

  // Get sections sorted by order
  const sectionOrder = useMemo(() => {
    const sections = ['stats', 'quickSearch', 'alerts', 'reminders', 'lowStock', 'reservations'];
    return sections
      .filter(id => showSection(id))
      .map(id => ({ id, order: getSectionPref(id).order }))
      .sort((a, b) => a.order - b.order)
      .map(s => s.id);
  }, [layoutPrefs]);

  // Computed stats
  const stats = useMemo(() => {
    const today = getTodayISO();
    
    // Get all due reminders across all items
    const dueReminders = inventory.flatMap(item => 
      (item.reminders || [])
        .filter(r => isReminderDue(r))
        .map(r => ({ ...r, item }))
    );

    // Get low stock items
    const lowStockItems = inventory.filter(item => {
      const settings = categorySettings?.[item.category];
      if (!settings?.trackQuantity) return false;
      
      // Only consider items that have a quantity defined
      if (item.quantity === undefined || item.quantity === null) return false;
      
      const quantity = item.quantity;
      const threshold = item.reorderPoint || settings.lowStockThreshold || 0;
      
      return threshold > 0 && quantity <= threshold;
    });
    
    return {
      total: inventory.length,
      available: inventory.filter(i => i.status === STATUS.AVAILABLE).length,
      checkedOut: inventory.filter(i => i.status === STATUS.CHECKED_OUT).length,
      alerts: inventory.filter(i => i.status === STATUS.NEEDS_ATTENTION),
      overdue: inventory.filter(i =>
        i.status === STATUS.CHECKED_OUT && i.dueBack && i.dueBack < today
      ),
      dueReminders,
      lowStockItems
    };
  }, [inventory, categorySettings]);

  // Upcoming reservations
  const upcomingReservations = useMemo(() => {
    return inventory
      .flatMap(i => (i.reservations || []).map(r => ({ ...r, item: i })))
      .filter(r => new Date(r.start) >= new Date())
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 6);
  }, [inventory]);

  // Quick search results
  const searchResults = useMemo(() => {
    if (!quickSearch.trim()) return [];
    const q = quickSearch.toLowerCase();
    return inventory
      .filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [inventory, quickSearch]);

  // Render sections
  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'stats':
        return (
          <CollapsibleSection
            key="stats"
            title="Statistics"
            icon={Package}
            badge={stats.total}
            badgeColor={PANEL_COLORS.stats}
            headerColor={PANEL_COLORS.stats}
            collapsed={isCollapsed('stats')}
            onToggleCollapse={() => toggleCollapse('stats')}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: spacing[3],
            }}>
              <StatCard
                icon={Package}
                value={stats.total}
                label="Total Items"
                color={PANEL_COLORS.stats}
                onClick={() => onFilteredView('all', 'all')}
              />
              <StatCard
                icon={CheckCircle}
                value={stats.available}
                label="Available"
                color={colors.available}
                onClick={() => onFilteredView('all', STATUS.AVAILABLE)}
              />
              <StatCard
                icon={Clock}
                value={stats.checkedOut}
                label="Checked Out"
                color={colors.checkedOut}
                onClick={() => onFilteredView('all', STATUS.CHECKED_OUT)}
              />
              <StatCard
                icon={AlertTriangle}
                value={stats.overdue.length}
                label="Overdue"
                color={colors.danger}
                onClick={onViewOverdue}
              />
            </div>
          </CollapsibleSection>
        );

      case 'quickSearch':
        return (
          <CollapsibleSection
            key="quickSearch"
            title="Quick Gear Search"
            headerColor={PANEL_COLORS.search}
            icon={Search}
            collapsed={isCollapsed('quickSearch')}
            onToggleCollapse={() => toggleCollapse('quickSearch')}
          >
            <SearchInput
              value={quickSearch}
              onChange={setQuickSearch}
              onClear={() => setQuickSearch('')}
              placeholder="Search by name, ID, or brand..."
            />

            {searchResults.length > 0 && (
              <div style={{ marginTop: spacing[3] }}>
                {searchResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      marginBottom: spacing[2],
                      background: withOpacity(PANEL_COLORS.search, 15),
                      border: `1px solid ${withOpacity(PANEL_COLORS.search, 40)}`,
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: borderRadius.sm,
                      background: withOpacity(PANEL_COLORS.search, 25),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.textMuted,
                      fontSize: typography.fontSize.xs
                    }}>
                      {item.image ? (
                        <img src={item.image} alt="" style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: borderRadius.sm
                        }} />
                      ) : 'No img'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: colors.textPrimary
                      }}>
                        {item.name}
                      </div>
                      <div style={{
                        fontSize: typography.fontSize.xs,
                        color: colors.textMuted
                      }}>
                        {item.id} • {item.category}
                      </div>
                    </div>
                    <Badge text={item.status} color={getStatusColor(item.status)} />
                  </div>
                ))}
              </div>
            )}

            {quickSearch && searchResults.length === 0 && (
              <p style={{
                color: colors.textMuted,
                textAlign: 'center',
                fontSize: typography.fontSize.sm,
                padding: spacing[4],
                margin: 0
              }}>
                No items found
              </p>
            )}

            {!quickSearch && (
              <p style={{
                color: colors.textMuted,
                textAlign: 'center',
                fontSize: typography.fontSize.sm,
                padding: spacing[4],
                margin: 0
              }}>
                Start typing to search inventory
              </p>
            )}
          </CollapsibleSection>
        );

      case 'alerts':
        return (
          <CollapsibleSection
            key="alerts"
            title="Alerts"
            icon={AlertTriangle}
            badge={stats.alerts.length || null}
            badgeColor={PANEL_COLORS.alerts}
            headerColor={PANEL_COLORS.alerts}
            collapsed={isCollapsed('alerts')}
            onToggleCollapse={() => toggleCollapse('alerts')}
            action={stats.alerts.length > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onViewAlerts(); }}
                style={{ ...styles.btnSec, padding: `${spacing[1]}px ${spacing[2]}px`, fontSize: typography.fontSize.xs }}
              >
                View All
              </button>
            ) : null}
            padding={false}
          >
            {stats.alerts.length === 0 ? (
              <div style={{ padding: spacing[4], color: colors.textMuted, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
                No alerts
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.alerts.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      marginBottom: spacing[2],
                      background: withOpacity(PANEL_COLORS.alerts, 15),
                      border: `1px solid ${withOpacity(PANEL_COLORS.alerts, 40)}`,
                    }}
                  >
                    <AlertTriangle size={16} color={PANEL_COLORS.alerts} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.alerts }}>
                        Needs attention • {item.category}
                      </div>
                    </div>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

      case 'reminders':
        return (
          <CollapsibleSection
            key="reminders"
            title="Due Reminders"
            icon={Bell}
            badge={stats.dueReminders.length || null}
            badgeColor={PANEL_COLORS.reminders}
            headerColor={PANEL_COLORS.reminders}
            collapsed={isCollapsed('reminders')}
            onToggleCollapse={() => toggleCollapse('reminders')}
            padding={false}
          >
            {stats.dueReminders.length === 0 ? (
              <div style={{ padding: spacing[4], color: colors.textMuted, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
                No due reminders
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.dueReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    onClick={() => onViewItem(reminder.item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      marginBottom: spacing[2],
                      background: withOpacity(PANEL_COLORS.reminders, 15),
                      border: `1px solid ${withOpacity(PANEL_COLORS.reminders, 40)}`,
                    }}
                  >
                    <Bell size={16} color={PANEL_COLORS.reminders} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {reminder.title}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.reminders }}>
                        {reminder.item.name} • Due {formatDate(reminder.dueDate)}
                      </div>
                    </div>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

      case 'lowStock':
        return (
          <CollapsibleSection
            key="lowStock"
            title="Low Stock Items"
            icon={TrendingDown}
            badge={stats.lowStockItems.length || null}
            badgeColor={PANEL_COLORS.lowStock}
            headerColor={PANEL_COLORS.lowStock}
            collapsed={isCollapsed('lowStock')}
            onToggleCollapse={() => toggleCollapse('lowStock')}
            action={stats.lowStockItems.length > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onViewLowStock(); }}
                style={{ ...styles.btnSec, padding: `${spacing[1]}px ${spacing[2]}px`, fontSize: typography.fontSize.xs }}
              >
                View All
              </button>
            ) : null}
            padding={false}
          >
            {stats.lowStockItems.length === 0 ? (
              <div style={{ padding: spacing[4], color: colors.textMuted, fontSize: typography.fontSize.sm, textAlign: 'center' }}>
                No low stock items
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 200, overflowY: 'auto' }}>
                {stats.lowStockItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing[3],
                      padding: spacing[3],
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                      marginBottom: spacing[2],
                      background: withOpacity(PANEL_COLORS.lowStock, 15),
                      border: `1px solid ${withOpacity(PANEL_COLORS.lowStock, 40)}`,
                    }}
                  >
                    <TrendingDown size={16} color={PANEL_COLORS.lowStock} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.lowStock }}>
                        {item.quantity || 0} remaining (min: {item.reorderPoint || categorySettings?.[item.category]?.lowStockThreshold || 0})
                      </div>
                    </div>
                    <Badge text={item.category} color={PANEL_COLORS.lowStock} size="xs" />
                    <ChevronRight size={16} color={colors.textMuted} />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

      case 'reservations':
        return (
          <CollapsibleSection
            key="reservations"
            title="Upcoming Reservations"
            icon={Calendar}
            badge={upcomingReservations.length}
            badgeColor={PANEL_COLORS.reservations}
            headerColor={PANEL_COLORS.reservations}
            collapsed={isCollapsed('reservations')}
            onToggleCollapse={() => toggleCollapse('reservations')}
            action={
              <button
                onClick={(e) => { e.stopPropagation(); onViewReservations(); }}
                style={{ ...styles.btnSec, padding: `${spacing[1]}px ${spacing[2]}px`, fontSize: typography.fontSize.xs }}
              >
                View All
              </button>
            }
            padding={false}
          >
            <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
              {upcomingReservations.length === 0 ? (
                <p style={{ color: colors.textMuted, textAlign: 'center', margin: 0 }}>
                  No upcoming reservations
                </p>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: spacing[3]
                }}>
                  {upcomingReservations.map(r => (
                    <div
                      key={r.id}
                      onClick={() => onViewReservation ? onViewReservation(r, r.item) : onViewItem(r.item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[3],
                        padding: spacing[3],
                        borderRadius: borderRadius.md,
                        background: withOpacity(PANEL_COLORS.reservations, 15),
                        border: `1px solid ${withOpacity(PANEL_COLORS.reservations, 40)}`,
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: borderRadius.sm,
                        background: withOpacity(PANEL_COLORS.reservations, 25),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textMuted,
                        fontSize: typography.fontSize.xs,
                        flexShrink: 0
                      }}>
                        {r.item.image ? (
                          <img src={r.item.image} alt="" style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: borderRadius.sm
                          }} />
                        ) : 'img'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {r.item.name}
                        </div>
                        <div style={{
                          fontSize: typography.fontSize.xs,
                          color: PANEL_COLORS.reservations
                        }}>
                          {r.project} • {formatDate(r.start)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[6]
      }}>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>Dashboard</h2>
        {onCustomizeLayout && (
          <Button variant="secondary" size="sm" onClick={onCustomizeLayout} icon={Layout}>
            Customize
          </Button>
        )}
      </div>

      {/* Render sections in order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {sectionOrder.map(sectionId => renderSection(sectionId))}
      </div>
    </>
  );
}

export default memo(Dashboard);
