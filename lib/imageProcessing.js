// =============================================================================
// Image Processing
// Browser-side pipeline that turns ANY decodable image — phone photo, camera
// JPEG, screenshot, transparent PNG, HEIC on Safari — into two JPEG renditions
// sized for the app, with the size cap enforced on the OUTPUT, never the input.
//
//   source ──decode──▶ working image (≤ WORKING_MAX_EDGE, alpha flattened)
//                          │
//                          ├─▶ full  : ≤ FULL_MAX_EDGE long edge (or the crop square)
//                          └─▶ thumb : THUMB_SIZE square, cover-cropped
//
// Each rendition is encoded once, stepping down the quality ladder only if the
// result exceeds its byte cap (grainy/noisy photos). Nothing is ever upscaled.
// The pure helpers (fitWithin, centerSquare, clampCrop, encodeUnderCap) are
// DOM-free so they unit-test under jsdom; the canvas work is isolated below.
// =============================================================================

/** Long edge of the in-memory working image everything else derives from */
export const WORKING_MAX_EDGE = 2048;
/** Long edge of the stored full-size rendition */
export const FULL_MAX_EDGE = 1600;
/** Edge of the square thumbnail rendition */
export const THUMB_SIZE = 480;
/** System-side ceilings on what gets stored — the bucket limit sits above these */
export const FULL_CAP_BYTES = 1.5 * 1024 * 1024;
export const THUMB_CAP_BYTES = 256 * 1024;
export const FULL_QUALITY_LADDER = [0.85, 0.78, 0.7, 0.6];
export const THUMB_QUALITY_LADDER = [0.82, 0.75, 0.65];
export const OUTPUT_TYPE = 'image/jpeg';

// -----------------------------------------------------------------------------
// Pure geometry
// -----------------------------------------------------------------------------

/**
 * Scale (width, height) to fit within maxEdge on the long side. Never upscales.
 * @returns {{width:number, height:number, scale:number}}
 */
export function fitWithin(width, height, maxEdge) {
  const longEdge = Math.max(width, height);
  if (!longEdge || longEdge <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height), scale: 1 };
  }
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** The largest centered square inside (width, height) */
export function centerSquare(width, height) {
  const size = Math.min(width, height);
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}

/** Clamp a square crop to the image bounds, shrinking it if it cannot fit */
export function clampCrop(crop, width, height) {
  if (!crop) return null;
  const size = Math.max(1, Math.min(crop.size, width, height));
  const x = Math.max(0, Math.min(crop.x, width - size));
  const y = Math.max(0, Math.min(crop.y, height - size));
  return { x, y, size };
}

/** Accept anything the browser might decode — the decoder is the real gate */
export function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  // Some platforms hand HEIC/HEIF over with an empty type
  return /\.(heic|heif|avif|jpe?g|png|gif|webp|bmp|tiff?)$/i.test(file.name || '');
}

// -----------------------------------------------------------------------------
// Encoding with an output cap
// -----------------------------------------------------------------------------

/**
 * Encode via `encode(quality)` stepping down `ladder` until the blob fits
 * `capBytes`. The last rung is returned even when over the cap — the caller
 * (and the bucket's own limit) decide what to do with a pathological image.
 * @param {(quality:number)=>Promise<Blob>} encode
 */
export async function encodeUnderCap(encode, { capBytes, ladder }) {
  let last = null;
  for (const quality of ladder) {
    const blob = await encode(quality);
    last = { blob, quality };
    if (blob.size <= capBytes) return last;
  }
  return last;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      type,
      quality,
    );
  });
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

async function sourceToBlob(source) {
  if (source instanceof Blob) return source;
  if (typeof source === 'string') {
    // Data URLs and same/cross-origin URLs alike — the bucket serves CORS
    // headers, so a cors fetch keeps the resulting canvas untainted
    const response = await fetch(source, { mode: 'cors' });
    if (!response.ok) throw new Error(`Could not load image (${response.status})`);
    return response.blob();
  }
  throw new Error('Unsupported image source');
}

function decodeViaImageElement(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ drawable: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This file is not an image the browser can open'));
    };
    img.src = url;
  });
}

/**
 * Decode to something drawImage accepts. createImageBitmap honours EXIF
 * orientation and decodes off the main thread; the <img> path is the fallback
 * for browsers/formats it rejects (e.g. HEIC on Safari decodes via <img>).
 */
async function decodeSource(source) {
  const blob = await sourceToBlob(source);
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { drawable: bitmap, width: bitmap.width, height: bitmap.height, bitmap };
    } catch {
      /* fall through to the element decoder */
    }
  }
  return decodeViaImageElement(blob);
}

function drawScaled(drawable, sx, sy, sw, sh, dw, dh) {
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  // JPEG has no alpha — flatten onto white so transparent PNG product shots
  // don't come out on black
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, dw, dh);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(drawable, sx, sy, sw, sh, 0, 0, dw, dh);
  return canvas;
}

/**
 * Decode `source` (File/Blob/data URL/URL) and downscale ONCE to the working
 * size. The result is what the crop editor previews and what both renditions
 * are rendered from — the multi-megapixel original is released immediately.
 * @returns {Promise<{canvas: HTMLCanvasElement, width: number, height: number}>}
 */
export async function loadWorkingImage(source) {
  const decoded = await decodeSource(source);
  if (!decoded.width || !decoded.height) throw new Error('Image has no pixels');
  const { width, height } = fitWithin(decoded.width, decoded.height, WORKING_MAX_EDGE);
  const canvas = drawScaled(decoded.drawable, 0, 0, decoded.width, decoded.height, width, height);
  decoded.bitmap?.close?.();
  return { canvas, width, height };
}

// -----------------------------------------------------------------------------
// Renditions
// -----------------------------------------------------------------------------

/**
 * Render a rendition from the working image.
 * @param {{canvas, width, height}} working
 * @param {{maxEdge:number, square?:boolean, crop?:{x,y,size}|null}} opts
 *   - crop: square region in working-image pixels (from the crop editor)
 *   - square: cover-crop to a centered square when no crop is given
 */
export function renderRendition(working, { maxEdge, square = false, crop = null }) {
  const { canvas, width, height } = working;
  let region;
  if (crop) region = clampCrop(crop, width, height);
  else if (square) region = centerSquare(width, height);

  if (region) {
    const size = Math.min(region.size, maxEdge);
    return drawScaled(canvas, region.x, region.y, region.size, region.size, size, size);
  }
  const fitted = fitWithin(width, height, maxEdge);
  return drawScaled(canvas, 0, 0, width, height, fitted.width, fitted.height);
}

/**
 * Produce the two stored renditions as JPEG blobs.
 * @param {{canvas, width, height}} working
 * @param {{crop?: {x,y,size}|null}} opts
 * @returns {Promise<{full: Blob, thumb: Blob, width: number, height: number}>}
 */
export async function renderRenditions(working, { crop = null } = {}) {
  const fullCanvas = renderRendition(working, { maxEdge: FULL_MAX_EDGE, crop });
  const thumbCanvas = renderRendition(working, { maxEdge: THUMB_SIZE, square: true, crop });

  const [full, thumb] = await Promise.all([
    encodeUnderCap((q) => canvasToBlob(fullCanvas, OUTPUT_TYPE, q), {
      capBytes: FULL_CAP_BYTES,
      ladder: FULL_QUALITY_LADDER,
    }),
    encodeUnderCap((q) => canvasToBlob(thumbCanvas, OUTPUT_TYPE, q), {
      capBytes: THUMB_CAP_BYTES,
      ladder: THUMB_QUALITY_LADDER,
    }),
  ]);

  return {
    full: full.blob,
    thumb: thumb.blob,
    width: fullCanvas.width,
    height: fullCanvas.height,
  };
}

/**
 * One-shot: decode + downscale + render both renditions.
 */
export async function processImage(source, { crop = null } = {}) {
  const working = await loadWorkingImage(source);
  return renderRenditions(working, { crop });
}

/**
 * Small preview (object URL) of what will be stored — for form thumbnails.
 * Callers revoke the URL when done.
 */
export async function makePreviewUrl(working, { crop = null, maxEdge = 320 } = {}) {
  const canvas = renderRendition(working, { maxEdge, crop });
  const blob = await canvasToBlob(canvas, OUTPUT_TYPE, 0.8);
  return URL.createObjectURL(blob);
}
