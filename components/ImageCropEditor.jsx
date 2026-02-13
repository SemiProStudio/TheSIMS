// ============================================================================
// ImageCropEditor - Canvas-based image crop, zoom, and pan editor
// Used for profile photos and item images
// ============================================================================

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';
import { colors, spacing, typography } from '../theme.js';
import { Button } from './ui.jsx';

// ============================================================================
// Constants
// ============================================================================
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;
const ZOOM_WHEEL_SENSITIVITY = 0.002;

// ============================================================================
// Helper: crop image on a canvas and return data URL
// ============================================================================
function cropImageToCanvas(image, cropArea, outputSize, borderRadiusPx = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  // Optional: clip to rounded rect for preview (final output is always square)
  if (borderRadiusPx > 0) {
    ctx.beginPath();
    const r = borderRadiusPx;
    ctx.moveTo(r, 0);
    ctx.arcTo(outputSize, 0, outputSize, outputSize, r);
    ctx.arcTo(outputSize, outputSize, 0, outputSize, r);
    ctx.arcTo(0, outputSize, 0, 0, r);
    ctx.arcTo(0, 0, outputSize, 0, r);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(
    image,
    cropArea.x, cropArea.y, cropArea.size, cropArea.size,
    0, 0, outputSize, outputSize
  );

  return canvas.toDataURL('image/jpeg', 0.9);
}

// ============================================================================
// ImageCropEditor Component
// ============================================================================
const ImageCropEditor = memo(function ImageCropEditor({
  imageSrc,
  onCropComplete,
  onCancel,
  outputSize = 400,
  cropShape = 'rounded-square', // 'rounded-square' | 'circle' | 'square'
  cropBorderRadius = 12,
  title = 'Crop Image',
}) {
  // State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan offset in image-space pixels
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNatural, setImageNatural] = useState({ width: 0, height: 0 });

  // Refs
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasPreviewRef = useRef(null);

  // ============================================================================
  // Image loading
  // ============================================================================
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageNatural({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      // Center the image
      setPan({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // ============================================================================
  // Calculate crop area in image coordinates
  // ============================================================================
  const getCropArea = useCallback(() => {
    if (!imageRef.current) return { x: 0, y: 0, size: 0 };
    
    const { width: natW, height: natH } = imageNatural;
    // The visible crop size in image-space: the smaller dimension divided by zoom
    const baseCropSize = Math.min(natW, natH);
    const cropSize = baseCropSize / zoom;
    
    // Center point with pan offset
    const centerX = natW / 2 + pan.x;
    const centerY = natH / 2 + pan.y;
    
    // Crop bounds
    let x = centerX - cropSize / 2;
    let y = centerY - cropSize / 2;
    
    // Clamp to image bounds
    x = Math.max(0, Math.min(x, natW - cropSize));
    y = Math.max(0, Math.min(y, natH - cropSize));
    
    return { x, y, size: cropSize };
  }, [imageNatural, zoom, pan]);

  // ============================================================================
  // Draw preview on canvas
  // ============================================================================
  useEffect(() => {
    if (!imageLoaded || !canvasPreviewRef.current || !imageRef.current) return;

    const canvas = canvasPreviewRef.current;
    const ctx = canvas.getContext('2d');
    const displaySize = canvas.width;
    const cropArea = getCropArea();

    // Clear
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Draw cropped region
    ctx.drawImage(
      imageRef.current,
      cropArea.x, cropArea.y, cropArea.size, cropArea.size,
      0, 0, displaySize, displaySize
    );
  }, [imageLoaded, zoom, pan, getCropArea]);

  // ============================================================================
  // Mouse/Touch handlers for panning
  // ============================================================================
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || !imageRef.current) return;
    e.preventDefault();

    const { width: natW, height: natH } = imageNatural;
    const container = containerRef.current;
    if (!container) return;

    const containerSize = container.offsetWidth;
    const baseCropSize = Math.min(natW, natH);
    
    // Convert pixel drag to image-space movement
    const scale = baseCropSize / containerSize / zoom;
    
    const dx = (e.clientX - dragStart.x) * scale;
    const dy = (e.clientY - dragStart.y) * scale;

    setPan(prev => {
      const cropSize = baseCropSize / zoom;
      const maxPanX = (natW - cropSize) / 2;
      const maxPanY = (natH - cropSize) / 2;
      return {
        x: Math.max(-maxPanX, Math.min(maxPanX, prev.x - dx)),
        y: Math.max(-maxPanY, Math.min(maxPanY, prev.y - dy)),
      };
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, imageNatural, zoom]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse up listener
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointermove', handlePointerMove);
      return () => {
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointermove', handlePointerMove);
      };
    }
  }, [isDragging, handlePointerUp, handlePointerMove]);

  // ============================================================================
  // Scroll/wheel zoom
  // ============================================================================
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = -e.deltaY * ZOOM_WHEEL_SENSITIVITY;
    setZoom(prev => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
  }, []);

  // Attach wheel listener with passive: false
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ============================================================================
  // Zoom controls
  // ============================================================================
  const zoomIn = () => setZoom(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP * 3));
  const zoomOut = () => setZoom(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP * 3));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // ============================================================================
  // Commit crop
  // ============================================================================
  const handleCropComplete = useCallback(() => {
    if (!imageRef.current) return;
    const cropArea = getCropArea();
    const dataUrl = cropImageToCanvas(imageRef.current, cropArea, outputSize, 0);
    // Always output square — the display layer handles rounding
    onCropComplete(dataUrl);
  }, [getCropArea, outputSize, onCropComplete]);

  // ============================================================================
  // Crop overlay shape
  // ============================================================================
  const overlayBorderRadius = cropShape === 'circle' ? '50%' : 
                                cropShape === 'rounded-square' ? `${cropBorderRadius}px` : '0';

  // ============================================================================
  // Render
  // ============================================================================
  if (!imageSrc) return null;

  return (
    <div style={{ padding: spacing[4] }}>
      {/* Title */}
      <div style={{ 
        marginBottom: spacing[3], 
        fontWeight: typography.fontWeight.medium, 
        color: colors.textPrimary,
        fontSize: typography.fontSize.base,
      }}>
        {title}
      </div>

      {/* Main crop area */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 300,
          aspectRatio: '1',
          margin: '0 auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          overflow: 'hidden',
          borderRadius: overlayBorderRadius,
          background: colors.surfaceAlt || '#1a1a2e',
        }}
      >
        {/* Canvas preview showing cropped area */}
        {imageLoaded && (
          <canvas
            ref={canvasPreviewRef}
            width={300}
            height={300}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        )}

        {/* Loading state */}
        {!imageLoaded && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
          }}>
            Loading...
          </div>
        )}
      </div>

      {/* Zoom slider & controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        marginTop: spacing[3],
        maxWidth: 300,
        margin: `${spacing[3]}px auto 0`,
      }}>
        <button
          onClick={zoomOut}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: spacing[1],
            display: 'flex',
          }}
          title="Zoom out"
        >
          <ZoomOut size={18} />
        </button>

        <input
          type="range"
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          value={zoom * 100}
          onChange={(e) => setZoom(Number(e.target.value) / 100)}
          style={{
            flex: 1,
            accentColor: colors.primary,
            cursor: 'pointer',
          }}
        />

        <button
          onClick={zoomIn}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: spacing[1],
            display: 'flex',
          }}
          title="Zoom in"
        >
          <ZoomIn size={18} />
        </button>

        <button
          onClick={resetView}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textMuted,
            cursor: 'pointer',
            padding: spacing[1],
            display: 'flex',
          }}
          title="Reset view"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Hint text */}
      <div style={{
        textAlign: 'center',
        fontSize: typography.fontSize.xs,
        color: colors.textMuted,
        marginTop: spacing[2],
      }}>
        Drag to reposition · Scroll to zoom
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: spacing[3],
        justifyContent: 'center',
        marginTop: spacing[4],
      }}>
        <Button variant="secondary" onClick={onCancel} icon={X} size="sm">
          Cancel
        </Button>
        <Button onClick={handleCropComplete} icon={Check} size="sm">
          Apply
        </Button>
      </div>
    </div>
  );
});

ImageCropEditor.propTypes = {
  /** Data URL or URL of image to crop */
  imageSrc: PropTypes.string.isRequired,
  /** Called with cropped image data URL */
  onCropComplete: PropTypes.func.isRequired,
  /** Called when user cancels crop */
  onCancel: PropTypes.func.isRequired,
  /** Output image size in pixels */
  outputSize: PropTypes.number,
  /** Crop overlay shape */
  cropShape: PropTypes.oneOf(['rounded-square', 'circle', 'square']),
  /** Border radius for rounded-square mode */
  cropBorderRadius: PropTypes.number,
  /** Title shown above crop area */
  title: PropTypes.string,
};

export default ImageCropEditor;
