// =============================================================================
// Shared Utilities for Supabase Edge Functions
// =============================================================================

// CORS headers for browser requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Standard JSON response
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Error response
export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Get Supabase client for Edge Functions
export async function getSupabaseClient() {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Escape a value for safe interpolation into HTML
export function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Simple template rendering (replace {{variable}} with values).
// When html=true, substituted VALUES are HTML-escaped so caller-supplied
// templateData cannot inject markup into emails (the template itself, which
// lives in the database and is admin-controlled, is left as-is).
export function renderTemplate(
  template: string,
  data: Record<string, string>,
  html = false,
): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    const safeValue = value ? (html ? escapeHtml(value) : String(value)) : '';
    result = result.replace(regex, safeValue);
  }

  // Handle conditional blocks {{#if variable}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, variable, content) => {
    return data[variable] ? content : '';
  });

  return result;
}

// True only when the request carries a real signed-in end-user or the service
// role — NOT the bare anon key. verify_jwt = true accepts ANY project-signed
// JWT, including the anon key that ships in the public bundle; the anon token
// has role 'anon' and no `sub`, so callers must additionally clear this gate.
// Use for any function that must not be reachable by unauthenticated internet
// callers. Only meaningful behind verify_jwt = true.
export function isTrustedCaller(
  claims: { role?: string; sub?: string } | null,
): boolean {
  if (!claims) return false;
  if (claims.role === 'service_role') return true;
  return claims.role === 'authenticated' && !!claims.sub;
}

// Best-effort burst rate limit using notification_log as a shared counter:
// true when at least `limit` rows were created in the last `windowMs`. Bounds
// runaway loops / a compromised account; not a per-caller quota.
export async function isRateLimited(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  limit: number,
  windowMs = 60_000,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await supabase
    .from('notification_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  return (count ?? 0) >= limit;
}

// Decode the (gateway-verified) JWT from the Authorization header.
// Returns { role, sub, email } or null if absent/malformed. Signature is NOT
// re-verified here — only use behind verify_jwt = true, where the Supabase
// gateway has already rejected invalid tokens.
export function decodeAuthClaims(
  req: Request,
): { role?: string; sub?: string; email?: string } | null {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
          (c) => c.charCodeAt(0),
        ),
      ),
    );
    return { role: payload.role, sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
