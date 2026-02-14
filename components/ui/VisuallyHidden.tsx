import React, { memo } from 'react';

// Accessibility Helpers
// ============================================================================

// VisuallyHidden - Hide content visually but keep it accessible to screen readers

interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: React.ElementType;
}

export const VisuallyHidden = memo<VisuallyHiddenProps>(function VisuallyHidden({ children, as: Component = 'span' }) {
  return (
    <Component
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
    </Component>
  );
});

