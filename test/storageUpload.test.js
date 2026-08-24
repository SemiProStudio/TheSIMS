// =============================================================================
// Storage service — rendition upload contract
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  isDemoMode: false,
  getSupabase: vi.fn(),
  supabase: null,
}));

const { storageService, STORED_IMAGE_LIMIT_BYTES, UPLOAD_TIMEOUT_MS } = await import('../lib/storage.js');

function makeBucket({ fullError = null, thumbError = null } = {}) {
  const uploads = [];
  const removed = [];
  const bucket = {
    upload: vi.fn(async (path, blob, options) => {
      uploads.push({ path, size: blob.size, options });
      if (path.endsWith('_thumb.jpg') && thumbError) return { data: null, error: thumbError };
      if (!path.endsWith('_thumb.jpg') && fullError) return { data: null, error: fullError };
      return { data: { path }, error: null };
    }),
    remove: vi.fn(async (paths) => {
      removed.push(...paths);
      return { data: paths, error: null };
    }),
    getPublicUrl: vi.fn((path) => ({
      data: { publicUrl: `https://proj.supabase.co/storage/v1/object/public/equipment-images/${path}` },
    })),
  };
  const client = { storage: { from: vi.fn(() => bucket) } };
  return { client, bucket, uploads, removed };
}

const blob = (size) => ({ size });

describe('storageService.uploadRenditions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  it('uploads full + thumb under a timestamped name with immutable caching', async () => {
    const { client, uploads } = makeBucket();
    getSupabase.mockResolvedValue(client);

    const result = await storageService.uploadRenditions(
      { full: blob(200_000), thumb: blob(30_000) },
      'CAM-00012',
    );

    expect(uploads.map((u) => u.path)).toEqual([
      'CAM-00012/1700000000000.jpg',
      'CAM-00012/1700000000000_thumb.jpg',
    ]);
    uploads.forEach((u) => {
      expect(u.options).toMatchObject({
        contentType: 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      });
    });
    expect(result.path).toBe('CAM-00012/1700000000000.jpg');
    expect(result.url).toMatch(/equipment-images\/CAM-00012\/1700000000000\.jpg$/);
    expect(result.thumbnailUrl).toMatch(/1700000000000_thumb\.jpg$/);
  });

  it('keeps the full image when only the thumbnail fails (display falls back to full)', async () => {
    const { client } = makeBucket({ thumbError: { message: 'boom' } });
    getSupabase.mockResolvedValue(client);

    const result = await storageService.uploadRenditions(
      { full: blob(200_000), thumb: blob(30_000) },
      'profiles/u1',
    );
    expect(result.url).toMatch(/profiles\/u1\/1700000000000\.jpg$/);
    expect(result.thumbnailUrl).toBe(result.url);
  });

  it('removes an orphaned thumbnail when the full upload fails, and throws', async () => {
    const { client, removed } = makeBucket({ fullError: { message: 'quota' } });
    getSupabase.mockResolvedValue(client);

    await expect(
      storageService.uploadRenditions({ full: blob(200_000), thumb: blob(30_000) }, 'CAM-00012'),
    ).rejects.toThrow(/Upload failed: quota/);
    expect(removed).toEqual(['CAM-00012/1700000000000_thumb.jpg']);
  });

  it('refuses a rendition the quality ladder could not get under the stored-image limit', async () => {
    const { client, uploads } = makeBucket();
    getSupabase.mockResolvedValue(client);

    await expect(
      storageService.uploadRenditions(
        { full: blob(STORED_IMAGE_LIMIT_BYTES + 1), thumb: blob(30_000) },
        'CAM-00012',
      ),
    ).rejects.toThrow(/could not be compressed/);
    expect(uploads).toHaveLength(0);
  });

  it('has no base64 fallback — without storage it throws instead of returning a data URL', async () => {
    getSupabase.mockResolvedValue(null);
    await expect(
      storageService.uploadRenditions({ full: blob(10), thumb: blob(5) }, 'CAM-00012'),
    ).rejects.toThrow(/not available/);
  });

  it('exposes no legacy entry points that accepted raw files or data URLs', () => {
    expect(storageService.uploadFromDataUrl).toBeUndefined();
    expect(storageService.uploadImage).toBeUndefined();
    expect(typeof storageService.uploadPending).toBe('function');
  });
});

describe('storageService.uploadRenditions — stalled network', () => {
  it('rejects with a timeout instead of hanging when the upload never settles', async () => {
    vi.useFakeTimers();
    try {
      const bucket = { upload: vi.fn(() => new Promise(() => {})), remove: vi.fn(), getPublicUrl: vi.fn() };
      getSupabase.mockResolvedValue({ storage: { from: () => bucket } });
      const pending = storageService.uploadRenditions({ full: blob(1000), thumb: blob(100) }, 'ITEM1');
      const assertion = expect(pending).rejects.toThrow(/timed out/);
      await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS + 10);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });
});
