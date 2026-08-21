// ============================================================================
// QR Scanner Modal
// Camera-based QR code scanning with quick checkout/checkin actions.
// Resolves item AND package labels — both encode the same /?item=<id> deep
// link (see lib/qrData.js).
// ============================================================================

import { memo, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Flashlight } from 'lucide-react';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { getStatusColor } from '../utils';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import { useQRScanner } from '../hooks/useQRScanner.js';
import { parseScannedCode, resolveScannedCode, truncateScannedCode } from '../lib/qrData.js';

export const QRScannerModal = memo(function QRScannerModal({
  inventory,
  packages,
  onItemFound,
  onPackageFound,
  onQuickCheckout,
  onQuickCheckin,
  onClose,
}) {
  const [lookupError, setLookupError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [manualCode, setManualCode] = useState('');
  // { type: 'item' | 'package', entity } — what the last scan resolved to
  const [found, setFound] = useState(null);
  // Whether the current find came from the camera — Scan Another restarts
  // the camera for camera finds, but must not surprise a manual-entry user
  // with a permission prompt
  const foundViaCameraRef = useRef(false);

  // Camera lifecycle, throttled decode, dedupe, and torch live in the shared
  // hook; the onCode callback always sees current props/state.
  const {
    videoRef,
    canvasRef,
    scanning,
    cameraError,
    startScanning,
    stopScanning,
    torchSupported,
    torchOn,
    toggleTorch,
  } = useQRScanner({
    onCode: (raw) => {
      const code = parseScannedCode(raw);
      setLastScanned(code);
      const target = resolveScannedCode(code, inventory, packages);
      if (target) {
        stopScanning();
        foundViaCameraRef.current = true;
        setFound(target);
        setLookupError(null);
      } else {
        // Keep scanning — the dedupe window lets the user re-aim and retry.
        setLookupError(`No item found for code "${truncateScannedCode(code)}"`);
      }
    },
  });

  const handleStartCamera = () => {
    setLookupError(null);
    setFound(null);
    startScanning();
  };

  // Auto-start the camera on open — scanning is the whole point of this
  // modal, and the extra "Start Camera" tap was pure friction at the cage.
  // If there is no camera (or permission is denied) cameraError shows and
  // manual entry still works; the Start Camera button remains as the retry.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    startScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle manual code entry (accepts bare IDs, serials, or pasted deep links)
  const handleManualLookup = () => {
    if (!manualCode.trim()) return;

    const target = resolveScannedCode(parseScannedCode(manualCode), inventory, packages);
    if (target) {
      foundViaCameraRef.current = false;
      setFound(target);
      setLookupError(null);
    } else {
      setLookupError(`No item found with code "${truncateScannedCode(manualCode)}"`);
    }
  };

  // Reset to scan the next label; camera finds resume scanning immediately
  const handleScanAnother = () => {
    setFound(null);
    setManualCode('');
    setLastScanned(null);
    if (foundViaCameraRef.current) {
      foundViaCameraRef.current = false;
      startScanning();
    }
  };

  // Lookup errors first: with the camera auto-starting, a headless or
  // camera-less environment always carries a cameraError, and it must not
  // mask the actionable "no item found" feedback from manual entry
  const error = lookupError || cameraError;

  const foundItem = found?.type === 'item' ? found.entity : null;
  const foundPackage = found?.type === 'package' ? found.entity : null;
  const isCheckedOut = foundItem?.status === 'checked-out';
  const isAvailable = foundItem?.status === 'available';

  return (
    <Modal
      onClose={() => {
        stopScanning();
        onClose();
      }}
      maxWidth={450}
    >
      <ModalHeader
        title="Scan QR Code"
        onClose={() => {
          stopScanning();
          onClose();
        }}
      />
      <div style={{ padding: spacing[4] }}>
        {/* FOUND PACKAGE CARD */}
        {foundPackage ? (
          <div>
            <div
              style={{
                background: `${withOpacity(colors.accent2, 10)}`,
                border: `1px solid ${withOpacity(colors.accent2, 30)}`,
                borderRadius: borderRadius.lg,
                padding: spacing[4],
                marginBottom: spacing[4],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: spacing[1],
                  marginBottom: spacing[1],
                  flexWrap: 'wrap',
                }}
              >
                <Badge text={foundPackage.id} color={colors.accent2} />
                <Badge text="Package" color={colors.accent2} />
              </div>
              <div
                style={{
                  fontWeight: typography.fontWeight.medium,
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.base,
                }}
              >
                {foundPackage.name}
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: colors.textMuted }}>
                {foundPackage.items?.length || 0} items
                {foundPackage.category ? ` • ${foundPackage.category}` : ''}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[2],
                marginBottom: spacing[4],
              }}
            >
              <Button
                fullWidth
                onClick={() => onPackageFound(foundPackage)}
                style={{ justifyContent: 'center' }}
              >
                View Package
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={handleScanAnother}
                style={{ justifyContent: 'center' }}
              >
                Scan Another Item
              </Button>
            </div>
          </div>
        ) : foundItem ? (
          <div>
            {/* Item Summary Card */}
            <div
              style={{
                background: `${withOpacity(colors.primary, 10)}`,
                border: `1px solid ${withOpacity(colors.primary, 30)}`,
                borderRadius: borderRadius.lg,
                padding: spacing[4],
                marginBottom: spacing[4],
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[3],
                  marginBottom: spacing[3],
                }}
              >
                {foundItem.image ? (
                  <img
                    src={foundItem.image}
                    alt=""
                    style={{
                      width: 64,
                      height: 64,
                      objectFit: 'cover',
                      borderRadius: borderRadius.md,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      background: `${withOpacity(colors.primary, 20)}`,
                      borderRadius: borderRadius.md,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.textMuted,
                      fontSize: typography.fontSize.xs,
                    }}
                  >
                    No img
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: spacing[1],
                      marginBottom: spacing[1],
                      flexWrap: 'wrap',
                    }}
                  >
                    <Badge text={foundItem.id} color={colors.primary} />
                    <Badge text={foundItem.status} color={getStatusColor(foundItem.status)} />
                  </div>
                  <div
                    style={{
                      fontWeight: typography.fontWeight.medium,
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.base,
                    }}
                  >
                    {foundItem.name}
                  </div>
                  <div
                    style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.textMuted,
                    }}
                  >
                    {foundItem.brand} • {foundItem.category}
                  </div>
                </div>
              </div>

              {/* Checkout info if checked out */}
              {isCheckedOut && foundItem.checkedOutTo && (
                <div
                  style={{
                    padding: spacing[2],
                    background: `${withOpacity(colors.checkedOut, 15)}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.sm,
                    color: colors.textSecondary,
                  }}
                >
                  Checked out to{' '}
                  <strong style={{ color: colors.textPrimary }}>{foundItem.checkedOutTo}</strong>
                  {foundItem.dueBack && <span> • Due {foundItem.dueBack}</span>}
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: spacing[2],
                marginBottom: spacing[4],
              }}
            >
              {/* Quick Check Out - only show if available */}
              {isAvailable && onQuickCheckout && (
                <Button
                  fullWidth
                  onClick={() => onQuickCheckout(foundItem)}
                  style={{
                    background: `linear-gradient(135deg, ${colors.available}, ${colors.accent2})`,
                    justifyContent: 'center',
                  }}
                >
                  ✓ Quick Check Out
                </Button>
              )}

              {/* Quick Check In - only show if checked out */}
              {isCheckedOut && onQuickCheckin && (
                <Button
                  fullWidth
                  onClick={() => onQuickCheckin(foundItem)}
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`,
                    justifyContent: 'center',
                  }}
                >
                  ↩ Quick Check In
                </Button>
              )}

              {/* View Details - always available */}
              <Button
                fullWidth
                variant="secondary"
                onClick={() => onItemFound(foundItem)}
                style={{ justifyContent: 'center' }}
              >
                View Full Details
              </Button>

              {/* Scan Another */}
              <Button
                fullWidth
                variant="secondary"
                onClick={handleScanAnother}
                style={{ justifyContent: 'center' }}
              >
                Scan Another Item
              </Button>
            </div>
          </div>
        ) : (
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
                marginBottom: spacing[4],
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

              {/* Scanning overlay - only show when scanning */}
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
                  {/* Scanning indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: spacing[3],
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.7)',
                      padding: `${spacing[1]}px ${spacing[3]}px`,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    Scanning...
                  </div>
                  {/* Torch toggle — rear cameras that support it */}
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
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
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                    >
                      <Flashlight size={18} />
                    </button>
                  )}
                </>
              )}

              {/* Camera not active placeholder - only show when not scanning */}
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
                  <svg
                    width={48}
                    height={48}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2h-4m4-6v-1m-2-2h1m-6 0h-1m-2 2v1m-4 6H3a2 2 0 0 1-2-2v-4m6 0H6m-2-2V9m2 2v1" />
                    <rect x="5" y="5" width="5" height="5" rx="1" />
                    <rect x="14" y="5" width="5" height="5" rx="1" />
                    <rect x="5" y="14" width="5" height="5" rx="1" />
                  </svg>
                  <p style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm }}>
                    Camera not active
                  </p>
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Error message */}
            {error && (
              <div
                style={{
                  background: `${withOpacity(colors.danger, 20)}`,
                  border: `1px solid ${withOpacity(colors.danger, 50)}`,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                  marginBottom: spacing[4],
                  color: colors.danger,
                  fontSize: typography.fontSize.sm,
                }}
              >
                {error}
              </div>
            )}

            {/* Camera control button */}
            {!scanning ? (
              <Button fullWidth onClick={handleStartCamera} style={{ marginBottom: spacing[4] }}>
                Start Camera
              </Button>
            ) : (
              <Button
                fullWidth
                variant="secondary"
                onClick={stopScanning}
                style={{ marginBottom: spacing[4] }}
              >
                Stop Camera
              </Button>
            )}

            {/* Manual entry section */}
            <div
              style={{
                borderTop: `1px solid ${colors.borderLight}`,
                paddingTop: spacing[4],
              }}
            >
              <label style={styles.label} htmlFor="qr-manual-code">
                Or enter code manually
              </label>
              <div style={{ display: 'flex', gap: spacing[2] }}>
                <input
                  id="qr-manual-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    setLookupError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  placeholder="Item ID or Serial Number"
                  style={{ ...styles.input, flex: 1 }}
                />
                <Button onClick={handleManualLookup} disabled={!manualCode.trim()}>
                  Lookup
                </Button>
              </div>
            </div>

            {/* Last scanned indicator */}
            {lastScanned && (
              <div
                style={{
                  marginTop: spacing[3],
                  padding: spacing[2],
                  background: `${withOpacity(colors.primary, 15)}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary,
                }}
              >
                Last scanned: <strong>{lastScanned}</strong>
              </div>
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
QRScannerModal.propTypes = {
  /** Full inventory array for item lookup */
  inventory: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      brand: PropTypes.string,
      status: PropTypes.string,
      condition: PropTypes.string,
      image: PropTypes.string,
      checkout: PropTypes.object,
    }),
  ).isRequired,
  /** Packages — package labels encode their pkg id in the same deep link */
  packages: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      items: PropTypes.array,
    }),
  ),
  /** Callback when an item is found (navigate to details) */
  onItemFound: PropTypes.func.isRequired,
  /** Callback when a package is found (navigate to the Packages view) */
  onPackageFound: PropTypes.func.isRequired,
  /** Callback for quick checkout action (omit to hide — permission-gated) */
  onQuickCheckout: PropTypes.func,
  /** Callback for quick check-in action (omit to hide — permission-gated) */
  onQuickCheckin: PropTypes.func,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
