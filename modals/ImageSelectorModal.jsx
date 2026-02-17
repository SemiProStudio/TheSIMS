// ============================================================================
// Image Selector Modal
// Upload and manage item images with storage integration
// ============================================================================

import { memo, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, Image, Trash2 } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme.js';
import { Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import ImageCropEditor from '../components/ImageCropEditor.jsx';

import { error as logError } from '../lib/logger.js';

export const ImageSelectorModal = memo(function ImageSelectorModal({
  images: _images,
  currentImage,
  itemId,
  onSelect,
  onClose
}) {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const selectedFileRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      setError(null);
      selectedFileRef.current = file;
      
      // Open crop editor
      const reader = new FileReader();
      reader.onload = (ev) => setCropSrc(ev.target.result);
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl) => {
    setUploadedImage(croppedDataUrl);
    setCropSrc(null);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
  };
  
  const handleUseImage = async () => {
    if (!uploadedImage) return;

    setUploading(true);
    setError(null);

    try {
      // Import storage service dynamically to avoid circular deps
      const { storageService, isStorageUrl, getStoragePathFromUrl } = await import('../lib/index.js');

      if (!itemId) {
        // No itemId, just use the data URL
        onSelect(uploadedImage);
      } else {
        // Delete old image from storage before uploading new one
        if (currentImage && isStorageUrl(currentImage)) {
          const oldPath = getStoragePathFromUrl(currentImage);
          if (oldPath) {
            await storageService.deleteImage(oldPath).catch(() => {});
          }
        }

        // Upload to Supabase Storage
        const result = await storageService.uploadFromDataUrl(uploadedImage, itemId);
        onSelect(result.url);
      }
    } catch (err) {
      logError('Image upload error:', err);
      setError(err.message || 'Failed to upload image');
      // Fall back to data URL if upload fails
      onSelect(uploadedImage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Select Image" onClose={onClose} />
      <div style={{ padding: cropSrc ? 0 : spacing[4] }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: borderRadius.md,
            padding: spacing[3],
            margin: cropSrc ? spacing[4] : 0,
            marginBottom: spacing[4],
            fontSize: '14px',
            color: colors.danger,
          }}>
            {error}
          </div>
        )}
        
        {cropSrc ? (
          /* Crop editor step */
          <ImageCropEditor
            imageSrc={cropSrc}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            outputSize={600}
            cropShape="square"
            title="Crop your image"
          />
        ) : (
          <>
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()} 
              style={{ 
                border: `2px dashed ${colors.border}`, 
                borderRadius: borderRadius.lg, 
                padding: spacing[6], 
                textAlign: 'center', 
                cursor: uploading ? 'not-allowed' : 'pointer', 
                marginBottom: spacing[4],
                opacity: uploading ? 0.6 : 1,
              }}
            >
              <Upload size={32} color={colors.textMuted} style={{ marginBottom: spacing[2] }} />
              <p style={{ color: colors.textMuted, margin: 0 }}>
                {uploading ? 'Uploading...' : 'Click to upload an image'}
              </p>
              <p style={{ color: colors.textMuted, margin: '8px 0 0', fontSize: '12px' }}>
                Max size: 5MB. Formats: JPG, PNG, WebP, GIF
              </p>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/gif" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                disabled={uploading}
              />
            </div>
            
            {uploadedImage && (
              <div style={{ marginBottom: spacing[4] }}>
                <p style={{ ...styles.label, marginBottom: spacing[2] }}>Preview</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                  <img 
                    src={uploadedImage} 
                    alt="Preview" 
                    style={{ 
                      width: 80, 
                      height: 80, 
                      objectFit: 'cover', 
                      borderRadius: borderRadius.md 
                    }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                    <Button 
                      onClick={handleUseImage} 
                      icon={uploading ? null : Image}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Use This Image'}
                    </Button>
                    <button
                      onClick={() => setCropSrc(uploadedImage)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.primary,
                        cursor: 'pointer',
                        fontSize: typography.fontSize.sm,
                        textAlign: 'left',
                      }}
                    >
                      Resize / Crop again
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {currentImage && (
              <Button
                variant="secondary"
                danger
                fullWidth
                onClick={async () => {
                  // Delete from storage if it's a storage URL
                  if (itemId) {
                    try {
                      const { storageService, isStorageUrl, getStoragePathFromUrl } = await import('../lib/index.js');
                      if (isStorageUrl(currentImage)) {
                        const path = getStoragePathFromUrl(currentImage);
                        if (path) await storageService.deleteImage(path).catch(() => {});
                      }
                    } catch (_e) { /* non-fatal */ }
                  }
                  onSelect(null);
                }}
                icon={Trash2}
                disabled={uploading}
              >
                Remove Current Image
              </Button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
ImageSelectorModal.propTypes = {
  /** Array of available image URLs (unused in current implementation) */
  images: PropTypes.arrayOf(PropTypes.string),
  /** Current image URL */
  currentImage: PropTypes.string,
  /** Item ID for storage upload */
  itemId: PropTypes.string,
  /** Callback when image is selected */
  onSelect: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
