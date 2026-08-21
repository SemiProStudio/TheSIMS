// =============================================================================
// SIMS Storage Service
// Uploads processed image renditions to Supabase Storage (see imageProcessing)
// =============================================================================

import { getSupabase } from './supabase.js';

import { error as logError } from './logger.js';
import { processImage, renderRenditions, OUTPUT_TYPE } from './imageProcessing.js';

// Storage bucket name
const BUCKET_NAME = 'equipment-images';

/**
 * Server-side backstop. Renditions are capped well below this by
 * imageProcessing (FULL_CAP_BYTES); the bucket's file_size_limit mirrors it.
 * There is deliberately NO cap on what a user may pick — the pipeline
 * downscales before anything is uploaded.
 */
export const STORED_IMAGE_LIMIT_BYTES = 2 * 1024 * 1024;

const UPLOAD_OPTIONS = {
  contentType: OUTPUT_TYPE,
  cacheControl: '31536000', // immutable names → cache for a year
  upsert: false,
};

/**
 * Storage service for handling file uploads
 */
export const storageService = {
  /**
   * Upload already-rendered renditions under `folder` (an item id, or
   * `profiles/<uid>`). Names are timestamped so every upload is a new
   * immutable object; callers delete the previous one AFTER their DB write
   * commits. The thumbnail is best-effort — OptimizedImage falls back to the
   * full image when it is missing.
   * @param {{full: Blob, thumb: Blob}} renditions
   * @param {string} folder
   * @returns {Promise<{url: string, path: string, thumbnailUrl: string}>}
   */
  async uploadRenditions({ full, thumb }, folder) {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Image storage is not available');
    if (!folder) throw new Error('No storage folder provided');
    if (!full) throw new Error('No image to upload');
    if (full.size > STORED_IMAGE_LIMIT_BYTES) {
      // The quality ladder could not get this under the ceiling — a broken
      // image rather than a big one (noise, or an encoder bug)
      throw new Error('Image could not be compressed enough to store');
    }

    const basePath = `${folder}/${Date.now()}`;
    const bucket = supabase.storage.from(BUCKET_NAME);

    const [fullResult, thumbResult] = await Promise.all([
      bucket.upload(`${basePath}.jpg`, full, UPLOAD_OPTIONS),
      thumb ? bucket.upload(`${basePath}_thumb.jpg`, thumb, UPLOAD_OPTIONS) : { data: null },
    ]);

    if (fullResult.error) {
      logError('Full image upload error:', fullResult.error);
      // Don't leave a thumb without its full image
      if (thumbResult?.data?.path) await bucket.remove([thumbResult.data.path]).catch(() => {});
      throw new Error(`Upload failed: ${fullResult.error.message}`);
    }
    if (thumbResult?.error) logError('Thumbnail upload error:', thumbResult.error);

    const { data: fullUrlData } = bucket.getPublicUrl(fullResult.data.path);
    const { data: thumbUrlData } = bucket.getPublicUrl(
      thumbResult?.data?.path || fullResult.data.path,
    );

    return {
      url: fullUrlData.publicUrl,
      path: fullResult.data.path,
      thumbnailUrl: thumbUrlData.publicUrl,
    };
  },

  /**
   * Process any image source (File/Blob/data URL/URL) through the pipeline and
   * upload both renditions.
   * @param {File|Blob|string} source
   * @param {string} folder
   * @param {{crop?: {x:number,y:number,size:number}|null}} [opts]
   * @returns {Promise<{url: string, path: string, thumbnailUrl: string, width: number, height: number}>}
   */
  async uploadImage(source, folder, { crop = null } = {}) {
    const { full, thumb, width, height } = await processImage(source, { crop });
    const result = await this.uploadRenditions({ full, thumb }, folder);
    return { ...result, width, height };
  },

  /**
   * Upload a form's PENDING image (from components/ImageField): the already
   * downscaled working bitmap plus its optional crop. Releases the preview URL.
   * @param {{working: {canvas, width, height}, crop?: object|null, previewUrl?: string}} pending
   * @param {string} folder
   */
  async uploadPending(pending, folder) {
    if (!pending?.working) throw new Error('No pending image');
    const { full, thumb, width, height } = await renderRenditions(pending.working, {
      crop: pending.crop || null,
    });
    const result = await this.uploadRenditions({ full, thumb }, folder);
    if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    return { ...result, width, height };
  },

  /**
   * Delete an image from Supabase Storage (including thumbnail)
   * @param {string} path - The storage path of the image
   * @returns {Promise<boolean>}
   */
  async deleteImage(path) {
    if (!path) {
      return true;
    }

    const supabase = await getSupabase();
    if (!supabase) {
      return true;
    }

    // Also try to delete thumbnail
    const thumbPath = path.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '_thumb.jpg');
    const pathsToDelete = [path];
    if (thumbPath !== path) {
      pathsToDelete.push(thumbPath);
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);

    if (error) {
      logError('Delete error:', error);
      return false;
    }

    return true;
  },

  /**
   * Delete all images for an item
   * @param {string} itemId - The item ID
   * @returns {Promise<boolean>}
   */
  async deleteItemImages(itemId) {
    const supabase = await getSupabase();
    if (!supabase) {
      return true;
    }

    // List all files in the item's folder
    const { data: files, error: listError } = await supabase.storage.from(BUCKET_NAME).list(itemId);

    if (listError) {
      logError('List error:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true;
    }

    // Delete all files
    const paths = files.map((f) => `${itemId}/${f.name}`);
    const { error } = await supabase.storage.from(BUCKET_NAME).remove(paths);

    if (error) {
      logError('Delete error:', error);
      return false;
    }

    return true;
  },

  /**
   * Get a signed URL for private access (if bucket is not public)
   * @param {string} path - The storage path
   * @param {number} expiresIn - Seconds until expiration (default 1 hour)
   * @returns {Promise<string | null>}
   */
  async getSignedUrl(path, expiresIn = 3600) {
    if (!path) {
      return null;
    }

    const supabase = await getSupabase();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, expiresIn);

    if (error) {
      logError('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Check if the storage bucket exists and is accessible
   * @returns {Promise<boolean>}
   */
  async checkBucket() {
    const supabase = await getSupabase();
    if (!supabase) {
      return false;
    }

    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_NAME);
      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Initialize storage bucket (run once during setup)
   * Note: This requires admin/service role key, not anon key
   * @returns {Promise<boolean>}
   */
  async initBucket() {
    const supabase = await getSupabase();
    if (!supabase) {
      return false;
    }

    try {
      // Check if bucket exists
      const { data: existing } = await supabase.storage.getBucket(BUCKET_NAME);

      if (existing) {
        return true;
      }

      // Create bucket (requires service role key)
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: STORED_IMAGE_LIMIT_BYTES,
        allowedMimeTypes: [OUTPUT_TYPE],
      });

      if (error) {
        logError('Bucket creation error:', error);
        return false;
      }

      return true;
    } catch (err) {
      logError('Bucket init error:', err);
      return false;
    }
  },
};

/**
 * Helper to check if a URL is a data URL (base64)
 */
export function isDataUrl(url) {
  return url && url.startsWith('data:');
}

/**
 * Helper to check if a URL is a Supabase Storage URL
 */
export function isStorageUrl(url) {
  return url && (url.includes('supabase.co/storage') || url.includes('supabase.in/storage'));
}

/**
 * Helper to extract storage path from URL
 */
export function getStoragePathFromUrl(url) {
  if (!isStorageUrl(url)) return null;

  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^?]+)/);
    return pathMatch ? pathMatch[1].replace(`${BUCKET_NAME}/`, '') : null;
  } catch {
    return null;
  }
}

/**
 * Get thumbnail URL from full image URL
 * @param {string} url - The full image URL
 * @returns {string} - The thumbnail URL (or original if not a storage URL)
 */
export function getThumbnailUrl(url) {
  if (!url) return url;

  // If it's a data URL, return as-is
  if (isDataUrl(url)) return url;

  // If it's already a thumbnail, return as-is
  if (url.includes('_thumb.')) return url;

  // If it's a Supabase storage URL, convert to thumbnail URL
  if (isStorageUrl(url)) {
    return url.replace(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i, '_thumb.jpg$2');
  }

  return url;
}

export default storageService;
