// ============================================================================
// Accessibility Components
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, borderRadius, typography } from './shared.js';

// ============================================================================
// VisuallyHidden - Hide content visually but keep it accessible to screen readers
// ============================================================================

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
        borderWidth: 0,
      }}
    >
      {children}
    </Component>
  );
});

VisuallyHidden.propTypes = {
  children: PropTypes.node.isRequired,
  as: PropTypes.elementType,
};

// ============================================================================
// LiveRegion - Announce dynamic content to screen readers
// ============================================================================

export const LiveRegion = memo(function LiveRegion({ 
  children, 
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </div>
  );
});

LiveRegion.propTypes = {
  children: PropTypes.node,
  politeness: PropTypes.oneOf(['polite', 'assertive', 'off']),
  atomic: PropTypes.bool,
  relevant: PropTypes.string,
};

// ============================================================================
// SkipLink - Skip to main content link for keyboard users
// ============================================================================

export const SkipLink = memo(function SkipLink({ targetId = 'main-content', children = 'Skip to main content' }) {
  return (
    <a
      href={`#${targetId}`}
      className="skip-link"
      style={{
        position: 'absolute',
        top: -100,
        left: spacing[2],
        zIndex: 9999,
        padding: `${spacing[3]}px ${spacing[4]}px`,
        background: colors.primary,
        color: 'white',
        textDecoration: 'none',
        borderRadius: borderRadius.md,
        fontWeight: typography.fontWeight.medium,
        fontSize: typography.fontSize.sm,
        transition: 'top 150ms ease',
      }}
      onFocus={(e) => {
        e.target.style.top = `${spacing[2]}px`;
      }}
      onBlur={(e) => {
        e.target.style.top = '-100px';
      }}
    >
      {children}
    </a>
  );
});

SkipLink.propTypes = {
  targetId: PropTypes.string,
  children: PropTypes.node,
};

export default { VisuallyHidden, LiveRegion, SkipLink };
