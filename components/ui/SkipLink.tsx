import { memo } from 'react';
import type React from 'react';
import { colors, borderRadius, spacing } from '../../theme';
import type React from 'react';

// SkipLink - Allow keyboard users to skip to main content

interface SkipLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipLink = memo<SkipLinkProps>(function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={`#${targetId}`}
      style={{
        position: 'absolute',
        left: -9999,
        top: 'auto',
        width: 1,
        height: 1,
        overflow: 'hidden',
        zIndex: 9999,
        padding: `${spacing[2]}px ${spacing[4]}px`,
        background: colors.primary,
        color: '#fff',
        textDecoration: 'none',
        borderRadius: borderRadius.md,
      }}
      onFocus={(e) => {
        e.target.style.left = spacing[4] + 'px';
        e.target.style.top = spacing[4] + 'px';
        e.target.style.width = 'auto';
        e.target.style.height = 'auto';
      }}
      onBlur={(e) => {
        e.target.style.left = '-9999px';
        e.target.style.width = '1px';
        e.target.style.height = '1px';
      }}
    >
      {children}
    </a>
  );
});

