// ============================================================================
// Image Preview Modal
// Full-size image view with options to replace or remove
// ============================================================================

import { memo } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography } from '../theme';
import { Button } from '../components/ui';

// ============================================================================
// Module-level style constants
// ============================================================================
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(0, 0, 0, 0.85)',
  ...styles.flexColCenter,
  padding: spacing[4],
} as const;

const closeBtnStyle = {
  position: 'absolute',
  top: spacing[4],
  right: spacing[4],
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: borderRadius.md,
  color: '#fff',
  cursor: 'pointer',
  padding: spacing[2],
  ...styles.flexColCenter,
} as const;

const imageContainerStyle = {
  maxWidth: '90vw',
  maxHeight: '75vh',
  ...styles.flexColCenter,
} as const;

interface ImagePreviewModalProps {
  imageSrc: string;
  itemName?: string;
  onReplace: () => void;
  onRemove: () => void;
  onClose: () => void;
}

const ImagePreviewModal = memo<ImagePreviewModalProps>(function ImagePreviewModal({
  imageSrc,
  itemName,
  onReplace,
  onRemove,
  onClose,
}) {
  return (
    <div 
      onClick={onClose}
      style={overlayStyle}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={closeBtnStyle}
        title="Close"
      >
        <X size={24} />
      </button>

      {/* Full size image */}
      <div 
        onClick={e => e.stopPropagation()}
        style={imageContainerStyle}
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
          ...styles.flexCenter,
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

export default ImagePreviewModal;
