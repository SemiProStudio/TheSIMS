// ============================================================================
// Image Selector Modal
// Change an item's photo from the detail view. The picker (ImageField) holds
// the processed image as PENDING; "Use This Image" is the single commit point
// that uploads and hands the URL to the caller, which persists it and cleans
// up the previous object only after that write succeeds.
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { Image, Loader2, Trash2 } from 'lucide-react';
import { spacing } from '../theme.js';
import { Button } from '../components/ui.jsx';
import ImageField from '../components/ImageField.jsx';
import { Modal, ModalHeader, ModalFooter } from './ModalBase.jsx';

import { error as logError } from '../lib/logger.js';

export const ImageSelectorModal = memo(function ImageSelectorModal({
  currentImage,
  itemId,
  onSelect,
  onClose,
}) {
  // `value` mirrors the stored image until the user removes it; `pending` is
  // the newly picked (processed, not yet uploaded) photo
  const [value, setValue] = useState(currentImage || null);
  const [pending, setPending] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = ({ value: nextValue, pending: nextPending }) => {
    setValue(nextValue);
    setPending(nextPending);
    setError(null);
  };

  const handleUseImage = async () => {
    if (!pending?.working) return;
    setUploading(true);
    setError(null);
    try {
      const { storageService } = await import('../lib/index.js');
      if (!itemId) throw new Error('This item has no id yet — save it first.');
      const result = await storageService.uploadPending(pending, itemId);
      onSelect(result.url);
    } catch (err) {
      logError('Image upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removed = Boolean(currentImage) && !value && !pending;

  return (
    <Modal onClose={onClose} maxWidth={500}>
      <ModalHeader title="Item Photo" onClose={onClose} />
      <div className="modal-body" style={{ padding: spacing[4] }}>
        <ImageField
          label="Photo"
          value={value}
          pending={pending}
          onChange={handleChange}
          inputId="image-selector-upload"
          cropTitle="Crop item photo"
          disabled={uploading}
          previewSize={96}
          pendingHint="click Use This Image to save it"
        />
        {error && (
          <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>
            {error}
          </p>
        )}
      </div>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        {removed ? (
          <Button variant="secondary" danger onClick={() => onSelect(null)} icon={Trash2}>
            Remove Photo
          </Button>
        ) : (
          <Button
            onClick={handleUseImage}
            disabled={!pending?.working || uploading}
            icon={uploading ? Loader2 : Image}
            className={uploading ? 'btn-busy' : undefined}
            aria-busy={uploading}
          >
            {uploading ? 'Uploading…' : 'Use This Image'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
});

// ============================================================================
// PropTypes
// ============================================================================
ImageSelectorModal.propTypes = {
  /** Current image URL */
  currentImage: PropTypes.string,
  /** Item ID for storage upload */
  itemId: PropTypes.string,
  /** Callback with the new image URL (or null to remove) */
  onSelect: PropTypes.func.isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
