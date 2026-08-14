// =============================================================================
// useQRDataURL — async QR data-URL generation for rendering QRs as <img>
// (label previews). Returns '' until ready.
// =============================================================================

import { useState, useEffect } from 'react';
import { generateQRDataURL } from '../lib/qrData.js';

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
