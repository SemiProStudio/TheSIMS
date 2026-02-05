// ============================================================================
// Smart Paste Modal
// Import product specs from pasted text, PDF, or TXT files
// ============================================================================

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, FileText, ChevronDown, ChevronUp, AlertCircle, Check, X as XIcon } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import {
  parseProductText,
  buildApplyPayload,
  readTextFile,
  readPdfFile,
} from '../lib/smartPasteParser.js';

// ============================================================================
// Confidence Badge
// ============================================================================
function ConfidenceBadge({ confidence }) {
  let color, label;
  if (confidence >= 85) {
    color = colors.available || '#4ade80';
    label = 'Direct';
  } else if (confidence >= 60) {
    color = colors.accent1 || '#facc15';
    label = 'Likely';
  } else {
    color = colors.textMuted;
    label = 'Fuzzy';
  }

  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 600,
      padding: '1px 6px',
      borderRadius: 4,
      background: `${withOpacity(color, 20)}`,
      color,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

// ============================================================================
// Field Row with dropdown alternatives
// ============================================================================
function FieldRow({ specName, fieldData, selectedValue, onSelect, onClear, isRequired }) {
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
      {/* Spec Name */}
      <div style={{
        fontSize: typography.fontSize.sm,
        fontWeight: 600,
        color: isEmpty ? withOpacity(colors.textMuted, 60) : colors.textPrimary,
        paddingTop: 2,
        wordBreak: 'break-word',
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
      }}>
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
              <ConfidenceBadge confidence={fieldData.confidence} />
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
                  title={`${fieldData.alternatives.length} options — click to choose`}
                >
                  {isOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  <span>{fieldData.alternatives.length} options</span>
                </button>
              )}
            </div>
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

// ============================================================================
// Smart Paste Modal Component
// ============================================================================
export const SmartPasteModal = memo(function SmartPasteModal({ specs, onApply, onClose }) {
  const [inputText, setInputText] = useState('');
  const [parseResult, setParseResult] = useState(null);
  const [selectedValues, setSelectedValues] = useState({});
  const [importStatus, setImportStatus] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showEmptyFields, setShowEmptyFields] = useState(true);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Build full list of spec field names across all categories
  const allSpecFields = specs ? [...new Set(
    Object.values(specs).flatMap(specList =>
      Array.isArray(specList) ? specList.map(s => s.name) : []
    )
  )] : [];

  // Build required fields set
  const requiredFields = new Set();
  if (specs) {
    Object.values(specs).forEach(specList => {
      if (!Array.isArray(specList)) return;
      specList.forEach(s => { if (s.required) requiredFields.add(s.name); });
    });
  }

  // Get fields for the detected category
  const getCategoryFields = useCallback((categoryName) => {
    if (!specs || !categoryName || !specs[categoryName]) return [];
    return specs[categoryName];
  }, [specs]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleParse = useCallback(() => {
    if (!inputText.trim()) return;
    const result = parseProductText(inputText, specs);
    setParseResult(result);
    setSelectedValues({});
    setImportStatus('');
  }, [inputText, specs]);

  const handleFileImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    try {
      let text;
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'pdf') {
        text = await readPdfFile(file);
      } else if (['txt', 'text', 'csv', 'tsv', 'md', 'rtf'].includes(ext)) {
        text = await readTextFile(file);
      } else {
        text = await readTextFile(file);
      }

      if (!text || !text.trim()) {
        setImportStatus('error:No text content found in file');
        return;
      }

      setInputText(text);
      setImportStatus(`success:Imported ${file.name} (${text.split('\n').length} lines)`);

      const result = parseProductText(text, specs);
      setParseResult(result);
      setSelectedValues({});
    } catch (err) {
      console.error('File import error:', err);
      setImportStatus(`error:${err.message || 'Failed to read file'}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [specs]);

  const handleSelectValue = useCallback((specName, value) => {
    setSelectedValues(prev => ({ ...prev, [specName]: value }));
  }, []);

  const handleClearField = useCallback((specName) => {
    setSelectedValues(prev => ({ ...prev, [specName]: '' }));
  }, []);

  const handleApply = useCallback(() => {
    if (!parseResult) return;
    const payload = buildApplyPayload(parseResult, selectedValues);
    onApply(payload);
    onClose();
  }, [parseResult, selectedValues, onApply, onClose]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const matchedCount = parseResult ? [...parseResult.fields.values()].filter(f => f.value).length : 0;
  const totalExtracted = parseResult ? parseResult.rawExtracted.length : 0;
  const unmatchedCount = parseResult ? parseResult.unmatchedPairs.length : 0;
  const altsCount = parseResult
    ? [...parseResult.fields.values()].filter(f => f.alternatives && f.alternatives.length > 1).length
    : 0;

  // Get category-specific spec fields if category detected
  const detectedCategory = parseResult?.category;
  const categorySpecFields = detectedCategory ? getCategoryFields(detectedCategory) : [];

  // Build ordered field list: category fields first (in order), then any extra matched fields
  const orderedFields = [];
  const addedNames = new Set();

  if (categorySpecFields.length > 0) {
    for (const spec of categorySpecFields) {
      const field = parseResult?.fields.get(spec.name);
      orderedFields.push({
        specName: spec.name,
        data: field || null,
        isRequired: spec.required || false,
      });
      addedNames.add(spec.name);
    }
  }

  // Add any matched fields not in the detected category
  if (parseResult) {
    for (const [specName, data] of parseResult.fields) {
      if (!addedNames.has(specName) && data.value) {
        orderedFields.push({ specName, data, isRequired: false });
        addedNames.add(specName);
      }
    }
  }

  // Separate into matched and empty
  const matchedFields = orderedFields.filter(f => {
    const override = selectedValues[f.specName];
    const val = override !== undefined ? override : f.data?.value;
    return val && val.trim();
  });
  const emptyFields = orderedFields.filter(f => {
    const override = selectedValues[f.specName];
    const val = override !== undefined ? override : f.data?.value;
    return !val || !val.trim();
  });

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Modal onClose={onClose} maxWidth={780}>
      <ModalHeader title="Smart Paste — Import Product Info" onClose={onClose} />
      <div style={{ padding: spacing[4], maxHeight: '80vh', overflowY: 'auto' }}>

        {/* Instructions */}
        <p style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, marginBottom: spacing[3], lineHeight: 1.5 }}>
          Paste product specifications from a retailer or manufacturer page, or import a PDF/text file.
          The parser extracts key-value pairs and matches them against your spec fields using
          direct lookups, abbreviation expansion, and fuzzy matching.
        </p>

        {/* Spec fields list — always visible */}
        {allSpecFields.length > 0 && (
          <div style={{
            marginBottom: spacing[3],
            padding: `${spacing[2]}px ${spacing[3]}px`,
            background: `${withOpacity(colors.primary, 5)}`,
            borderRadius: borderRadius.md,
            border: `1px solid ${withOpacity(colors.primary, 15)}`,
          }}>
            <div style={{
              fontSize: typography.fontSize.xs,
              fontWeight: 700,
              color: colors.primary,
              marginBottom: spacing[1],
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Matching against {allSpecFields.length} spec fields across all categories
            </div>
            <div style={{
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              lineHeight: 1.6,
              maxHeight: 100,
              overflowY: 'auto',
              columnCount: 3,
              columnGap: spacing[3],
            }}>
              {allSpecFields.map(name => (
                <div key={name} style={{
                  breakInside: 'avoid',
                  opacity: requiredFields.has(name) ? 1 : 0.7,
                }}>
                  {requiredFields.has(name) && <span style={{ color: colors.danger || '#f87171', marginRight: 2 }}>*</span>}
                  {name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Import + Input */}
        <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[2], alignItems: 'center' }}>
          <Button
            variant="secondary"
            icon={Upload}
            onClick={() => fileInputRef.current?.click()}
            style={{ flexShrink: 0 }}
          >
            Import File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.text,.csv,.tsv,.md,.rtf"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />
          <span style={{ fontSize: typography.fontSize.xs, color: colors.textMuted }}>
            PDF, TXT, CSV, TSV, Markdown, or RTF
          </span>
        </div>

        {/* Import status */}
        {importStatus && (
          <div style={{
            padding: `${spacing[1]}px ${spacing[2]}px`,
            marginBottom: spacing[2],
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.xs,
            background: importStatus.startsWith('error')
              ? `${withOpacity(colors.danger, 10)}`
              : importStatus.startsWith('success')
                ? `${withOpacity(colors.available || '#4ade80', 10)}`
                : `${withOpacity(colors.primary, 10)}`,
            color: importStatus.startsWith('error')
              ? colors.danger
              : importStatus.startsWith('success')
                ? (colors.available || '#4ade80')
                : colors.primary,
          }}>
            {importStatus.startsWith('loading') ? '⏳ Reading file...' :
             importStatus.startsWith('error:') ? `⚠ ${importStatus.slice(6)}` :
             importStatus.startsWith('success:') ? `✓ ${importStatus.slice(8)}` : importStatus}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={e => { setInputText(e.target.value); setParseResult(null); setImportStatus(''); }}
          placeholder={`Paste product text here, or import a file above...\n\nSupported formats:\n  Key: Value\n  Key → Value\n  Key\tValue  (tab-separated, e.g. from tables)\n  Key = Value\n  Key | Value\n\nHTML table content is automatically cleaned and converted.`}
          style={{
            ...styles.input,
            width: '100%',
            minHeight: 130,
            fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
            fontSize: typography.fontSize.sm,
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />

        {/* Parse button + summary */}
        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], marginBottom: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleParse} disabled={!inputText.trim()} icon={FileText}>
            Parse Text
          </Button>
          {parseResult && (
            <span style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
              Extracted <strong style={{ color: colors.textPrimary }}>{totalExtracted}</strong> pairs
              {' → '}<strong style={{ color: colors.primary }}>{matchedCount}</strong> matched
              {altsCount > 0 && (
                <>, <strong style={{ color: colors.accent1 || '#facc15' }}>{altsCount}</strong> with alternatives</>
              )}
              {unmatchedCount > 0 && (
                <>, <strong style={{ color: colors.textMuted }}>{unmatchedCount}</strong> unmatched</>
              )}
            </span>
          )}
        </div>

        {/* ================================================================= */}
        {/* Results */}
        {/* ================================================================= */}
        {parseResult && (
          <div style={{
            background: colors.bgLight,
            borderRadius: borderRadius.lg,
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
            marginBottom: spacing[3],
          }}>
            {/* Basic Info Section */}
            <div style={{
              padding: `${spacing[3]}px ${spacing[3]}px ${spacing[2]}px`,
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{
                fontSize: typography.fontSize.xs,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: colors.textMuted,
                marginBottom: spacing[2],
              }}>
                Basic Information
              </div>

              {[
                { label: 'Name', value: parseResult.name, key: 'name' },
                { label: 'Brand', value: parseResult.brand, key: 'brand' },
                { label: 'Category', value: parseResult.category, key: 'category' },
                { label: 'Price', value: parseResult.purchasePrice ? `$${parseResult.purchasePrice}` : '', key: 'price' },
              ].map(item => (
                <div key={item.key} style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: spacing[2],
                  padding: `${spacing[1]}px 0`,
                  fontSize: typography.fontSize.sm,
                }}>
                  <span style={{ fontWeight: 600, color: colors.textPrimary }}>{item.label}</span>
                  <span style={{
                    color: item.value ? colors.textSecondary : withOpacity(colors.textMuted, 40),
                    fontStyle: item.value ? 'normal' : 'italic',
                  }}>
                    {item.value || 'Not detected'}
                  </span>
                </div>
              ))}
            </div>

            {/* Matched Specs Section */}
            {matchedFields.length > 0 && (
              <div style={{ padding: `${spacing[3]}px` }}>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: colors.textMuted,
                  marginBottom: spacing[2],
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                }}>
                  <span>Matched Specifications ({matchedFields.length})</span>
                  <Check size={12} style={{ color: colors.available || '#4ade80' }} />
                </div>

                {matchedFields.map(({ specName, data, isRequired }) => (
                  <FieldRow
                    key={specName}
                    specName={specName}
                    fieldData={data}
                    selectedValue={selectedValues[specName]}
                    onSelect={handleSelectValue}
                    onClear={handleClearField}
                    isRequired={isRequired}
                  />
                ))}
              </div>
            )}

            {/* Empty fields section */}
            {emptyFields.length > 0 && (
              <div style={{
                padding: `${spacing[2]}px ${spacing[3]}px`,
                borderTop: `1px solid ${colors.border}`,
              }}>
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
                  {detectedCategory && <span style={{ fontWeight: 400, marginLeft: 4 }}>({detectedCategory})</span>}
                </button>
                {showEmptyFields && (
                  <div style={{
                    marginTop: spacing[1],
                    fontSize: typography.fontSize.xs,
                    color: withOpacity(colors.textMuted, 50),
                    lineHeight: 2,
                    columnCount: 2,
                    columnGap: spacing[4],
                  }}>
                    {emptyFields.map(({ specName, isRequired }) => (
                      <div key={specName} style={{ breakInside: 'avoid', display: 'flex', gap: 4 }}>
                        <span style={{ opacity: 0.5 }}>—</span>
                        <span>{specName}</span>
                        {isRequired && <span style={{ color: colors.danger || '#f87171' }}>*</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Unmatched pairs */}
            {parseResult.unmatchedPairs.length > 0 && (
              <div style={{
                padding: `${spacing[2]}px ${spacing[3]}px`,
                borderTop: `1px solid ${colors.border}`,
              }}>
                <button
                  onClick={() => setShowUnmatched(!showUnmatched)}
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
                  <AlertCircle size={12} />
                  {showUnmatched ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {parseResult.unmatchedPairs.length} extracted but not matched to any spec
                </button>
                {showUnmatched && (
                  <div style={{
                    marginTop: spacing[2],
                    fontSize: typography.fontSize.sm,
                    color: colors.textMuted,
                    lineHeight: 1.6,
                  }}>
                    {parseResult.unmatchedPairs.map((pair, i) => (
                      <div key={i} style={{
                        padding: `3px 0`,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1.5fr',
                        gap: spacing[2],
                      }}>
                        <span style={{ fontWeight: 600, color: colors.textSecondary }}>{pair.key}</span>
                        <span style={{ color: withOpacity(colors.textMuted, 70) }}>{pair.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!parseResult || matchedCount === 0}>
            Apply {matchedCount > 0 ? `${matchedCount} Fields` : ''} to Form
          </Button>
        </div>
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
SmartPasteModal.propTypes = {
  specs: PropTypes.object,
  onApply: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
