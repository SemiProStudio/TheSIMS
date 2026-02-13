// ============================================================================
// Maintenance Section Component
// Displays maintenance history and allows adding new maintenance records
// ============================================================================

import { memo, useState } from 'react';
import { Wrench, Plus, Check, Clock, AlertTriangle, DollarSign, Building2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { MAINTENANCE_STATUS } from '../constants.js';
import { colors, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatDate, formatMoney } from '../utils';
import { Badge, Button } from './ui.jsx';

// Get status color for maintenance
const getMaintenanceStatusColor = (status) => {
  switch (status) {
    case MAINTENANCE_STATUS.COMPLETED: return colors.available;
    case MAINTENANCE_STATUS.IN_PROGRESS: return colors.checkedOut;
    case MAINTENANCE_STATUS.SCHEDULED: return colors.primary;
    case MAINTENANCE_STATUS.CANCELLED: return colors.textMuted;
    default: return colors.textMuted;
  }
};

// Get status icon
const getMaintenanceStatusIcon = (status) => {
  switch (status) {
    case MAINTENANCE_STATUS.COMPLETED: return Check;
    case MAINTENANCE_STATUS.IN_PROGRESS: return Clock;
    case MAINTENANCE_STATUS.SCHEDULED: return Calendar;
    case MAINTENANCE_STATUS.CANCELLED: return AlertTriangle;
    default: return Wrench;
  }
};

// Format status for display
const formatStatus = (status) => {
  switch (status) {
    case MAINTENANCE_STATUS.COMPLETED: return 'Completed';
    case MAINTENANCE_STATUS.IN_PROGRESS: return 'In Progress';
    case MAINTENANCE_STATUS.SCHEDULED: return 'Scheduled';
    case MAINTENANCE_STATUS.CANCELLED: return 'Cancelled';
    default: return status;
  }
};

// Single maintenance entry component
const MaintenanceEntry = memo(function MaintenanceEntry({ entry, onComplete, _onEdit, panelColor }) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = getMaintenanceStatusIcon(entry.status);
  const statusColor = getMaintenanceStatusColor(entry.status);
  const isCompleted = entry.status === MAINTENANCE_STATUS.COMPLETED;
  const isScheduled = entry.status === MAINTENANCE_STATUS.SCHEDULED;
  const isInProgress = entry.status === MAINTENANCE_STATUS.IN_PROGRESS;
  
  // Ensure we have a valid hex color for opacity
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;

  return (
    <div
      style={{
        background: `${withOpacity(effectivePanelColor, 20)}`,
        border: `1px solid ${withOpacity(effectivePanelColor, 50)}`,
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: borderRadius.lg,
        marginBottom: spacing[3],
        overflow: 'hidden',
      }}
    >
      {/* Header - always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: spacing[3],
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: borderRadius.md,
            background: withOpacity(statusColor, 20),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: statusColor,
          }}
        >
          <StatusIcon size={18} />
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[1] }}>
            <Badge text={entry.type} color={statusColor} size="xs" />
            <Badge text={formatStatus(entry.status)} color={statusColor} size="xs" />
            {entry.warrantyWork && (
              <Badge text="Warranty" color={colors.available} size="xs" />
            )}
          </div>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              color: colors.textPrimary,
              fontWeight: typography.fontWeight.medium,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {entry.description || entry.type}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            {isCompleted && entry.completedDate
              ? `Completed ${formatDate(entry.completedDate)}`
              : entry.scheduledDate
              ? `Scheduled ${formatDate(entry.scheduledDate)}`
              : formatDate(entry.createdAt)}
            {entry.cost > 0 && (
              <span style={{ color: colors.textSecondary }}> • {formatMoney(entry.cost)}</span>
            )}
          </div>
        </div>

        <div style={{ color: colors.textMuted }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            padding: spacing[3],
            paddingTop: 0,
            borderTop: `1px solid ${colors.borderLight}`,
          }}
        >
          <div style={{ paddingTop: spacing[3] }}>
            {/* Vendor info */}
            {entry.vendor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <Building2 size={14} color={colors.textMuted} />
                <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                  {entry.vendor}
                  {entry.vendorContact && ` • ${entry.vendorContact}`}
                </span>
              </div>
            )}

            {/* Cost */}
            {entry.cost > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                <DollarSign size={14} color={colors.textMuted} />
                <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                  {formatMoney(entry.cost)}
                  {entry.warrantyWork && ' (Warranty covered)'}
                </span>
              </div>
            )}

            {/* Dates */}
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
              <Calendar size={14} color={colors.textMuted} />
              <span style={{ fontSize: typography.fontSize.sm, color: colors.textSecondary }}>
                {entry.scheduledDate && `Scheduled: ${formatDate(entry.scheduledDate)}`}
                {entry.scheduledDate && entry.completedDate && ' → '}
                {entry.completedDate && `Completed: ${formatDate(entry.completedDate)}`}
              </span>
            </div>

            {/* Notes */}
            {entry.notes && (
              <div
                style={{
                  marginTop: spacing[2],
                  padding: spacing[2],
                  background: colors.bgCard,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                &quot;{entry.notes}&quot;
              </div>
            )}

            {/* Actions */}
            {(isScheduled || isInProgress) && (
              <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3] }}>
                {isScheduled && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(entry.id, MAINTENANCE_STATUS.IN_PROGRESS);
                    }}
                  >
                    Start Work
                  </Button>
                )}
                {isInProgress && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(entry.id, MAINTENANCE_STATUS.COMPLETED);
                    }}
                    icon={Check}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Main component
function MaintenanceSection({ 
  maintenanceHistory = [], 
  onAddMaintenance, 
  onUpdateMaintenance,
  onCompleteMaintenance,
  panelColor
}) {
  // Get computed color for use with opacity
  const effectivePanelColor = panelColor && panelColor.length > 0 ? panelColor : colors.primary;
  
  // Calculate totals
  const totalCost = maintenanceHistory
    .filter(m => m.status === MAINTENANCE_STATUS.COMPLETED && !m.warrantyWork)
    .reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  
  const pendingCount = maintenanceHistory.filter(
    m => m.status === MAINTENANCE_STATUS.SCHEDULED || m.status === MAINTENANCE_STATUS.IN_PROGRESS
  ).length;

  // Sort: pending first, then by date descending
  const sortedHistory = [...maintenanceHistory].sort((a, b) => {
    // Pending items first
    const aIsPending = a.status === MAINTENANCE_STATUS.SCHEDULED || a.status === MAINTENANCE_STATUS.IN_PROGRESS;
    const bIsPending = b.status === MAINTENANCE_STATUS.SCHEDULED || b.status === MAINTENANCE_STATUS.IN_PROGRESS;
    if (aIsPending && !bIsPending) return -1;
    if (!aIsPending && bIsPending) return 1;
    
    // Then by date
    const aDate = a.completedDate || a.scheduledDate || a.createdAt;
    const bDate = b.completedDate || b.scheduledDate || b.createdAt;
    return new Date(bDate) - new Date(aDate);
  });

  const content = (
    <>
      <div style={{ padding: spacing[4] }}>
        {/* Summary stats */}
        {maintenanceHistory.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: spacing[4],
              marginBottom: spacing[4],
              padding: spacing[3],
              background: `${withOpacity(effectivePanelColor, 15)}`,
              borderRadius: borderRadius.md,
            }}
          >
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.primary,
                }}
              >
                {maintenanceHistory.length}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Records
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: pendingCount > 0 ? colors.checkedOut : colors.textMuted,
                }}
              >
                {pendingCount}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Pending
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div
                style={{
                  fontSize: typography.fontSize.lg,
                  fontWeight: typography.fontWeight.bold,
                  color: colors.available,
                }}
              >
                {formatMoney(totalCost)}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                Total Cost
              </div>
            </div>
          </div>
        )}

        {/* Add Record Button - always at top */}
        <Button
          variant="secondary"
          onClick={onAddMaintenance}
          icon={Plus}
          style={{ width: '100%', justifyContent: 'center', marginBottom: sortedHistory.length > 0 ? spacing[3] : 0 }}
        >
          Add Record
        </Button>

        {/* Maintenance entries */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {sortedHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: spacing[4], color: colors.textMuted }}>
              <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
                No maintenance records yet
              </p>
            </div>
          ) : (
            sortedHistory.map((entry) => (
              <MaintenanceEntry
                key={entry.id}
                entry={entry}
                onComplete={onCompleteMaintenance}
                onEdit={onUpdateMaintenance}
                panelColor={panelColor}
              />
            ))
          )}
        </div>
      </div>
    </>
  );

  return content;
}

export default memo(MaintenanceSection);
