// =============================================================================
// Environment Variable Validation
// Validates required env vars at module load (fail-fast) and exports typed
// accessors. If a required variable is missing, the app shows a clear error
// instead of a blank white screen.
// =============================================================================

function getRequiredEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    const message =
      `Missing required environment variable: ${key}. ` +
      `Copy .env.example to .env and fill in your values.`;

    // Show a visible error in the DOM for developers who miss console output
    if (typeof document !== 'undefined') {
      document.title = 'SIMS — Config Error';
      const root = document.getElementById('root');
      if (root) {
        root.innerHTML = `
          <div style="padding:40px;font-family:system-ui;color:#f87171;background:#1a1a2e;min-height:100vh">
            <h1 style="margin-bottom:16px">Configuration Error</h1>
            <p style="color:#94a3b8;margin-bottom:8px">Missing required environment variable:</p>
            <code style="background:#0f172a;padding:4px 12px;border-radius:4px;color:#fbbf24;font-size:1.1em">${key}</code>
            <p style="color:#94a3b8;margin-top:24px">
              Copy <code>.env.example</code> to <code>.env</code> and fill in your Supabase credentials.
            </p>
          </div>`;
      }
    }
    throw new Error(message);
  }
  return value;
}

function getOptionalEnv(key: string, fallback = ''): string {
  return import.meta.env[key] || fallback;
}

// Validate required vars immediately on module load (fail fast)
export const env = {
  SUPABASE_URL: getRequiredEnv('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getRequiredEnv('VITE_SUPABASE_ANON_KEY'),

  SENTRY_DSN: getOptionalEnv('VITE_SENTRY_DSN'),
  APP_VERSION: getOptionalEnv('VITE_APP_VERSION', '1.0.0'),
  SENTRY_ENABLED: getOptionalEnv('VITE_SENTRY_ENABLED'),

  MODE: (import.meta.env.MODE as string) || 'development',
  DEV: import.meta.env.DEV ?? false,
} as const;
