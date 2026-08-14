// =============================================================================
// CSV parsing — the RFC 4180 behaviors the old line-splitting parser broke:
// quoted newlines, Excel's UTF-8 BOM, formula-guard round-trips, currency
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parseCSV, stripFormulaGuard, parseMoney } from '../lib/csv.js';

describe('parseCSV', () => {
  it('parses headers and rows', () => {
    const { headers, rows } = parseCSV('name,brand\nCamera,Sony\nLens,Canon');
    expect(headers).toEqual(['name', 'brand']);
    expect(rows).toEqual([
      ['Camera', 'Sony'],
      ['Lens', 'Canon'],
    ]);
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    const { rows } = parseCSV('name,notes\n"Cam, the great","He said ""hi"""');
    expect(rows[0]).toEqual(['Cam, the great', 'He said "hi"']);
  });

  it('handles NEWLINES inside quoted fields — the multi-line notes case', () => {
    const { rows } = parseCSV('name,notes\nCam,"line one\nline two"\nLens,ok');
    expect(rows).toEqual([
      ['Cam', 'line one\nline two'],
      ['Lens', 'ok'],
    ]);
  });

  it('strips the UTF-8 BOM Excel prepends — "name" must stay recognizable', () => {
    const { headers } = parseCSV('\uFEFF' + 'name,brand\nCam,Sony');
    expect(headers[0]).toBe('name');
  });

  it('handles CRLF line endings and a trailing newline', () => {
    const { rows } = parseCSV('name\r\nCam\r\nLens\r\n');
    expect(rows).toEqual([['Cam'], ['Lens']]);
  });

  it('drops blank records but keeps rows of empty quoted fields', () => {
    const { rows } = parseCSV('a,b\n\n\nx,y\n,\n');
    // ',' alone is two empty fields — an all-empty record, dropped like blanks
    expect(rows).toEqual([['x', 'y']]);
  });

  it('rejects files without a data row', () => {
    expect(() => parseCSV('name,brand\n')).toThrow(/header row and at least one data row/);
    expect(() => parseCSV('')).toThrow();
  });
});

describe('stripFormulaGuard', () => {
  it('removes the guard apostrophe our exporter adds before formula chars', () => {
    expect(stripFormulaGuard("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(stripFormulaGuard("'-5C Rated")).toBe('-5C Rated');
    expect(stripFormulaGuard("'+1 spare")).toBe('+1 spare');
    expect(stripFormulaGuard("'@handle")).toBe('@handle');
  });

  it('leaves ordinary apostrophes alone', () => {
    expect(stripFormulaGuard("'quoted'")).toBe("'quoted'");
    expect(stripFormulaGuard("O'Brien")).toBe("O'Brien");
    expect(stripFormulaGuard('plain')).toBe('plain');
  });
});

describe('parseMoney', () => {
  it('parses plain and decorated numbers', () => {
    expect(parseMoney('3498')).toEqual({ value: 3498, ok: true });
    expect(parseMoney('$3,498')).toEqual({ value: 3498, ok: true });
    expect(parseMoney('$3,498.50')).toEqual({ value: 3498.5, ok: true });
    expect(parseMoney(' 12.99 ')).toEqual({ value: 12.99, ok: true });
    expect(parseMoney('-50')).toEqual({ value: -50, ok: true });
  });

  it('the old parseFloat corruption cases now parse correctly or flag', () => {
    // parseFloat('3,498') was 3; parseFloat('$3,498') was NaN→0 — both silent
    expect(parseMoney('3,498').value).toBe(3498);
    expect(parseMoney('abc')).toEqual({ value: 0, ok: false });
    expect(parseMoney('12abc').ok).toBe(false);
  });

  it('empty input is a clean zero', () => {
    expect(parseMoney('')).toEqual({ value: 0, ok: true });
    expect(parseMoney(null)).toEqual({ value: 0, ok: true });
    expect(parseMoney(undefined)).toEqual({ value: 0, ok: true });
  });
});
