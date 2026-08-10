-- =============================================================================
-- Schedule the due-date-reminder edge function
-- Runs daily at 9:00 AM UTC via pg_cron + pg_net.
-- The x-cron-secret header is read from Vault (secret name: cron_secret) at
-- execution time, so the secret value is never stored in the job definition.
-- The edge function validates it against its CRON_SECRET env var.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'due-date-reminder-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://smcenkniztqzkgsamvsc.supabase.co/functions/v1/due-date-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
