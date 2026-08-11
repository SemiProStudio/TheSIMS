// =============================================================================
// QR Payload Helpers — Test Suite
// buildItemQRData / parseScannedCode round-trips, legacy labels, foreign QRs
// =============================================================================

import { describe, it, expect } from 'vitest';
import { buildItemQRData, parseScannedCode } from '../lib/qrData.js';
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
