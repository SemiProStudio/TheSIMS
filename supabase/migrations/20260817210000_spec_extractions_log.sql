-- ============================================================================
-- Phase 2 (AI spec extraction): per-call audit/rate-limit log
-- The extract-specs edge function counts recent rows to enforce its
-- 10/minute + 100/day caps, and records usage for cost visibility.
-- Service-role only — clients never read or write it.
-- ============================================================================
CREATE TABLE IF NOT EXISTS spec_extractions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID,
  category VARCHAR(100),
  input_chars INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spec_extractions_created
  ON spec_extractions (created_at DESC);

ALTER TABLE spec_extractions ENABLE ROW LEVEL SECURITY;
-- RLS on with no policies + explicit revoke: only service role reaches it
REVOKE ALL ON spec_extractions FROM anon, authenticated, public;
