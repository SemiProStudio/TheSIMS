// =============================================================================
// Supabase Client Configuration
// =============================================================================

// Environment variables (set these in your .env file)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in demo mode (no Supabase connection)
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

// Supabase client - only created if credentials are provided
let supabaseClient = null;
let initPromise = null;

// Dynamic import of Supabase - truly optional
async function initSupabase() {
  if (isDemoMode) {
    console.info(
      '%cSIMS running in demo mode',
      'color: #6366f1; font-weight: bold',
      '\nData is stored locally only.',
      '\nTo connect to Supabase, set environment variables:',
      '\n  VITE_SUPABASE_URL=your-project-url',
      '\n  VITE_SUPABASE_ANON_KEY=your-anon-key'
    );
    return null;
  }

  try {
    // Try to import from node_modules first (use vite-ignore to prevent build-time resolution)
    const { createClient } = await import(/* @vite-ignore */ '@supabase/supabase-js');
    console.info('%cSIMS connected to Supabase', 'color: #22c55e; font-weight: bold');
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    // If module not found, try CDN as fallback
    try {
      const module = await import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2');
      console.info('%cSIMS connected to Supabase (via CDN)', 'color: #22c55e; font-weight: bold');
      return module.createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
    } catch (cdnErr) {
      console.warn(
        '%cSupabase SDK not available',
        'color: #f59e0b; font-weight: bold',
        '\nRunning in demo mode.',
        '\nTo enable Supabase, run: npm install'
      );
      return null;
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

// Start initialization immediately but don't block
if (!isDemoMode) {
  getSupabase().then(client => { supabase = client; });
}

// =============================================================================
// Auth Helpers
// =============================================================================

export const auth = {
  // Sign up new user
  signUp: async (email, password, name) => {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase not configured');
    
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
    if (!client) throw new Error('Supabase not configured');
    
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
    if (!client) throw new Error('Supabase not configured');
    
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  // Get current session
  getSession: async () => {
    const client = await getSupabase();
    if (!client) return null;
    
    const { data: { session } } = await client.auth.getSession();
    return session;
  },

  // Get current user
  getUser: async () => {
    const client = await getSupabase();
    if (!client) return null;
    
    const { data: { user } } = await client.auth.getUser();
    return user;
  },

  // Subscribe to auth changes
  onAuthStateChange: (callback) => {
    // This needs to be synchronous, so check if client exists
    if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
    
    return supabase.auth.onAuthStateChange(callback);
  },

  // Reset password
  resetPassword: async (email) => {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase not configured');
    
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Update password
  updatePassword: async (newPassword) => {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase not configured');
    
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
};

export default supabase;
