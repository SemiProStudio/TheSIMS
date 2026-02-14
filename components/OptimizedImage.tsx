// =============================================================================
// OptimizedImage Component
// Displays thumbnails for fast loading, with option for full-size images
// =============================================================================

import { useState, useRef, useEffect, memo } from 'react';
import type React from 'react';
import { getThumbnailUrl } from '../lib/index';
import { colors, borderRadius } from '../theme';

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
interface OptimizedImageProps {
  src?: string;
  alt?: string;
  size?: 'thumbnail' | 'full';
  width?: number | string;
  height?: number | string;
  style?: Record<string, any>;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: React.ReactNode;
  onLoad?: (...args: any[]) => any;
  onError?: (...args: any[]) => any;
  lazy?: boolean;
}

export function OptimizedImage({
  src,
  alt = '',
  size = 'thumbnail',
  width,
  height,
  style = {},
  className = '',
  objectFit = 'cover',
  placeholder = null,
  onLoad,
  onError,
  lazy = true,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Get the appropriate URL based on size
  const imageUrl = size === 'thumbnail' ? getThumbnailUrl(src) : src;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading slightly before in view
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Reset state when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
    
    // If thumbnail failed, try full-size as fallback
    if (size === 'thumbnail' && imageUrl !== src) {
      const img = e.target;
      img.src = src;
    }
  };

  // Default placeholder
  const defaultPlaceholder = (
    <div
      style={{
        width: width || '100%',
        height: height || '100%',
        backgroundColor: colors.surfaceHover,
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
    backgroundColor: colors.surfaceHover,
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
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && (
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

      {/* Error state */}
      {hasError && !isLoaded && (
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
          ref={imgRef}
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
}

export default memo(OptimizedImage);
