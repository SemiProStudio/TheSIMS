// =============================================================================
// Pack List Print Export
// Pure HTML builder for the pack-list print window. Kept free of React/DOM so
// the escaping behavior is directly unit-testable — every user-controlled
// string (list name, item name/brand/category, package names) must go through
// escapeHtml before being interpolated, because the print window shares the
// app's origin.
// =============================================================================

import { escapeHtml } from '../lib/escapeHtml.js';

const FONT_SIZES = { XS: 10, S: 12, M: 14, L: 16, XL: 18 };

/**
 * Build the {title, styles, body} for openPrintWindow.
 *
 * @param {Object} options
 * @param {Object} options.list - The pack list ({name, createdAt}).
 * @param {Array}  options.items - Sorted list items ({id, name, brand, category, quantity}).
 * @param {Array}  options.listPackages - Packages attached to the list ({name}).
 * @param {string} options.exportSort - 'category' groups rows under category headers.
 * @param {string} options.exportFontSize - XS | S | M | L | XL.
 * @param {(date: string) => string} options.formatDate
 */
export function buildPackListExportHTML({
  list,
  items,
  listPackages,
  exportSort,
  exportFontSize,
  formatDate,
}) {
  const fs = FONT_SIZES[exportFontSize] || FONT_SIZES.M;
  const colCount = exportSort === 'category' ? 5 : 6;

  const itemRow = (i, withCategory) => `
    <tr>
      <td class="check">&#9744;</td>
      <td class="qty">${escapeHtml(i.quantity)}</td>
      <td>${escapeHtml(i.id)}</td>
      <td>${escapeHtml(i.name)}</td>
      <td>${escapeHtml(i.brand || '')}</td>
      ${withCategory ? `<td>${escapeHtml(i.category)}</td>` : ''}
    </tr>
  `;

  let tableContent = '';
  if (exportSort === 'category') {
    const byCategory = {};
    items.forEach((item) => {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    });

    Object.entries(byCategory).forEach(([category, categoryItems]) => {
      tableContent += `
        <tr class="category-header"><td colspan="${colCount}"><strong>${escapeHtml(category)}</strong></td></tr>
        ${categoryItems.map((i) => itemRow(i, false)).join('')}
      `;
    });
  } else {
    tableContent = items.map((i) => itemRow(i, true)).join('');
  }

  const categoryColumn = exportSort !== 'category' ? '<th>Category</th>' : '';
  const packagesLine =
    listPackages.length > 0
      ? ` | Packages: ${listPackages.map((p) => escapeHtml(p.name)).join(', ')}`
      : '';

  return {
    title: list.name,
    styles: `
      body { font-family: system-ui; font-size: ${fs}px; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background: #f5f5f5; }
      .qty { width: 60px; text-align: center; }
      .check { width: 30px; }
      .category-header {
        background: #e8e8e8;
        page-break-after: avoid;
      }
      .category-header td {
        padding: 12px 8px;
        border-bottom: 2px solid #ccc;
      }
      @media print {
        .category-header { break-after: avoid; }
        tr { break-inside: avoid; }
      }
    `,
    body: `
      <h1>${escapeHtml(list.name)}</h1>
      <p>Created: ${escapeHtml(formatDate(list.createdAt))} | Items: ${items.length}${packagesLine}</p>
      <table>
        <thead><tr><th class="check">&#10003;</th><th class="qty">Qty</th><th>ID</th><th>Name</th><th>Brand</th>${categoryColumn}</tr></thead>
        <tbody>${tableContent}</tbody>
      </table>
    `,
  };
}
