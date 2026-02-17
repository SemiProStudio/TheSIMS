// ============================================================================
// Smart Paste — Source Panel
// Side-by-side source text view with line highlighting
// ============================================================================

import { FileText } from 'lucide-react';
import { colors, spacing, borderRadius, typography, withOpacity } from '../../theme.js';

export function SourcePanel({ sourceLines, fields, unmatchedPairs, highlightedLine, sourceRef }) {
  if (!sourceLines) return null;

  return (
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
      <div
        style={{
          padding: `${spacing[2]}px ${spacing[3]}px`,
          borderBottom: `1px solid ${colors.border}`,
          position: 'sticky',
          top: 0,
          background: colors.bgMedium,
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: typography.fontSize.xs,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          <FileText size={11} />
          Source Text ({sourceLines.length} lines)
        </div>
      </div>
      <div style={{ padding: `${spacing[1]}px 0` }}>
        {sourceLines.map((line, i) => {
          const isMatched = [...fields.values()].some((f) => f.lineIndex === i);
          const isUnmatched = unmatchedPairs.some((p) => p.lineIndex === i);
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
  );
}
