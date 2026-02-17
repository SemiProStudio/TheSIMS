// ============================================================================
// Smart Paste — OCR (Optical Character Recognition)
// Image text extraction via Tesseract.js loaded on demand from CDN
// ============================================================================

import { CDN_TIMEOUT_OCR_MS } from './constants.js';

let tesseractWorker = null;

/**
 * Run OCR on an image file and return extracted text.
 * Dynamically loads Tesseract.js from CDN on first use (~2MB WASM).
 * @param {File|Blob} imageFile - Image file (PNG, JPEG, WebP, TIFF, BMP)
 * @param {Function} onProgress - Optional progress callback (0-1)
 * @returns {Promise<{ text: string, confidence: number }>}
 */
export async function ocrImage(imageFile, onProgress) {
  // Dynamic import of Tesseract.js from CDN with timeout
  if (!tesseractWorker) {
    if (onProgress) onProgress(0.05);
    try {
      const Tesseract = await Promise.race([
        import(
          /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js'
        ),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `OCR engine load timed out after ${CDN_TIMEOUT_OCR_MS / 1000}s. Check your internet connection.`,
                ),
              ),
            CDN_TIMEOUT_OCR_MS,
          ),
        ),
      ]);
      if (onProgress) onProgress(0.15);
      tesseractWorker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (onProgress && m.status === 'recognizing text') {
            onProgress(0.2 + m.progress * 0.7);
          }
        },
      });
    } catch (err) {
      throw new Error(
        err.message.includes('timed out')
          ? err.message
          : 'Failed to load OCR engine. Check your internet connection and try again. ' +
              'Alternatively, paste the text manually or use a screenshot-to-text tool.',
      );
    }
  }

  if (onProgress) onProgress(0.2);

  // Pre-process: create an off-screen canvas for contrast enhancement
  const enhancedBlob = await enhanceImageForOCR(imageFile);
  if (onProgress) onProgress(0.25);

  const { data } = await tesseractWorker.recognize(enhancedBlob || imageFile);
  if (onProgress) onProgress(0.95);

  // Post-process: clean up OCR artifacts
  let text = data.text || '';
  text = text
    .replace(/[|]/g, 'I') // Common OCR confusion: | → I
    .replace(/(\w)l(\w)/g, '$1I$2') // Lowercase L in the middle of uppercase words
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines
    .replace(/^\s+$/gm, '') // Remove whitespace-only lines
    .trim();

  if (onProgress) onProgress(1);

  return {
    text,
    confidence: data.confidence || 0, // Tesseract's overall confidence (0-100)
  };
}

/**
 * Enhance image for better OCR results.
 * Applies grayscale conversion and contrast boost using canvas.
 * Returns a Blob or null if enhancement fails.
 */
async function enhanceImageForOCR(imageFile) {
  try {
    const bitmap = await createImageBitmap(imageFile);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');

    // Draw original
    ctx.drawImage(bitmap, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and boost contrast
    for (let i = 0; i < data.length; i += 4) {
      // Luminance grayscale
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      // Contrast stretch: push darks darker, lights lighter
      const contrast = 1.5;
      const adjusted = Math.min(255, Math.max(0, ((gray / 255 - 0.5) * contrast + 0.5) * 255));

      data[i] = adjusted; // R
      data[i + 1] = adjusted; // G
      data[i + 2] = adjusted; // B
      // Alpha unchanged
    }

    ctx.putImageData(imageData, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch {
    // Enhancement failed (e.g. OffscreenCanvas not supported) — use original
    return null;
  }
}

/**
 * Terminate the OCR worker to free memory.
 * Call when the modal closes if OCR was used.
 */
export async function terminateOCR() {
  if (tesseractWorker) {
    try {
      await tesseractWorker.terminate();
    } catch {
      /* ignore */
    }
    tesseractWorker = null;
  }
}
