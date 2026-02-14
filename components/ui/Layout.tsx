// ============================================================================
// Layout Components - Grid, Flex, Divider
// ============================================================================

import { memo } from 'react';
import type React from 'react';
import { colors, spacing } from './shared';

// ============================================================================
// Grid - Simple grid layout
// ============================================================================

interface LayoutGridProps {
  children?: React.ReactNode;
  columns?: number;
  gap?: number;
  style?: Record<string, any>;
  [key: string]: any;
}

export const Grid = memo<LayoutGridProps>(function Grid({
  children,
  columns = 2,
  gap = 4,
  style: customStyle,
  ...props
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: spacing[gap],
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Flex - Flexbox container
// ============================================================================

interface LayoutFlexProps {
  children?: React.ReactNode;
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: number;
  wrap?: boolean;
  style?: Record<string, any>;
  [key: string]: any;
}

export const Flex = memo<LayoutFlexProps>(function Flex({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'flex-start',
  gap = 0,
  wrap = false,
  style: customStyle,
  ...props
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        gap: spacing[gap],
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...customStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

// ============================================================================
// Divider - Horizontal divider line
// ============================================================================

interface LayoutDividerProps {
  spacing?: number;
}

export const Divider = memo<LayoutDividerProps>(function Divider({ spacing: sp = 4 }) {
  return (
    <hr
      style={{
        border: 'none',
        borderTop: `1px solid ${colors.border}`,
        margin: `${spacing[sp]}px 0`,
      }}
    />
  );
});

export default { Grid, Flex, Divider };
