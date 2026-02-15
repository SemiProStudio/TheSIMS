-- =============================================================================
-- SIMS Baseline Migration 8/8: Smart Paste Aliases
-- Community-contributed field mapping table for the Smart Paste parser
-- =============================================================================

CREATE TABLE smart_paste_aliases (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_key  TEXT        NOT NULL,
  spec_name   TEXT        NOT NULL,
  category    TEXT,
  usage_count INTEGER     NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT smart_paste_aliases_unique UNIQUE (source_key, spec_name, category)
);

-- Indexes for fast lookups during parsing
CREATE INDEX IF NOT EXISTS idx_smart_paste_aliases_lookup
  ON smart_paste_aliases (source_key, usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_smart_paste_aliases_category
  ON smart_paste_aliases (category, usage_count DESC)
  WHERE category IS NOT NULL;

-- =============================================================================
-- RPC Functions
-- =============================================================================

-- Upsert alias: insert or increment usage_count
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

-- Get aliases above a usage threshold
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

-- Cleanup: prune stale low-usage aliases
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

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE smart_paste_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read aliases"
  ON smart_paste_aliases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert aliases"
  ON smart_paste_aliases
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
