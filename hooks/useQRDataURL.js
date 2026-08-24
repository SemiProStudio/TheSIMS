// =============================================================================
// useQRDataURL — async QR data-URL generation for rendering QRs as <img>
// (label previews). Returns '' until ready.
// =============================================================================

import { useState, useEffect } from 'react';
import { generateQRDataURL } from '../lib/qrData.js';
import { error as logError } from '../lib/logger.js';

export function useQRDataURL(data, displaySize) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (!data) {
      setUrl('');
      return undefined;
    }
    generateQRDataURL(data, displaySize)
      .then((dataURL) => {
        if (!cancelled) setUrl(dataURL);
      })
      .catch((err) => {
        // Failed generation leaves the preview empty rather than surfacing
        // an unhandled rejection
        logError('QR generation failed:', err);
        if (!cancelled) setUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [data, displaySize]);

  return url;
}
