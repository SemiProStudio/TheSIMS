import { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, borderRadius, typography } from '../../theme.js';

// ============================================================================
// Avatar - User avatar
// ============================================================================

export const Avatar = memo(function Avatar({ name, src, size = 40, style: customStyle }) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: borderRadius.md,
          objectFit: 'cover',
          ...customStyle,
        }}
      />
    );
  }

  return (
    <div
      aria-label={name ? `Avatar for ${name}` : 'Avatar'}
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius.md,
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: typography.fontWeight.semibold,
        color: colors.textPrimary,
        fontSize: size * 0.4,
        ...customStyle,
      }}
    >
      {initial}
    </div>
  );
});

Avatar.propTypes = {
  /** User name for initials */
  name: PropTypes.string,
  /** Image source URL */
  src: PropTypes.string,
  /** Avatar size in pixels */
  size: PropTypes.number,
  /** Custom background color */
  color: PropTypes.string,
};
