import { memo } from 'react';
import PropTypes from 'prop-types';

// LiveRegion - Announce dynamic content to screen readers
export const LiveRegion = memo(function LiveRegion({ 
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

LiveRegion.propTypes = {
  /** Message to announce */
  message: PropTypes.string,
  /** ARIA politeness level */
  politeness: PropTypes.oneOf(['polite', 'assertive']),
  /** Clear message after delay */
  clearAfter: PropTypes.number,
};
