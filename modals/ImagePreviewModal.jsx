// ============================================================================
// Image Preview Modal
// Full-size image view with options to replace or remove
// ============================================================================

import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { Pencil, Trash2, X } from 'lucide-react';
import { colors, spacing, borderRadius, typography } from '../theme.js';
import { Button } from '../components/ui.jsx';

const ImagePreviewModal = memo(function ImagePreviewModal({
  imageSrc,
  itemName,
  onReplace,
  onRemove,
  onClose,
}) {
  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[4],
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: spacing[4],
          right: spacing[4],
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: borderRadius.md,
          color: '#fff',
          cursor: 'pointer',
          padding: spacing[2],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Close"
      >
        <X size={24} />
      </button>

      {/* Full size image */}
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '75vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={imageSrc}
          alt={itemName || 'Item image'}
          style={{
            maxWidth: '100%',
            maxHeight: '75vh',
            objectFit: 'contain',
            borderRadius: borderRadius.lg,
          }}
        />
      </div>

      {/* Action buttons */}
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          display: 'flex',
          gap: spacing[3],
          marginTop: spacing[4],
        }}
      >
        <Button
          variant="secondary"
          onClick={onReplace}
          icon={Pencil}
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderColor: 'rgba(255,255,255,0.2)',
            color: '#fff',
          }}
        >
          Replace Image
        </Button>
        <Button
          variant="secondary"
          danger
          onClick={onRemove}
          icon={Trash2}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          Remove Image
        </Button>
      </div>
    </div>
  );
});

ImagePreviewModal.propTypes = {
  imageSrc: PropTypes.string.isRequired,
  itemName: PropTypes.string,
  onReplace: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ImagePreviewModal;
