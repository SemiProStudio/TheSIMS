// =============================================================================
// Community Aliases — Test Suite
// Tests the Supabase-backed community alias recording and fetching
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAlias, fetchCommunityAliases } from '../lib/smartPaste/communityAliases.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// recordAlias
// =============================================================================

describe('recordAlias', () => {
  it('should do nothing when supabase is null', async () => {
    // Should not throw
    await expect(recordAlias(null, 'weight', 'Weight', 'Cameras')).resolves.toBeUndefined();
  });

  it('should do nothing when supabase is undefined', async () => {
    await expect(recordAlias(undefined, 'weight', 'Weight', 'Cameras')).resolves.toBeUndefined();
  });

  it('should call supabase rpc with correct parameters', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { rpc: mockRpc };

    await recordAlias(mockSupabase, '  Weight  ', 'Weight', 'Cameras');

    expect(mockRpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
      p_source_key: 'weight',
      p_spec_name: 'Weight',
      p_category: 'Cameras',
    });
  });

  it('should lowercase and trim the source key', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { rpc: mockRpc };

    await recordAlias(mockSupabase, '  FOCAL LENGTH  ', 'Focal Length', 'Lenses');

    expect(mockRpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
      p_source_key: 'focal length',
      p_spec_name: 'Focal Length',
      p_category: 'Lenses',
    });
  });

  it('should pass null category when not provided', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: null });
    const mockSupabase = { rpc: mockRpc };

    await recordAlias(mockSupabase, 'weight', 'Weight', '');

    expect(mockRpc).toHaveBeenCalledWith('upsert_smart_paste_alias', {
      p_source_key: 'weight',
      p_spec_name: 'Weight',
      p_category: null,
    });
  });

  it('should handle rpc errors gracefully without throwing', async () => {
    const mockRpc = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });
    const mockSupabase = { rpc: mockRpc };

    // Should not throw
    await expect(recordAlias(mockSupabase, 'weight', 'Weight', 'Cameras')).resolves.toBeUndefined();
  });

  it('should handle thrown exceptions gracefully', async () => {
    const mockRpc = vi.fn().mockRejectedValue(new Error('Connection lost'));
    const mockSupabase = { rpc: mockRpc };

    await expect(recordAlias(mockSupabase, 'weight', 'Weight', 'Cameras')).resolves.toBeUndefined();
  });
});

// =============================================================================
// fetchCommunityAliases
// =============================================================================

describe('fetchCommunityAliases', () => {
  it('should return empty Map when supabase is null', async () => {
    const result = await fetchCommunityAliases(null);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should return empty Map when supabase is undefined', async () => {
    const result = await fetchCommunityAliases(undefined);
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it('should query supabase with correct filters', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = { from: mockFrom };

    await fetchCommunityAliases(mockSupabase);

    expect(mockFrom).toHaveBeenCalledWith('smart_paste_aliases');
    expect(mockSelect).toHaveBeenCalledWith('source_key, spec_name, usage_count');
    expect(mockGte).toHaveBeenCalledWith('usage_count', 3);
    expect(mockOrder).toHaveBeenCalledWith('usage_count', { ascending: false });
  });

  it('should use custom minUsage when provided', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = { from: mockFrom };

    await fetchCommunityAliases(mockSupabase, 10);

    expect(mockGte).toHaveBeenCalledWith('usage_count', 10);
  });

  it('should return Map of aliases from DB data', async () => {
    const data = [
      { source_key: 'weight', spec_name: 'Weight', usage_count: 15 },
      { source_key: 'focal length', spec_name: 'Focal Length', usage_count: 8 },
      { source_key: 'megapixels', spec_name: 'Effective Pixels', usage_count: 5 },
    ];

    const mockOrder = vi.fn().mockResolvedValue({ data, error: null });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = { from: mockFrom };

    const result = await fetchCommunityAliases(mockSupabase);

    expect(result.size).toBe(3);
    expect(result.get('weight')).toEqual({ specName: 'Weight', usageCount: 15 });
    expect(result.get('focal length')).toEqual({ specName: 'Focal Length', usageCount: 8 });
    expect(result.get('megapixels')).toEqual({ specName: 'Effective Pixels', usageCount: 5 });
  });

  it('should return empty Map when data is null', async () => {
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = { from: mockFrom };

    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });

  it('should return empty Map on query error', async () => {
    const mockOrder = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'Table not found' } });
    const mockGte = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ gte: mockGte });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabase = { from: mockFrom };

    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });

  it('should return empty Map on thrown exception', async () => {
    const mockFrom = vi.fn().mockImplementation(() => {
      throw new Error('Connection failed');
    });
    const mockSupabase = { from: mockFrom };

    const result = await fetchCommunityAliases(mockSupabase);
    expect(result.size).toBe(0);
  });
});
