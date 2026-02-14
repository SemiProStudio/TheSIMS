// ============================================================================
// Audit Log Panel View
// Historical record of deleted notes and system events
// ============================================================================

import { memo } from 'react';

import { Clock } from 'lucide-react';
import { colors, styles, spacing, typography } from '../theme';
import { formatDateTime } from '../utils';
import { Badge, Card, EmptyState, PageHeader } from '../components/ui';

interface AuditLogPanelProps {
  auditLog: {
    type: string;
    timestamp?: string;
    description?: string;
    content?: string;
    user?: string;
    itemId?: string;
  }[];
  onBack: () => void;
}

export const AuditLogPanel = memo<AuditLogPanelProps>(function AuditLogPanel({ auditLog, onBack }) {
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
              <div style={{ ...styles.flexBetween, marginBottom: spacing[2] }}>
                <Badge 
                  text={entry.type} 
                  color={entry.type === 'note_deleted' ? colors.danger : colors.primary} 
                />
                <span style={styles.textXsMuted}>
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
                  "{entry.content}"
                </div>
              )}
              <div style={{ ...styles.textXsMuted, marginTop: spacing[1] }}>
                By: {entry.user} | Item: {entry.itemId}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
});

