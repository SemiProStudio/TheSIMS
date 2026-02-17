// ============================================================================
// Smart Paste Modal — Orchestrator
// Import product specs from pasted text, PDF, TXT, URL, or images (OCR)
// ============================================================================

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FileText } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';
import { env } from '../../lib/env.js';
import { Button } from '../../components/ui.jsx';
import { Modal, ModalHeader } from '../ModalBase.jsx';
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
  fetchCommunityAliases,
  ocrImage,
  terminateOCR,
} from '../../lib/smartPaste/index.js';
import { getSupabase } from '../../lib/supabase.js';
import { error as logError } from '../../lib/logger.js';

// Sub-components
import { InputTabs } from './InputTabs.jsx';
import { ImportStatus } from './ImportStatus.jsx';
import { ControlBar } from './ControlBar.jsx';
import { BatchSelector } from './BatchSelector.jsx';
import { SourcePanel } from './SourcePanel.jsx';
import { ResultsPanel } from './ResultsPanel.jsx';
import { UnmatchedPairs } from './UnmatchedPairs.jsx';
import { DiffView } from './DiffView.jsx';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'tif', 'bmp'];
const CONFIDENCE_THRESHOLDS = { strict: 85, balanced: 60, aggressive: 50 };
const HISTORY_KEY = 'sims_smart_paste_history';
const MAX_HISTORY = 5;

// ============================================================================
// Main Component
// ============================================================================
export const SmartPasteModal = memo(function SmartPasteModal({ specs, onApply, onClose, existingItem }) {
  // ---- State ----
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState('paste');
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [selectedValues, setSelectedValues] = useState({});
  const [importStatus, setImportStatus] = useState('');
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [confidenceMode, setConfidenceMode] = useState('balanced');
  const [manualMappings, setManualMappings] = useState({});
  const [brandOverride, setBrandOverride] = useState(null);
  const [categoryOverride, setCategoryOverride] = useState(null);
  const [showSourceView, setShowSourceView] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(null);
  const [normalizeMetric, setNormalizeMetric] = useState(true);
  const [batchResults, setBatchResults] = useState(null);
  const [batchSelected, setBatchSelected] = useState(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [diffResults, setDiffResults] = useState(null);
  const [communityAliases, setCommunityAliases] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const sourceRef = useRef(null);

  // ---- Paste History (sessionStorage) ----
  const getPasteHistory = useCallback(() => {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }, []);

  const savePasteHistory = useCallback((text, resultSummary) => {
    try {
      const history = getPasteHistory();
      // Cap stored text at 50KB to avoid sessionStorage quota issues
      const maxFullText = 50_000;
      const entry = {
        text: text.slice(0, 500),
        fullText: text.length > maxFullText ? text.slice(0, maxFullText) : text,
        matchedCount: resultSummary.matchedCount,
        name: resultSummary.name || 'Unknown product',
        timestamp: Date.now(),
      };
      const filtered = history.filter(h => h.text !== entry.text);
      filtered.unshift(entry);
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, MAX_HISTORY)));
    } catch { /* sessionStorage full or unavailable */ }
  }, [getPasteHistory]);

  const [pasteHistory, setPasteHistory] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  });

  // ---- Effects ----
  useEffect(() => {
    if (inputMode === 'paste') textareaRef.current?.focus();
  }, [inputMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = await getSupabase();
        const aliases = await fetchCommunityAliases(supabase);
        if (!cancelled) setCommunityAliases(aliases);
      } catch { /* Community aliases not available */ }
    })();
    return () => {
      cancelled = true;
      terminateOCR();
    };
  }, []);

  // ---- Derived Data ----
  const allSpecFields = specs ? [...new Set(
    Object.values(specs).flatMap(specList =>
      Array.isArray(specList) ? specList.map(s => s.name) : []
    )
  )] : [];

  const availableCategories = specs ? Object.keys(specs).sort() : [];

  const requiredFields = new Set();
  if (specs) {
    Object.values(specs).forEach(specList => {
      if (!Array.isArray(specList)) return;
      specList.forEach(s => { if (s.required) requiredFields.add(s.name); });
    });
  }

  const getCategoryFields = useCallback((categoryName) => {
    if (!specs || !categoryName || !specs[categoryName]) return [];
    return specs[categoryName];
  }, [specs]);

  const threshold = CONFIDENCE_THRESHOLDS[confidenceMode] || 60;

  const filteredFields = parseResult ? new Map(
    [...parseResult.fields.entries()].filter(([, data]) => data.confidence >= threshold)
  ) : new Map();

  const matchedCount = filteredFields.size + Object.keys(manualMappings).length;
  const totalExtracted = parseResult ? parseResult.rawExtracted.length : 0;
  const unmatchedCount = parseResult ? parseResult.unmatchedPairs.length : 0;
  const altsCount = parseResult
    ? [...filteredFields.values()].filter(f => f.alternatives && f.alternatives.length > 1).length
    : 0;

  const detectedCategory = categoryOverride !== null ? categoryOverride : parseResult?.category;
  const categorySpecFields = detectedCategory ? getCategoryFields(detectedCategory) : [];

  // Build ordered field list
  const orderedFields = [];
  const addedNames = new Set();

  if (categorySpecFields.length > 0) {
    for (const spec of categorySpecFields) {
      const field = filteredFields.get(spec.name);
      orderedFields.push({ specName: spec.name, data: field || null, isRequired: spec.required || false });
      addedNames.add(spec.name);
    }
  }

  if (parseResult) {
    for (const [specName, data] of filteredFields) {
      if (!addedNames.has(specName) && data.value) {
        orderedFields.push({ specName, data, isRequired: false });
        addedNames.add(specName);
      }
    }
  }

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

  const mappedSpecNames = new Set([
    ...matchedFields.map(f => f.specName),
    ...Object.values(manualMappings),
  ]);
  const unmappedSpecOptions = allSpecFields.filter(name => !mappedSpecNames.has(name)).sort();

  // ---- Handlers ----
  const resetParseState = useCallback(() => {
    setSelectedValues({});
    setManualMappings({});
    setBrandOverride(null);
    setCategoryOverride(null);
    setHighlightedLine(null);
    setDiffResults(null);
  }, []);

  const handleParse = useCallback(() => {
    if (!inputText.trim()) return;
    const parseOpts = communityAliases ? { communityAliases } : {};

    const segments = detectProductBoundaries(inputText);
    if (segments.length > 1) {
      const batch = parseBatchProducts(inputText, specs, parseOpts);
      setBatchResults(batch);
      setBatchSelected(new Set(batch.map((_, i) => i)));
      setParseResult(null);
      resetParseState();
      setImportStatus(`Detected ${batch.length} products`);
      return;
    }

    setBatchResults(null);
    const result = parseProductText(inputText, specs, parseOpts);
    setParseResult(result);
    resetParseState();
    setImportStatus('');
    const matchCount = [...result.fields.values()].filter(f => f.value).length;
    savePasteHistory(inputText, { matchedCount: matchCount, name: result.name });
    setPasteHistory(getPasteHistory());
  }, [inputText, specs, communityAliases, savePasteHistory, getPasteHistory, resetParseState]);

  const handleFileImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('loading');
    try {
      let text;
      const ext = file.name.toLowerCase().split('.').pop();

      if (IMAGE_EXTENSIONS.includes(ext)) {
        setOcrProgress(0);
        setImportStatus('ocr:Running OCR — loading engine...');
        try {
          const ocrResult = await ocrImage(file, (progress) => {
            setOcrProgress(progress);
            if (progress < 0.2) setImportStatus('ocr:Loading OCR engine...');
            else if (progress < 0.9) setImportStatus(`ocr:Recognizing text... ${Math.round(progress * 100)}%`);
            else setImportStatus('ocr:Finishing up...');
          });
          text = ocrResult.text;
          const confLabel = ocrResult.confidence >= 80 ? 'high' : ocrResult.confidence >= 50 ? 'medium' : 'low';
          setImportStatus(`success:OCR complete — ${confLabel} confidence (${Math.round(ocrResult.confidence)}%), ${text.split('\n').length} lines`);
        } finally {
          setOcrProgress(null);
        }
      } else if (ext === 'pdf') {
        text = await readPdfFile(file);
      } else {
        text = await readTextFile(file);
      }

      if (!text || !text.trim()) {
        setImportStatus('error:No text content found in file');
        return;
      }

      setInputText(text);
      if (!IMAGE_EXTENSIONS.includes(ext)) {
        setImportStatus(`success:Imported ${file.name} (${text.split('\n').length} lines)`);
      }

      // Auto-parse: detect batch vs single (same logic as handleParse)
      const parseOpts = communityAliases ? { communityAliases } : {};
      const segments = detectProductBoundaries(text);
      if (segments.length > 1) {
        const batch = parseBatchProducts(text, specs, parseOpts);
        setBatchResults(batch);
        setBatchSelected(new Set(batch.map((_, i) => i)));
        setParseResult(null);
        resetParseState();
        setImportStatus(`success:Imported ${file.name} — detected ${batch.length} products`);
      } else {
        const result = parseProductText(text, specs, parseOpts);
        setParseResult(result);
        resetParseState();
      }
    } catch (err) {
      logError('File import error:', err);
      setImportStatus(`error:${err.message || 'Failed to read file'}`);
      setOcrProgress(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [specs, communityAliases, resetParseState]);

  const handleSelectValue = useCallback((specName, value) => {
    setSelectedValues(prev => ({ ...prev, [specName]: value }));
  }, []);

  const handleClearField = useCallback((specName) => {
    setSelectedValues(prev => ({ ...prev, [specName]: '' }));
  }, []);

  const handleManualMapping = useCallback((unmatchedIdx, specName, value) => {
    setManualMappings(prev => {
      const next = { ...prev };
      if (!specName) delete next[unmatchedIdx];
      else next[unmatchedIdx] = specName;
      return next;
    });
    setSelectedValues(prev => {
      const mappings = { ...(prev._manualMappings || {}) };
      if (specName) mappings[specName] = value;
      return { ...prev, _manualMappings: mappings };
    });

    if (specName && parseResult?.unmatchedPairs?.[unmatchedIdx]) {
      const sourceKey = parseResult.unmatchedPairs[unmatchedIdx].key;
      const category = categoryOverride || parseResult?.category || null;
      getSupabase()
        .then(supabase => recordAlias(supabase, sourceKey, specName, category))
        .catch(() => {});
    }
  }, [parseResult, categoryOverride]);

  const handleRestoreHistory = useCallback((entry) => {
    setInputText(entry.fullText || entry.text);
    setParseResult(null);
    resetParseState();
    setImportStatus(`Restored: ${entry.name}`);
  }, [resetParseState]);

  const handleHighlightLine = useCallback((lineIndex) => {
    setHighlightedLine(lineIndex);
    setShowSourceView(true);
    setTimeout(() => {
      const el = document.getElementById(`source-line-${lineIndex}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, []);

  const handlePaste = useCallback((e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    if (clipboardData.types.includes('text/html')) {
      e.preventDefault();
      const html = clipboardData.getData('text/html');
      const cleaned = cleanInputText(html);
      const plainText = clipboardData.getData('text/plain');
      const htmlTabLines = cleaned.split('\n').filter(l => l.includes('\t')).length;
      const plainTabLines = plainText.split('\n').filter(l => l.includes('\t')).length;
      const htmlLines = cleaned.split('\n').filter(l => l.trim()).length;
      const plainLines = plainText.split('\n').filter(l => l.trim()).length;
      const useHtml = htmlTabLines > plainTabLines || (htmlTabLines === plainTabLines && htmlLines > plainLines);
      const text = useHtml ? cleaned : plainText;
      setInputText(text);
      setParseResult(null);
      setImportStatus(useHtml ? 'HTML table structure preserved from clipboard' : '');
    }
  }, []);

  const handleApply = useCallback(() => {
    if (!parseResult) return;
    const payload = buildApplyPayload(parseResult, selectedValues, { normalizeMetric });
    if (brandOverride !== null) payload.brand = brandOverride;
    if (categoryOverride !== null) payload.category = categoryOverride;
    onApply(payload);
    onClose();
  }, [parseResult, selectedValues, normalizeMetric, brandOverride, categoryOverride, onApply, onClose]);

  const handleBatchApply = useCallback(() => {
    if (!batchResults) return;
    const selected = batchResults
      .filter((_, i) => batchSelected.has(i))
      .map(({ result }) => buildApplyPayload(result, {}, { normalizeMetric }));
    if (selected.length > 0) {
      onApply(selected.length === 1 ? selected[0] : selected);
      onClose();
    }
  }, [batchResults, batchSelected, normalizeMetric, onApply, onClose]);

  const handleBatchSelectSingle = useCallback((index) => {
    if (!batchResults?.[index]) return;
    const { result } = batchResults[index];
    setParseResult(result);
    setBatchResults(null);
    resetParseState();
    setImportStatus(`Viewing: ${result.name || `Product ${index + 1}`}`);
  }, [batchResults, resetParseState]);

  const handleUrlFetch = useCallback(async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setImportStatus('');
    setParseResult(null);
    setBatchResults(null);
    resetParseState();
    try {
      const supabaseUrl = env.SUPABASE_URL;
      const proxyUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/fetch-product-page` : null;
      const { text } = await fetchProductPage(urlInput, proxyUrl, env.SUPABASE_ANON_KEY);

      if (!text || !text.trim()) {
        setImportStatus('error:No text content found at that URL');
        return;
      }

      setInputText(text);
      setInputMode('paste');

      // Auto-parse: detect batch vs single (same logic as handleParse)
      const parseOpts = communityAliases ? { communityAliases } : {};
      const segments = detectProductBoundaries(text);
      if (segments.length > 1) {
        const batch = parseBatchProducts(text, specs, parseOpts);
        setBatchResults(batch);
        setBatchSelected(new Set(batch.map((_, i) => i)));
        setParseResult(null);
        setImportStatus(`success:Fetched URL — detected ${batch.length} products`);
      } else {
        const result = parseProductText(text, specs, parseOpts);
        setParseResult(result);
        resetParseState();

        const matchCount = [...result.fields.values()].filter(f => f.value).length;
        savePasteHistory(text, { matchedCount: matchCount, name: result.name });
        setPasteHistory(getPasteHistory());

        setImportStatus(`success:Fetched & parsed ${matchCount} fields from URL`);
      }
    } catch (e) {
      logError('URL fetch error:', e);
      setImportStatus(`error:${e.message}`);
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, specs, communityAliases, savePasteHistory, getPasteHistory, resetParseState]);

  const handleDiffExisting = useCallback((existingSpecs) => {
    if (!parseResult) return;
    const diff = diffSpecs(existingSpecs, parseResult.fields);
    setDiffResults(diff);
  }, [parseResult]);

  // ---- Render ----
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

        {/* Spec fields list */}
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

        {/* Input Tabs */}
        <InputTabs
          inputMode={inputMode} setInputMode={setInputMode}
          inputText={inputText} setInputText={setInputText}
          handlePaste={handlePaste} handleFileImport={handleFileImport}
          handleUrlFetch={handleUrlFetch} urlInput={urlInput} setUrlInput={setUrlInput} urlLoading={urlLoading}
          dragOver={dragOver} setDragOver={setDragOver}
          textareaRef={textareaRef} fileInputRef={fileInputRef}
          setParseResult={setParseResult} setImportStatus={setImportStatus} setManualMappings={setManualMappings}
          pasteHistory={pasteHistory} onRestoreHistory={handleRestoreHistory}
        />

        {/* Import Status */}
        <ImportStatus importStatus={importStatus} ocrProgress={ocrProgress} />

        {/* Parse button + summary */}
        <div style={{ display: 'flex', gap: spacing[2], marginTop: spacing[3], marginBottom: spacing[3], alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={handleParse} disabled={!inputText.trim()} icon={FileText}>
            Parse Text
          </Button>
          {batchResults && (
            <span style={{ fontSize: typography.fontSize.sm, color: colors.primary, fontWeight: 600 }}>
              ⊞ {batchResults.length} products detected
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

        {/* Control Bar */}
        {parseResult && (
          <ControlBar
            confidenceMode={confidenceMode} setConfidenceMode={setConfidenceMode}
            normalizeMetric={normalizeMetric} setNormalizeMetric={setNormalizeMetric}
            showSourceView={showSourceView} setShowSourceView={setShowSourceView}
          />
        )}

        {/* Batch Selector */}
        <BatchSelector
          batchResults={batchResults} batchSelected={batchSelected} setBatchSelected={setBatchSelected}
          onBatchApply={handleBatchApply} onBatchSelectSingle={handleBatchSelectSingle}
        />

        {/* Results (with optional source view) */}
        {parseResult && (
          <div style={{
            display: showSourceView ? 'grid' : 'block',
            gridTemplateColumns: showSourceView ? '1fr 1fr' : '1fr',
            gap: showSourceView ? spacing[3] : 0,
            marginBottom: spacing[3],
          }}>
            {showSourceView && parseResult.sourceLines && (
              <SourcePanel
                sourceLines={parseResult.sourceLines}
                fields={parseResult.fields}
                unmatchedPairs={parseResult.unmatchedPairs}
                highlightedLine={highlightedLine}
                sourceRef={sourceRef}
              />
            )}
            <div>
              <ResultsPanel
                parseResult={parseResult}
                matchedFields={matchedFields}
                emptyFields={emptyFields}
                selectedValues={selectedValues}
                onSelectValue={handleSelectValue}
                onClearField={handleClearField}
                onHighlightLine={handleHighlightLine}
                normalizeMetric={normalizeMetric}
                normalizeUnits={normalizeUnits}
                coerceFieldValue={coerceFieldValue}
                brandOverride={brandOverride} setBrandOverride={setBrandOverride}
                categoryOverride={categoryOverride} setCategoryOverride={setCategoryOverride}
                availableCategories={availableCategories}
                showSourceView={showSourceView}
              />
              {/* Unmatched Pairs (inside the results grid flow) */}
              {parseResult.unmatchedPairs.length > 0 && (
                <UnmatchedPairs
                  unmatchedPairs={parseResult.unmatchedPairs}
                  manualMappings={manualMappings}
                  onManualMapping={handleManualMapping}
                  unmappedSpecOptions={unmappedSpecOptions}
                  showUnmatched={showUnmatched}
                  setShowUnmatched={setShowUnmatched}
                />
              )}
            </div>
          </div>
        )}

        {/* Diff View */}
        <DiffView diffResults={diffResults} onHideDiff={() => setDiffResults(null)} />

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end', alignItems: 'center' }}>
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
              ⇄ Compare with existing
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

SmartPasteModal.propTypes = {
  specs: PropTypes.object,
  onApply: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  existingItem: PropTypes.object,
};
