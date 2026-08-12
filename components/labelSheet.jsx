// ============================================================================
// Label Sheet Export (Cricut Print Then Cut)
// Lays labels out on a 300-DPI PNG sheet sized to Cricut's Print-Then-Cut
// area on Letter paper (6.75" × 9.25"), with a transparent background and
// gaps between labels. Uploaded to Cricut Design Space as one image, each
// opaque label region becomes its own contour cut — the sticker-sheet
// workflow. Labels are rendered by the SAME ItemLabel component as the
// preview and print paths (ppi=300), rasterized via an SVG foreignObject.
// ============================================================================

import { ItemLabel, qrOffset, qrDisplaySize } from './ItemLabel.jsx';

export const SHEET_DPI = 300;
// Cricut Print-Then-Cut printable area inside the registration box (Letter)
export const CRICUT_PRINT_AREA = { width: 6.75, height: 9.25 }; // inches
export const LABEL_GAP_IN = 0.2; // blade clearance between labels

/**
 * Grid layout for a format on one sheet. All values in inches except counts.
 */
export function computeSheetLayout(format) {
  const labelW = format.width;
  // The small format renders square (height = width) — mirror ItemLabel
  const labelH = format.id === 'small' ? format.width : format.height;

  const cols = Math.max(
    1,
    Math.floor((CRICUT_PRINT_AREA.width + LABEL_GAP_IN) / (labelW + LABEL_GAP_IN)),
  );
  const rows = Math.max(
    1,
    Math.floor((CRICUT_PRINT_AREA.height + LABEL_GAP_IN) / (labelH + LABEL_GAP_IN)),
  );

  const usedW = cols * labelW + (cols - 1) * LABEL_GAP_IN;
  const usedH = rows * labelH + (rows - 1) * LABEL_GAP_IN;

  return {
    cols,
    rows,
    perSheet: cols * rows,
    labelW,
    labelH,
    offsetX: (CRICUT_PRINT_AREA.width - usedW) / 2,
    offsetY: (CRICUT_PRINT_AREA.height - usedH) / 2,
  };
}

/**
 * Build one SVG string per sheet. Pure apart from the lazy server-renderer
 * import; rasterization is separate so this part stays unit-testable.
 */
export async function buildLabelSheetSVGs({
  items,
  format,
  user,
  isKit = false,
  isPackage = false,
  getContainedItems = () => [],
  qrDataURLs = [],
}) {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const layout = computeSheetLayout(format);
  const px = (v) => Math.round(v * SHEET_DPI);
  const width = px(CRICUT_PRINT_AREA.width);
  const height = px(CRICUT_PRINT_AREA.height);

  // QR geometry: labels render `flat`, which replaces the QR <img> with an
  // empty spacer — WebKit refuses to load foreignObject <img> subresources
  // when rasterizing, so QRs are instead drawn straight onto the canvas by
  // rasterizeSheetToPNG at the positions computed here (identical result in
  // every browser).
  const qrOff = qrOffset(format);
  const qrPx = Math.round(qrDisplaySize(format, SHEET_DPI));
  const qrScale = SHEET_DPI / 96;

  const svgs = [];
  const qrDraws = [];
  for (let start = 0; start < items.length; start += layout.perSheet) {
    const slice = items.slice(start, start + layout.perSheet);
    const sheetDraws = [];
    const cells = slice
      .map((item, i) => {
        const col = i % layout.cols;
        const row = Math.floor(i / layout.cols);
        const left = px(layout.offsetX + col * (layout.labelW + LABEL_GAP_IN));
        const top = px(layout.offsetY + row * (layout.labelH + LABEL_GAP_IN));
        sheetDraws.push({
          dataURL: qrDataURLs[start + i],
          x: left + Math.round(qrOff.x * qrScale),
          y: top + Math.round(qrOff.y * qrScale),
          size: qrPx,
        });
        // flat: no drop shadow — a rasterized shadow becomes a gray halo that
        // confuses Design Space's contour detection and prints as fuzz
        const markup = renderToStaticMarkup(
          <ItemLabel
            item={item}
            format={format}
            user={user}
            isKit={isKit}
            isPackage={isPackage}
            containedItems={isKit || isPackage ? getContainedItems(item, isPackage) : []}
            ppi={SHEET_DPI}
            flat
            qrDataURL={qrDataURLs[start + i]}
          />,
        );
        return `<div style="position:absolute;left:${left}px;top:${top}px">${markup}</div>`;
      })
      .join('');

    // No background rect — transparency between labels is what makes each
    // label its own cut contour in Design Space.
    svgs.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
        `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
        `<div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${width}px;height:${height}px">${cells}</div>` +
        `</foreignObject></svg>`,
    );
    qrDraws.push(sheetDraws);
  }

  return { svgs, qrDraws, width, height, perSheet: layout.perSheet };
}

/**
 * Rasterize a sheet SVG to a PNG blob, then composite the QR codes on top
 * (see buildLabelSheetSVGs — the SVG itself deliberately contains no QR
 * images). Browser-only. Throws on genuine rasterization failure.
 */
export async function rasterizeSheetToPNG(svg, width, height, qrDraws = []) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  for (const draw of qrDraws) {
    if (!draw?.dataURL) continue;
    const qrImg = new Image();
    qrImg.src = draw.dataURL;
    await qrImg.decode();
    ctx.drawImage(qrImg, draw.x, draw.y, draw.size, draw.size);
  }

  return await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))),
        'image/png',
      );
    } catch (err) {
      reject(err);
    }
  });
}
