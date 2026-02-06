// =============================================================================
// SIMS Storage Service
// Handles file uploads to Supabase Storage with thumbnail generation
// =============================================================================

import { getSupabase } from './supabase.js';

import { error as logError } from './logger.js';

// Storage bucket name
const BUCKET_NAME = 'equipment-images';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Image size settings
const FULL_SIZE_MAX = 1200; // Max dimension for full-size images
const THUMBNAIL_SIZE = 200; // Thumbnail dimension (square crop)

/**
 * Resize an image using canvas
 * @param {Blob|File} imageBlob - The image to resize
 * @param {number} maxSize - Maximum dimension
 * @param {boolean} square - Whether to crop to square
 * @returns {Promise<Blob>}
 */
async function resizeImage(imageBlob, maxSize, square = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let width = img.width;
      let height = img.height;
      let sx = 0, sy = 0, sWidth = width, sHeight = height;
      
      if (square) {
        // Crop to square from center
        const minDim = Math.min(width, height);
        sx = (width - minDim) / 2;
        sy = (height - minDim) / 2;
        sWidth = sHeight = minDim;
        width = height = maxSize;
      } else {
        // Maintain aspect ratio
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        0.85 // Quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

// Helper to convert file to base64 (fallback)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result, path: null, thumbnailUrl: reader.result });
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Storage service for handling file uploads
 */
export const storageService = {
  /**
   * Upload an image file to Supabase Storage (with thumbnail)
   * @param {File} file - The file to upload
   * @param {string} itemId - The item ID (used for organizing files)
   * @returns {Promise<{url: string, path: string, thumbnailUrl: string} | null>}
   */
  async uploadImage(file, itemId) {
    const supabase = await getSupabase();
    if (!supabase) {
      // Fall back to base64 if Supabase not available
      return fileToBase64(file);
    }

    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Generate unique filename base
    const timestamp = Date.now();
    const basePath = `${itemId}/${timestamp}`;
    
    try {
      // Resize full image (if needed) and create thumbnail
      const [fullBlob, thumbBlob] = await Promise.all([
        resizeImage(file, FULL_SIZE_MAX, false),
        resizeImage(file, THUMBNAIL_SIZE, true)
      ]);

      // Upload both images in parallel
      const [fullResult, thumbResult] = await Promise.all([
        supabase.storage
          .from(BUCKET_NAME)
          .upload(`${basePath}.jpg`, fullBlob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000', // 1 year cache
            upsert: false,
          }),
        supabase.storage
          .from(BUCKET_NAME)
          .upload(`${basePath}_thumb.jpg`, thumbBlob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: false,
          })
      ]);

      if (fullResult.error) {
        logError('Full image upload error:', fullResult.error);
        throw new Error(`Upload failed: ${fullResult.error.message}`);
      }

      if (thumbResult.error) {
        logError('Thumbnail upload error:', thumbResult.error);
        // Continue even if thumbnail fails - full image is more important
      }

      // Get public URLs
      const { data: fullUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fullResult.data.path);

      const { data: thumbUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(thumbResult.data?.path || fullResult.data.path);

      return {
        url: fullUrlData.publicUrl,
        path: fullResult.data.path,
        thumbnailUrl: thumbUrlData.publicUrl,
      };
    } catch (resizeError) {
      logError('Image processing error:', resizeError);
      // Fall back to uploading original without resize
      const extension = file.name.split('.').pop() || 'jpg';
      const filename = `${basePath}.${extension}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
        thumbnailUrl: urlData.publicUrl, // Same as full if resize failed
      };
    }
  },

  /**
   * Upload an image from a data URL (base64)
   * @param {string} dataUrl - The base64 data URL
   * @param {string} itemId - The item ID
   * @returns {Promise<{url: string, path: string, thumbnailUrl: string} | null>}
   */
  async uploadFromDataUrl(dataUrl, itemId) {
    const supabase = await getSupabase();
    if (!supabase) {
      return { url: dataUrl, path: null, thumbnailUrl: dataUrl };
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    
    // Create a File object
    const extension = dataUrl.includes('image/png') ? 'png' : 
                     dataUrl.includes('image/webp') ? 'webp' : 
                     dataUrl.includes('image/gif') ? 'gif' : 'jpg';
    const file = new File([blob], `image.${extension}`, { type: blob.type });
    
    return this.uploadImage(file, itemId);
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

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(pathsToDelete);

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
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(itemId);

    if (listError) {
      logError('List error:', listError);
      return false;
    }

    if (!files || files.length === 0) {
      return true;
    }

    // Delete all files
    const paths = files.map(f => `${itemId}/${f.name}`);
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(paths);

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
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
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
  return url && (
    url.includes('supabase.co/storage') || 
    url.includes('supabase.in/storage')
  );
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
