// =============================================================================
// URL Fetcher — Test Suite
// Tests the CORS proxy URL fetching module
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchProductPage } from '../lib/smartPaste/urlFetcher.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// fetchProductPage
// =============================================================================

describe('fetchProductPage', () => {
  const validProxyUrl = 'https://test.supabase.co/functions/v1/fetch-product-page';
  const validAnonKey = 'test-anon-key-123';
  const productUrl = 'https://www.bhphotovideo.com/c/product/123456';

  it('should throw if proxyUrl is not provided', async () => {
    await expect(fetchProductPage(productUrl, null)).rejects.toThrow(
      'URL import requires a CORS proxy',
    );
    await expect(fetchProductPage(productUrl, '')).rejects.toThrow(
      'URL import requires a CORS proxy',
    );
    await expect(fetchProductPage(productUrl, undefined)).rejects.toThrow(
      'URL import requires a CORS proxy',
    );
  });

  it('should send POST request with correct headers and body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Product text', html: '<p>Product</p>' }),
    });

    await fetchProductPage(productUrl, validProxyUrl, validAnonKey);

    expect(mockFetch).toHaveBeenCalledWith(validProxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validAnonKey}`,
      },
      body: JSON.stringify({ url: productUrl }),
    });
  });

  it('should not include Authorization header when anonKey is not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'text', html: '' }),
    });

    await fetchProductPage(productUrl, validProxyUrl);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers).not.toHaveProperty('Authorization');
  });

  it('should return text, html, and sourceUrl on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: 'Sony A7 IV', html: '<h1>Sony A7 IV</h1>' }),
    });

    const result = await fetchProductPage(productUrl, validProxyUrl, validAnonKey);
    expect(result).toEqual({
      text: 'Sony A7 IV',
      html: '<h1>Sony A7 IV</h1>',
      sourceUrl: productUrl,
    });
  });

  it('should default text and html to empty strings if missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await fetchProductPage(productUrl, validProxyUrl);
    expect(result.text).toBe('');
    expect(result.html).toBe('');
    expect(result.sourceUrl).toBe(productUrl);
  });

  it('should throw network error on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow(
      'Network error connecting to proxy',
    );
  });

  it('should throw specific error for 404 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow('proxy not found');
  });

  it('should throw detail error for 403 response with error body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ error: 'Remote server returned 403 Forbidden' }),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow(
      'Remote server returned 403 Forbidden',
    );
  });

  it('should throw generic error for 403 without detail', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({}),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow(
      'Proxy returned 403 Forbidden',
    );
  });

  it('should throw generic error for 500 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ message: 'Server crashed' }),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow('Server crashed');
  });

  it('should handle non-JSON error responses gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow(
      'Proxy returned 502 Bad Gateway',
    );
  });

  it('should use message field when error field is not present', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ message: 'Invalid URL format' }),
    });

    await expect(fetchProductPage(productUrl, validProxyUrl)).rejects.toThrow('Invalid URL format');
  });
});
