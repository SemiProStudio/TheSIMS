// ============================================================================
// Depreciation Calculator Component
// Calculates and displays item depreciation using multiple methods
// ============================================================================

import React, { memo, useState, useMemo } from 'react';
import { TrendingDown, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity} from '../theme.js';
import { formatMoney, calculateDepreciation, DEFAULT_USEFUL_LIFE, DEPRECIATION_METHODS } from '../utils.js';
import { Badge, Card, CardHeader, Button } from './ui.jsx';
import { Select } from './Select.jsx';

// Depreciation Calculator Component
function DepreciationCalculator({ item, onUpdateValue }) {
  const [method, setMethod] = useState(DEPRECIATION_METHODS.STRAIGHT_LINE);
  const [usefulLife, setUsefulLife] = useState(
    DEFAULT_USEFUL_LIFE[item.category] || 5
  );
  const [salvagePercent, setSalvagePercent] = useState(10); // 10% salvage value default
  const [showSchedule, setShowSchedule] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const salvageValue = (item.purchasePrice * salvagePercent) / 100;

  const depreciation = useMemo(() => {
    if (!item.purchasePrice || !item.purchaseDate) {
      return null;
    }
    return calculateDepreciation(
      item.purchasePrice,
      item.purchaseDate,
      usefulLife,
      salvageValue,
      method
    );
  }, [item.purchasePrice, item.purchaseDate, usefulLife, salvageValue, method]);

  if (!item.purchasePrice || !item.purchaseDate) {
    return (
      <Card padding={false}>
        <CardHeader title="Depreciation" icon={TrendingDown} />
        <div style={{ padding: spacing[4], textAlign: 'center', color: colors.textMuted }}>
          <p style={{ margin: 0, fontSize: typography.fontSize.sm }}>
            Purchase price and date required to calculate depreciation.
          </p>
        </div>
      </Card>
    );
  }

  const methodLabels = {
    [DEPRECIATION_METHODS.STRAIGHT_LINE]: 'Straight Line',
    [DEPRECIATION_METHODS.DECLINING_BALANCE]: 'Declining Balance (150%)',
    [DEPRECIATION_METHODS.DOUBLE_DECLINING]: 'Double Declining (200%)',
  };

  return (
    <Card padding={false}>
      <CardHeader 
        title="Depreciation Calculator" 
        icon={TrendingDown}
        action={
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: spacing[1],
            }}
          >
            <Info size={16} />
          </button>
        }
      />
      <div style={{ padding: spacing[4] }}>
        {/* Info panel */}
        {showInfo && (
          <div
            style={{
              background: `${withOpacity(colors.primary, 10)}`,
              borderRadius: borderRadius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
              fontSize: typography.fontSize.xs,
              color: colors.textSecondary,
            }}
          >
            <strong style={{ color: colors.textPrimary }}>Depreciation Methods:</strong>
            <ul style={{ margin: `${spacing[2]}px 0 0 0`, paddingLeft: spacing[4] }}>
              <li><strong>Straight Line:</strong> Equal depreciation each year</li>
              <li><strong>Declining Balance:</strong> 150% of straight-line rate applied to remaining value</li>
              <li><strong>Double Declining:</strong> 200% of straight-line rate (accelerated)</li>
            </ul>
          </div>
        )}

        {/* Configuration */}
        <div className="responsive-three-col" style={{ display: 'grid', gap: spacing[3], marginBottom: spacing[4] }}>
          <div>
            <label style={{ ...styles.label, fontSize: typography.fontSize.xs }}>Method</label>
            <Select
              value={method}
              onChange={e => setMethod(e.target.value)}
              options={Object.entries(methodLabels).map(([value, label]) => ({ value, label }))}
              aria-label="Depreciation method"
            />
          </div>
          <div>
            <label style={{ ...styles.label, fontSize: typography.fontSize.xs }}>Useful Life (years)</label>
            <input
              type="number"
              value={usefulLife}
              onChange={e => setUsefulLife(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="30"
              style={{ ...styles.input, fontSize: typography.fontSize.sm, padding: spacing[2] }}
            />
          </div>
          <div>
            <label style={{ ...styles.label, fontSize: typography.fontSize.xs }}>Salvage Value (%)</label>
            <input
              type="number"
              value={salvagePercent}
              onChange={e => setSalvagePercent(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
              min="0"
              max="100"
              style={{ ...styles.input, fontSize: typography.fontSize.sm, padding: spacing[2] }}
            />
          </div>
        </div>

        {/* Results */}
        {depreciation && (
          <>
            {/* Value comparison */}
            <div
              className="responsive-three-col"
              style={{
                display: 'grid',
                gap: spacing[3],
                marginBottom: spacing[4],
                padding: spacing[3],
                background: colors.bgDark,
                borderRadius: borderRadius.lg,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing[1] }}>
                  Purchase Price
                </div>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.textPrimary }}>
                  {formatMoney(item.purchasePrice)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing[1] }}>
                  Calculated Value
                </div>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.primary }}>
                  {formatMoney(depreciation.currentValue)}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted, marginBottom: spacing[1] }}>
                  Current Value
                </div>
                <div style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.available }}>
                  {formatMoney(item.currentValue)}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing[2], marginBottom: spacing[4] }}>
              <div style={{ padding: spacing[2], background: `${withOpacity(colors.danger, 10)}`, borderRadius: borderRadius.md, textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Total Depreciation</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.danger }}>
                  {formatMoney(depreciation.totalDepreciation)}
                </div>
              </div>
              <div style={{ padding: spacing[2], background: `${withOpacity(colors.primary, 10)}`, borderRadius: borderRadius.md, textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Annual</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary }}>
                  {formatMoney(depreciation.annualDepreciation)}
                </div>
              </div>
              <div style={{ padding: spacing[2], background: `${withOpacity(colors.accent1, 10)}`, borderRadius: borderRadius.md, textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Age</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.accent1 }}>
                  {depreciation.ageInYears.toFixed(1)} yrs
                </div>
              </div>
              <div style={{ padding: spacing[2], background: `${withOpacity(colors.accent2, 10)}`, borderRadius: borderRadius.md, textAlign: 'center' }}>
                <div style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>% Depreciated</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.accent2 }}>
                  {depreciation.percentDepreciated.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Depreciation bar */}
            <div style={{ marginBottom: spacing[4] }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing[1] }}>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>Depreciation Progress</span>
                <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
                  Salvage: {formatMoney(salvageValue)}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  background: colors.borderLight,
                  borderRadius: borderRadius.full,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(depreciation.percentDepreciated, 100)}%`,
                    background: `linear-gradient(90deg, ${colors.danger}, ${colors.accent1})`,
                    borderRadius: borderRadius.full,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Update value button */}
            {Math.abs(item.currentValue - depreciation.currentValue) > 1 && onUpdateValue && (
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() => onUpdateValue(Math.round(depreciation.currentValue))}
                style={{ marginBottom: spacing[4] }}
              >
                Update Current Value to {formatMoney(depreciation.currentValue)}
              </Button>
            )}

            {/* Schedule toggle */}
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing[2],
                background: 'none',
                border: `1px solid ${colors.borderLight}`,
                borderRadius: borderRadius.md,
                cursor: 'pointer',
                color: colors.textSecondary,
                fontSize: typography.fontSize.sm,
              }}
            >
              <span>Depreciation Schedule</span>
              {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Schedule table */}
            {showSchedule && (
              <div style={{ marginTop: spacing[3], overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.xs }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                      <th style={{ padding: spacing[2], textAlign: 'left', color: colors.textMuted }}>Year</th>
                      <th style={{ padding: spacing[2], textAlign: 'right', color: colors.textMuted }}>Start Value</th>
                      <th style={{ padding: spacing[2], textAlign: 'right', color: colors.textMuted }}>Depreciation</th>
                      <th style={{ padding: spacing[2], textAlign: 'right', color: colors.textMuted }}>End Value</th>
                      <th style={{ padding: spacing[2], textAlign: 'right', color: colors.textMuted }}>Accumulated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciation.schedule.map((row, idx) => {
                      const isCurrent = row.year === Math.ceil(depreciation.ageInYears);
                      return (
                        <tr
                          key={row.year}
                          style={{
                            borderBottom: `1px solid ${colors.borderLight}`,
                            background: isCurrent ? `${withOpacity(colors.primary, 10)}` : 'transparent',
                          }}
                        >
                          <td style={{ padding: spacing[2], color: colors.textPrimary }}>
                            {row.year}
                            {isCurrent && <Badge text="Current" color={colors.primary} size="xs" style={{ marginLeft: spacing[1] }} />}
                          </td>
                          <td style={{ padding: spacing[2], textAlign: 'right', color: colors.textSecondary }}>
                            {formatMoney(row.startValue)}
                          </td>
                          <td style={{ padding: spacing[2], textAlign: 'right', color: colors.danger }}>
                            -{formatMoney(row.depreciation)}
                          </td>
                          <td style={{ padding: spacing[2], textAlign: 'right', color: colors.textPrimary, fontWeight: typography.fontWeight.medium }}>
                            {formatMoney(row.endValue)}
                          </td>
                          <td style={{ padding: spacing[2], textAlign: 'right', color: colors.textMuted }}>
                            {formatMoney(row.accumulated)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default memo(DepreciationCalculator);
