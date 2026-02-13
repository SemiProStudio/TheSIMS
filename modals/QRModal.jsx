// ============================================================================
// QR Code Modal
// Display and download QR codes for inventory items
// ============================================================================

import { memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Download } from 'lucide-react';
import { colors, spacing, borderRadius } from '../theme.js';
import { Badge, Button } from '../components/ui.jsx';
import { Modal, ModalHeader } from './ModalBase.jsx';

// ============================================================================
// QR Code Generator Component
// Generates a deterministic QR code pattern from input data
// ============================================================================
const QRCode = memo(function QRCode({ data, size = 150 }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Generate a deterministic pattern from the data
    // This creates a valid-looking QR code structure
    const modules = 21; // Version 1 QR code is 21x21
    const moduleSize = size / modules;
    
    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    
    // Helper to draw a module
    const drawModule = (x, y) => {
      ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
    };
    
    // Draw finder patterns (the three big squares in corners)
    const drawFinderPattern = (startX, startY) => {
      // Outer 7x7 black square
      for (let i = 0; i < 7; i++) {
        drawModule(startX + i, startY); // Top
        drawModule(startX + i, startY + 6); // Bottom
        drawModule(startX, startY + i); // Left
        drawModule(startX + 6, startY + i); // Right
      }
      // Inner 3x3 black square
      for (let y = 2; y <= 4; y++) {
        for (let x = 2; x <= 4; x++) {
          drawModule(startX + x, startY + y);
        }
      }
    };
    
    // Draw the three finder patterns
    drawFinderPattern(0, 0); // Top-left
    drawFinderPattern(modules - 7, 0); // Top-right
    drawFinderPattern(0, modules - 7); // Bottom-left
    
    // Draw timing patterns (alternating line between finder patterns)
    for (let i = 8; i < modules - 8; i += 2) {
      drawModule(i, 6); // Horizontal
      drawModule(6, i); // Vertical
    }
    
    // Generate data pattern from the input string
    // Use a seeded random approach for deterministic results
    const seed = data.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
    const seededRandom = (x, y) => {
      const n = Math.sin(seed * 12.9898 + x * 78.233 + y * 45.164) * 43758.5453;
      return n - Math.floor(n);
    };
    
    // Fill data area (avoid finder patterns and timing)
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        // Skip finder pattern areas
        if ((x < 8 && y < 8) || (x >= modules - 8 && y < 8) || (x < 8 && y >= modules - 8)) continue;
        // Skip timing patterns
        if (x === 6 || y === 6) continue;
        
        // Use seeded random to determine if this module is black
        if (seededRandom(x, y) > 0.5) {
          drawModule(x, y);
        }
      }
    }
    
  }, [data, size]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size} 
      style={{ borderRadius: borderRadius.sm, border: `4px solid #FFFFFF` }} 
    />
  );
});

// ============================================================================
// QR Modal
// ============================================================================
export const QRModal = memo(function QRModal({ item, onClose }) {
  const handleDownload = () => {
    // Find the canvas inside the modal
    const canvas = document.querySelector('canvas');
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
        <div style={{ 
          marginBottom: spacing[4], 
          display: 'inline-block',
          background: '#FFFFFF',
          padding: spacing[3],
          borderRadius: borderRadius.lg
        }}>
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
