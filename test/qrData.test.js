// =============================================================================
// QR Payload Helpers — Test Suite
// buildItemQRData / parseScannedCode round-trips, legacy labels, foreign QRs
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  buildItemQRData,
  parseScannedCode,
  resolveScannedCode,
  truncateScannedCode,
} from '../lib/qrData.js';
import { escapeHtml } from '../lib/escapeHtml.js';

describe('buildItemQRData', () => {
  it('encodes a deep link with the item id', () => {
    expect(buildItemQRData('CA1001', 'https://sims.example.com')).toBe(
      'https://sims.example.com/?item=CA1001',
    );
  });

  it('defaults to the current origin', () => {
    const url = buildItemQRData('CA1001');
    expect(url).toBe(`${window.location.origin}/?item=CA1001`);
  });

  it('URL-encodes ids with special characters', () => {
    expect(buildItemQRData('A&B #2', 'https://x.test')).toBe('https://x.test/?item=A%26B%20%232');
  });
});

describe('parseScannedCode', () => {
  it('round-trips deep-link payloads back to the item id', () => {
    expect(parseScannedCode(buildItemQRData('CA1001', 'https://sims.example.com'))).toBe('CA1001');
    expect(parseScannedCode(buildItemQRData('A&B #2', 'https://x.test'))).toBe('A&B #2');
  });

  it('passes legacy bare-ID labels through unchanged', () => {
    expect(parseScannedCode('CA1001')).toBe('CA1001');
    expect(parseScannedCode('  SN-12345  ')).toBe('SN-12345');
  });

  it('extracts the item param from deep links regardless of extra params', () => {
    expect(parseScannedCode('https://sims.example.com/?utm=x&item=LE1002')).toBe('LE1002');
  });

  it('passes foreign URLs without an item param through as-is', () => {
    expect(parseScannedCode('https://example.com/menu')).toBe('https://example.com/menu');
  });

  it('handles junk input without throwing', () => {
    expect(parseScannedCode('')).toBe('');
    expect(parseScannedCode(null)).toBe('');
    expect(parseScannedCode(undefined)).toBe('');
    expect(parseScannedCode('http://')).toBe('http://');
  });
});

describe('resolveScannedCode', () => {
  const inventory = [
    { id: 'CA1001', name: 'Camera', serialNumber: 'SN-777' },
    { id: 'LE1002', name: 'Lens' },
  ];
  const packages = [{ id: 'pkg-interview', name: 'Interview Kit' }];

  it('resolves items by id, case-insensitively', () => {
    expect(resolveScannedCode('ca1001', inventory, packages)).toEqual({
      type: 'item',
      entity: inventory[0],
    });
  });

  it('resolves items by serial number', () => {
    expect(resolveScannedCode('sn-777', inventory, packages).entity.id).toBe('CA1001');
  });

  it('resolves package ids — package labels share the ?item= deep link', () => {
    expect(resolveScannedCode('PKG-INTERVIEW', inventory, packages)).toEqual({
      type: 'package',
      entity: packages[0],
    });
  });

  it('prefers an item over a package on an (unlikely) id collision', () => {
    const colliding = [{ id: 'pkg-interview', name: 'Oddly Named Item' }];
    expect(resolveScannedCode('pkg-interview', colliding, packages).type).toBe('item');
  });

  it('returns null for unknown codes, blanks, and missing lists', () => {
    expect(resolveScannedCode('NOPE', inventory, packages)).toBeNull();
    expect(resolveScannedCode('', inventory, packages)).toBeNull();
    expect(resolveScannedCode(null, inventory, packages)).toBeNull();
    expect(resolveScannedCode('CA1001', undefined, undefined)).toBeNull();
    expect(resolveScannedCode('pkg-interview', inventory)).toBeNull();
  });
});

describe('truncateScannedCode', () => {
  it('passes short codes through unchanged', () => {
    expect(truncateScannedCode('CA1001')).toBe('CA1001');
  });

  it('truncates long payloads (foreign QR URLs) with an ellipsis', () => {
    const url = `https://evil.example.com/${'x'.repeat(100)}`;
    const shown = truncateScannedCode(url);
    expect(shown.length).toBe(41); // 40 chars + ellipsis
    expect(shown.endsWith('…')).toBe(true);
  });

  it('renders nullish input as an empty string without throwing', () => {
    expect(truncateScannedCode(null)).toBe('');
    expect(truncateScannedCode(undefined)).toBe('');
  });
});

describe('escapeHtml', () => {
  it('escapes all HTML-special characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert('xss')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;&amp;',
    );
  });

  it('stringifies non-strings and nullish values', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
  });
});
