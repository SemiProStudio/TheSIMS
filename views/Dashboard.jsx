// ============================================================================
// Dashboard Component
// Supports collapsible sections with user-customizable order and visibility
// ============================================================================

import { memo, useState, useMemo, useEffect } from 'react';
import {
  Package, CheckCircle, Clock, AlertTriangle, Calendar,
  ChevronRight, Search, Bell, TrendingDown, Layout, Loader,
  LogOut, LogIn, Wrench, Activity, Bookmark
} from 'lucide-react';
import { STATUS, DASHBOARD_SECTIONS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate, getStatusColor, getTodayISO, isReminderDue } from '../utils';
import { Badge, StatCard, SearchInput, Button, CollapsibleSection, PageHeader } from '../components/ui.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { useData } from '../contexts/DataContext.js';

// Panel color CSS variables for dashboard sections
const PANEL_COLORS = {
  stats: 'var(--panel-stats)',
  search: 'var(--panel-search)',
  checkedOut: 'var(--panel-checkedout)',
  alerts: 'var(--panel-alerts)',
  reminders: 'var(--panel-reminders)',
  lowStock: 'var(--panel-lowstock)',
  reservations: 'var(--panel-reservations)',
  maintenance: 'var(--panel-maintenance)',
  recentActivity: 'var(--panel-activity)',
};

// Shared empty state style
const emptyStateStyle = {
  padding: spacing[4],
  color: colors.textMuted,
  fontSize: typography.fontSize.sm,
  textAlign: 'center',
  margin: 0,
};

// Shared list item style builder
const listItemStyle = (panelColor) => ({
  display: 'flex',
  alignItems: 'center',
  gap: spacing[3],
  padding: spacing[3],
  borderRadius: borderRadius.md,
  cursor: 'pointer',
  marginBottom: spacing[2],
  background: withOpacity(panelColor, 15),
  border: `1px solid ${withOpacity(panelColor, 40)}`,
});

function Dashboard({
  inventory = [],
  categorySettings = {},
  layoutPrefs,
  onViewItem,
  onViewReservation,
  onFilteredView,
  onViewAlerts,
  onViewLowStock,
  onViewReservations,
  onViewCheckedOut,
  onCustomizeLayout,
  onToggleCollapse,
}) {
  const [quickSearch, setQuickSearch] = useState('');
  const { tier2Loaded } = useData();

  // Permissions
  const { canEdit: _canEdit } = usePermissions();

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
    const getOrder = (sectionId) => {
      const defaultSection = Object.values(DASHBOARD_SECTIONS).find(s => s.id === sectionId);
      const pref = layoutPrefs?.sections?.[sectionId];
      return pref?.order ?? defaultSection?.order ?? 99;
    };
    const isVisible = (sectionId) => {
      const pref = layoutPrefs?.sections?.[sectionId];
      return pref?.visible !== false;
    };
    const sections = ['stats', 'quickSearch', 'checkedOut', 'alerts', 'reminders', 'lowStock', 'reservations', 'maintenance', 'recentActivity'];
    return sections
      .filter(id => isVisible(id))
      .map(id => ({ id, order: getOrder(id) }))
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

    // Get checked out items sorted by due date
    const checkedOutItems = inventory
      .filter(i => i.status === STATUS.CHECKED_OUT)
      .sort((a, b) => {
        // Items with due dates first, sorted ascending; no due date last
        if (!a.dueBack && !b.dueBack) return 0;
        if (!a.dueBack) return 1;
        if (!b.dueBack) return -1;
        return a.dueBack.localeCompare(b.dueBack);
      });

    // Get pending maintenance from items
    const pendingMaintenance = inventory.flatMap(item =>
      (item.maintenanceHistory || [])
        .filter(m => m.status === 'scheduled' || m.status === 'in-progress')
        .map(m => ({ ...m, item }))
    ).sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0;
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    // Build recent activity from checked out items
    const recentActivity = inventory
      .filter(i => i.checkedOutDate || i.lastCheckedIn)
      .map(i => {
        const events = [];
        if (i.status === STATUS.CHECKED_OUT && i.checkedOutDate) {
          events.push({
            id: `${i.id}-checkout`,
            type: 'checkout',
            item: i,
            date: i.checkedOutDate,
            who: i.checkedOutTo || 'Unknown',
          });
        }
        if (i.lastCheckedIn) {
          events.push({
            id: `${i.id}-checkin`,
            type: 'checkin',
            item: i,
            date: i.lastCheckedIn,
            who: i.lastCheckedInBy || 'Unknown',
          });
        }
        return events;
      })
      .flat()
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 8);

    const reserved = inventory.filter(i => i.status === STATUS.RESERVED).length;

    return {
      total: inventory.length,
      available: inventory.filter(i => i.status === STATUS.AVAILABLE).length,
      checkedOut: checkedOutItems.length,
      reserved,
      alerts: inventory.filter(i => i.status === STATUS.NEEDS_ATTENTION),
      overdue: inventory.filter(i =>
        i.status === STATUS.CHECKED_OUT && i.dueBack && i.dueBack < today
      ),
      dueReminders,
      lowStockItems,
      checkedOutItems,
      pendingMaintenance,
      recentActivity,
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
                icon={Bookmark}
                value={stats.reserved}
                label="Reserved"
                color={colors.reserved || PANEL_COLORS.reservations}
                onClick={() => onFilteredView('all', STATUS.RESERVED)}
              />
              <StatCard
                icon={AlertTriangle}
                value={stats.alerts.length}
                label="Needs Attention"
                color={colors.danger}
                onClick={onViewAlerts}
              />
              <StatCard
                icon={Wrench}
                value={stats.pendingMaintenance.length}
                label="Maintenance"
                color={PANEL_COLORS.maintenance}
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
                    style={listItemStyle(PANEL_COLORS.search)}
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
                        {item.id} &bull; {item.category}
                      </div>
                    </div>
                    <Badge text={item.status} color={getStatusColor(item.status)} />
                  </div>
                ))}
              </div>
            )}

            {quickSearch && searchResults.length === 0 && (
              <p style={emptyStateStyle}>No items found</p>
            )}

            {!quickSearch && (
              <p style={emptyStateStyle}>Start typing to search inventory</p>
            )}
          </CollapsibleSection>
        );

      case 'checkedOut':
        return (
          <CollapsibleSection
            key="checkedOut"
            title="Currently Checked Out"
            icon={LogOut}
            badge={stats.checkedOutItems.length || null}
            badgeColor={PANEL_COLORS.checkedOut}
            headerColor={PANEL_COLORS.checkedOut}
            collapsed={isCollapsed('checkedOut')}
            onToggleCollapse={() => toggleCollapse('checkedOut')}
            action={stats.checkedOutItems.length > 0 ? (
              <button
                onClick={(e) => { e.stopPropagation(); onViewCheckedOut?.(); }}
                style={{ ...styles.btnSec, padding: `${spacing[1]}px ${spacing[2]}px`, fontSize: typography.fontSize.xs }}
              >
                View All
              </button>
            ) : null}
            padding={false}
          >
            {stats.checkedOutItems.length === 0 ? (
              <div style={emptyStateStyle}>All items are available</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 300, overflowY: 'auto' }}>
                {stats.checkedOutItems.slice(0, 8).map(item => {
                  const today = getTodayISO();
                  const isOverdue = item.dueBack && item.dueBack < today;
                  return (
                    <div
                      key={item.id}
                      onClick={() => onViewItem(item.id)}
                      style={listItemStyle(PANEL_COLORS.checkedOut)}
                    >
                      <LogOut size={16} color={PANEL_COLORS.checkedOut} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.checkedOut }}>
                          {item.checkedOutTo || 'Unknown'}{item.dueBack ? ` \u2022 Due ${formatDate(item.dueBack)}` : ''}
                        </div>
                      </div>
                      {isOverdue && (
                        <Badge text="Overdue" color={colors.danger} size="xs" />
                      )}
                      <ChevronRight size={16} color={colors.textMuted} />
                    </div>
                  );
                })}
              </div>
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
              <div style={emptyStateStyle}>No alerts</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.alerts.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(PANEL_COLORS.alerts)}
                  >
                    <AlertTriangle size={16} color={PANEL_COLORS.alerts} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.alerts }}>
                        Needs attention &bull; {item.category}
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
              <div style={emptyStateStyle}>No due reminders</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.dueReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    onClick={() => onViewItem(reminder.item.id)}
                    style={listItemStyle(PANEL_COLORS.reminders)}
                  >
                    <Bell size={16} color={PANEL_COLORS.reminders} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {reminder.title}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.reminders }}>
                        {reminder.item.name} &bull; Due {formatDate(reminder.dueDate)}
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
              <div style={emptyStateStyle}>No low stock items</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 200, overflowY: 'auto' }}>
                {stats.lowStockItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(PANEL_COLORS.lowStock)}
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
            badge={upcomingReservations.length || null}
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
                <p style={{ ...emptyStateStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
                  {!tier2Loaded ? (
                    <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading reservations...</>
                  ) : (
                    'No upcoming reservations'
                  )}
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
                          {r.project ? `${r.project} \u2022 ` : ''}{formatDate(r.start)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleSection>
        );

      case 'maintenance':
        return (
          <CollapsibleSection
            key="maintenance"
            title="Upcoming Maintenance"
            icon={Wrench}
            badge={stats.pendingMaintenance.length || null}
            badgeColor={PANEL_COLORS.maintenance}
            headerColor={PANEL_COLORS.maintenance}
            collapsed={isCollapsed('maintenance')}
            onToggleCollapse={() => toggleCollapse('maintenance')}
            padding={false}
          >
            {stats.pendingMaintenance.length === 0 ? (
              <div style={emptyStateStyle}>
                {!tier2Loaded ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing[2] }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading maintenance...
                  </span>
                ) : (
                  'No scheduled maintenance'
                )}
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.pendingMaintenance.slice(0, 6).map(record => (
                  <div
                    key={record.id}
                    onClick={() => onViewItem(record.item.id)}
                    style={listItemStyle(PANEL_COLORS.maintenance)}
                  >
                    <Wrench size={16} color={PANEL_COLORS.maintenance} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {record.item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.maintenance }}>
                        {record.type || 'Maintenance'}{record.scheduledDate ? ` \u2022 ${formatDate(record.scheduledDate)}` : ''}
                      </div>
                    </div>
                    <Badge
                      text={record.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                      color={record.status === 'in-progress' ? colors.warning : PANEL_COLORS.maintenance}
                      size="xs"
                    />
                    <ChevronRight size={16} color={colors.textMuted} />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

      case 'recentActivity':
        return (
          <CollapsibleSection
            key="recentActivity"
            title="Recent Activity"
            icon={Activity}
            badge={null}
            headerColor={PANEL_COLORS.recentActivity}
            collapsed={isCollapsed('recentActivity')}
            onToggleCollapse={() => toggleCollapse('recentActivity')}
            padding={false}
          >
            {stats.recentActivity.length === 0 ? (
              <div style={emptyStateStyle}>No recent activity</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 300, overflowY: 'auto' }}>
                {stats.recentActivity.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onViewItem(event.item.id)}
                    style={listItemStyle(PANEL_COLORS.recentActivity)}
                  >
                    {event.type === 'checkout' ? (
                      <LogOut size={16} color={PANEL_COLORS.recentActivity} />
                    ) : (
                      <LogIn size={16} color={PANEL_COLORS.recentActivity} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.recentActivity }}>
                        {event.type === 'checkout' ? 'Checked out to' : 'Returned by'} {event.who} &bull; {formatDate(event.date)}
                      </div>
                    </div>
                    <Badge
                      text={event.type === 'checkout' ? 'Out' : 'In'}
                      color={event.type === 'checkout' ? colors.checkedOut : colors.available}
                      size="xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        action={onCustomizeLayout && (
          <Button variant="secondary" onClick={onCustomizeLayout} icon={Layout}>
            Customize
          </Button>
        )}
      />

      {/* Render sections in order */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {sectionOrder.map(sectionId => renderSection(sectionId))}
      </div>
    </>
  );
}

export default memo(Dashboard);
