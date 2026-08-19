// ============================================================================
// Dashboard Component
// Supports collapsible sections with user-customizable order and visibility.
// Reminders and pending maintenance arrive with the Tier 2 data load (merged
// into inventory items by DataContext); Recent Activity is driven by the
// real audit log (lazy-loaded on mount).
// ============================================================================

import { memo, useState, useMemo, useEffect } from 'react';
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Search,
  Bell,
  TrendingDown,
  Layout,
  Loader,
  LogOut,
  LogIn,
  Wrench,
  Activity,
  Bookmark,
  Hourglass,
  Plus,
  CalendarClock,
  Trash2,
} from 'lucide-react';
import { STATUS, DASHBOARD_SECTIONS } from '../constants.js';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { formatDate, getStatusColor, getTodayISO, isReminderDue, filterBySearch, getStatusLabel } from '../utils';
import {
  Badge,
  StatCard,
  SearchInput,
  Button,
  CollapsibleSection,
  PageHeader,
} from '../components/ui.jsx';
import { usePermissions } from '../contexts/PermissionsContext.js';
import { useData } from '../contexts/DataContext.js';

// Panel color CSS variables for dashboard sections
const PANEL_COLORS = {
  today: 'var(--primary)',
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

// Audit-log event types shown in Recent Activity, with their icons
const ACTIVITY_EVENT_ICONS = {
  item_checkout: LogOut,
  item_checkin: LogIn,
  item_created: Plus,
  item_deleted: Trash2,
  bulk_delete: Trash2,
  maintenance_added: Wrench,
  maintenance_updated: Wrench,
  maintenance_status_changed: Wrench,
};

// Shared empty state style
const emptyStateStyle = {
  padding: spacing[4],
  color: colors.textMuted,
  fontSize: typography.fontSize.sm,
  textAlign: 'center',
  margin: 0,
};

// Shared list row style builder. Rows render as <button> for keyboard access,
// so button defaults are reset here.
const listItemStyle = (panelColor) => ({
  display: 'flex',
  alignItems: 'center',
  gap: spacing[3],
  padding: spacing[3],
  borderRadius: borderRadius.md,
  cursor: 'pointer',
  marginBottom: spacing[2],
  // Quiet accent tint — the row is the information, the section chrome is
  // neutral, so 10/22 reads as color-coding without the old slab effect
  background: withOpacity(panelColor, 10),
  border: `1px solid ${withOpacity(panelColor, 22)}`,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'left',
  font: 'inherit',
  color: 'inherit',
});

// Loading placeholder used while Tier 2 data is on its way
const TierLoading = ({ label }) => (
  <span
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
    }}
  >
    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {label}
  </span>
);

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
  onViewCheckedOut,
  onCustomizeLayout,
  onToggleCollapse,
}) {
  const [quickSearch, setQuickSearch] = useState('');
  const { tier2Loaded, auditLog, auditLogLoaded, ensureAuditLog } = useData();

  // Permissions
  const { canEdit: _canEdit } = usePermissions();

  // Recent Activity reads the real audit log (latest 100, lazy-loaded)
  useEffect(() => {
    ensureAuditLog();
  }, [ensureAuditLog]);

  // "Today" for overdue/due-date math. Refreshed when the tab regains
  // visibility and hourly, so a dashboard left open past midnight doesn't
  // keep yesterday's overdue calculations.
  const [today, setToday] = useState(getTodayISO);
  useEffect(() => {
    const refresh = () => setToday(getTodayISO());
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(refresh, 60 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, []);

  // Local state for collapsed sections (for immediate UI response)
  const [collapsedSections, setCollapsedSections] = useState(() => {
    const initial = {};
    Object.values(DASHBOARD_SECTIONS).forEach((s) => {
      initial[s.id] = layoutPrefs?.sections?.[s.id]?.collapsed || false;
    });
    return initial;
  });

  // Sync with layoutPrefs when they change externally
  useEffect(() => {
    if (layoutPrefs?.sections) {
      setCollapsedSections((prev) => {
        const updated = { ...prev };
        Object.keys(layoutPrefs.sections).forEach((id) => {
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
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
    // Also notify parent to persist
    if (onToggleCollapse) {
      onToggleCollapse('dashboard', sectionId);
    }
  };

  // The Maintenance stat card scrolls to (and expands) the maintenance panel
  const revealMaintenancePanel = () => {
    setCollapsedSections((prev) => (prev.maintenance ? { ...prev, maintenance: false } : prev));
    document
      .getElementById('dash-section-maintenance')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Get sections sorted by order
  const sectionOrder = useMemo(() => {
    const getOrder = (sectionId) => {
      const defaultSection = Object.values(DASHBOARD_SECTIONS).find((s) => s.id === sectionId);
      const pref = layoutPrefs?.sections?.[sectionId];
      return pref?.order ?? defaultSection?.order ?? 99;
    };
    const isVisible = (sectionId) => {
      const pref = layoutPrefs?.sections?.[sectionId];
      return pref?.visible !== false;
    };
    return Object.values(DASHBOARD_SECTIONS)
      .map((s) => s.id)
      .filter((id) => isVisible(id))
      .map((id) => ({ id, order: getOrder(id) }))
      .sort((a, b) => a.order - b.order)
      .map((s) => s.id);
  }, [layoutPrefs]);

  // Computed stats — single-pass over inventory for performance
  const stats = useMemo(() => {
    let available = 0;
    let reserved = 0;
    const alerts = [];
    const overdue = [];
    const checkedOutItems = [];
    const dueReminders = [];
    const lowStockItems = [];
    const pendingMaintenance = [];

    for (const item of inventory) {
      // Status counts
      switch (item.status) {
        case STATUS.AVAILABLE:
          available++;
          break;
        case STATUS.CHECKED_OUT:
          checkedOutItems.push(item);
          if (item.dueBack && item.dueBack < today) {
            overdue.push(item);
          }
          break;
        case STATUS.RESERVED:
          reserved++;
          break;
        case STATUS.NEEDS_ATTENTION:
          alerts.push(item);
          break;
      }

      // Due reminders
      const reminders = item.reminders;
      if (reminders && reminders.length > 0) {
        for (const r of reminders) {
          if (isReminderDue(r)) {
            dueReminders.push({ ...r, item });
          }
        }
      }

      // Low stock check
      const catSettings = categorySettings?.[item.category];
      if (catSettings?.trackQuantity && item.quantity != null) {
        const threshold = item.reorderPoint || catSettings.lowStockThreshold || 0;
        if (threshold > 0 && item.quantity <= threshold) {
          lowStockItems.push(item);
        }
      }

      // Pending maintenance
      const history = item.maintenanceHistory;
      if (history && history.length > 0) {
        for (const m of history) {
          if (m.status === 'scheduled' || m.status === 'in-progress') {
            pendingMaintenance.push({ ...m, item });
          }
        }
      }
    }

    // Sort only the collected arrays (much smaller than full inventory)
    checkedOutItems.sort((a, b) => {
      if (!a.dueBack && !b.dueBack) return 0;
      if (!a.dueBack) return 1;
      if (!b.dueBack) return -1;
      return a.dueBack.localeCompare(b.dueBack);
    });

    pendingMaintenance.sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0;
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    return {
      total: inventory.length,
      available,
      checkedOut: checkedOutItems.length,
      reserved,
      alerts,
      overdue,
      dueReminders,
      lowStockItems,
      checkedOutItems,
      pendingMaintenance,
    };
  }, [inventory, categorySettings, today]);

  // Recent activity from the audit log; falls back to state-derived events
  // while the log is still loading.
  const recentActivity = useMemo(() => {
    if (auditLogLoaded && auditLog.length > 0) {
      return auditLog
        .filter((e) => ACTIVITY_EVENT_ICONS[e.type])
        .slice(0, 8)
        .map((e) => ({
          id: e.id,
          type: e.type,
          description: e.description,
          who: e.user || 'System',
          date: e.timestamp,
          itemId: e.itemId,
        }));
    }
    // Fallback: synthesize from current item state
    const events = [];
    for (const item of inventory) {
      if (item.status === STATUS.CHECKED_OUT && item.checkedOutDate) {
        events.push({
          id: `${item.id}-checkout`,
          type: 'item_checkout',
          description: `${item.name} checked out to ${item.checkedOutTo || 'Unknown'}`,
          who: item.checkedOutTo || 'Unknown',
          date: item.checkedOutDate,
          itemId: item.id,
        });
      }
      if (item.lastCheckedIn) {
        events.push({
          id: `${item.id}-checkin`,
          type: 'item_checkin',
          description: `${item.name} returned by ${item.lastCheckedInBy || 'Unknown'}`,
          who: item.lastCheckedInBy || 'Unknown',
          date: item.lastCheckedIn,
          itemId: item.id,
        });
      }
    }
    events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return events.slice(0, 8);
  }, [auditLog, auditLogLoaded, inventory]);

  // Upcoming AND ongoing reservations: anything that hasn't ended yet.
  // (Cancelled reservations are excluded server-side; the status check is
  // defense in depth for locally-mutated state.)
  const upcomingReservations = useMemo(() => {
    return inventory
      .flatMap((i) => (i.reservations || []).map((r) => ({ ...r, item: i })))
      .filter((r) => r.status !== 'cancelled' && (r.end || r.start) >= today)
      .sort((a, b) => (a.start || '').localeCompare(b.start || ''))
      .slice(0, 6);
  }, [inventory, today]);

  // Today panel: the studio manager's morning questions in one place —
  // what's overdue, what's due back today, what goes out today
  const todayData = useMemo(() => {
    const dueBackToday = stats.checkedOutItems.filter((i) => i.dueBack === today);
    const goingOutToday = inventory
      .flatMap((i) => (i.reservations || []).map((r) => ({ ...r, item: i })))
      .filter((r) => r.status !== 'cancelled' && r.start === today)
      .sort((a, b) => (a.item?.name || '').localeCompare(b.item?.name || ''));
    return {
      dueBackToday,
      goingOutToday,
      total: stats.overdue.length + dueBackToday.length + goingOutToday.length,
    };
  }, [stats.checkedOutItems, stats.overdue, inventory, today]);

  // Quick search results — same shared matcher and fields as the gear list
  // and the Search view, so the three can't silently drift apart again
  const allSearchResults = useMemo(() => {
    if (!quickSearch.trim()) return [];
    return filterBySearch(inventory, quickSearch, ['name', 'brand', 'id', 'serialNumber']);
  }, [inventory, quickSearch]);
  const searchResults = allSearchResults.slice(0, 5);

  // Render sections
  const renderSection = (sectionId) => {
    switch (sectionId) {
      case 'today':
        return (
          <CollapsibleSection
            key="today"
            title="Today"
            icon={CalendarClock}
            badge={todayData.total || null}
            badgeColor={PANEL_COLORS.today}
            headerColor={PANEL_COLORS.today}
            collapsed={isCollapsed('today')}
            onToggleCollapse={() => toggleCollapse('today')}
            padding={false}
          >
            {todayData.total === 0 ? (
              <div style={emptyStateStyle}>Nothing due in or out today</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 320, overflowY: 'auto' }}>
                {stats.overdue.map((item) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={`over-${item.id}`}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(colors.danger)}
                  >
                    <Hourglass size={16} color={colors.danger} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.danger }}>
                        {item.checkedOutTo || 'Unknown'}
                        {item.dueBack ? ` • was due ${formatDate(item.dueBack)}` : ''}
                      </div>
                    </div>
                    <Badge text="Overdue" color={colors.danger} size="xs" />
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
                ))}
                {todayData.dueBackToday.map((item) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={`due-${item.id}`}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(PANEL_COLORS.today)}
                  >
                    <LogIn size={16} color={PANEL_COLORS.today} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        Due back today • {item.checkedOutTo || 'Unknown'}
                      </div>
                    </div>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
                ))}
                {todayData.goingOutToday.map((r) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={`out-${r.id}-${r.item.id}`}
                    onClick={() => onViewItem(r.item.id)}
                    style={listItemStyle(PANEL_COLORS.reservations)}
                  >
                    <LogOut size={16} color={PANEL_COLORS.reservations} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          color: colors.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.item.name}
                      </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                        Goes out today{r.project ? ` • ${r.project}` : ''}
                        {r.reservedBy ? ` • ${r.reservedBy}` : ''}
                      </div>
                    </div>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
                ))}
              </div>
            )}
          </CollapsibleSection>
        );

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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: spacing[3],
              }}
            >
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
                icon={Hourglass}
                value={stats.overdue.length}
                label="Overdue"
                color={colors.danger}
                onClick={onViewOverdue}
              />
              <StatCard
                icon={Bookmark}
                value={stats.reserved}
                label="Reserved"
                color={colors.reserved}
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
                onClick={revealMaintenancePanel}
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
            <div
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  onViewItem(searchResults[0].id);
                }
              }}
            >
              <SearchInput
                value={quickSearch}
                onChange={setQuickSearch}
                onClear={() => setQuickSearch('')}
                placeholder="Search by name, ID, brand, or serial..."
              />
            </div>

            {searchResults.length > 0 && (
              <div style={{ marginTop: spacing[3] }}>
                {searchResults.map((item) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(PANEL_COLORS.search)}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: borderRadius.sm,
                        background: withOpacity(PANEL_COLORS.search, 25),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: colors.textMuted,
                        fontSize: typography.fontSize.xs,
                        flexShrink: 0,
                      }}
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: borderRadius.sm,
                          }}
                        />
                      ) : (
                        'No img'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: typography.fontSize.sm,
                          fontWeight: typography.fontWeight.medium,
                          color: colors.textPrimary,
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: typography.fontSize.xs,
                          color: colors.textMuted,
                        }}
                      >
                        {item.id} &bull; {item.category}
                      </div>
                    </div>
                    <Badge text={getStatusLabel(item.status)} color={getStatusColor(item.status)} />
                  </button>
                ))}
                {allSearchResults.length > searchResults.length && (
                  <button
                    type="button"
                    className="dash-row"
                    onClick={() => onFilteredView('all', 'all', quickSearch)}
                    style={{
                      ...listItemStyle(PANEL_COLORS.search),
                      justifyContent: 'center',
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    View all {allSearchResults.length} results
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
                )}
              </div>
            )}

            {quickSearch && searchResults.length === 0 && (
              <p style={emptyStateStyle}>No items found</p>
            )}

            {!quickSearch && <p style={emptyStateStyle}>Start typing to search inventory</p>}
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
            action={
              stats.checkedOutItems.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewCheckedOut?.();
                  }}
                  style={{
                    ...styles.btnSec,
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    fontSize: typography.fontSize.xs,
                  }}
                >
                  View All
                </button>
              ) : null
            }
            padding={false}
          >
            {stats.checkedOutItems.length === 0 ? (
              <div style={emptyStateStyle}>Nothing is checked out</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 300, overflowY: 'auto' }}>
                {stats.checkedOutItems.slice(0, 8).map((item) => {
                  const isOverdue = item.dueBack && item.dueBack < today;
                  return (
                    <button
                      type="button"
                      className="dash-row"
                      key={item.id}
                      onClick={() => onViewItem(item.id)}
                      style={listItemStyle(PANEL_COLORS.checkedOut)}
                    >
                      <LogOut size={16} color={PANEL_COLORS.checkedOut} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: typography.fontSize.xs,
                            color: PANEL_COLORS.checkedOut,
                          }}
                        >
                          {item.checkedOutTo || 'Unknown'}
                          {item.dueBack ? ` • Due ${formatDate(item.dueBack)}` : ''}
                        </div>
                      </div>
                      {isOverdue && <Badge text="Overdue" color={colors.danger} size="xs" />}
                      <ChevronRight size={16} color={colors.textMuted} />
                    </button>
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
            action={
              stats.alerts.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAlerts();
                  }}
                  style={{
                    ...styles.btnSec,
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    fontSize: typography.fontSize.xs,
                  }}
                >
                  View All
                </button>
              ) : null
            }
            padding={false}
          >
            {stats.alerts.length === 0 ? (
              <div style={emptyStateStyle}>No alerts</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.alerts.map((item) => (
                  <button
                    type="button"
                    className="dash-row"
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
                  </button>
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
              <div style={emptyStateStyle}>
                {!tier2Loaded ? <TierLoading label="Loading reminders..." /> : 'No due reminders'}
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                {stats.dueReminders.map((reminder) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={reminder.id}
                    onClick={() => onViewItem(reminder.item.id)}
                    style={listItemStyle(PANEL_COLORS.reminders)}
                  >
                    <Bell size={16} color={PANEL_COLORS.reminders} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {reminder.title}
                      </div>
                      <div
                        style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.reminders }}
                      >
                        {reminder.item.name} &bull; Due {formatDate(reminder.dueDate)}
                      </div>
                    </div>
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
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
            action={
              stats.lowStockItems.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewLowStock();
                  }}
                  style={{
                    ...styles.btnSec,
                    padding: `${spacing[1]}px ${spacing[2]}px`,
                    fontSize: typography.fontSize.xs,
                  }}
                >
                  View All
                </button>
              ) : null
            }
            padding={false}
          >
            {stats.lowStockItems.length === 0 ? (
              <div style={emptyStateStyle}>No low stock items</div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 200, overflowY: 'auto' }}>
                {stats.lowStockItems.map((item) => (
                  <button
                    type="button"
                    className="dash-row"
                    key={item.id}
                    onClick={() => onViewItem(item.id)}
                    style={listItemStyle(PANEL_COLORS.lowStock)}
                  >
                    <TrendingDown size={16} color={PANEL_COLORS.lowStock} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                        {item.name}
                      </div>
                      <div
                        style={{ fontSize: typography.fontSize.xs, color: PANEL_COLORS.lowStock }}
                      >
                        {item.quantity || 0} remaining (min:{' '}
                        {item.reorderPoint ||
                          categorySettings?.[item.category]?.lowStockThreshold ||
                          0}
                        )
                      </div>
                    </div>
                    <Badge text={item.category} color={PANEL_COLORS.lowStock} size="xs" />
                    <ChevronRight size={16} color={colors.textMuted} />
                  </button>
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
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReservations();
                }}
                style={{
                  ...styles.btnSec,
                  padding: `${spacing[1]}px ${spacing[2]}px`,
                  fontSize: typography.fontSize.xs,
                }}
              >
                View All
              </button>
            }
            padding={false}
          >
            <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
              {upcomingReservations.length === 0 ? (
                <p
                  style={{
                    ...emptyStateStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing[2],
                  }}
                >
                  {!tier2Loaded ? (
                    <TierLoading label="Loading reservations..." />
                  ) : (
                    'No upcoming reservations'
                  )}
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: spacing[3],
                  }}
                >
                  {upcomingReservations.map((r) => {
                    const isActive = r.start <= today;
                    const dateLabel =
                      r.end && r.end !== r.start
                        ? `${formatDate(r.start)} – ${formatDate(r.end)}`
                        : formatDate(r.start);
                    return (
                      <button
                        type="button"
                        className="dash-row"
                        key={r.id}
                        onClick={() =>
                          onViewReservation ? onViewReservation(r, r.item) : onViewItem(r.item.id)
                        }
                        style={{
                          ...listItemStyle(PANEL_COLORS.reservations),
                          marginBottom: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: borderRadius.sm,
                            background: withOpacity(PANEL_COLORS.reservations, 25),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.textMuted,
                            fontSize: typography.fontSize.xs,
                            flexShrink: 0,
                          }}
                        >
                          {r.item.image ? (
                            <img
                              src={r.item.image}
                              alt=""
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: borderRadius.sm,
                              }}
                            />
                          ) : (
                            'No img'
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: typography.fontSize.sm,
                              color: colors.textPrimary,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.item.name}
                          </div>
                          <div
                            style={{
                              fontSize: typography.fontSize.xs,
                              color: PANEL_COLORS.reservations,
                            }}
                          >
                            {r.project ? `${r.project} • ` : ''}
                            {dateLabel}
                          </div>
                        </div>
                        {isActive && (
                          <Badge text="Active" color={PANEL_COLORS.reservations} size="xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleSection>
        );

      case 'maintenance':
        return (
          <div key="maintenance" id="dash-section-maintenance">
            <CollapsibleSection
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
                    <TierLoading label="Loading maintenance..." />
                  ) : (
                    'No scheduled maintenance'
                  )}
                </div>
              ) : (
                <div style={{ padding: spacing[4], maxHeight: 240, overflowY: 'auto' }}>
                  {stats.pendingMaintenance.slice(0, 6).map((record) => (
                    <button
                      type="button"
                      className="dash-row"
                      key={record.id}
                      onClick={() => onViewItem(record.item.id)}
                      style={listItemStyle(PANEL_COLORS.maintenance)}
                    >
                      <Wrench size={16} color={PANEL_COLORS.maintenance} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {record.item.name}
                        </div>
                        <div
                          style={{
                            fontSize: typography.fontSize.xs,
                            color: PANEL_COLORS.maintenance,
                          }}
                        >
                          {record.type || 'Maintenance'}
                          {record.scheduledDate
                            ? ` • ${formatDate(record.scheduledDate)}`
                            : ''}
                        </div>
                      </div>
                      <Badge
                        text={record.status === 'in-progress' ? 'In Progress' : 'Scheduled'}
                        color={
                          record.status === 'in-progress'
                            ? colors.warning
                            : PANEL_COLORS.maintenance
                        }
                        size="xs"
                      />
                      <ChevronRight size={16} color={colors.textMuted} />
                    </button>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          </div>
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
            {recentActivity.length === 0 ? (
              <div style={emptyStateStyle}>
                {!auditLogLoaded ? <TierLoading label="Loading activity..." /> : 'No recent activity'}
              </div>
            ) : (
              <div style={{ padding: spacing[4], maxHeight: 300, overflowY: 'auto' }}>
                {recentActivity.map((event) => {
                  const EventIcon = ACTIVITY_EVENT_ICONS[event.type] || Activity;
                  const canOpen = event.itemId && inventory.some((i) => i.id === event.itemId);
                  const Row = canOpen ? 'button' : 'div';
                  return (
                    <Row
                      type={canOpen ? 'button' : undefined}
                      className={canOpen ? 'dash-row' : undefined}
                      key={event.id}
                      onClick={canOpen ? () => onViewItem(event.itemId) : undefined}
                      style={{
                        ...listItemStyle(PANEL_COLORS.recentActivity),
                        ...(canOpen ? {} : { cursor: 'default' }),
                      }}
                    >
                      <EventIcon size={16} color={PANEL_COLORS.recentActivity} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: typography.fontSize.sm,
                            color: colors.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {event.description}
                        </div>
                        <div
                          style={{
                            fontSize: typography.fontSize.xs,
                            color: PANEL_COLORS.recentActivity,
                          }}
                        >
                          {event.who} &bull; {formatDate(event.date)}
                        </div>
                      </div>
                      {canOpen && <ChevronRight size={16} color={colors.textMuted} />}
                    </Row>
                  );
                })}
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
        action={
          onCustomizeLayout && (
            <Button variant="secondary" onClick={onCustomizeLayout} icon={Layout}>
              Customize
            </Button>
          )
        }
      />

      {/* Render sections in order. Stats + quick search stay full-width
          leads; the remaining panels flow into two columns on wide screens
          (see .dashboard-columns in index.css) instead of stretching each
          panel across the whole desktop viewport. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
        {sectionOrder
          .filter((id) => id === 'stats' || id === 'quickSearch')
          .map((sectionId) => renderSection(sectionId))}
        <div className="dashboard-columns">
          {sectionOrder
            .filter((id) => id !== 'stats' && id !== 'quickSearch')
            .map((sectionId) => (
              <div key={sectionId} className="dashboard-columns-item">
                {renderSection(sectionId)}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export default memo(Dashboard);
