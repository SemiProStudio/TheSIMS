import { memo } from 'react';
import type React from 'react';
import { colors, borderRadius, typography, withOpacity } from '../../theme';
import type React from 'react';

// ============================================================================
// Badge - Status/category indicator
// ============================================================================

interface BadgeProps {
  text?: string;
  children?: React.ReactNode;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
}

export const Badge = memo<BadgeProps>(function Badge({ text, children, color = colors.primary, size = 'sm' }) {
  const sizes = {
    xs: { padding: '2px 5px', fontSize: '9px' },
    sm: { padding: '3px 8px', fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '11px' },
  };

  const content = text || children;
  
  // Don't render if no content
  if (!content) return null;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: withOpacity(color, 25),
        color: color,
        borderRadius: borderRadius.full,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
        ...sizes[size],
      }}
    >
      {content}
    </span>
  );
});

