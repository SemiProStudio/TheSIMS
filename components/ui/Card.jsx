import { memo } from 'react';
import PropTypes from 'prop-types';
import { styles, spacing } from '../../theme.js';

// ============================================================================
// Card - Container component
// ============================================================================

export const Card = memo(function Card({ 
  children, 
  padding = true,
  onClick,
  style: customStyle,
  className: customClassName,
  ...props 
}) {
  const isClickable = !!onClick;
  const classNames = [
    'card', 
    isClickable && 'card-clickable',
    customClassName
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={classNames}
      style={{
        ...(padding && { padding: spacing[4] }),
        ...(isClickable && { cursor: 'pointer' }),
        ...customStyle,
      }}
      onClick={onClick}
      // Make clickable cards keyboard accessible
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
});

Card.propTypes = {
  /** Card content */
  children: PropTypes.node.isRequired,
  /** Whether to include padding */
  padding: PropTypes.bool,
  /** Click handler */
  onClick: PropTypes.func,
  /** Custom class name */
  className: PropTypes.string,
  /** Additional styles */
  style: PropTypes.object,
};
