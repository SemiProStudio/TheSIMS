// =============================================================================
// Ambient declarations for `npm run typecheck` only.
//
// The vitest suites import the Deno-flavored supabase/functions/_shared
// modules directly (that sharing is the point — the pure pipeline logic is
// unit-tested), and tsc follows those imports even though supabase/functions
// is excluded. The excluded entrypoints run under the real Deno types when
// deployed; this shim only has to make the *imported* shared modules
// typecheck from the app project.
// =============================================================================

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// Edge modules import supabase-js from esm.sh; the app project has no types
// for URL imports (and never executes these paths).
declare module 'https://esm.sh/*';
