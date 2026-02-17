// =============================================================================
// Smart Paste — Community Aliases, URL Fetcher Tests
// Tests for modules that interact with external services (mocked)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAlias, fetchCommunityAliases } from '../lib/smartPaste/communityAliases.js';
import { fetchProductPage } from '../lib/smartPaste/urlFetcher.js';

// =============================================================================
// Community Aliases — recordAlias
// =============================================================================

describe('recordAlias', () => {
  it('should do nothing when supabase is null', async () => {
    await expect(recordAlias(null, 'src', 'spec', 'cat')).resolves.toBeUndefined();
  });

  it('should call supabase.rpc with correct params', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };
    await recordAlias(mockSupabase, '  Weight  ', 'Weight (g)', 'Cameras');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
      p_source_key: 'weight',
      p_spec_name: 'Weight (g)',
      p_category: 'Cameras',
    });
  });

  it('should handle null category', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ error: null }),
    };
    await recordAlias(mockSupabase, 'focal', 'Focal Length', null);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
      p_source_key: 'focal',
      p_spec_name: 'Focal Length',
      p_category: null,
    });
  });

  it('should not throw on RPC error', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
    };
    await expect(recordAlias(mockSupabase, 'src', 'spec', 'cat')).resolves.toBeUndefined();
  });

  it('should not throw on network error', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockRejectedValue(new Error('Network error')),
    };
    await expect(recordAlias(mockSupabase, 'src', 'spec', 'cat')).resolves.toBeUndefined();
  });
});

// =============================================================================
// Community Aliases — fetchCommunityAliases
// =============================================================================

describe('fetchCommunityAliases', () => {
  it('should return empty Map when supabase is null', async () => {
    const result = await fetchCommunityAliases(null);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should fetch and map aliases correctly', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { source_key: 'weight', spec_name: 'Weight (g)', usage_count: 10 },
          { source_key: 'focal length', spec_name: 'Focal Length', usage_count: 5 },
        ],
        error: null,
      }),
    };
    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(2);
    expect(result.get('weight')).toEqual({ specName: 'Weight (g)', usageCount: 10 });
    expect(result.get('focal length')).toEqual({ specName: 'Focal Length', usageCount: 5 });
  });

  it('should use custom minUsage threshold', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    await fetchCommunityAliases(mockSupabase, 10);
    expect(mockSupabase.gte).toHaveBeenCalledWith('usage_count', 10);
  });

  it('should return empty Map on query error', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query failed' } }),
    };
    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });

  it('should return empty Map on exception', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockRejectedValue(new Error('Network error')),
    };
    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });

  it('should handle null data gracefully', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });
});

// =============================================================================
// URL Fetcher Tests
// =============================================================================

describe('fetchProductPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when proxyUrl is falsy', async () => {
    await expect(fetchProductPage('https://example.com', null)).rejects.toThrow('CORS proxy');
    await expect(fetchProductPage('https://example.com', '')).rejects.toThrow('CORS proxy');
  });

  it('should call fetch with correct POST body', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ text: 'Product text', html: '<p>Product</p>' }),
    };
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchProductPage(
      'https://example.com/product',
      'https://proxy.example.com',
    );

    expect(global.fetch).toHaveBeenCalledWith('https://proxy.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/product' }),
    });
    expect(result.text).toBe('Product text');
    expect(result.html).toBe('<p>Product</p>');
    expect(result.sourceUrl).toBe('https://example.com/product');
  });

  it('should throw on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      fetchProductPage('https://example.com', 'https://proxy.example.com'),
    ).rejects.toThrow('500');
  });

  it('should handle empty response data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    const result = await fetchProductPage('https://example.com', 'https://proxy.example.com');
    expect(result.text).toBe('');
    expect(result.html).toBe('');
    expect(result.sourceUrl).toBe('https://example.com');
  });
});
