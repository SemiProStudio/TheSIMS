import { memo } from 'react';
import type React from 'react';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { colors, styles, spacing } from '../../theme';

// ============================================================================
// BackButton - Consistent back navigation
// ============================================================================

interface BackButtonProps {
  onClick: (...args: any[]) => any;
  children?: React.ReactNode;
}

export const BackButton = memo<BackButtonProps>(function BackButton({ onClick, children = 'Back' }) {
  return (
    <button 
      onClick={onClick} 
      type="button"
      aria-label={`Go back: ${children}`}
      style={{ 
        ...styles.btnSec, 
        marginBottom: spacing[4], 
        border: 'none', 
        background: 'none', 
        padding: 0, 
        color: colors.textSecondary, 
        display: 'flex', 
        alignItems: 'center', 
        gap: spacing[2],
        cursor: 'pointer',
      }}
    >
      <ArrowLeft size={18} aria-hidden="true" /> {children}
    </button>
  );
});

