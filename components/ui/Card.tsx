import { memo } from 'react';
import type React from 'react';
import { spacing } from '../../theme';
import type React from 'react';

// ============================================================================
// Card - Container component
// ============================================================================

interface CardProps {
  children: React.ReactNode;
  padding?: boolean;
  onClick?: (...args: any[]) => any;
  className?: string;
  style?: Record<string, any>;
  [key: string]: any;
}

export const Card = memo<CardProps>(function Card({
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

