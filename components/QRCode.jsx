// ============================================================================
// QR Code Rendering
// Single home for QR generation: a canvas component for on-screen display
// (QR modal) and a data-URL helper for label previews and print/export HTML.
// Both render at OVERSAMPLE× the display size so QR modules stay crisp on
// retina screens and, more importantly, on 300–600dpi label printers — a QR
// rasterized at its 60–80px display size prints visibly blurry.
// QR colors are intentionally hardcoded black-on-white in every theme:
// scanners need the contrast, and labels print on white stock.
// ============================================================================

import { memo, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import QRCodeLib from 'qrcode';
import { borderRadius } from '../theme.js';

import { error as logError } from '../lib/logger.js';

const OVERSAMPLE = 4;

const QR_OPTIONS = {
  margin: 1,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
  errorCorrectionLevel: 'M',
};

/**
 * Generate a QR PNG data URL rendered at OVERSAMPLE× the display size.
 * @param {string} data - Payload to encode.
 * @param {number} displaySize - The CSS pixel size it will be displayed at.
 * @returns {Promise<string>} data URL, or '' on failure.
 */
export async function generateQRDataURL(data, displaySize = 100) {
  try {
    return await QRCodeLib.toDataURL(String(data), {
      ...QR_OPTIONS,
      width: displaySize * OVERSAMPLE,
    });
  } catch (err) {
    logError('QR Code toDataURL error:', err);
    return '';
  }
}

/**
 * Hook: async data-URL generation for rendering QRs as <img> (label previews).
 * Returns '' until ready.
 */
export function useQRDataURL(data, displaySize) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!data) {
      setUrl('');
      return undefined;
    }
    generateQRDataURL(data, displaySize).then((dataURL) => {
      if (!cancelled) setUrl(dataURL);
    });
    return () => {
      cancelled = true;
    };
  }, [data, displaySize]);

  return url;
}

// ============================================================================
// Canvas QR component (QR modal)
// ============================================================================
export const QRCodeCanvas = memo(function QRCodeCanvas({ data, size = 150, label }) {
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
        ...QR_OPTIONS,
        width: size * OVERSAMPLE,
      },
      (err) => {
        if (err) {
          logError('QR Code generation error:', err);
          setError(true);
        } else {
          // toCanvas sets style.width/height to the oversampled pixel size;
          // scale the element back down to the intended display size.
          canvas.style.width = `${size}px`;
          canvas.style.height = `${size}px`;
        }
      },
    );
  }, [data, size]);

  if (!data) return null;

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
      role="img"
      aria-label={label || `QR code for ${data}`}
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius.sm,
        border: '4px solid #FFFFFF',
        backgroundColor: '#FFFFFF',
      }}
    />
  );
});

QRCodeCanvas.propTypes = {
  /** Data to encode in the QR code */
  data: PropTypes.string.isRequired,
  /** Display size of the QR code in CSS pixels */
  size: PropTypes.number,
  /** Accessible label; defaults to describing the encoded data */
  label: PropTypes.string,
};
