// =============================================================================
// OptimizedImage Component
// Displays thumbnails for fast loading, with option for full-size images
// =============================================================================

import { useState, useRef, useEffect, memo } from 'react';
import PropTypes from 'prop-types';
import { getThumbnailUrl } from '../lib/index.js';
import { colors, borderRadius } from '../theme.js';

/**
 * OptimizedImage - Displays images with thumbnail/full-size optimization
 *
 * Features:
 * - Lazy loading with IntersectionObserver
 * - Thumbnail display for list views (fast loading)
 * - Full-size display for detail views
 * - Loading placeholder
 * - Error fallback
 * - Smooth fade-in transition
 */
export const OptimizedImage = memo(function OptimizedImage({
  src,
  alt = '',
  size = 'thumbnail', // 'thumbnail' | 'full'
  width,
  height,
  style = {},
  className = '',
  objectFit = 'cover',
  placeholder = null,
  onLoad,
  onError,
  lazy = true,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const containerRef = useRef(null);
  const triedFullSizeRef = useRef(false);

  // Get the appropriate URL based on size
  const imageUrl = size === 'thumbnail' ? getThumbnailUrl(src) : src;

  // Intersection Observer for lazy loading. `lazy` flipping to false must
  // show the image immediately — the observer never fires for it otherwise.
  useEffect(() => {
    if (!lazy) {
      setIsInView(true);
      return undefined;
    }
    if (isInView || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Pre-load images before they scroll into view
        threshold: 0.01,
      },
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Reset state when the rendered URL changes — keying on src alone left a
  // stale full-size retry flag behind a thumbnail↔full size switch
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    triedFullSizeRef.current = false;
  }, [src, size]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    // If the thumbnail failed, try full-size ONCE as a fallback. Without the
    // guard, a broken full-size URL re-enters this handler with imageUrl !== src
    // still true, re-assigning src in an infinite request loop.
    if (size === 'thumbnail' && imageUrl !== src && !triedFullSizeRef.current) {
      triedFullSizeRef.current = true;
      e.target.src = src;
      return;
    }
    setHasError(true);
    onError?.(e);
  };

  // Default placeholder. bgLight is a real theme token — the old
  // colors.surfaceHover never existed, so loading/error states rendered
  // fully transparent instead of a neutral box.
  const defaultPlaceholder = (
    <div
      style={{
        width: width || '100%',
        height: height || '100%',
        backgroundColor: colors.bgLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        fontSize: '12px',
      }}
    >
      {hasError ? '⚠️' : ''}
    </div>
  );

  const containerStyle = {
    width: width || '100%',
    height: height || '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.bgLight,
    borderRadius: borderRadius.md,
    ...style,
  };

  const imageStyle = {
    width: '100%',
    height: '100%',
    objectFit,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
  };

  // No image provided
  if (!src) {
    return (
      <div ref={containerRef} style={containerStyle} className={className}>
        {placeholder || defaultPlaceholder}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle} className={className}>
      {/* Placeholder while loading or after an error (the defaultPlaceholder
          shows the warning glyph when hasError) */}
      {!isLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          {placeholder || defaultPlaceholder}
        </div>
      )}

      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={imageUrl}
          alt={alt}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      )}
    </div>
  );
});

OptimizedImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['thumbnail', 'full']),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  style: PropTypes.object,
  className: PropTypes.string,
  objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none', 'scale-down']),
  placeholder: PropTypes.node,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
  lazy: PropTypes.bool,
};

export default OptimizedImage;
