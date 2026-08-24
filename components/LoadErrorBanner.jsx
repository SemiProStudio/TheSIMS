// ============================================================================
// Load Error Banner
// Inline failure signal for lazily loaded data layers (clients, audit log,
// pack lists, maintenance history, checkout activity). A failed lazy load
// stays unloaded in DataContext — this banner gives the user the retry that
// used to require a full page reload.
// ============================================================================

import PropTypes from 'prop-types';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { Button } from './ui.jsx';

function LoadErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: borderRadius.md,
        border: `1px solid ${colors.danger}`,
        background: 'transparent',
        margin: `${spacing[4]}px 0`,
      }}
    >
      <AlertTriangle size={20} color={colors.danger} aria-hidden="true" />
      <div style={{ flex: 1, fontSize: typography.fontSize.sm, color: colors.textPrimary }}>
        {message}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={RefreshCw}>
          Retry
        </Button>
      )}
    </div>
  );
}

LoadErrorBanner.propTypes = {
  /** What failed, in user terms (e.g. "Couldn't load clients.") */
  message: PropTypes.string.isRequired,
  /** Re-invokes the layer's ensure* loader */
  onRetry: PropTypes.func,
};

export default LoadErrorBanner;
