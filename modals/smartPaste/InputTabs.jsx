// ============================================================================
// Smart Paste — Input Tabs
// Paste/File/URL tab navigation and content areas
// ============================================================================

import { Upload, FileText } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../../theme.js';
import { Button } from '../../components/ui.jsx';
import { PasteHistory } from './PasteHistory.jsx';

const TAB_CONFIG = [
  { key: 'paste', label: 'Paste Text', icon: '📋' },
  { key: 'file', label: 'Import File', icon: '📁' },
  { key: 'url', label: 'From URL', icon: '🔗' },
];

export function InputTabs({
  inputMode, setInputMode,
  inputText, setInputText,
  handlePaste, handleFileImport,
  handleUrlFetch, urlInput, setUrlInput, urlLoading,
  dragOver, setDragOver,
  textareaRef, fileInputRef,
  setParseResult, setImportStatus, setManualMappings,
  pasteHistory, onRestoreHistory,
}) {
  return (
    <>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 0,
        borderBottom: `2px solid ${colors.border}`,
      }}>
        {TAB_CONFIG.map(tab => {
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

      {/* Paste Text tab */}
      {inputMode === 'paste' && (
        <div style={{ marginTop: spacing[2] }}>
          {/* Paste history */}
          {!inputText && (
            <PasteHistory pasteHistory={pasteHistory} onRestore={onRestoreHistory} />
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
              PDF, TXT, CSV, TSV, Markdown, RTF, or Images (OCR)
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.text,.csv,.tsv,.md,.rtf,.png,.jpg,.jpeg,.webp,.tiff,.tif,.bmp"
            onChange={handleFileImport}
            style={{ display: 'none' }}
          />

          {/* Imported text preview */}
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

      {/* URL Import tab */}
      {inputMode === 'url' && (
        <div style={{ marginTop: spacing[2] }}>
          <div style={{
            fontSize: typography.fontSize.xs,
            color: colors.textMuted,
            marginBottom: spacing[2],
          }}>
            Enter a product page URL to fetch and parse specs automatically.
            Supported sites include B&H, Adorama, manufacturer pages, and Amazon.
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
              icon={FileText}
            >
              {urlLoading ? 'Fetching...' : 'Fetch'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
