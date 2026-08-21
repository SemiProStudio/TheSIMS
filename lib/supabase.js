// =============================================================================
// Supabase Client Configuration
// =============================================================================

// Environment variables (validated in env.ts)
import { info, error as logError } from './logger.js';
import { env } from './env.js';

const supabaseUrl = env.SUPABASE_URL;
const supabaseAnonKey = env.SUPABASE_ANON_KEY;

// Supabase client
let supabaseClient = null;
let initPromise = null;

// Initialize Supabase client
async function initSupabase() {
  try {
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js');
    info('%cSIMS connected to Supabase', 'color: #22c55e; font-weight: bold');
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (_err) {
    // If module not found, try CDN as fallback
    try {
      const module = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2');
      info('%cSIMS connected to Supabase (via CDN)', 'color: #22c55e; font-weight: bold');
      return module.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      });
    } catch (cdnErr) {
      logError('Failed to load Supabase SDK:', cdnErr);
      throw new Error('Supabase SDK not available');
    }
  }
}

// Initialize on first access
export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!initPromise) {
    initPromise = initSupabase();
  }
  supabaseClient = await initPromise;
  return supabaseClient;
}

// Synchronous export for backward compatibility (may be null initially)
export let supabase = null;

// Start initialization immediately
getSupabase()
  .then((client) => {
    supabase = client;
  })
  .catch((err) => logError(err));

// =============================================================================
// Auth Helpers
// =============================================================================

export const auth = {
  // Sign up new user
  signUp: async (email, password, name, roleId) => {
    const client = await getSupabase();

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name, role_id: roleId },
      },
    });

    if (error) throw error;
    return data;
  },

  // Create a user on behalf of an admin.
  // Preferred path: the admin-create-user edge function — it verifies the
  // caller holds admin_users edit, creates the account with the service-role
  // admin API (works with PUBLIC SIGNUPS DISABLED), and applies the chosen
  // role server-side. Falls back to the legacy signUp path ONLY when the
  // function isn't deployed yet (404), so a client deployed ahead of the
  // function never breaks Add User.
  // Returns { user, needsEmailConfirmation, roleApplied }.
  adminCreateUser: async (email, password, name, roleId) => {
    const client = await getSupabase();
    const { data, error } = await client.functions.invoke('admin-create-user', {
      body: { email, password, name, roleId },
    });

    if (!error) {
      return {
        user: data.user,
        needsEmailConfirmation: false, // admin-created accounts are pre-confirmed
        roleApplied: data.roleApplied === true,
      };
    }

    // FunctionsHttpError carries the Response; anything but "function not
    // deployed" (404) is a REAL rejection (403 not authorized, 400 duplicate
    // email/weak password) and must surface, not silently fall back.
    const status = error.context?.status;
    if (status && status !== 404) {
      let message = 'Failed to create user';
      try {
        const body = await error.context.json();
        if (body?.error) message = body.error;
      } catch {
        /* non-JSON body — keep the generic message */
      }
      throw new Error(message);
    }

    // Legacy path — signUp on an ISOLATED client: signUp on the shared client
    // returns a session for the NEW user (when email confirmation is off),
    // which used to silently replace the admin's own login. Requires public
    // signups to be enabled; the role is applied by the caller afterwards.
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js');
    const throwaway = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data: signUpData, error: signUpError } = await throwaway.auth.signUp({
      email,
      password,
      options: {
        data: { name, role_id: roleId },
      },
    });

    if (signUpError) throw signUpError;

    // Drop the new user's session from the throwaway client immediately
    if (signUpData.session) {
      await throwaway.auth.signOut().catch(() => {});
    }

    return {
      user: signUpData.user,
      needsEmailConfirmation: !signUpData.session,
      roleApplied: false,
    };
  },

  // Sign in existing user
  signIn: async (email, password) => {
    const client = await getSupabase();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign out THIS device. Supabase's default scope is 'global', which
  // revokes every session the user holds (phone, other browsers) — not what
  // a Sign Out button means, and it also tore down parallel E2E workers'
  // sessions for the shared admin user (the recurring "logged out mid-test"
  // flake).
  signOut: async () => {
    const client = await getSupabase();

    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  },

  // Get current session
  getSession: async () => {
    const client = await getSupabase();

    const {
      data: { session },
    } = await client.auth.getSession();
    return session;
  },

  // Get current user
  getUser: async () => {
    const client = await getSupabase();

    const {
      data: { user },
    } = await client.auth.getUser();
    return user;
  },

  // Subscribe to auth changes
  onAuthStateChange: (callback) => {
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },

  // Reset password
  resetPassword: async (email) => {
    const client = await getSupabase();

    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Update password
  updatePassword: async (newPassword) => {
    const client = await getSupabase();

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },
};

export default supabase;
