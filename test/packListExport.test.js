// =============================================================================
// Pack List Print Export — Test Suite
// The print window shares the app origin, so every user-controlled string in
// the generated HTML MUST be escaped. These tests pin that invariant.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { buildPackListExportHTML } from '../views/packListExport.js';

const formatDate = (d) => `formatted(${d})`;

const baseArgs = {
  list: { name: 'Shoot A', createdAt: '2026-08-01' },
  items: [
    { id: 'CA1001', name: 'Camera One', brand: 'Canon', category: 'Cameras', quantity: 1 },
    { id: 'LE1002', name: 'Lens Two', brand: 'Sigma', category: 'Lenses', quantity: 2 },
  ],
  listPackages: [{ name: 'Base Package' }],
  exportSort: 'name',
  exportFontSize: 'M',
  formatDate,
};

describe('buildPackListExportHTML', () => {
  it('renders title, header line, and all item rows', () => {
    const { title, body, styles } = buildPackListExportHTML(baseArgs);
    expect(title).toBe('Shoot A');
    expect(body).toContain('<h1>Shoot A</h1>');
    expect(body).toContain('formatted(2026-08-01)');
    expect(body).toContain('Packages: Base Package');
    expect(body).toContain('CA1001');
    expect(body).toContain('Camera One');
    expect(body).toContain('Lens Two');
    expect(body).toContain('<th>Category</th>'); // non-category sort keeps the column
    expect(styles).toContain('font-size: 14px'); // M
  });

  it('groups under category headers when sorted by category', () => {
    const { body } = buildPackListExportHTML({ ...baseArgs, exportSort: 'category' });
    expect(body).toContain('<strong>Cameras</strong>');
    expect(body).toContain('<strong>Lenses</strong>');
    expect(body).not.toContain('<th>Category</th>');
  });

  it('escapes malicious item, list, package, and category names', () => {
    const { title, body } = buildPackListExportHTML({
      ...baseArgs,
      list: { name: '<script>alert(1)</script>', createdAt: '2026-08-01' },
      items: [
        {
          id: 'X<img src=x onerror=alert(2)>',
          name: '"/><script>alert(3)</script>',
          brand: "O'Brien & Sons",
          category: '<b>Cat</b>',
          quantity: 1,
        },
      ],
      listPackages: [{ name: '<svg onload=alert(4)>' }],
      exportSort: 'category',
    });

    expect(title).toBe('<script>alert(1)</script>'); // escaped later by openPrintWindow
    expect(body).not.toContain('<script>');
    expect(body).not.toContain('<img');
    expect(body).not.toContain('<svg');
    expect(body).not.toContain('<b>Cat</b>');
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(body).toContain('&lt;b&gt;Cat&lt;/b&gt;');
    expect(body).toContain('O&#39;Brien &amp; Sons');
  });

  it('applies each font size setting', () => {
    for (const [key, px] of [
      ['XS', 10],
      ['S', 12],
      ['M', 14],
      ['L', 16],
      ['XL', 18],
    ]) {
      const { styles } = buildPackListExportHTML({ ...baseArgs, exportFontSize: key });
      expect(styles).toContain(`font-size: ${px}px`);
    }
  });

  it('omits the packages line when the list has no packages', () => {
    const { body } = buildPackListExportHTML({ ...baseArgs, listPackages: [] });
    expect(body).not.toContain('Packages:');
  });
});
