// ============================================================================
// Audit Log Panel View
// Historical record of deleted notes and system events
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Clock } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { formatDateTime } from '../utils';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui.jsx';

export const AuditLogPanel = memo(function AuditLogPanel({ auditLog, onBack }) {
  return (
    <>
      <PageHeader 
        title="Audit Log" 
        subtitle="Historical record of all deleted notes and system events"
        onBack={onBack}
        backLabel="Back to Admin"
      />
      {auditLog.length === 0 ? (
        <EmptyState 
          icon={Clock} 
          title="No Events Yet" 
          description="Deleted notes and other events will appear here." 
        />
      ) : (
        <Card padding={false}>
          {auditLog.map((entry, i) => (
            <div 
              key={i} 
              style={{ 
                padding: spacing[4], 
                borderBottom: i < auditLog.length - 1 ? `1px solid ${colors.borderLight}` : 'none' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[2] }}>
                <Badge 
                  text={entry.type} 
                  color={entry.type === 'note_deleted' ? colors.danger : colors.primary} 
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
                By: {entry.user} | Item: {entry.itemId}
              </div>
            </div>
          ))}
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
