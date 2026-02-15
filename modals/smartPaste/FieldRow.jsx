// ============================================================================
// Smart Paste — Field Row
// Matched spec field with alternatives dropdown, badges, and hints
// ============================================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X as XIcon } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';
import { ConfidenceBadge } from './ConfidenceBadge.jsx';

export function FieldRow({ specName, fieldData, selectedValue, onSelect, onClear, isRequired, onLineClick, unitInfo, coercionInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasAlts = fieldData && fieldData.alternatives && fieldData.alternatives.length > 1;
  const value = fieldData
    ? (selectedValue !== undefined ? selectedValue : fieldData.value)
    : '';
  const isEmpty = !value;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1.6fr auto',
      gap: spacing[2],
      alignItems: 'start',
      padding: `${spacing[2]}px 0`,
      borderBottom: `1px solid ${withOpacity(colors.border, 30)}`,
    }}>
      {/* Spec Name — clickable to highlight source line */}
      <div
        onClick={() => onLineClick && fieldData?.lineIndex != null && onLineClick(fieldData.lineIndex)}
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: 600,
          color: isEmpty ? withOpacity(colors.textMuted, 60) : colors.textPrimary,
          paddingTop: 2,
          wordBreak: 'break-word',
          display: 'flex',
          alignItems: 'baseline',
          gap: 4,
          cursor: onLineClick && fieldData?.lineIndex != null ? 'pointer' : 'default',
        }}
        title={onLineClick && fieldData?.lineIndex != null ? 'Click to view in source' : undefined}
      >
        <span>{specName}</span>
        {isRequired && (
          <span style={{ color: colors.danger || '#f87171', fontSize: 10, fontWeight: 700 }}>*</span>
        )}
      </div>

      {/* Value + Dropdown */}
      <div style={{ position: 'relative' }}>
        {isEmpty ? (
          <span style={{
            fontSize: typography.fontSize.sm,
            color: withOpacity(colors.textMuted, 40),
            fontStyle: 'italic',
          }}>
            —
          </span>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary,
                wordBreak: 'break-word',
                flex: 1,
                minWidth: 0,
              }}>
                {value}
              </span>
              {/* Conflict badge */}
              {fieldData.hasConflict && !selectedValue && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: withOpacity(colors.danger || '#f87171', 15),
                  color: colors.danger || '#f87171',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  ⚠ Conflict
                </span>
              )}
              {/* Merged badge */}
              {fieldData.mergedCount && (
                <span style={{
                  display: 'inline-block',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: withOpacity(colors.primary, 15),
                  color: colors.primary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: '16px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  Combined ×{fieldData.mergedCount}
                </span>
              )}
              {/* Standard confidence badge */}
              {!fieldData.hasConflict && !fieldData.mergedCount && (
                <ConfidenceBadge confidence={fieldData.confidence} />
              )}
              {fieldData.hasConflict && !fieldData.mergedCount && selectedValue && (
                <ConfidenceBadge confidence={fieldData.confidence} />
              )}
              {hasAlts && (
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  style={{
                    background: withOpacity(colors.primary, 10),
                    border: `1px solid ${withOpacity(colors.primary, 30)}`,
                    borderRadius: borderRadius.sm,
                    cursor: 'pointer',
                    color: colors.primary,
                    padding: '1px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: typography.fontSize.xs,
                    gap: 3,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title={fieldData.hasConflict
                    ? `⚠ ${fieldData.alternatives.length} conflicting values — click to choose`
                    : `${fieldData.alternatives.length} options — click to choose`}
                >
                  {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  <span>{fieldData.alternatives.length} {fieldData.hasConflict ? 'conflicts' : 'options'}</span>
                </button>
              )}
            </div>
            {/* Validation warning */}
            {fieldData.validationWarning && (
              <div style={{
                fontSize: 11,
                color: colors.accent1 || '#facc15',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                ⚠
                <span>{fieldData.validationWarning}</span>
              </div>
            )}
            {/* Source key hint */}
            {fieldData.sourceKey && fieldData.sourceKey.toLowerCase() !== specName.toLowerCase() && (
              <div style={{
                fontSize: 11,
                color: withOpacity(colors.textMuted, 60),
                marginTop: 2,
              }}>
                matched from: <em>{fieldData.sourceKey}</em>
              </div>
            )}
            {/* Unit normalization hint */}
            {unitInfo && (
              <div style={{
                fontSize: 11,
                color: colors.primary,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                →
                <span>normalized: <strong>{unitInfo.normalized}</strong></span>
              </div>
            )}
            {/* Type coercion hint */}
            {coercionInfo && !unitInfo && (
              <div style={{
                fontSize: 11,
                color: withOpacity(colors.primary, 80),
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                →
                <span>suggestion: <strong>{coercionInfo.coerced}</strong></span>
              </div>
            )}
            {/* Alternatives dropdown */}
            {isOpen && hasAlts && (
              <div style={{
                marginTop: spacing[1],
                background: colors.bgMedium,
                border: `1px solid ${colors.border}`,
                borderRadius: borderRadius.md,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                {fieldData.alternatives.map((alt, i) => {
                  const isSelected = alt.value === value;
                  return (
                    <button
                      key={i}
                      onClick={() => { onSelect(specName, alt.value); setIsOpen(false); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: `${spacing[2]}px ${spacing[2]}px`,
                        border: 'none',
                        borderBottom: i < fieldData.alternatives.length - 1
                          ? `1px solid ${withOpacity(colors.border, 30)}`
                          : 'none',
                        background: isSelected ? `${withOpacity(colors.primary, 15)}` : 'transparent',
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        color: colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                      }}
                    >
                      {isSelected && <Check size={12} style={{ color: colors.primary, flexShrink: 0 }} />}
                      {!isSelected && <span style={{ width: 12, flexShrink: 0 }} />}
                      <span style={{ flex: 1, wordBreak: 'break-word' }}>{alt.value}</span>
                      <ConfidenceBadge confidence={alt.confidence} />
                      <span style={{
                        color: withOpacity(colors.textMuted, 60),
                        fontSize: 11,
                        flexShrink: 0,
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {alt.sourceKey}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear button */}
      {!isEmpty && (
        <button
          onClick={() => onClear(specName)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textMuted,
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            marginTop: 2,
            opacity: 0.6,
          }}
          title="Clear this field"
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}
