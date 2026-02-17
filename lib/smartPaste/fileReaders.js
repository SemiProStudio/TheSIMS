// ============================================================================
// Smart Paste — File Readers
// Read text files and PDFs with CDN-loaded pdf.js
// ============================================================================

import { CDN_TIMEOUT_PDF_MS } from './constants.js';

/**
 * Read a text file and return its contents.
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Read a PDF file and extract text using pdf.js.
 * Loads pdf.js from CDN on first use with a timeout to prevent indefinite hangs.
 */
let pdfjsLoaded = false;
export async function readPdfFile(file) {
  if (!pdfjsLoaded && !window.pdfjsLib) {
    await Promise.race([
      new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          pdfjsLoaded = true;
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load PDF.js library'));
        document.head.appendChild(script);
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `PDF.js library load timed out after ${CDN_TIMEOUT_PDF_MS / 1000}s. Check your internet connection.`,
              ),
            ),
          CDN_TIMEOUT_PDF_MS,
        ),
      ),
    ]);
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const lineMap = new Map();
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], text: item.str, width: item.width || 0 });
    }

    const sortedLines = [...lineMap.entries()].sort((a, b) => b[0] - a[0]);

    for (const [, items] of sortedLines) {
      items.sort((a, b) => a.x - b.x);

      let lineText = items[0].text;
      for (let j = 1; j < items.length; j++) {
        const prevEnd = items[j - 1].x + (items[j - 1].width || items[j - 1].text.length * 5);
        const gap = items[j].x - prevEnd;
        lineText += (gap > 30 ? '\t' : ' ') + items[j].text;
      }
      textParts.push(lineText.trim());
    }

    if (i < pdf.numPages) textParts.push('');
  }

  return textParts.join('\n');
}
