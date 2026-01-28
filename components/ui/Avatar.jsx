// ============================================================================
// Avatar - User avatar with initials fallback
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { colors, borderRadius, typography } from './shared.js';

export const Avatar = memo(function Avatar({ 
  name, 
  src, 
  size = 40,
  style: customStyle,
}) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'User avatar'}
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
      aria-label={name ? `Avatar for ${name}` : 'User avatar'}
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
  name: PropTypes.string,
  src: PropTypes.string,
  size: PropTypes.number,
  style: PropTypes.object,
};

export default Avatar;
