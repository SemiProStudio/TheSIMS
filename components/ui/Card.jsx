// ============================================================================
// Card - Container component with optional click handling
// Uses CSS Modules for styling
// ============================================================================

import React, { memo, forwardRef } from 'react';
import PropTypes from 'prop-types';
import styles from '../../styles/Card.module.css';

/**
 * Join class names, filtering out falsy values
 * @param {...string} classes - Class names to join
 * @returns {string} Combined class names
 */
const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * Card component - A flexible container with various styling options
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {'none'|'small'|'medium'|'large'} props.padding - Padding size
 * @param {boolean} props.elevated - Add shadow elevation
 * @param {boolean} props.interactive - Enable hover effects
 * @param {boolean} props.selected - Show selected state
 * @param {Function} props.onClick - Click handler (makes card interactive)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Additional inline styles
 */
export const Card = memo(forwardRef(function Card({ 
  children, 
  padding = 'medium',
  elevated = false,
  interactive,
  selected = false,
  onClick,
  style: customStyle,
  className: customClassName,
  ...props 
}, ref) {
  // Determine if card should be interactive
  const isInteractive = interactive ?? !!onClick;
  
  // Build class names from CSS module
  const className = cx(
    styles.card,
    padding === 'none' && styles.paddingNone,
    padding === 'small' && styles.paddingSmall,
    padding === 'medium' && styles.padding,
    padding === 'large' && styles.paddingLarge,
    elevated && styles.elevated,
    isInteractive && styles.interactive,
    selected && styles.selected,
    customClassName
  );
  
  return (
    <div
      ref={ref}
      className={className}
      style={customStyle}
      onClick={onClick}
      // Make interactive cards keyboard accessible
      tabIndex={isInteractive ? 0 : undefined}
      role={isInteractive ? 'button' : undefined}
      onKeyDown={isInteractive ? (e) => {
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
}));

/**
 * CardHeader component - Header section for cards
 */
export const CardHeader = memo(function CardHeader({
  title,
  subtitle,
  actions,
  className: customClassName,
  ...props
}) {
  return (
    <div className={cx(styles.header, customClassName)} {...props}>
      <div>
        {title && <h3 className={styles.headerTitle}>{title}</h3>}
        {subtitle && <p className={styles.headerSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.headerActions}>{actions}</div>}
    </div>
  );
});

/**
 * CardBody component - Main content section for cards
 */
export const CardBody = memo(function CardBody({
  children,
  scrollable = false,
  className: customClassName,
  ...props
}) {
  return (
    <div 
      className={cx(
        styles.body, 
        scrollable && styles.bodyScrollable,
        customClassName
      )} 
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * CardFooter component - Footer section for cards
 */
export const CardFooter = memo(function CardFooter({
  children,
  spaceBetween = false,
  className: customClassName,
  ...props
}) {
  return (
    <div 
      className={cx(
        styles.footer,
        spaceBetween && styles.footerSpaceBetween,
        customClassName
      )} 
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * StatsCard component - Card optimized for displaying statistics
 */
export const StatsCard = memo(function StatsCard({
  value,
  label,
  change,
  changeType = 'neutral',
  icon: Icon,
  className: customClassName,
  ...props
}) {
  return (
    <Card padding="medium" className={cx(styles.statsCard, customClassName)} {...props}>
      {Icon && <Icon size={24} style={{ opacity: 0.7 }} />}
      <span className={styles.statsValue}>{value}</span>
      <span className={styles.statsLabel}>{label}</span>
      {change !== undefined && (
        <span className={cx(
          styles.statsChange,
          changeType === 'positive' && styles.statsChangePositive,
          changeType === 'negative' && styles.statsChangeNegative
        )}>
          {changeType === 'positive' ? '↑' : changeType === 'negative' ? '↓' : ''}
          {change}
        </span>
      )}
    </Card>
  );
});

/**
 * EmptyStateCard component - Card for empty states
 */
export const EmptyStateCard = memo(function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  className: customClassName,
  ...props
}) {
  return (
    <Card padding="none" className={cx(styles.emptyState, customClassName)} {...props}>
      {Icon && <div className={styles.emptyStateIcon}><Icon size={48} /></div>}
      {title && <h3 className={styles.emptyStateTitle}>{title}</h3>}
      {description && <p className={styles.emptyStateDescription}>{description}</p>}
      {action}
    </Card>
  );
});

/**
 * CardGrid component - Grid layout for cards
 */
export const CardGrid = memo(function CardGrid({
  children,
  columns = 'auto',
  className: customClassName,
  ...props
}) {
  const columnClass = {
    2: styles.gridTwoCols,
    3: styles.gridThreeCols,
    4: styles.gridFourCols,
    auto: styles.gridAuto,
  }[columns] || styles.gridAuto;
  
  return (
    <div className={cx(styles.grid, columnClass, customClassName)} {...props}>
      {children}
    </div>
  );
});

// PropTypes
Card.propTypes = {
  children: PropTypes.node,
  padding: PropTypes.oneOf(['none', 'small', 'medium', 'large']),
  elevated: PropTypes.bool,
  interactive: PropTypes.bool,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  style: PropTypes.object,
  className: PropTypes.string,
};

CardHeader.propTypes = {
  title: PropTypes.node,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  className: PropTypes.string,
};

CardBody.propTypes = {
  children: PropTypes.node,
  scrollable: PropTypes.bool,
  className: PropTypes.string,
};

CardFooter.propTypes = {
  children: PropTypes.node,
  spaceBetween: PropTypes.bool,
  className: PropTypes.string,
};

StatsCard.propTypes = {
  value: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  change: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  changeType: PropTypes.oneOf(['positive', 'negative', 'neutral']),
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

EmptyStateCard.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  action: PropTypes.node,
  className: PropTypes.string,
};

CardGrid.propTypes = {
  children: PropTypes.node,
  columns: PropTypes.oneOf([2, 3, 4, 'auto']),
  className: PropTypes.string,
};

export default Card;
