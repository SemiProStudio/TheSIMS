// ============================================================================
// ImageField — the one image picker used by item forms, the image selector
// and the profile modal.
//
// Accepts any image the browser can open, at any size (no user-facing cap:
// the pipeline downscales before anything is stored). The picked file becomes
// a PENDING image — a downscaled working bitmap plus an optional square crop —
// that the owning form uploads when it saves. Nothing is uploaded, and no
// base64 is ever written to the database, from here.
//
//   value   : the persisted image URL (or null)
//   pending : { working, crop, previewUrl, name } | null
//   onChange({ value, pending })
// ============================================================================

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Crop, Upload, X } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { isImageFile, loadWorkingImage, makePreviewUrl } from '../lib/imageProcessing.js';
import ImageCropEditor from './ImageCropEditor.jsx';

const linkButton = {
  background: 'none',
  border: 'none',
  color: colors.primary,
  fontSize: typography.fontSize.sm,
  cursor: 'pointer',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: spacing[1],
  minHeight: 32,
};

export const ImageField = memo(function ImageField({
  value,
  pending,
  onChange,
  label = 'Image (Optional)',
  cropShape = 'square',
  cropTitle = 'Crop image',
  inputId,
  disabled = false,
  previewSize = 80,
  previewRadius = borderRadius.md,
  pendingHint = 'saved when you save the form',
}) {
  const autoId = useId();
  const id = inputId || `image-field-${autoId}`;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [cropping, setCropping] = useState(false);
  const inputRef = useRef(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  // Revoke the last preview URL when the field unmounts
  useEffect(
    () => () => {
      if (pendingRef.current?.previewUrl) URL.revokeObjectURL(pendingRef.current.previewUrl);
    },
    [],
  );

  const replacePending = useCallback(
    (next, nextValue = value) => {
      if (pending?.previewUrl && pending.previewUrl !== next?.previewUrl) {
        URL.revokeObjectURL(pending.previewUrl);
      }
      onChange({ value: nextValue, pending: next });
    },
    [onChange, pending, value],
  );

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    if (!isImageFile(file)) {
      setError('That file is not an image.');
      return;
    }
    setBusy(true);
    try {
      const working = await loadWorkingImage(file);
      const previewUrl = await makePreviewUrl(working);
      replacePending({ working, crop: null, previewUrl, name: file.name });
    } catch (err) {
      setError(err?.message || 'Could not open that image.');
    } finally {
      setBusy(false);
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = ''; // allow re-picking the same file
    handleFile(file);
  };

  // Crop opens on the pending working image, or loads the stored one first
  const handleCrop = async () => {
    setError(null);
    if (pending?.working) {
      setCropping(true);
      return;
    }
    if (!value) return;
    setBusy(true);
    try {
      const working = await loadWorkingImage(value);
      replacePending({ working, crop: null, previewUrl: null, name: null });
      setCropping(true);
    } catch (err) {
      setError(err?.message || 'Could not load the current image for cropping.');
    } finally {
      setBusy(false);
    }
  };

  const handleCropComplete = async (crop) => {
    setCropping(false);
    if (!pending?.working) return;
    try {
      const previewUrl = await makePreviewUrl(pending.working, { crop });
      replacePending({ ...pending, crop, previewUrl });
    } catch (err) {
      setError(err?.message || 'Could not apply the crop.');
    }
  };

  const handleRemove = () => {
    setError(null);
    replacePending(null, null);
  };

  const previewSrc = pending?.previewUrl || value;
  const hasImage = Boolean(previewSrc);
  const statusText = busy
    ? 'Preparing image…'
    : pending
      ? `${pending.crop ? 'Cropped' : 'Ready'} — ${pendingHint}`
      : 'Image attached';

  if (cropping && pending?.working) {
    return (
      <div style={{ marginBottom: spacing[4] }}>
        {label && <label style={styles.label}>{label}</label>}
        <ImageCropEditor
          working={pending.working}
          initialCrop={pending.crop}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setCropping(false);
            // Opened only to crop the stored image and backed out: drop the
            // pending copy so saving doesn't re-upload an identical photo
            if (!pending.crop && !pending.previewUrl) replacePending(null);
          }}
          cropShape={cropShape}
          title={cropTitle}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: spacing[4] }}>
      {label && (
        <label htmlFor={id} style={styles.label}>
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          padding: spacing[3],
          border: `1px dashed ${colors.border}`,
          borderRadius: borderRadius.md,
          background: colors.bgLight,
          opacity: disabled || busy ? 0.7 : 1,
        }}
      >
        {hasImage ? (
          <img
            src={previewSrc}
            alt="Preview"
            style={{
              width: previewSize,
              height: previewSize,
              objectFit: 'cover',
              borderRadius: previewRadius,
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: previewSize,
              height: previewSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: withOpacity(colors.primary, 10),
              borderRadius: previewRadius,
              color: colors.textMuted,
              flexShrink: 0,
            }}
          >
            <Upload size={24} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleInputChange}
            disabled={disabled || busy}
          />
          {hasImage ? (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                }}
              >
                {statusText}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: spacing[3],
                  marginTop: spacing[1],
                }}
              >
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={disabled || busy}
                  style={linkButton}
                >
                  <Upload size={14} /> Change
                </button>
                <button
                  type="button"
                  onClick={handleCrop}
                  disabled={disabled || busy}
                  style={linkButton}
                >
                  <Crop size={14} /> Crop
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || busy}
                  style={{ ...linkButton, color: colors.danger }}
                >
                  <X size={14} /> Remove image
                </button>
              </div>
            </>
          ) : (
            <>
              <label
                htmlFor={id}
                style={{
                  ...styles.btnSec,
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: disabled || busy ? 'not-allowed' : 'pointer',
                  fontSize: typography.fontSize.sm,
                }}
              >
                <Upload size={14} style={{ marginRight: spacing[1] }} />
                {busy ? 'Preparing image…' : 'Choose Image'}
              </label>
              <p
                style={{
                  margin: `${spacing[1]}px 0 0`,
                  fontSize: typography.fontSize.xs,
                  color: colors.textMuted,
                }}
              >
                Any photo, any size — large images are scaled down automatically
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          style={{
            margin: `${spacing[1]}px 0 0`,
            fontSize: typography.fontSize.xs,
            color: colors.danger,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
});

ImageField.propTypes = {
  value: PropTypes.string,
  pending: PropTypes.shape({
    working: PropTypes.object,
    crop: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number, size: PropTypes.number }),
    previewUrl: PropTypes.string,
    name: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  cropShape: PropTypes.oneOf(['rounded-square', 'circle', 'square']),
  cropTitle: PropTypes.string,
  inputId: PropTypes.string,
  disabled: PropTypes.bool,
  previewSize: PropTypes.number,
  previewRadius: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  /** Tail of the "Ready — …" status line; names the action that commits it */
  pendingHint: PropTypes.string,
};

export default ImageField;
