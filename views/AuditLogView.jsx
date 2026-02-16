// ============================================================================
// Audit Log Panel View
// Historical record of system events with filtering and search
// ============================================================================

import { memo, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Clock, Filter } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme.js';
import { formatDateTime } from '../utils';
import { Badge, Card, EmptyState, PageHeader, SearchInput } from '../components/ui.jsx';

// Event type → color mapping for meaningful badge differentiation
const EVENT_COLORS = {
  // Item CRUD
  item_created: colors.success,
  item_updated: colors.primary,
  item_deleted: colors.danger,
  // Checkout / Checkin
  item_checkout: colors.checkedOut || colors.warning,
  item_checkin: colors.available || colors.success,
  // Notes
  note_deleted: colors.danger,
  // Maintenance
  maintenance_added: colors.warning,
  maintenance_updated: colors.warning,
  maintenance_status_changed: colors.warning,
  // Bulk operations
  bulk_status_change: colors.accent1 || colors.primary,
  bulk_location_change: colors.accent1 || colors.primary,
  bulk_category_change: colors.accent1 || colors.primary,
  bulk_delete: colors.danger,
  // Kit
  item_converted_to_kit: colors.accent2 || colors.primary,
  // Pack lists
  pack_list_created: colors.success,
  pack_list_updated: colors.primary,
  pack_list_deleted: colors.danger,
  // Packages
  package_created: colors.success,
  package_updated: colors.primary,
  package_deleted: colors.danger,
  // Admin operations
  categories_updated: colors.accent2 || colors.primary,
  category_renamed: colors.accent2 || colors.primary,
  specs_updated: colors.accent2 || colors.primary,
  spec_fields_renamed: colors.accent2 || colors.primary,
  locations_updated: colors.accent2 || colors.primary,
  role_created: colors.success,
  role_updated: colors.primary,
  role_deleted: colors.danger,
  // User management
  user_deleted: colors.danger,
  profile_updated: colors.primary,
};

const getEventColor = (type) => EVENT_COLORS[type] || colors.primary;

// Format event type for display (e.g. "item_created" → "Item Created")
const formatEventType = (type) => {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Get unique event types from audit log
const getEventTypes = (auditLog) => {
  const types = new Set(auditLog.map(e => e.type));
  return [...types].sort();
};

const ITEMS_PER_PAGE = 50;

export const AuditLogPanel = memo(function AuditLogPanel({ auditLog, onBack }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const eventTypes = useMemo(() => getEventTypes(auditLog), [auditLog]);

  // Sort by timestamp descending, then filter
  const filteredLog = useMemo(() => {
    let entries = [...auditLog].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    if (selectedType) {
      entries = entries.filter(e => e.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.user || '').toLowerCase().includes(q) ||
        (e.itemId || '').toLowerCase().includes(q) ||
        (e.type || '').toLowerCase().includes(q) ||
        (e.content || '').toLowerCase().includes(q)
      );
    }

    return entries;
  }, [auditLog, searchQuery, selectedType]);

  const visibleEntries = filteredLog.slice(0, visibleCount);
  const hasMore = visibleCount < filteredLog.length;

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle={`${auditLog.length} system events recorded`}
        onBack={onBack}
        backLabel="Back to Admin"
      />

      {/* Search & Filter Bar */}
      <Card style={{ marginBottom: spacing[4] }}>
        <div style={{ padding: spacing[3], display: 'flex', gap: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder="Search events..."
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <Filter size={16} style={{ color: colors.textMuted }} />
            <select
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setVisibleCount(ITEMS_PER_PAGE); }}
              style={{ ...styles.input, width: 'auto', minWidth: 160, padding: `${spacing[1]}px ${spacing[2]}px` }}
            >
              <option value="">All Events ({auditLog.length})</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>
                  {formatEventType(type)} ({auditLog.filter(e => e.type === type).length})
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || selectedType) && (
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
              {filteredLog.length} result{filteredLog.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </Card>

      {filteredLog.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={searchQuery || selectedType ? 'No Matching Events' : 'No Events Yet'}
          description={searchQuery || selectedType
            ? 'Try adjusting your search or filter.'
            : 'System events will appear here as actions are performed.'}
        />
      ) : (
        <Card padding={false}>
          {visibleEntries.map((entry, i) => (
            <div
              key={entry.id || i}
              style={{
                padding: spacing[4],
                borderBottom: i < visibleEntries.length - 1 ? `1px solid ${colors.borderLight}` : 'none'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <Badge
                  text={formatEventType(entry.type)}
                  color={getEventColor(entry.type)}
                />
                <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
                {entry.description}
              </div>
              {entry.content && (
                <div style={{
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                  marginTop: spacing[1],
                  fontStyle: 'italic'
                }}>
                  &quot;{entry.content}&quot;
                </div>
              )}
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginTop: spacing[1] }}>
                By: {entry.user || 'System'}
                {entry.itemId && <> | Item: {entry.itemId}</>}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div style={{ padding: spacing[4], textAlign: 'center' }}>
              <button
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                style={{
                  background: 'none',
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.md,
                  padding: `${spacing[2]}px ${spacing[4]}px`,
                  color: colors.primary,
                  cursor: 'pointer',
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Load more ({filteredLog.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </Card>
      )}
    </>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
AuditLogPanel.propTypes = {
  /** Array of audit log entries */
  auditLog: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.string.isRequired,
    timestamp: PropTypes.string,
    description: PropTypes.string,
    content: PropTypes.string,
    user: PropTypes.string,
    itemId: PropTypes.string,
  })).isRequired,
  /** Callback to go back */
  onBack: PropTypes.func.isRequired,
};
