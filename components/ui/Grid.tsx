import { memo } from 'react';
import type React from 'react';
import { spacing } from '../../theme';
import type React from 'react';

// ============================================================================
// Grid - Responsive grid layout
// ============================================================================

interface GridProps {
  children: React.ReactNode;
  columns?: string | number;
  minWidth?: number;
  gap?: number;
  style?: Record<string, any>;
}

export const Grid = memo<GridProps>(function Grid({
  children,
  columns = 'auto-fill',
  minWidth = 180,
  gap = 4,
  style: customStyle,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(${minWidth}px, 1fr))`,
        gap: spacing[gap],
        ...customStyle,
      }}
    >
      {children}
    </div>
  );
});

