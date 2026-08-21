// =============================================================================
// Image processing — pure helpers and the output-cap encoder
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import {
  fitWithin,
  centerSquare,
  clampCrop,
  isImageFile,
  encodeUnderCap,
  FULL_MAX_EDGE,
  THUMB_SIZE,
  FULL_CAP_BYTES,
  FULL_QUALITY_LADDER,
  WORKING_MAX_EDGE,
} from '../lib/imageProcessing.js';

describe('fitWithin', () => {
  it('scales the long edge down to maxEdge and keeps aspect', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536, scale: 2048 / 4000 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600, scale: 0.4 });
  });

  it('never upscales', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600, scale: 1 });
    expect(fitWithin(1600, 1600, 1600).scale).toBe(1);
  });

  it('never collapses a dimension to zero', () => {
    const r = fitWithin(10000, 1, 100);
    expect(r.width).toBe(100);
    expect(r.height).toBe(1);
  });
});

describe('centerSquare', () => {
  it('takes the largest centered square', () => {
    expect(centerSquare(1600, 1200)).toEqual({ x: 200, y: 0, size: 1200 });
    expect(centerSquare(900, 1600)).toEqual({ x: 0, y: 350, size: 900 });
    expect(centerSquare(500, 500)).toEqual({ x: 0, y: 0, size: 500 });
  });
});

describe('clampCrop', () => {
  it('keeps a valid crop unchanged', () => {
    expect(clampCrop({ x: 10, y: 20, size: 100 }, 400, 300)).toEqual({ x: 10, y: 20, size: 100 });
  });

  it('pulls a crop that overhangs back inside the image', () => {
    expect(clampCrop({ x: 350, y: 250, size: 100 }, 400, 300)).toEqual({ x: 300, y: 200, size: 100 });
    expect(clampCrop({ x: -30, y: -5, size: 100 }, 400, 300)).toEqual({ x: 0, y: 0, size: 100 });
  });

  it('shrinks a crop larger than the image to the short edge', () => {
    expect(clampCrop({ x: 0, y: 0, size: 900 }, 400, 300)).toEqual({ x: 0, y: 0, size: 300 });
  });

  it('passes null through', () => {
    expect(clampCrop(null, 400, 300)).toBeNull();
  });
});

describe('isImageFile', () => {
  it('accepts any image/* type — there is no user-facing format or size gate', () => {
    expect(isImageFile({ type: 'image/jpeg', name: 'a.jpg', size: 50 * 1024 * 1024 })).toBe(true);
    expect(isImageFile({ type: 'image/heic', name: 'IMG_0001.HEIC' })).toBe(true);
    expect(isImageFile({ type: 'image/avif', name: 'x' })).toBe(true);
  });

  it('falls back to the extension when the platform gives no MIME type', () => {
    expect(isImageFile({ type: '', name: 'IMG_0001.heic' })).toBe(true);
    expect(isImageFile({ type: '', name: 'photo.TIF' })).toBe(true);
  });

  it('rejects non-images', () => {
    expect(isImageFile({ type: 'application/pdf', name: 'spec.pdf' })).toBe(false);
    expect(isImageFile({ type: '', name: 'notes.txt' })).toBe(false);
    expect(isImageFile(null)).toBe(false);
  });
});

describe('encodeUnderCap', () => {
  const blobOf = (size) => ({ size });

  it('returns the first rung that fits the cap', async () => {
    const encode = vi.fn(async (q) => blobOf(q >= 0.85 ? 2_000_000 : 900_000));
    const { blob, quality } = await encodeUnderCap(encode, {
      capBytes: 1_000_000,
      ladder: [0.85, 0.78, 0.7],
    });
    expect(quality).toBe(0.78);
    expect(blob.size).toBe(900_000);
    expect(encode).toHaveBeenCalledTimes(2);
  });

  it('encodes once when the first rung already fits', async () => {
    const encode = vi.fn(async () => blobOf(100));
    const { quality } = await encodeUnderCap(encode, { capBytes: 1000, ladder: [0.85, 0.7] });
    expect(quality).toBe(0.85);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('returns the last rung even when nothing fits — the caller decides', async () => {
    const encode = vi.fn(async () => blobOf(5_000_000));
    const { blob, quality } = await encodeUnderCap(encode, {
      capBytes: 1_000_000,
      ladder: [0.85, 0.6],
    });
    expect(quality).toBe(0.6);
    expect(blob.size).toBe(5_000_000);
    expect(encode).toHaveBeenCalledTimes(2);
  });
});

describe('pipeline constants', () => {
  it('renditions sit below the working size, and the cap below the bucket limit', () => {
    expect(FULL_MAX_EDGE).toBeLessThanOrEqual(WORKING_MAX_EDGE);
    expect(THUMB_SIZE).toBeLessThan(FULL_MAX_EDGE);
    // Bucket file_size_limit is 2 MB (migration 20260820120000)
    expect(FULL_CAP_BYTES).toBeLessThan(2 * 1024 * 1024);
    expect(FULL_QUALITY_LADDER[0]).toBeGreaterThan(FULL_QUALITY_LADDER.at(-1));
  });
});
