// ============================================================================
// ImageCropEditor - Canvas-based square crop with zoom and pan
// Works on the pipeline's WORKING image (see lib/imageProcessing.js) and
// returns a crop rectangle in working-image pixels — encoding happens later,
// once, in the pipeline. Drawing from the already-downscaled working canvas
// keeps pan/zoom smooth on phones even for 50-megapixel originals, and never
// taints a canvas (the old version loaded stored URLs without CORS and its
// export threw "Tainted canvases may not be exported").
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
// ImageCropEditor Component
// ============================================================================
const ImageCropEditor = memo(function ImageCropEditor({
  working,
  initialCrop = null,
  onCropComplete,
  onCancel,
  cropShape = 'rounded-square', // 'rounded-square' | 'circle' | 'square'
  cropBorderRadius = 12,
  title = 'Crop Image',
}) {
  // State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // pan offset in image-space pixels
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Refs
  const containerRef = useRef(null);
  const canvasPreviewRef = useRef(null);

  const imageLoaded = Boolean(working?.canvas);
  const imageNatural = { width: working?.width || 0, height: working?.height || 0 };
  const sourceCanvas = working?.canvas || null;

  // A new working image (or a previous crop to resume from) resets the view
  useEffect(() => {
    if (!working?.canvas) return;
    const natW = working.width;
    const natH = working.height;
    if (initialCrop && initialCrop.size > 0) {
      const base = Math.min(natW, natH);
      setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, base / initialCrop.size)));
      setPan({
        x: initialCrop.x + initialCrop.size / 2 - natW / 2,
        y: initialCrop.y + initialCrop.size / 2 - natH / 2,
      });
    } else {
      setPan({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [working, initialCrop]);

  // ============================================================================
  // Calculate crop area in image coordinates
  // ============================================================================
  const getCropArea = useCallback(() => {
    if (!sourceCanvas) return { x: 0, y: 0, size: 0 };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCanvas, imageNatural.width, imageNatural.height, zoom, pan]);

  // ============================================================================
  // Draw preview on canvas
  // ============================================================================
  useEffect(() => {
    if (!sourceCanvas || !canvasPreviewRef.current) return;

    const canvas = canvasPreviewRef.current;
    const ctx = canvas.getContext('2d');
    const displaySize = canvas.width;
    const cropArea = getCropArea();

    // Clear
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Draw cropped region
    ctx.drawImage(
      sourceCanvas,
      cropArea.x,
      cropArea.y,
      cropArea.size,
      cropArea.size,
      0,
      0,
      displaySize,
      displaySize,
    );
  }, [sourceCanvas, zoom, pan, getCropArea]);

  // ============================================================================
  // Mouse/Touch handlers for panning
  // ============================================================================
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || !sourceCanvas) return;
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

      setPan((prev) => {
        const cropSize = baseCropSize / zoom;
        const maxPanX = (natW - cropSize) / 2;
        const maxPanY = (natH - cropSize) / 2;
        return {
          x: Math.max(-maxPanX, Math.min(maxPanX, prev.x - dx)),
          y: Math.max(-maxPanY, Math.min(maxPanY, prev.y - dy)),
        };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDragging, dragStart, imageNatural.width, imageNatural.height, zoom, sourceCanvas],
  );

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
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta)));
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
  const zoomIn = () => setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP * 3));
  const zoomOut = () => setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP * 3));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ============================================================================
  // Commit crop
  // ============================================================================
  const handleCropComplete = useCallback(() => {
    if (!imageLoaded) return;
    // Square region in working-image pixels; the pipeline renders + encodes it
    onCropComplete(getCropArea());
  }, [imageLoaded, getCropArea, onCropComplete]);

  // ============================================================================
  // Crop overlay shape
  // ============================================================================
  const overlayBorderRadius =
    cropShape === 'circle' ? '50%' : cropShape === 'rounded-square' ? `${cropBorderRadius}px` : '0';

  // ============================================================================
  // Render
  // ============================================================================
  if (!working) return null;

  return (
    <div style={{ padding: spacing[4] }}>
      {/* Title */}
      <div
        style={{
          marginBottom: spacing[3],
          fontWeight: typography.fontWeight.medium,
          color: colors.textPrimary,
          fontSize: typography.fontSize.base,
        }}
      >
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
          background: colors.bgMedium,
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
            }}
          >
            Loading...
          </div>
        )}
      </div>

      {/* Zoom slider & controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[2],
          marginTop: spacing[3],
          maxWidth: 300,
          margin: `${spacing[3]}px auto 0`,
        }}
      >
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
      <div
        style={{
          textAlign: 'center',
          fontSize: typography.fontSize.xs,
          color: colors.textMuted,
          marginTop: spacing[2],
        }}
      >
        Drag to reposition · Scroll to zoom
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: spacing[3],
          justifyContent: 'center',
          marginTop: spacing[4],
        }}
      >
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
  /** Working image from lib/imageProcessing loadWorkingImage */
  working: PropTypes.shape({
    canvas: PropTypes.object,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  /** Previous crop to resume from (working-image pixels) */
  initialCrop: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    size: PropTypes.number,
  }),
  /** Called with the chosen square crop {x, y, size} in working-image pixels */
  onCropComplete: PropTypes.func.isRequired,
  /** Called when user cancels crop */
  onCancel: PropTypes.func.isRequired,
  /** Crop overlay shape */
  cropShape: PropTypes.oneOf(['rounded-square', 'circle', 'square']),
  /** Border radius for rounded-square mode */
  cropBorderRadius: PropTypes.number,
  /** Title shown above crop area */
  title: PropTypes.string,
};

export default ImageCropEditor;
