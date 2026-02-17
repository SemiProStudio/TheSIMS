// ============================================================================
// Storage Utility Tests
// Tests for image URL helper functions
// ============================================================================

import { describe, it, expect } from 'vitest';
import { getThumbnailUrl, isDataUrl, isStorageUrl, getStoragePathFromUrl } from '../lib/storage.js';

// ============================================================================
// isDataUrl
// ============================================================================

describe('isDataUrl', () => {
  it('returns true for base64 data URLs', () => {
    expect(isDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    expect(isDataUrl('data:image/png;base64,iVBOR')).toBe(true);
  });

  it('returns false for non-data URLs', () => {
    expect(isDataUrl('https://example.com/image.jpg')).toBe(false);
    expect(isDataUrl('http://example.com/image.jpg')).toBe(false);
  });

  it('returns falsy for null/undefined/empty', () => {
    expect(isDataUrl(null)).toBeFalsy();
    expect(isDataUrl(undefined)).toBeFalsy();
    expect(isDataUrl('')).toBeFalsy();
  });
});

// ============================================================================
// isStorageUrl
// ============================================================================

describe('isStorageUrl', () => {
  it('returns true for Supabase storage URLs', () => {
    expect(isStorageUrl('https://abc.supabase.co/storage/v1/object/public/equipment-images/item1/123.jpg')).toBe(true);
    expect(isStorageUrl('https://abc.supabase.in/storage/v1/object/public/equipment-images/item1/123.jpg')).toBe(true);
  });

  it('returns false for non-storage URLs', () => {
    expect(isStorageUrl('https://example.com/image.jpg')).toBe(false);
    expect(isStorageUrl('https://cdn.example.com/storage/image.jpg')).toBe(false);
  });

  it('returns false for data URLs', () => {
    expect(isStorageUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(false);
  });

  it('returns falsy for null/undefined/empty', () => {
    expect(isStorageUrl(null)).toBeFalsy();
    expect(isStorageUrl(undefined)).toBeFalsy();
    expect(isStorageUrl('')).toBeFalsy();
  });
});

// ============================================================================
// getStoragePathFromUrl
// ============================================================================

describe('getStoragePathFromUrl', () => {
  it('extracts path from Supabase storage URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.jpg';
    expect(getStoragePathFromUrl(url)).toBe('ITEM001/1700000000.jpg');
  });

  it('extracts thumbnail path from Supabase storage URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg';
    expect(getStoragePathFromUrl(url)).toBe('ITEM001/1700000000_thumb.jpg');
  });

  it('returns null for non-storage URLs', () => {
    expect(getStoragePathFromUrl('https://example.com/image.jpg')).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(getStoragePathFromUrl(null)).toBeNull();
    expect(getStoragePathFromUrl(undefined)).toBeNull();
  });

  it('handles URLs with query parameters', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.jpg?t=123';
    expect(getStoragePathFromUrl(url)).toBe('ITEM001/1700000000.jpg');
  });
});

// ============================================================================
// getThumbnailUrl
// ============================================================================

describe('getThumbnailUrl', () => {
  it('converts full-size storage URL to thumbnail URL', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.jpg';
    const expected = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg';
    expect(getThumbnailUrl(url)).toBe(expected);
  });

  it('returns same URL if already a thumbnail', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg';
    expect(getThumbnailUrl(url)).toBe(url);
  });

  it('returns data URL unchanged', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ';
    expect(getThumbnailUrl(dataUrl)).toBe(dataUrl);
  });

  it('returns non-storage URL unchanged', () => {
    const url = 'https://example.com/image.jpg';
    expect(getThumbnailUrl(url)).toBe(url);
  });

  it('returns null/undefined unchanged', () => {
    expect(getThumbnailUrl(null)).toBeNull();
    expect(getThumbnailUrl(undefined)).toBeUndefined();
  });

  it('handles .png extension', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.png';
    const expected = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg';
    expect(getThumbnailUrl(url)).toBe(expected);
  });

  it('handles .webp extension', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.webp';
    const expected = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg';
    expect(getThumbnailUrl(url)).toBe(expected);
  });

  it('preserves query parameters after conversion', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000.jpg?t=abc';
    const expected = 'https://abc.supabase.co/storage/v1/object/public/equipment-images/ITEM001/1700000000_thumb.jpg?t=abc';
    expect(getThumbnailUrl(url)).toBe(expected);
  });
});
