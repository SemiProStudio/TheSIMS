import { memo } from 'react';
import type React from 'react';
import { spacing } from '../../theme';
import type React from 'react';

// ============================================================================
// Flex - Flexbox container
// ============================================================================

interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: number;
  wrap?: boolean;
  style?: Record<string, any>;
  [key: string]: any;
}

export const Flex = memo<FlexProps>(function Flex({
  children,
  direction = 'row',
  align = 'center',
  justify = 'flex-start',
  gap = 2,
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

