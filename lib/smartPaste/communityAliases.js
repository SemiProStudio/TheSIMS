// ============================================================================
// Smart Paste — Community Aliases
// Record and fetch community-learned alias mappings via Supabase
// ============================================================================

import { warn } from '../logger.js';

/**
 * Record a manual mapping for community learning.
 * @param {Object} supabase - Supabase client instance
 * @param {string} sourceKey - The original key from the pasted text
 * @param {string} specName - The spec field the user mapped it to
 * @param {string} category - The item category (for context)
 */
export async function recordAlias(supabase, sourceKey, specName, category) {
  if (!supabase) return;
  try {
    // Upsert: increment usage_count if exists, insert if not
    const { error } = await supabase.rpc('upsert_smart_paste_alias', {
      p_source_key: sourceKey.toLowerCase().trim(),
      p_spec_name: specName,
      p_category: category || null,
    });
    if (error) warn('Failed to record alias:', error.message);
  } catch (e) {
    warn('Community alias recording not available:', e.message);
  }
}

/**
 * Fetch community aliases for use in parsing.
 * Returns Map<normalizedKey, { specName, usageCount }>.
 * @param {Object} supabase - Supabase client instance
 * @param {number} minUsage - Minimum usage count to include (default 3)
 */
export async function fetchCommunityAliases(supabase, minUsage = 3) {
  if (!supabase) return new Map();
  try {
    const { data, error } = await supabase
      .from('smart_paste_aliases')
      .select('source_key, spec_name, usage_count')
      .gte('usage_count', minUsage)
      .order('usage_count', { ascending: false });
    if (error) throw error;
    const map = new Map();
    for (const row of data || []) {
      map.set(row.source_key, { specName: row.spec_name, usageCount: row.usage_count });
    }
    return map;
  } catch (e) {
    warn('Community aliases not available:', e.message);
    return new Map();
  }
}
