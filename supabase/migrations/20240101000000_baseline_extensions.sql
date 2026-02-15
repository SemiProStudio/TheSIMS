-- =============================================================================
-- SIMS Baseline Migration 1/8: Extensions
-- =============================================================================
-- BASELINE MIGRATION — Do NOT run on existing databases.
--
-- This migration captures the full schema as of the initial migration setup.
-- For existing databases, mark all baseline migrations as applied:
--   supabase migration repair --status applied 20240101000000
--   supabase migration repair --status applied 20240101000001
--   supabase migration repair --status applied 20240101000002
--   supabase migration repair --status applied 20240101000003
--   supabase migration repair --status applied 20240101000004
--   supabase migration repair --status applied 20240101000005
--   supabase migration repair --status applied 20240101000006
--   supabase migration repair --status applied 20240101000007
--
-- Future schema changes should be added as new migration files.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
