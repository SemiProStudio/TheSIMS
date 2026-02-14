import { memo } from 'react';
import { colors, withOpacity } from '../../theme';

// ============================================================================
// LoadingSpinner - Loading indicator
// ============================================================================

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  style?: Record<string, any>;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(function LoadingSpinner({
  size = 24,
  color = colors.primary,
  style: customStyle
}) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${withOpacity(color, 30)}`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      ...customStyle,
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

