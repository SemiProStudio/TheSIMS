import { memo } from 'react';
import PropTypes from 'prop-types';

// Accessibility Helpers
// ============================================================================

// VisuallyHidden - Hide content visually but keep it accessible to screen readers
export const VisuallyHidden = memo(function VisuallyHidden({ children, as: Component = 'span' }) {
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

VisuallyHidden.propTypes = {
  /** Content to hide visually */
  children: PropTypes.node.isRequired,
  /** HTML element to render */
  as: PropTypes.elementType,
};
