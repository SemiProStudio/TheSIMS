// ============================================================================
// Smart Paste — Batch Selector
// Multi-product batch selection panel
// ============================================================================

import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';
import { Button } from '../../components/ui.jsx';

export function BatchSelector({ batchResults, batchSelected, setBatchSelected, onBatchApply, onBatchSelectSingle }) {
  if (!batchResults) return null;

  return (
    <div style={{
      background: colors.bgLight,
      borderRadius: borderRadius.lg,
      border: `1px solid ${colors.border}`,
      overflow: 'hidden',
      marginBottom: spacing[3],
    }}>
      <div style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: typography.fontSize.xs,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: colors.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: spacing[1],
        }}>
          ⊞
          Detected Products ({batchResults.length})
        </div>
        <div style={{ display: 'flex', gap: spacing[1] }}>
          <button
            onClick={() => setBatchSelected(new Set(batchResults.map((_, i) => i)))}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: typography.fontSize.xs, color: colors.primary, fontWeight: 600,
            }}
          >Select All</button>
          <button
            onClick={() => setBatchSelected(new Set())}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: typography.fontSize.xs, color: colors.textMuted,
            }}
          >Clear</button>
        </div>
      </div>
      {batchResults.map(({ segment, result }, i) => {
        const isSelected = batchSelected.has(i);
        const fieldCount = [...result.fields.values()].filter(f => f.value).length;
        return (
          <div
            key={i}
            style={{
              padding: `${spacing[2]}px ${spacing[3]}px`,
              borderBottom: `1px solid ${withOpacity(colors.border, 30)}`,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              background: isSelected ? withOpacity(colors.primary, 5) : 'transparent',
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {
                const next = new Set(batchSelected);
                if (isSelected) next.delete(i); else next.add(i);
                setBatchSelected(next);
              }}
              style={{ cursor: 'pointer', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: typography.fontSize.sm,
                fontWeight: 600,
                color: colors.textPrimary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {result.name || segment.name}
              </div>
              <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                {result.brand && <span>{result.brand} · </span>}
                {result.category && <span>{result.category} · </span>}
                <span>{fieldCount} fields matched</span>
                {result.purchasePrice && <span> · ${result.purchasePrice}</span>}
              </div>
            </div>
            <button
              onClick={() => onBatchSelectSingle(i)}
              title="View & edit this product in detail"
              style={{
                background: withOpacity(colors.primary, 10),
                border: `1px solid ${withOpacity(colors.primary, 30)}`,
                borderRadius: borderRadius.sm,
                cursor: 'pointer',
                color: colors.primary,
                padding: `2px ${spacing[2]}px`,
                fontSize: typography.fontSize.xs,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Edit
            </button>
          </div>
        );
      })}
      <div style={{
        padding: `${spacing[2]}px ${spacing[3]}px`,
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <Button
          onClick={onBatchApply}
          disabled={batchSelected.size === 0}
        >
          Import {batchSelected.size} Product{batchSelected.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
