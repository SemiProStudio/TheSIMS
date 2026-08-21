// =============================================================================
// Low-stock reminder fields (Add / Edit item forms)
// Per-item opt-in: a checkbox that is OFF by default, and — once on — the
// threshold the item is considered low at. Only rendered by callers whose
// category tracks quantity; there is no category-level threshold.
// =============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, spacing, typography } from '../theme.js';

const LowStockFields = memo(function LowStockFields({ enabled, threshold, onChange, inputId }) {
  const id = inputId || 'low-stock-threshold';
  return (
    <div style={{ marginBottom: spacing[3] }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: `${spacing[1]}px ${spacing[2]}px`,
          cursor: 'pointer',
          fontSize: typography.fontSize.sm,
          color: colors.textPrimary,
        }}
      >
        <input
          type="checkbox"
          checked={Boolean(enabled)}
          onChange={(e) => onChange({ lowStockAlert: e.target.checked })}
          style={{ accentColor: colors.primary, alignSelf: 'center' }}
        />
        <span style={{ whiteSpace: 'nowrap' }}>Low stock reminder</span>
        <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
          off by default · shows on the dashboard and in the admin digest
        </span>
      </label>
      {enabled && (
        <div style={{ marginTop: spacing[2], paddingLeft: spacing[6] }}>
          <label htmlFor={id} style={styles.label}>
            Alert when quantity is at or below
          </label>
          <input
            id={id}
            type="number"
            min="0"
            value={threshold ?? 0}
            onChange={(e) =>
              onChange({ reorderPoint: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            style={{ ...styles.input, maxWidth: 150 }}
          />
          {!(Number(threshold) > 0) && (
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                fontSize: typography.fontSize.xs,
                color: colors.warning,
              }}
            >
              Set a threshold above 0 — at 0 the reminder never fires.
            </p>
          )}
        </div>
      )}
    </div>
  );
});

LowStockFields.propTypes = {
  enabled: PropTypes.bool,
  threshold: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Called with a partial form patch: { lowStockAlert } or { reorderPoint } */
  onChange: PropTypes.func.isRequired,
  inputId: PropTypes.string,
};

export default LowStockFields;
