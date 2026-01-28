// =============================================================================
// SIMS Storage Service
// Handles file uploads to Supabase Storage
// =============================================================================

import { getSupabase, isDemoMode } from './supabase.js';

// Storage bucket name
const BUCKET_NAME = 'equipment-images';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Helper to convert file to base64 (for demo mode)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result, path: null });
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Storage service for handling file uploads
 */
export const storageService = {
  /**
   * Upload an image file to Supabase Storage
   * @param {File} file - The file to upload
   * @param {string} itemId - The item ID (used for organizing files)
   * @returns {Promise<{url: string, path: string} | null>}
   */
  async uploadImage(file, itemId) {
    // In demo mode, convert to base64 and return data URL
    if (isDemoMode) {
      return fileToBase64(file);
    }
    
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

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${itemId}/${timestamp}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  },

  /**
   * Upload an image from a data URL (base64)
   * @param {string} dataUrl - The base64 data URL
   * @param {string} itemId - The item ID
   * @returns {Promise<{url: string, path: string} | null>}
   */
  async uploadFromDataUrl(dataUrl, itemId) {
    // In demo mode, just return the data URL as-is
    if (isDemoMode) {
      return { url: dataUrl, path: null };
    }
    
    const supabase = await getSupabase();
    if (!supabase) {
      return { url: dataUrl, path: null };
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
   * Delete an image from Supabase Storage
   * @param {string} path - The storage path of the image
   * @returns {Promise<boolean>}
   */
  async deleteImage(path) {
    if (isDemoMode || !path) {
      return true;
    }
    
    const supabase = await getSupabase();
    if (!supabase) {
      return true;
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
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
    if (isDemoMode) {
      return true;
    }
    
    const supabase = await getSupabase();
    if (!supabase) {
      return true;
    }

    // List all files in the item's folder
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(itemId);

    if (listError) {
      console.error('List error:', listError);
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
      console.error('Delete error:', error);
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
    if (isDemoMode || !path) {
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
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Check if the storage bucket exists and is accessible
   * @returns {Promise<boolean>}
   */
  async checkBucket() {
    if (isDemoMode) {
      return true;
    }
    
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
    if (isDemoMode) {
      return true;
    }
    
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
        console.error('Bucket creation error:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Bucket init error:', err);
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

export default storageService;
