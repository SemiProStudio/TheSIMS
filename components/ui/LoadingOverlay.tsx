import { memo } from 'react';
import { colors, spacing, typography } from '../../theme';
import { LoadingSpinner } from './LoadingSpinner';

// ============================================================================
// LoadingOverlay - Full-screen or container loading state
// ============================================================================

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  text?: string;
  inline?: boolean;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(function LoadingOverlay({
  message = 'Loading...',
  fullScreen = false,
}) {
  const containerStyle = fullScreen ? {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  } : {
    position: 'absolute',
    inset: 0,
    background: `${colors.bgDark}cc`,
  };

  return (
    <div style={{
      ...containerStyle,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[3],
    }}>
      <LoadingSpinner size={32} />
      <span style={{ color: colors.textMuted, fontSize: typography.fontSize.sm }}>
        {message}
      </span>
    </div>
  );
});

