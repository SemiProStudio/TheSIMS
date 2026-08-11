// ============================================================================
// QR Code Modal
// Display and download QR codes for inventory items.
// The QR encodes a deep link (/?item=<id>) so a phone's native camera opens
// the item directly; the in-app scanner accepts old bare-ID labels too.
// ============================================================================

import { memo } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, spacing, borderRadius } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';
import { QRCodeCanvas, generateQRDataURL } from '../components/QRCode.jsx';
import { buildItemQRData } from '../lib/qrData.js';

// ============================================================================
// QR Modal
// ============================================================================
export const QRModal = memo(function QRModal({ item, onClose }) {
  const qrData = buildItemQRData(item.id);

  const handleDownload = async () => {
    // Generate a fresh high-resolution PNG (512px) rather than reading the
    // display canvas — the download is what ends up in print material.
    const dataURL = await generateQRDataURL(qrData, 128);
    if (!dataURL) return;
    const link = document.createElement('a');
    link.download = `${item.id}-qr.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <Modal onClose={onClose} maxWidth={350}>
      <ModalHeader title="QR Code" onClose={onClose} />
      <div style={{ padding: spacing[6], textAlign: 'center' }}>
        <div
          style={{
            marginBottom: spacing[4],
            display: 'inline-block',
            background: '#FFFFFF',
            padding: spacing[3],
            borderRadius: borderRadius.lg,
          }}
        >
          <QRCodeCanvas data={qrData} size={180} label={`QR code for ${item.id}`} />
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

// ============================================================================
// PropTypes
// ============================================================================
QRModal.propTypes = {
  /** Item to generate QR code for */
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  /** Callback to close modal */
  onClose: PropTypes.func.isRequired,
};
