-- =============================================================================
-- DEPRECATED: This file is kept for reference only.
-- The source of truth for the database schema is supabase/migrations/.
-- To set up a new database, run: supabase db reset
-- To apply new changes, create a new migration: supabase migration new <name>
-- =============================================================================
--
-- Smart Paste Community Aliases (5.3)
-- Stores user-contributed field mappings that the parser can learn from.
-- =============================================================================

-- Table: smart_paste_aliases
-- Stores discovered mappings between raw pasted keys and spec field names.
-- When a user manually maps an unmatched pair to a spec field, this table
-- records that mapping. Aliases with high usage_count are used by the parser
-- in Pass 1 to improve matching accuracy over time.
-- =============================================================================

CREATE TABLE IF NOT EXISTS smart_paste_aliases (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key  TEXT        NOT NULL,  -- Normalized source key (lowercased, trimmed)
  spec_name   TEXT        NOT NULL,  -- Target spec field name
  category    TEXT,                  -- Item category for context (nullable for universal aliases)
  usage_count INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each source_key + spec_name + category combination is unique
  CONSTRAINT smart_paste_aliases_unique UNIQUE (source_key, spec_name, category)
);

-- Index for fast lookups during parsing
CREATE INDEX IF NOT EXISTS idx_smart_paste_aliases_lookup
  ON smart_paste_aliases (source_key, usage_count DESC);

-- Index for category-filtered lookups
CREATE INDEX IF NOT EXISTS idx_smart_paste_aliases_category
  ON smart_paste_aliases (category, usage_count DESC)
  WHERE category IS NOT NULL;

-- =============================================================================
-- RPC: upsert_smart_paste_alias
-- Called from the client when a user manually maps an unmatched field.
-- Inserts a new alias or increments usage_count if it already exists.
-- =============================================================================

CREATE OR REPLACE FUNCTION upsert_smart_paste_alias(
  p_source_key TEXT,
  p_spec_name  TEXT,
  p_category   TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO smart_paste_aliases (source_key, spec_name, category, usage_count, updated_at)
  VALUES (lower(trim(p_source_key)), trim(p_spec_name), p_category, 1, now())
  ON CONFLICT (source_key, spec_name, category)
  DO UPDATE SET
    usage_count = smart_paste_aliases.usage_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: get_smart_paste_aliases
-- Returns community aliases above a minimum usage threshold.
-- Used by the parser to pre-populate Pass 1 alias lookup.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_smart_paste_aliases(
  p_min_usage  INTEGER DEFAULT 3,
  p_category   TEXT    DEFAULT NULL
)
RETURNS TABLE (
  source_key  TEXT,
  spec_name   TEXT,
  category    TEXT,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.source_key,
    a.spec_name,
    a.category,
    a.usage_count
  FROM smart_paste_aliases a
  WHERE a.usage_count >= p_min_usage
    AND (p_category IS NULL OR a.category IS NULL OR a.category = p_category)
  ORDER BY a.usage_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE smart_paste_aliases ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read aliases (community knowledge)
CREATE POLICY "Anyone can read aliases"
  ON smart_paste_aliases
  FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can insert aliases (contribute mappings)
CREATE POLICY "Anyone can insert aliases"
  ON smart_paste_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only allow updates through the RPC function (SECURITY DEFINER)
-- Direct updates are not permitted through the API.

-- =============================================================================
-- Cleanup: optional function to prune stale aliases
-- Run periodically (e.g. monthly) to remove low-usage aliases older than 6 months.
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_smart_paste_aliases(
  p_max_age_days INTEGER DEFAULT 180,
  p_min_usage    INTEGER DEFAULT 2
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM smart_paste_aliases
  WHERE usage_count < p_min_usage
    AND updated_at < now() - (p_max_age_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
