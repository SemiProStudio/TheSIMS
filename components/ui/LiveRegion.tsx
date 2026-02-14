import { memo } from 'react';
import type React from 'react';

// LiveRegion - Announce dynamic content to screen readers

interface LiveRegionProps {
  children?: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  message?: string;
  clearAfter?: number;
}

export const LiveRegion = memo<LiveRegionProps>(function LiveRegion({
  children,
  politeness = 'polite', // 'polite' or 'assertive'
  atomic = true
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      }}
    >
      {children}
    </div>
  );
});

