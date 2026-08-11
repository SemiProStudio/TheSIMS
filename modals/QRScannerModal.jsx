// ============================================================================
// QR Scanner Modal
// Camera-based QR code scanning with quick checkout/checkin actions
// ============================================================================

import { memo, useState } from 'react';
import PropTypes from 'prop-types';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme.js';
import { getStatusColor } from '../utils';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import { useQRScanner } from '../hooks/useQRScanner.js';
import { parseScannedCode } from '../lib/qrData.js';

export const QRScannerModal = memo(function QRScannerModal({
  inventory,
  onItemFound,
  onQuickCheckout,
  onQuickCheckin,
  onClose,
}) {
  const [lookupError, setLookupError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [foundItem, setFoundItem] = useState(null);

  const findByCode = (code) =>
    inventory.find(
      (i) =>
        i.id.toLowerCase() === code.toLowerCase() ||
        i.serialNumber?.toLowerCase() === code.toLowerCase(),
    );

  // Camera lifecycle, throttled decode, and dedupe live in the shared hook;
  // the onCode callback always sees current props/state.
  const { videoRef, canvasRef, scanning, cameraError, startScanning, stopScanning } = useQRScanner({
    onCode: (raw) => {
      const code = parseScannedCode(raw);
      setLastScanned(code);
      const item = findByCode(code);
      if (item) {
        stopScanning();
        setFoundItem(item);
        setLookupError(null);
      } else {
        // Keep scanning — the dedupe window lets the user re-aim and retry.
        setLookupError(`No item found for code "${code}"`);
      }
    },
  });

  const handleStartCamera = () => {
    setLookupError(null);
    setFoundItem(null);
    startScanning();
  };

  // Handle manual code entry (accepts bare IDs, serials, or pasted deep links)
  const handleManualLookup = () => {
    if (!manualCode.trim()) return;

    const item = findByCode(parseScannedCode(manualCode));
    if (item) {
      setFoundItem(item);
      setLookupError(null);
    } else {
      setLookupError(`No item found with code "${manualCode}"`);
    }
  };

  // Reset to scan another item
  const handleScanAnother = () => {
    setFoundItem(null);
    setManualCode('');
    setLastScanned(null);
  };

  const error = cameraError || lookupError;

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
        {/* FOUND ITEM CARD - Quick Actions */}
        {foundItem ? (
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
  /** Callback when an item is found (navigate to details) */
  onItemFound: PropTypes.func.isRequired,
  /** Callback for quick checkout action */
  onQuickCheckout: PropTypes.func,
  /** Callback for quick check-in action */
  onQuickCheckin: PropTypes.func,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
