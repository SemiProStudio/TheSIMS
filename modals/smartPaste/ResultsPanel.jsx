// ============================================================================
// Smart Paste — Results Panel
// Basic info, matched specs, and empty fields sections
// ============================================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X as XIcon } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../../theme.js';
import { BasicInfoRow } from './BasicInfoRow.jsx';
import { Select } from '../../components/Select.jsx';
import { FieldRow } from './FieldRow.jsx';

export function ResultsPanel({
  parseResult,
  matchedFields,
  emptyFields,
  selectedValues,
  onSelectValue,
  onClearField,
  onHighlightLine,
  normalizeMetric,
  normalizeUnits,
  coerceFieldValue,
  brandOverride,
  setBrandOverride,
  categoryOverride,
  setCategoryOverride,
  defaultCategory,
  availableCategories,
  showSourceView,
}) {
  const [showEmptyFields, setShowEmptyFields] = useState(true);
  // defaultCategory already encodes the precedence (host form category wins
  // over parser detection); fall back to raw detection for older callers.
  const fallbackCategory = defaultCategory ?? (parseResult?.category || '');
  const detectedCategory = categoryOverride !== null ? categoryOverride : fallbackCategory;

  return (
    <div
      style={{
        background: colors.bgLight,
        borderRadius: borderRadius.lg,
        border: `1px solid ${colors.border}`,
        overflow: 'hidden',
        maxHeight: showSourceView ? 600 : 'none',
        overflowY: showSourceView ? 'auto' : 'visible',
      }}
    >
      {/* Basic Info Section — editable brand/category */}
      <div
        style={{
          padding: `${spacing[3]}px ${spacing[3]}px ${spacing[2]}px`,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.textMuted,
            marginBottom: spacing[2],
          }}
        >
          Basic Information
        </div>

        {/* Name — read only */}
        <BasicInfoRow label="Name" value={parseResult.name} />

        {/* Brand — editable */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr',
            gap: spacing[2],
            padding: `${spacing[1]}px 0`,
            fontSize: typography.fontSize.sm,
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, color: colors.textPrimary }}>Brand</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <input
              type="text"
              value={brandOverride !== null ? brandOverride : parseResult.brand || ''}
              onChange={(e) => setBrandOverride(e.target.value)}
              placeholder="Not detected — type to set"
              style={{
                ...styles.input,
                fontSize: typography.fontSize.sm,
                padding: `2px ${spacing[2]}px`,
                flex: 1,
                minWidth: 0,
              }}
            />
            {brandOverride !== null && brandOverride !== parseResult.brand && (
              <button
                onClick={() => setBrandOverride(null)}
                title="Reset to detected"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.textMuted,
                  padding: 2,
                  display: 'flex',
                }}
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Category — editable dropdown */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr',
            gap: spacing[2],
            padding: `${spacing[1]}px 0`,
            fontSize: typography.fontSize.sm,
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600, color: colors.textPrimary }}>Category</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
            <Select
              value={detectedCategory || ''}
              onChange={(e) => setCategoryOverride(e.target.value || null)}
              options={[
                { value: '', label: 'Not detected' },
                ...availableCategories.map((cat) => ({ value: cat, label: cat })),
              ]}
              compact
              style={{ flex: 1, minWidth: 0 }}
              aria-label="Category"
            />
            {categoryOverride !== null && categoryOverride !== fallbackCategory && (
              <button
                onClick={() => setCategoryOverride(null)}
                title="Reset"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: colors.textMuted,
                  padding: 2,
                  display: 'flex',
                }}
              >
                <XIcon size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Detection differs from the effective category — offer, don't impose */}
        {parseResult.category && parseResult.category !== detectedCategory && (
          <div
            style={{
              gridColumn: '1 / -1',
              paddingLeft: 80 + spacing[2],
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
            }}
          >
            Detected: {parseResult.category}{' '}
            <button
              onClick={() => setCategoryOverride(parseResult.category)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: colors.primary,
                fontSize: typography.fontSize.xs,
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              use detected
            </button>
          </div>
        )}

        {/* Price, Model, Serial — read only */}
        <BasicInfoRow
          label="Price"
          value={
            parseResult.purchasePrice
              ? `$${parseResult.purchasePrice}${parseResult.priceNote ? ` (${parseResult.priceNote})` : ''}`
              : ''
          }
        />
        {parseResult.modelNumber && (
          <BasicInfoRow label="Model #" value={parseResult.modelNumber} />
        )}
        {parseResult.serialNumber && (
          <BasicInfoRow label="Serial #" value={parseResult.serialNumber} />
        )}
      </div>

      {/* Matched Specs Section */}
      {matchedFields.length > 0 && (
        <div style={{ padding: `${spacing[3]}px` }}>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: colors.textMuted,
              marginBottom: spacing[2],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            <span>Matched Specifications ({matchedFields.length})</span>
            <Check size={12} style={{ color: colors.available }} />
          </div>

          {matchedFields.map(({ specName, data, isRequired }) => {
            const currentVal =
              selectedValues[specName] !== undefined ? selectedValues[specName] : data?.value;
            const unitInfo =
              normalizeMetric && currentVal ? normalizeUnits(currentVal, normalizeMetric) : null;
            const coercionInfo = currentVal ? coerceFieldValue(specName, currentVal) : null;
            return (
              <FieldRow
                key={specName}
                specName={specName}
                fieldData={data}
                selectedValue={selectedValues[specName]}
                onSelect={onSelectValue}
                onClear={onClearField}
                isRequired={isRequired}
                onLineClick={onHighlightLine}
                unitInfo={unitInfo}
                coercionInfo={coercionInfo}
              />
            );
          })}
        </div>
      )}

      {/* Empty fields section */}
      {emptyFields.length > 0 && (
        <div
          style={{
            padding: `${spacing[2]}px ${spacing[3]}px`,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <button
            onClick={() => setShowEmptyFields(!showEmptyFields)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.textMuted,
              fontSize: typography.fontSize.xs,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
              padding: `${spacing[1]}px 0`,
              fontWeight: 600,
            }}
          >
            {showEmptyFields ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {emptyFields.length} fields with no match
            {detectedCategory && (
              <span style={{ fontWeight: 400, marginLeft: 4 }}>({detectedCategory})</span>
            )}
          </button>
          {showEmptyFields && (
            <div
              style={{
                marginTop: spacing[1],
                fontSize: typography.fontSize.xs,
                color: withOpacity(colors.textMuted, 50),
                lineHeight: 2,
                columnCount: 2,
                columnGap: spacing[4],
              }}
            >
              {emptyFields.map(({ specName, isRequired }) => (
                <div key={specName} style={{ breakInside: 'avoid', display: 'flex', gap: 4 }}>
                  <span style={{ opacity: 0.5 }}>—</span>
                  <span>{specName}</span>
                  {isRequired && <span style={{ color: colors.danger }}>*</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
