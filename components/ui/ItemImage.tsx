import { memo } from 'react';

import { colors, borderRadius, withOpacity } from '../../theme';

// ============================================================================
// ItemImage - Image with placeholder
// ============================================================================

interface ItemImageProps {
  src?: string;
  alt?: string;
  size?: number;
  borderRadius?: string;
  showPlaceholder?: boolean;
  onClick?: (...args: any[]) => any;
  clickable?: boolean;
}

export const ItemImage = memo<ItemImageProps>(function ItemImage({
  src,
  alt = '',
  size = 56,
  borderRadius: radius = borderRadius.md,
  showPlaceholder = true,
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: 'cover',
        }}
      />
    );
  }

  if (!showPlaceholder) return null;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${withOpacity(colors.primary, 15)}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
      }}
    >
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      {size >= 48 && (
        <span style={{ fontSize: Math.max(8, size * 0.15), marginTop: 2 }}>No Image</span>
      )}
    </div>
  );
});

