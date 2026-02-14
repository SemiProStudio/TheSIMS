// ============================================================================
// QR Scanner Modal
// Camera-based QR code scanning with quick checkout/checkin actions
// ============================================================================

import { memo, useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { colors, styles, spacing, borderRadius, typography, withOpacity } from '../theme';
import { getStatusColor } from '../utils';
import { Badge, Button } from '../components/ui';
import { Modal, ModalHeader } from './ModalBase';

import { error as logError } from '../lib/logger';

// ============================================================================
// Module-level style constants
// ============================================================================
const foundItemBannerStyle = {
  background: `${withOpacity(colors.primary, 10)}`,
  border: `1px solid ${withOpacity(colors.primary, 30)}`,
  borderRadius: borderRadius.lg,
  padding: spacing[4],
  marginBottom: spacing[4],
} as const;

const noImgStyle = {
  width: 64,
  height: 64,
  background: `${withOpacity(colors.primary, 20)}`,
  borderRadius: borderRadius.md,
  ...styles.flexColCenter,
  color: colors.textMuted,
  fontSize: typography.fontSize.xs,
} as const;

const cameraContainerStyle = {
  position: 'relative',
  width: '100%',
  aspectRatio: '4/3',
  background: colors.bgDark,
  borderRadius: borderRadius.lg,
  overflow: 'hidden',
  marginBottom: spacing[4],
} as const;

const scanOverlayStyle = {
  position: 'absolute',
  inset: 0,
  ...styles.flexColCenter,
  pointerEvents: 'none',
} as const;

const cameraPlaceholderStyle = {
  width: '100%',
  height: '100%',
  ...styles.flexColCenter,
  color: colors.textMuted,
} as const;

const errorBannerStyle = {
  background: `${withOpacity(colors.danger, 20)}`,
  border: `1px solid ${withOpacity(colors.danger, 50)}`,
  borderRadius: borderRadius.md,
  padding: spacing[3],
  marginBottom: spacing[4],
  color: colors.danger,
  fontSize: typography.fontSize.sm,
} as const;

interface QRScannerModalProps {
  inventory: {
    id: string;
    name: string;
    brand?: string;
    status?: string;
    condition?: string;
    image?: string;
    checkout?: Record<string, any>;
  }[];
  onItemFound: (item: any) => void;
  onQuickCheckout?: (item: any) => void;
  onQuickCheckin?: (item: any) => void;
  onClose: () => void;
}

export const QRScannerModal = memo<QRScannerModalProps>(function QRScannerModal({
  inventory,
  onItemFound,
  onQuickCheckout,
  onQuickCheckin,
  onClose
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);
  
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [foundItem, setFoundItem] = useState(null);
  
  // Start camera and scanning
  const startScanning = async () => {
    try {
      setError(null);
      setFoundItem(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanFrame();
      }
    } catch (err) {
      logError('Camera error:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera access and try again.' 
        : 'Could not access camera. Try entering the code manually below.');
    }
  };
  
  // Stop camera
  const stopScanning = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
  };
  
  // Scan video frame for QR codes
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = decodeQRFromImageData(imageData);
      
      if (code && code !== lastScanned) {
        setLastScanned(code);
        handleCodeFound(code);
      }
    }
    
    animationRef.current = requestAnimationFrame(scanFrame);
  };
  
  // Decode QR code from canvas image data using jsQR
  const decodeQRFromImageData = (imageData) => {
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    return code ? code.data : null;
  };
  
  // Handle found code
  const handleCodeFound = (code) => {
    const item = inventory.find(i => 
      i.id.toLowerCase() === code.toLowerCase() ||
      i.serialNumber?.toLowerCase() === code.toLowerCase()
    );
    
    if (item) {
      stopScanning();
      setFoundItem(item);
    }
  };
  
  // Handle manual code entry
  const handleManualLookup = () => {
    if (!manualCode.trim()) return;
    
    const item = inventory.find(i => 
      i.id.toLowerCase() === manualCode.trim().toLowerCase() ||
      i.serialNumber?.toLowerCase() === manualCode.trim().toLowerCase()
    );
    
    if (item) {
      setFoundItem(item);
      setError(null);
    } else {
      setError(`No item found with code "${manualCode}"`);
    }
  };
  
  // Reset to scan another item
  const handleScanAnother = () => {
    setFoundItem(null);
    setManualCode('');
    setLastScanned(null);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => stopScanning();
  }, []);
  
  const isCheckedOut = foundItem?.status === 'checked-out';
  const isAvailable = foundItem?.status === 'available';
  
  return (
    <Modal onClose={() => { stopScanning(); onClose(); }} maxWidth={450}>
      <ModalHeader title="Scan QR Code" onClose={() => { stopScanning(); onClose(); }} />
      <div style={{ padding: spacing[4] }}>
        
        {/* FOUND ITEM CARD - Quick Actions */}
        {foundItem ? (
          <div>
            {/* Item Summary Card */}
            <div style={foundItemBannerStyle}>
              <div style={{ ...styles.flexCenter, gap: spacing[3], marginBottom: spacing[3] }}>
                {foundItem.image ? (
                  <img 
                    src={foundItem.image} 
                    alt="" 
                    style={{ 
                      width: 64, 
                      height: 64, 
                      objectFit: 'cover', 
                      borderRadius: borderRadius.md 
                    }} 
                  />
                ) : (
                  <div style={noImgStyle}>
                    No img
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ ...styles.flexWrap, gap: spacing[1], marginBottom: spacing[1] }}>
                    <Badge text={foundItem.id} color={colors.primary} />
                    <Badge 
                      text={foundItem.status} 
                      color={getStatusColor(foundItem.status)} 
                    />
                  </div>
                  <div style={{ 
                    ...styles.subheading,
                    fontSize: typography.fontSize.base
                  }}>
                    {foundItem.name}
                  </div>
                  <div style={styles.textSmMuted}>
                    {foundItem.brand} • {foundItem.category}
                  </div>
                </div>
              </div>
              
              {/* Checkout info if checked out */}
              {isCheckedOut && foundItem.checkedOutTo && (
                <div style={{
                  padding: spacing[2],
                  background: `${withOpacity(colors.checkedOut, 15)}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.sm,
                  color: colors.textSecondary
                }}>
                  Checked out to <strong style={{ color: colors.textPrimary }}>{foundItem.checkedOutTo}</strong>
                  {foundItem.dueBack && (
                    <span> • Due {foundItem.dueBack}</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Quick Action Buttons */}
            <div style={{ 
              ...styles.flexCol,
              gap: spacing[2],
              marginBottom: spacing[4]
            }}>
              {/* Quick Check Out - only show if available */}
              {isAvailable && onQuickCheckout && (
                <Button 
                  fullWidth 
                  onClick={() => onQuickCheckout(foundItem)}
                  style={{ 
                    background: `linear-gradient(135deg, ${colors.available}, ${colors.accent2})`,
                    justifyContent: 'center'
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
                    justifyContent: 'center'
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
            <div style={cameraContainerStyle}>
              {/* Video element always rendered (hidden when not scanning) */}
              <video
                ref={videoRef}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: scanning ? 'block' : 'none'
                }}
                playsInline
                muted
              />
              
              {/* Scanning overlay - only show when scanning */}
              {scanning && (
                <>
                  <div style={scanOverlayStyle}>
                    <div style={{
                      width: '60%',
                      height: '60%',
                      border: `2px solid ${colors.primary}`,
                      borderRadius: borderRadius.lg,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                    }} />
                  </div>
                  {/* Scanning indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: spacing[3],
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    padding: `${spacing[1]}px ${spacing[3]}px`,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: typography.fontSize.sm
                  }}>
                    Scanning...
                  </div>
                </>
              )}
              
              {/* Camera not active placeholder - only show when not scanning */}
              {!scanning && (
                <div style={cameraPlaceholderStyle}>
                  <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2h-4m4-6v-1m-2-2h1m-6 0h-1m-2 2v1m-4 6H3a2 2 0 0 1-2-2v-4m6 0H6m-2-2V9m2 2v1"/>
                    <rect x="5" y="5" width="5" height="5" rx="1"/>
                    <rect x="14" y="5" width="5" height="5" rx="1"/>
                    <rect x="5" y="14" width="5" height="5" rx="1"/>
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
              <div style={errorBannerStyle}>
                {error}
              </div>
            )}
            
            {/* Camera control button */}
            {!scanning ? (
              <Button fullWidth onClick={startScanning} style={{ marginBottom: spacing[4] }}>
                Start Camera
              </Button>
            ) : (
              <Button fullWidth variant="secondary" onClick={stopScanning} style={{ marginBottom: spacing[4] }}>
                Stop Camera
              </Button>
            )}
            
            {/* Manual entry section */}
            <div style={{
              borderTop: `1px solid ${colors.borderLight}`,
              paddingTop: spacing[4]
            }}>
              <label style={styles.label}>Or enter code manually</label>
              <div style={{ ...styles.flexCenter, gap: spacing[2] }}>
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => { setManualCode(e.target.value); setError(null); }}
                  onKeyDown={e => e.key === 'Enter' && handleManualLookup()}
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
              <div style={{
                marginTop: spacing[3],
                padding: spacing[2],
                background: `${withOpacity(colors.primary, 15)}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.sm,
                color: colors.textSecondary
              }}>
                Last scanned: <strong>{lastScanned}</strong>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
});

