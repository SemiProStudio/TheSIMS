// ============================================================================
// Smart Paste Modal
// Import product specs from pasted text, PDF, or TXT files
// ============================================================================

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Upload, FileText, ChevronDown, ChevronUp, AlertCircle, Check, X as XIcon, Edit2, AlertTriangle, Clock, Columns, ArrowRight, Link2, Layers, GitCompare } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import {
  parseProductText,
  buildApplyPayload,
  readTextFile,
  readPdfFile,
  cleanInputText,
  normalizeUnits,
  coerceFieldValue,
  detectProductBoundaries,
  parseBatchProducts,
  fetchProductPage,
  diffSpecs,
  recordAlias,
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
// Basic Info Row (read-only)
// ============================================================================
function BasicInfoRow({ label, value }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 1fr',
      gap: spacing[2],
      padding: `${spacing[1]}px 0`,
      fontSize: typography.fontSize.sm,
    }}>
      <span style={{ fontWeight: 600, color: colors.textPrimary }}>{label}</span>
      <span style={{
        color: value ? colors.textSecondary : withOpacity(colors.textMuted, 40),
        fontStyle: value ? 'normal' : 'italic',
      }}>
        {value || 'Not detected'}
      </span>
    </div>
  );
}

// ============================================================================
// Field Row with dropdown alternatives
// ============================================================================
function FieldRow({ specName, fieldData, selectedValue, onSelect, onClear, isRequired, onLineClick, unitInfo, coercionInfo }) {
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
      {/* Spec Name — clickable to highlight source line (3.3) */}
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
              {/* Conflict badge (4.3) */}
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
                  <AlertTriangle size={9} /> Conflict
                </span>
              )}
              {/* Merged badge (1.2) */}
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
            {/* Validation warning (4.2) */}
            {fieldData.validationWarning && (
              <div style={{
                fontSize: 11,
                color: colors.accent1 || '#facc15',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <AlertTriangle size={10} />
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
            {/* Unit normalization hint (4.1) */}
            {unitInfo && (
              <div style={{
                fontSize: 11,
                color: colors.primary,
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <ArrowRight size={9} />
                <span>normalized: <strong>{unitInfo.normalized}</strong></span>
              </div>
            )}
            {/* Type coercion hint (4.4) */}
            {coercionInfo && !unitInfo && (
              <div style={{
                fontSize: 11,
                color: withOpacity(colors.primary, 80),
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <ArrowRight size={9} />
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

// ============================================================================
// Smart Paste Modal Component
// ============================================================================
export const SmartPasteModal = memo(function SmartPasteModal({ specs, onApply, onClose, existingItem }) {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState('paste'); // 'paste' | 'file' | 'url'
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [selectedValues, setSelectedValues] = useState({});
  const [importStatus, setImportStatus] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showEmptyFields, setShowEmptyFields] = useState(true);
  const [confidenceMode, setConfidenceMode] = useState('balanced'); // 'strict' | 'balanced' | 'aggressive'
  const [manualMappings, setManualMappings] = useState({}); // { unmatchedIndex: specName }
  const [brandOverride, setBrandOverride] = useState(null); // null = use detected
  const [categoryOverride, setCategoryOverride] = useState(null); // null = use detected
  const [showSourceView, setShowSourceView] = useState(false); // side-by-side source (3.3)
  const [highlightedLine, setHighlightedLine] = useState(null); // highlighted source line (3.3)
  const [normalizeMetric, setNormalizeMetric] = useState(true); // unit normalization toggle (4.1)
  const [batchResults, setBatchResults] = useState(null); // batch import results (5.1)
  const [batchSelected, setBatchSelected] = useState(new Set()); // selected products for batch import
  const [urlInput, setUrlInput] = useState(''); // URL import (2.1)
  const [urlLoading, setUrlLoading] = useState(false);
  const [diffResults, setDiffResults] = useState(null); // re-import diff (5.2)
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const sourceRef = useRef(null);

  const confidenceThresholds = { strict: 85, balanced: 60, aggressive: 50 };

  // Paste history (3.4) — stored in sessionStorage
  const HISTORY_KEY = 'sims_smart_paste_history';
  const MAX_HISTORY = 5;

  const getPasteHistory = useCallback(() => {
    try {
      return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  }, []);

  const savePasteHistory = useCallback((text, resultSummary) => {
    try {
      const history = getPasteHistory();
      const entry = {
        text: text.slice(0, 500), // truncate for storage
        fullText: text,
        matchedCount: resultSummary.matchedCount,
        name: resultSummary.name || 'Unknown product',
        timestamp: Date.now(),
      };
      // Deduplicate by text content
      const filtered = history.filter(h => h.text !== entry.text);
      filtered.unshift(entry);
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
    } catch { /* sessionStorage full or unavailable */ }
  }, [getPasteHistory]);

  const [pasteHistory, setPasteHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (inputMode === 'paste') textareaRef.current?.focus();
  }, [inputMode]);

  // Build full list of spec field names across all categories
  const allSpecFields = specs ? [...new Set(
    Object.values(specs).flatMap(specList =>
      Array.isArray(specList) ? specList.map(s => s.name) : []
    )
  )] : [];

  // Available categories for the override dropdown (3.2)
  const availableCategories = specs ? Object.keys(specs).sort() : [];

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

    // Check for multi-product content (5.1)
    const segments = detectProductBoundaries(inputText);
    if (segments.length > 1) {
      const batch = parseBatchProducts(inputText, specs);
      setBatchResults(batch);
      setBatchSelected(new Set(batch.map((_, i) => i)));
      setParseResult(null);
      setSelectedValues({});
      setManualMappings({});
      setBrandOverride(null);
      setCategoryOverride(null);
      setHighlightedLine(null);
      setDiffResults(null);
      setImportStatus(`Detected ${batch.length} products`);
      return;
    }

    // Single product
    setBatchResults(null);
    setDiffResults(null);
    const result = parseProductText(inputText, specs);
    setParseResult(result);
    setSelectedValues({});
    setManualMappings({});
    setBrandOverride(null);
    setCategoryOverride(null);
    setHighlightedLine(null);
    setImportStatus('');
    // Save to paste history (3.4)
    const matchCount = [...result.fields.values()].filter(f => f.value).length;
    savePasteHistory(inputText, { matchedCount: matchCount, name: result.name });
    setPasteHistory(getPasteHistory());
  }, [inputText, specs, savePasteHistory, getPasteHistory]);

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
      setManualMappings({});
      setBrandOverride(null);
      setCategoryOverride(null);
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

  // Manual mapping handler (1.1)
  const handleManualMapping = useCallback((unmatchedIdx, specName, value) => {
    setManualMappings(prev => {
      const next = { ...prev };
      if (!specName) {
        delete next[unmatchedIdx];
      } else {
        next[unmatchedIdx] = specName;
      }
      return next;
    });
    // Also store the value in selectedValues under _manualMappings
    setSelectedValues(prev => {
      const mappings = { ...(prev._manualMappings || {}) };
      if (!specName) {
        // Find and remove old mapping for this index
        for (const [key, val] of Object.entries(prev)) {
          if (key === '_manualMappings') continue;
        }
      } else {
        mappings[specName] = value;
      }
      return { ...prev, _manualMappings: mappings };
    });
  }, []);

  // Restore from paste history (3.4)
  const handleRestoreHistory = useCallback((entry) => {
    setInputText(entry.fullText || entry.text);
    setParseResult(null);
    setSelectedValues({});
    setManualMappings({});
    setBrandOverride(null);
    setCategoryOverride(null);
    setImportStatus(`Restored: ${entry.name}`);
  }, []);

  // Highlight source line from field click (3.3)
  const handleHighlightLine = useCallback((lineIndex) => {
    setHighlightedLine(lineIndex);
    setShowSourceView(true);
    // Scroll to the line in the source panel
    setTimeout(() => {
      const el = document.getElementById(`source-line-${lineIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  // Clipboard HTML preservation (2.2) — intercept paste and prefer text/html
  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check if HTML is available (browser copy often includes rich HTML)
    if (clipboardData.types.includes('text/html')) {
      e.preventDefault();
      const html = clipboardData.getData('text/html');
      const cleaned = cleanInputText(html);
      // If HTML cleaning produced more structured content, use it
      const plainText = clipboardData.getData('text/plain');
      const htmlLines = cleaned.split('\n').filter(l => l.trim()).length;
      const plainLines = plainText.split('\n').filter(l => l.trim()).length;
      // Use HTML version if it has more structure (more tab-separated lines)
      const htmlTabLines = cleaned.split('\n').filter(l => l.includes('\t')).length;
      const plainTabLines = plainText.split('\n').filter(l => l.includes('\t')).length;
      const useHtml = htmlTabLines > plainTabLines || htmlLines >= plainLines;
      const text = useHtml ? cleaned : plainText;
      setInputText(text);
      setParseResult(null);
      setImportStatus(useHtml ? 'HTML table structure preserved from clipboard' : '');
    }
    // Otherwise, let the default paste behavior happen
  }, []);

  const handleApply = useCallback(() => {
    if (!parseResult) return;
    const payload = buildApplyPayload(parseResult, selectedValues);
    // Apply brand/category overrides (3.2)
    if (brandOverride !== null) payload.brand = brandOverride;
    if (categoryOverride !== null) payload.category = categoryOverride;
    onApply(payload);
    onClose();
  }, [parseResult, selectedValues, brandOverride, categoryOverride, onApply, onClose]);

  // Batch apply — sends selected products (5.1)
  const handleBatchApply = useCallback(() => {
    if (!batchResults) return;
    const selected = batchResults
      .filter((_, i) => batchSelected.has(i))
      .map(({ result }) => buildApplyPayload(result, {}));
    if (selected.length > 0) {
      // onApply receives either a single payload or an array for batch
      onApply(selected.length === 1 ? selected[0] : selected);
      onClose();
    }
  }, [batchResults, batchSelected, onApply, onClose]);

  // Select a single batch product to view/edit in detail
  const handleBatchSelectSingle = useCallback((index) => {
    if (!batchResults?.[index]) return;
    const { result } = batchResults[index];
    setParseResult(result);
    setBatchResults(null);
    setSelectedValues({});
    setManualMappings({});
    setBrandOverride(null);
    setCategoryOverride(null);
    setImportStatus(`Viewing: ${result.name || `Product ${index + 1}`}`);
  }, [batchResults]);

  // URL fetch handler (2.1)
  const handleUrlFetch = useCallback(async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setImportStatus('');
    try {
      // Attempt to use the Edge Function proxy
      // For now this will fail gracefully if not configured
      const proxyUrl = null; // TODO: Configure from environment/settings
      const { text } = await fetchProductPage(urlInput, proxyUrl);
      setInputText(text);
      setInputMode('paste');
      setImportStatus(`Fetched content from ${urlInput}`);
    } catch (e) {
      setImportStatus(`⚠ ${e.message}`);
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput]);

  // Diff against existing item (5.2)
  const handleDiffExisting = useCallback((existingSpecs) => {
    if (!parseResult) return;
    const diff = diffSpecs(existingSpecs, parseResult.fields);
    setDiffResults(diff);
  }, [parseResult]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------
  const threshold = confidenceThresholds[confidenceMode] || 60;

  // Filter fields by confidence threshold (3.1)
  const filteredFields = parseResult ? new Map(
    [...parseResult.fields.entries()].filter(([, data]) => data.confidence >= threshold)
  ) : new Map();

  const matchedCount = filteredFields.size + Object.keys(manualMappings).length;
  const totalExtracted = parseResult ? parseResult.rawExtracted.length : 0;
  const unmatchedCount = parseResult ? parseResult.unmatchedPairs.length : 0;
  const altsCount = parseResult
    ? [...filteredFields.values()].filter(f => f.alternatives && f.alternatives.length > 1).length
    : 0;

  // Get category-specific spec fields if category detected (respects override — 3.2)
  const detectedCategory = categoryOverride !== null ? categoryOverride : parseResult?.category;
  const categorySpecFields = detectedCategory ? getCategoryFields(detectedCategory) : [];

  // Build ordered field list: category fields first (in order), then any extra matched fields
  const orderedFields = [];
  const addedNames = new Set();

  if (categorySpecFields.length > 0) {
    for (const spec of categorySpecFields) {
      const field = filteredFields.get(spec.name);
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
    for (const [specName, data] of filteredFields) {
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

  // Build list of spec fields available for manual mapping (1.1)
  const mappedSpecNames = new Set([
    ...matchedFields.map(f => f.specName),
    ...Object.values(manualMappings),
  ]);
  const unmappedSpecOptions = allSpecFields.filter(name => !mappedSpecNames.has(name)).sort();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <Modal onClose={onClose} maxWidth={showSourceView ? 1200 : 780}>
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

        {/* Input Method Tabs */}
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: 0,
          borderBottom: `2px solid ${colors.border}`,
        }}>
          {[
            { key: 'paste', label: 'Paste Text', icon: '📋' },
            { key: 'file', label: 'Import File', icon: '📁' },
            { key: 'url', label: 'From URL', icon: '🔗' },
          ].map(tab => {
            const isActive = inputMode === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setInputMode(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive
                    ? `2px solid ${colors.primary}`
                    : '2px solid transparent',
                  marginBottom: -2,
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? colors.primary : colors.textMuted,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Import status */}
        {importStatus && (
          <div style={{
            padding: `${spacing[2]}px ${spacing[3]}px`,
            marginTop: spacing[2],
            borderRadius: borderRadius.sm,
            fontSize: typography.fontSize.sm,
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

        {/* Paste Text tab */}
        {inputMode === 'paste' && (
          <div style={{ marginTop: spacing[2] }}>
            {/* Paste history (3.4) */}
            {pasteHistory.length > 0 && !inputText && (
              <div style={{
                marginBottom: spacing[2],
                padding: `${spacing[2]}px ${spacing[3]}px`,
                background: withOpacity(colors.bgMedium, 50),
                borderRadius: borderRadius.md,
                border: `1px solid ${withOpacity(colors.border, 30)}`,
              }}>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: 600,
                  color: colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  marginBottom: spacing[1],
                }}>
                  <Clock size={11} />
                  Recent Imports
                </div>
                {pasteHistory.map((entry, i) => (
                  <button
                    key={i}
                    onClick={() => handleRestoreHistory(entry)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      textAlign: 'left',
                      padding: `${spacing[1]}px ${spacing[2]}px`,
                      border: 'none',
                      borderRadius: borderRadius.sm,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: typography.fontSize.xs,
                      color: colors.textSecondary,
                      gap: spacing[2],
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </span>
                    <span style={{ color: colors.primary, fontWeight: 600, flexShrink: 0 }}>
                      {entry.matchedCount} fields
                    </span>
                    <span style={{ color: withOpacity(colors.textMuted, 50), flexShrink: 0 }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={e => { setInputText(e.target.value); setParseResult(null); setImportStatus(''); setManualMappings({}); }}
              onPaste={handlePaste}
              placeholder={`Paste product specifications here...\n\nSupported formats:\n  Key: Value\n  Key → Value\n  Key\tValue  (tab-separated)\n  Key = Value\n  Key | Value\n\nHTML table content is automatically cleaned.\nTip: Copy from a web page to preserve table structure.`}
              style={{
                ...styles.input,
                width: '100%',
                minHeight: 150,
                fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
                fontSize: typography.fontSize.sm,
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>
        )}

        {/* Import File tab */}
        {inputMode === 'file' && (
          <div style={{ marginTop: spacing[2] }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) handleFileImport({ target: { files: [file] } });
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? colors.primary : colors.border}`,
                borderRadius: borderRadius.lg,
                padding: `${spacing[6]}px ${spacing[4]}px`,
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver
                  ? withOpacity(colors.primary, 8)
                  : withOpacity(colors.bgMedium, 50),
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <Upload size={32} style={{
                color: dragOver ? colors.primary : colors.textMuted,
                margin: '0 auto',
                display: 'block',
                marginBottom: spacing[2],
                opacity: 0.6,
              }} />
              <div style={{
                fontSize: typography.fontSize.base,
                fontWeight: 600,
                color: colors.textPrimary,
                marginBottom: spacing[1],
              }}>
                Drop a file here or click to browse
              </div>
              <div style={{
                fontSize: typography.fontSize.sm,
                color: colors.textMuted,
              }}>
                PDF, TXT, CSV, TSV, Markdown, or RTF
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.text,.csv,.tsv,.md,.rtf"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />

            {/* Show imported text preview if file was loaded */}
            {inputText && (
              <div style={{ marginTop: spacing[2] }}>
                <div style={{
                  fontSize: typography.fontSize.xs,
                  fontWeight: 600,
                  color: colors.textMuted,
                  marginBottom: spacing[1],
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Imported Content Preview
                </div>
                <div style={{
                  ...styles.input,
                  width: '100%',
                  maxHeight: 120,
                  overflowY: 'auto',
                  fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
                  fontSize: typography.fontSize.xs,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  color: colors.textMuted,
                  padding: spacing[2],
                }}>
                  {inputText.slice(0, 2000)}{inputText.length > 2000 ? '\n...' : ''}
                </div>
              </div>
            )}
          </div>
        )}

        {/* URL Import tab (2.1) */}
        {inputMode === 'url' && (
          <div style={{ marginTop: spacing[2] }}>
            <div style={{
              fontSize: typography.fontSize.xs,
              color: colors.textMuted,
              marginBottom: spacing[2],
            }}>
              Enter a product page URL to fetch specs automatically.
              <br />
              <span style={{ color: withOpacity(colors.accent1 || '#facc15', 80) }}>
                ⚠ Requires CORS proxy Edge Function (not yet configured)
              </span>
            </div>
            <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
              <input
                type="url"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="https://www.bhphotovideo.com/c/product/..."
                style={{
                  ...styles.input,
                  flex: 1,
                  fontSize: typography.fontSize.sm,
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                }}
              />
              <Button
                variant="secondary"
                onClick={handleUrlFetch}
                disabled={!urlInput.trim() || urlLoading}
                icon={Link2}
              >
                {urlLoading ? 'Fetching...' : 'Fetch'}
              </Button>
            </div>
          </div>
        )}

        {/* Parse button + summary */}
        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], marginBottom: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleParse} disabled={!inputText.trim()} icon={FileText}>
            Parse Text
          </Button>
          {/* Batch results indicator (5.1) */}
          {batchResults && (
            <span style={{ fontSize: typography.fontSize.sm, color: colors.primary, fontWeight: 600 }}>
              <Layers size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              {batchResults.length} products detected
            </span>
          )}
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

        {/* Confidence threshold control (3.1) */}
        {parseResult && (
          <div style={{
            display: 'flex',
            gap: spacing[1],
            marginBottom: spacing[3],
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: typography.fontSize.xs,
              fontWeight: 600,
              color: colors.textMuted,
              marginRight: spacing[1],
            }}>
              Match Confidence:
            </span>
            {[
              { key: 'strict', label: 'Strict', desc: '≥85 — only high-confidence matches' },
              { key: 'balanced', label: 'Balanced', desc: '≥60 — recommended for most input' },
              { key: 'aggressive', label: 'Aggressive', desc: '≥50 — catch more at lower accuracy' },
            ].map(mode => {
              const isActive = confidenceMode === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => setConfidenceMode(mode.key)}
                  title={mode.desc}
                  style={{
                    padding: `3px ${spacing[2]}px`,
                    fontSize: typography.fontSize.xs,
                    fontWeight: isActive ? 700 : 500,
                    border: `1px solid ${isActive ? colors.primary : withOpacity(colors.border, 50)}`,
                    borderRadius: borderRadius.sm,
                    background: isActive ? withOpacity(colors.primary, 15) : 'transparent',
                    color: isActive ? colors.primary : colors.textMuted,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {mode.label}
                </button>
              );
            })}

            {/* Spacer */}
            <span style={{ flex: 1 }} />

            {/* Unit normalization toggle (4.1) */}
            <button
              onClick={() => setNormalizeMetric(prev => !prev)}
              title={normalizeMetric ? 'Showing metric conversions' : 'Unit normalization off'}
              style={{
                padding: `3px ${spacing[2]}px`,
                fontSize: typography.fontSize.xs,
                fontWeight: normalizeMetric ? 700 : 500,
                border: `1px solid ${normalizeMetric ? colors.primary : withOpacity(colors.border, 50)}`,
                borderRadius: borderRadius.sm,
                background: normalizeMetric ? withOpacity(colors.primary, 15) : 'transparent',
                color: normalizeMetric ? colors.primary : colors.textMuted,
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              Units
            </button>

            {/* Source view toggle (3.3) */}
            <button
              onClick={() => setShowSourceView(prev => !prev)}
              title={showSourceView ? 'Hide source text' : 'Show source text alongside results'}
              style={{
                padding: `3px ${spacing[2]}px`,
                fontSize: typography.fontSize.xs,
                fontWeight: showSourceView ? 700 : 500,
                border: `1px solid ${showSourceView ? colors.primary : withOpacity(colors.border, 50)}`,
                borderRadius: borderRadius.sm,
                background: showSourceView ? withOpacity(colors.primary, 15) : 'transparent',
                color: showSourceView ? colors.primary : colors.textMuted,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <Columns size={11} /> Source
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* Batch Product Selection (5.1) */}
        {/* ================================================================= */}
        {batchResults && (
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
                <Layers size={12} />
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
                    onClick={() => handleBatchSelectSingle(i)}
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
                onClick={handleBatchApply}
                disabled={batchSelected.size === 0}
              >
                Import {batchSelected.size} Product{batchSelected.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Results (with optional source view — 3.3) */}
        {/* ================================================================= */}
        {parseResult && (
          <div style={{
            display: showSourceView ? 'grid' : 'block',
            gridTemplateColumns: showSourceView ? '1fr 1fr' : '1fr',
            gap: showSourceView ? spacing[3] : 0,
            marginBottom: spacing[3],
          }}>
            {/* Source panel (3.3) */}
            {showSourceView && parseResult.sourceLines && (
              <div
                ref={sourceRef}
                style={{
                  background: colors.bgMedium,
                  borderRadius: borderRadius.lg,
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  maxHeight: 600,
                  overflowY: 'auto',
                }}
              >
                <div style={{
                  padding: `${spacing[2]}px ${spacing[3]}px`,
                  borderBottom: `1px solid ${colors.border}`,
                  position: 'sticky',
                  top: 0,
                  background: colors.bgMedium,
                  zIndex: 1,
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
                    <FileText size={11} />
                    Source Text ({parseResult.sourceLines.length} lines)
                  </div>
                </div>
                <div style={{ padding: `${spacing[1]}px 0` }}>
                  {parseResult.sourceLines.map((line, i) => {
                    // Check if this line was matched to any field
                    const isMatched = [...parseResult.fields.values()].some(f => f.lineIndex === i);
                    const isUnmatched = parseResult.unmatchedPairs.some(p => p.lineIndex === i);
                    const isHighlighted = highlightedLine === i;
                    return (
                      <div
                        key={i}
                        id={`source-line-${i}`}
                        style={{
                          padding: `1px ${spacing[3]}px`,
                          fontSize: 11,
                          fontFamily: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, monospace',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          background: isHighlighted
                            ? withOpacity(colors.primary, 20)
                            : isMatched
                              ? withOpacity(colors.available || '#4ade80', 8)
                              : 'transparent',
                          color: isMatched
                            ? colors.textSecondary
                            : isUnmatched
                              ? colors.textMuted
                              : withOpacity(colors.textMuted, 40),
                          borderLeft: isHighlighted
                            ? `3px solid ${colors.primary}`
                            : isMatched
                              ? `3px solid ${withOpacity(colors.available || '#4ade80', 40)}`
                              : isUnmatched
                                ? `3px solid ${withOpacity(colors.accent1 || '#facc15', 30)}`
                                : '3px solid transparent',
                          transition: 'background 0.3s, border-color 0.3s',
                        }}
                      >
                        {line || '\u00A0'}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results panel */}
            <div style={{
              background: colors.bgLight,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border}`,
              overflow: 'hidden',
              maxHeight: showSourceView ? 600 : 'none',
              overflowY: showSourceView ? 'auto' : 'visible',
            }}>
            {/* Basic Info Section — editable brand/category (3.2) */}
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

              {/* Name — read only */}
              <BasicInfoRow label="Name" value={parseResult.name} />

              {/* Brand — editable (3.2) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: spacing[2],
                padding: `${spacing[1]}px 0`,
                fontSize: typography.fontSize.sm,
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>Brand</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <input
                    type="text"
                    value={brandOverride !== null ? brandOverride : (parseResult.brand || '')}
                    onChange={e => setBrandOverride(e.target.value)}
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
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.textMuted, padding: 2, display: 'flex',
                      }}
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category — editable dropdown (3.2) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: spacing[2],
                padding: `${spacing[1]}px 0`,
                fontSize: typography.fontSize.sm,
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 600, color: colors.textPrimary }}>Category</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}>
                  <select
                    value={categoryOverride !== null ? categoryOverride : (parseResult.category || '')}
                    onChange={e => setCategoryOverride(e.target.value || null)}
                    style={{
                      ...styles.input,
                      fontSize: typography.fontSize.sm,
                      padding: `2px ${spacing[2]}px`,
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                      color: (categoryOverride || parseResult.category) ? colors.textSecondary : withOpacity(colors.textMuted, 40),
                    }}
                  >
                    <option value="">Not detected</option>
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {categoryOverride !== null && categoryOverride !== parseResult.category && (
                    <button
                      onClick={() => setCategoryOverride(null)}
                      title="Reset to detected"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: colors.textMuted, padding: 2, display: 'flex',
                      }}
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Price, Model, Serial — read only */}
              <BasicInfoRow
                label="Price"
                value={parseResult.purchasePrice ? `$${parseResult.purchasePrice}${parseResult.priceNote ? ` (${parseResult.priceNote})` : ''}` : ''}
              />
              {parseResult.modelNumber && <BasicInfoRow label="Model #" value={parseResult.modelNumber} />}
              {parseResult.serialNumber && <BasicInfoRow label="Serial #" value={parseResult.serialNumber} />}
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

                {matchedFields.map(({ specName, data, isRequired }) => {
                  const currentVal = selectedValues[specName] !== undefined ? selectedValues[specName] : data?.value;
                  const unitInfo = normalizeMetric && currentVal ? normalizeUnits(currentVal, normalizeMetric) : null;
                  const coercionInfo = currentVal ? coerceFieldValue(specName, currentVal) : null;
                  return (
                    <FieldRow
                      key={specName}
                      specName={specName}
                      fieldData={data}
                      selectedValue={selectedValues[specName]}
                      onSelect={handleSelectValue}
                      onClear={handleClearField}
                      isRequired={isRequired}
                      onLineClick={handleHighlightLine}
                      unitInfo={unitInfo}
                      coercionInfo={coercionInfo}
                    />
                  );
                })}
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

            {/* Unmatched pairs with manual mapping (1.1) */}
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
                  {parseResult.unmatchedPairs.length} extracted but not matched
                  {Object.keys(manualMappings).length > 0 && (
                    <span style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: withOpacity(colors.primary, 15),
                      color: colors.primary,
                    }}>
                      {Object.keys(manualMappings).length} mapped
                    </span>
                  )}
                </button>
                {showUnmatched && (
                  <div style={{
                    marginTop: spacing[2],
                    fontSize: typography.fontSize.sm,
                    color: colors.textMuted,
                    lineHeight: 1.6,
                  }}>
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      color: withOpacity(colors.textMuted, 60),
                      marginBottom: spacing[2],
                      fontStyle: 'italic',
                    }}>
                      Use the dropdowns to manually assign unmatched pairs to spec fields.
                    </div>
                    {parseResult.unmatchedPairs.map((pair, i) => {
                      const mappedTo = manualMappings[i];
                      return (
                        <div key={i} style={{
                          padding: `4px 0`,
                          display: 'grid',
                          gridTemplateColumns: '1fr 1.2fr 1fr',
                          gap: spacing[2],
                          alignItems: 'center',
                          borderBottom: `1px solid ${withOpacity(colors.border, 20)}`,
                        }}>
                          <span style={{ fontWeight: 600, color: colors.textSecondary }}>{pair.key}</span>
                          <span style={{ color: withOpacity(colors.textMuted, 70) }}>{pair.value}</span>
                          <select
                            value={mappedTo || ''}
                            onChange={e => handleManualMapping(i, e.target.value, pair.value)}
                            style={{
                              ...styles.input,
                              fontSize: typography.fontSize.xs,
                              padding: `2px ${spacing[1]}px`,
                              color: mappedTo ? colors.primary : colors.textMuted,
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">— Assign to field —</option>
                            {unmappedSpecOptions.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Diff View (5.2) — shown when comparing against existing item */}
        {/* ================================================================= */}
        {diffResults && (
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
              fontSize: typography.fontSize.xs,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: spacing[1],
            }}>
              <GitCompare size={12} />
              Spec Changes ({diffResults.filter(d => d.status !== 'unchanged').length} differences)
            </div>
            {diffResults.map(({ specName, status, oldValue, newValue }) => {
              const statusColors = {
                changed: colors.accent1 || '#facc15',
                added: colors.available || '#4ade80',
                removed: colors.danger || '#f87171',
                unchanged: withOpacity(colors.textMuted, 40),
              };
              const statusLabels = { changed: '~', added: '+', removed: '-', unchanged: '=' };
              if (status === 'unchanged') return null; // Skip unchanged in diff view
              return (
                <div key={specName} style={{
                  padding: `${spacing[1]}px ${spacing[3]}px`,
                  borderBottom: `1px solid ${withOpacity(colors.border, 20)}`,
                  display: 'grid',
                  gridTemplateColumns: '24px 1fr 1fr',
                  gap: spacing[2],
                  fontSize: typography.fontSize.xs,
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontWeight: 700,
                    color: statusColors[status],
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}>{statusLabels[status]}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: colors.textPrimary }}>{specName}</div>
                    {oldValue && (
                      <div style={{
                        color: status === 'changed' ? colors.danger || '#f87171' : colors.textMuted,
                        textDecoration: status === 'changed' ? 'line-through' : 'none',
                      }}>{oldValue}</div>
                    )}
                  </div>
                  <div style={{
                    color: status === 'removed' ? withOpacity(colors.textMuted, 40) : colors.available || '#4ade80',
                    fontWeight: status === 'added' ? 600 : 400,
                  }}>
                    {newValue || '—'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end', alignItems: 'center' }}>
          {/* Compare button (5.2) — only shown when editing existing item */}
          {existingItem && parseResult && !diffResults && (
            <button
              onClick={() => handleDiffExisting(existingItem.specs || {})}
              style={{
                background: 'none',
                border: `1px solid ${withOpacity(colors.border, 50)}`,
                borderRadius: borderRadius.sm,
                cursor: 'pointer',
                color: colors.textMuted,
                padding: `${spacing[1]}px ${spacing[2]}px`,
                fontSize: typography.fontSize.xs,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginRight: 'auto',
              }}
              title="Compare parsed specs against existing item values"
            >
              <GitCompare size={12} /> Compare with existing
            </button>
          )}
          {diffResults && (
            <button
              onClick={() => setDiffResults(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.textMuted, fontSize: typography.fontSize.xs, marginRight: 'auto',
              }}
            >
              Hide diff
            </button>
          )}
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
  existingItem: PropTypes.object, // Optional: pass for re-import diff (5.2)
};
