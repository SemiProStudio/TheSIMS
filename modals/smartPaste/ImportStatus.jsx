// ============================================================================
// Smart Paste — Import Status
// Status messages and OCR progress bar
// ============================================================================

import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';

export function ImportStatus({ importStatus, ocrProgress }) {
  if (!importStatus) return null;

  return (
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
       importStatus.startsWith('success:') ? `✓ ${importStatus.slice(8)}` :
       importStatus.startsWith('ocr:') ? `🔍 ${importStatus.slice(4)}` :
       importStatus}
      {/* OCR progress bar */}
      {ocrProgress !== null && (
        <div style={{
          marginTop: spacing[1],
          height: 4,
          borderRadius: 2,
          background: withOpacity(colors.primary, 20),
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${Math.round(ocrProgress * 100)}%`,
            background: colors.primary,
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </div>
  );
}
