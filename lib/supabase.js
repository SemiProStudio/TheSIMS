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
        detectSessionInUrl: true
      }
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
          detectSessionInUrl: true
        }
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
getSupabase().then(client => { supabase = client; }).catch(err => logError(err));

// =============================================================================
// Auth Helpers
// =============================================================================

export const auth = {
  // Sign up new user
  signUp: async (email, password, name) => {
    const client = await getSupabase();
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) throw error;
    return data;
  },

  // Sign in existing user
  signIn: async (email, password) => {
    const client = await getSupabase();
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const client = await getSupabase();
    
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getSession: async () => {
    const client = await getSupabase();
    
    const { data: { session } } = await client.auth.getSession();
    return session;
  },

  // Get current user
  getUser: async () => {
    const client = await getSupabase();
    
    const { data: { user } } = await client.auth.getUser();
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
  }
};

export default supabase;
