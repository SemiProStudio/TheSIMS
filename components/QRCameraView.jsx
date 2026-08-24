// ============================================================================
// QR Camera View
// The shared camera surface for QR scanning: video feed, reticle, status
// pill, torch toggle, not-active placeholder, error box, start/stop control,
// and manual code entry. QRScannerModal (lookup + quick actions) and
// PackListsView's ScanToPackOverlay (pack loop) render this same surface and
// differ only in what they DO with a resolved code — before extraction the
// overlay re-implemented all of this (~200 lines) with drifted cosmetics
// (reticle shadow, pill style, torch color). One rendering now.
// ============================================================================

import PropTypes from 'prop-types';
import { Flashlight } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { Button } from './ui.jsx';

export function QRCameraView({
  videoRef,
  canvasRef,
  scanning,
  errorMessage,
  onStartCamera,
  onStopCamera,
  torchSupported,
  torchOn,
  onToggleTorch,
  statusText,
  placeholderIcon,
  startIcon,
  sectionGap,
  cameraOverlay,
  manualLabel,
  manualInputId,
  manualValue,
  manualButtonLabel,
  onManualChange,
  onManualSubmit,
}) {
  return (
    <>
      {/* Camera view */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          background: colors.bgDark,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          marginBottom: sectionGap,
        }}
      >
        {/* Video element always rendered (hidden when not scanning) */}
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: scanning ? 'block' : 'none',
          }}
          playsInline
          muted
        />

        {scanning && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '60%',
                  border: `2px solid ${colors.primary}`,
                  borderRadius: borderRadius.lg,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: spacing[2],
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                padding: `${spacing[1]}px ${spacing[3]}px`,
                borderRadius: borderRadius.md,
                color: '#fff',
                fontSize: typography.fontSize.sm,
              }}
            >
              {statusText}
            </div>
            {/* Torch toggle — rear cameras that support it */}
            {torchSupported && (
              <button
                onClick={onToggleTorch}
                aria-label={torchOn ? 'Turn flashlight off' : 'Turn flashlight on'}
                aria-pressed={torchOn}
                style={{
                  position: 'absolute',
                  top: spacing[2],
                  right: spacing[2],
                  background: torchOn ? colors.primary : 'rgba(0,0,0,0.7)',
                  border: 'none',
                  borderRadius: borderRadius.md,
                  padding: spacing[2],
                  color: torchOn ? colors.onPrimary : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <Flashlight size={18} />
              </button>
            )}
          </>
        )}

        {!scanning && (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
            }}
          >
            {placeholderIcon}
            <p style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>
              Camera not active
            </p>
          </div>
        )}

        {cameraOverlay}

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {/* Error message */}
      {errorMessage && (
        <div
          style={{
            background: `${withOpacity(colors.danger, 20)}`,
            border: `1px solid ${withOpacity(colors.danger, 50)}`,
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: sectionGap,
            color: colors.danger,
            fontSize: typography.fontSize.sm,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Camera control button */}
      {!scanning ? (
        <Button
          fullWidth
          onClick={onStartCamera}
          icon={startIcon}
          style={{ marginBottom: sectionGap }}
        >
          Start Camera
        </Button>
      ) : (
        <Button
          fullWidth
          variant="secondary"
          onClick={onStopCamera}
          style={{ marginBottom: sectionGap }}
        >
          Stop Camera
        </Button>
      )}

      {/* Manual entry section */}
      <div
        style={{
          borderTop: `1px solid ${colors.borderLight}`,
          paddingTop: sectionGap,
        }}
      >
        <label style={styles.label} htmlFor={manualInputId}>
          {manualLabel}
        </label>
        <div style={{ display: 'flex', gap: spacing[2] }}>
          <input
            id={manualInputId}
            type="text"
            value={manualValue}
            onChange={onManualChange}
            onKeyDown={(e) => e.key === 'Enter' && onManualSubmit()}
            placeholder="Item ID or Serial Number"
            style={{ ...styles.input, flex: 1 }}
          />
          <Button onClick={onManualSubmit} disabled={!manualValue.trim()}>
            {manualButtonLabel}
          </Button>
        </div>
      </div>
    </>
  );
}

QRCameraView.propTypes = {
  videoRef: PropTypes.object.isRequired,
  canvasRef: PropTypes.object.isRequired,
  scanning: PropTypes.bool.isRequired,
  /** The message shown in the red box (hosts decide precedence/merging) */
  errorMessage: PropTypes.string,
  onStartCamera: PropTypes.func.isRequired,
  onStopCamera: PropTypes.func.isRequired,
  torchSupported: PropTypes.bool,
  torchOn: PropTypes.bool,
  onToggleTorch: PropTypes.func,
  /** Pill text while scanning ("Scanning..." / "Point camera at QR label...") */
  statusText: PropTypes.node.isRequired,
  /** Icon shown in the camera-off placeholder */
  placeholderIcon: PropTypes.node,
  /** Optional icon component for the Start Camera button */
  startIcon: PropTypes.elementType,
  /** Vertical rhythm between sections (hosts differ: modal 16, overlay 12) */
  sectionGap: PropTypes.number.isRequired,
  /** Extra layer rendered inside the camera box (e.g. scan-feedback flash) */
  cameraOverlay: PropTypes.node,
  manualLabel: PropTypes.node.isRequired,
  manualInputId: PropTypes.string.isRequired,
  manualValue: PropTypes.string.isRequired,
  manualButtonLabel: PropTypes.node.isRequired,
  onManualChange: PropTypes.func.isRequired,
  onManualSubmit: PropTypes.func.isRequired,
};
