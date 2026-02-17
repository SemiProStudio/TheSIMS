import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, spacing, typography } from '../../theme.js';
import { BackButton } from './BackButton.jsx';

// ============================================================================
// PageHeader - Consistent page title with optional subtitle and actions
// ============================================================================

export const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  action,
  backButton,
  onBack,
  backLabel = 'Back',
}) {
  return (
    <>
      {(backButton || onBack) && <BackButton onClick={onBack}>{backLabel}</BackButton>}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[5],
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: colors.textPrimary }}>{title}</h2>
          {subtitle && (
            <p
              style={{
                margin: `${spacing[1]}px 0 0`,
                color: colors.textMuted,
                fontSize: typography.fontSize.sm,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </>
  );
});

PageHeader.propTypes = {
  /** Page title */
  title: PropTypes.string.isRequired,
  /** Optional subtitle */
  subtitle: PropTypes.string,
  /** Action button(s) to render on the right */
  action: PropTypes.node,
  /** Whether to show back button (deprecated, use onBack) */
  backButton: PropTypes.bool,
  /** Callback for back button click */
  onBack: PropTypes.func,
  /** Label for back button */
  backLabel: PropTypes.string,
};
