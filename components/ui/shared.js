// ============================================================================
// Shared utilities for UI components
// ============================================================================

import { colors, styles, borderRadius, spacing, typography, withOpacity } from '../../theme.js';

// Re-export theme utilities for component use
export { colors, styles, borderRadius, spacing, typography, withOpacity };

// Shared styles used across multiple components
export const sharedStyles = {
  // Modal backdrop
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  
  // Modal box
  modalBox: {
    background: colors.bgMedium,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  
  // Base input styles
  inputBase: {
    width: '100%',
    padding: `${spacing[3]}px ${spacing[4]}px`,
    background: `color-mix(in srgb, ${colors.primary} 10%, transparent)`,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.textPrimary,
    fontSize: typography.fontSize.sm,
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
};
