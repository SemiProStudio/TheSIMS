// ============================================================================
// QR Code Modal
// Display and download QR codes for inventory items
// Uses the real 'qrcode' library for scannable QR code generation
// ============================================================================

import { memo, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { colors, spacing, borderRadius } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

import { error as logError } from '../lib/logger.js';

// ============================================================================
// QR Code Generator Component
// Generates a real, scannable QR code using the qrcode library
// ============================================================================
const QRCode = memo(function QRCode({ data, size = 150 }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    setError(false);

    QRCodeLib.toCanvas(
      canvas,
      String(data),
      {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) {
          logError('QR Code generation error:', err);
          setError(true);
        }
      },
    );
  }, [data, size]);

  if (error) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          borderRadius: borderRadius.sm,
          fontSize: 11,
          color: '#999',
          textAlign: 'center',
          padding: 8,
        }}
      >
        QR generation failed
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ borderRadius: borderRadius.sm, border: '4px solid #FFFFFF' }}
    />
  );
});

// ============================================================================
// QR Modal
// ============================================================================
export const QRModal = memo(function QRModal({ item, onClose }) {
  const qrCanvasRef = useRef(null);

  const handleDownload = () => {
    // Use the ref to the QRCode's parent to find the canvas reliably
    const container = qrCanvasRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${item.id}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <Modal onClose={onClose} maxWidth={350}>
      <ModalHeader title="QR Code" onClose={onClose} />
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <div
          ref={qrCanvasRef}
          style={{
            marginBottom: spacing[4],
            display: 'inline-block',
            background: '#FFFFFF',
            padding: spacing[3],
            borderRadius: borderRadius.lg,
          }}
        >
          <QRCode data={item.id} size={180} />
        </div>
        <div style={{ marginBottom: spacing[2] }}>
          <Badge text={item.id} color={colors.primary} size="md" />
        </div>
        <p style={{ color: colors.textSecondary, margin: `0 0 ${spacing[4]}px` }}>{item.name}</p>
        <Button variant="secondary" fullWidth onClick={handleDownload} icon={Download}>
          Download QR Code
        </Button>
      </div>
    </Modal>
  );
});

// Export QRCode for use in other components
export { QRCode };

// ============================================================================
// PropTypes
// ============================================================================
QRCode.propTypes = {
  /** Data to encode in QR code */
  data: PropTypes.string.isRequired,
  /** Size of the QR code in pixels */
  size: PropTypes.number,
};

QRModal.propTypes = {
  /** Item to generate QR code for */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
