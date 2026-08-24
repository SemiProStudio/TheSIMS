// =============================================================================
// SIMS Auth Context
// Provides authentication state and methods using Supabase Auth
// =============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getSupabase, auth } from '../lib/supabase.js';
import { usersService } from '../lib/services.js';
import { log, error as logError } from '../lib/logger.js';
import AuthContext from './AuthContext.js';

// =============================================================================
// Auth Provider
// =============================================================================
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =============================================================================
  // Initialize auth state
  // =============================================================================
  useEffect(() => {
    let subscription = null;

    const initAuth = async () => {
      setLoading(true);

      try {
        // Wait for Supabase client to be ready
        const supabase = await getSupabase();

        // Get current session
        const currentSession = await auth.getSession();

        if (currentSession?.user) {
          setUser(currentSession.user);

          // Fetch user profile from database
          try {
            const profile = await usersService.getById(currentSession.user.id);
            setUserProfile(profile);
          } catch (profileErr) {
            logError('Failed to fetch user profile:', profileErr);
          }
        }

        // Subscribe to auth changes (now that supabase is ready)
        // Skip INITIAL_SESSION — we already handled it above to avoid a flash
        // This callback MUST stay synchronous and MUST NOT call Supabase.
        // auth-js invokes it while holding the auth lock (TOKEN_REFRESHED
        // fires from inside the refresh flow); a query awaited here needs
        // that same lock, so it never resolves and the lock is never
        // released — every later request in the tab hangs. Prod 2026-08-22:
        // each session loaded fine, then every save hung forever after the
        // hourly refresh. Defer any Supabase work with setTimeout, as the
        // Supabase docs prescribe.
        const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
          if (event === 'INITIAL_SESSION') return;

          log('Auth state changed:', event);
          setUser(newSession?.user ?? null);

          if (!newSession?.user) {
            setUserProfile(null);
            return;
          }
          // A token refresh changes nothing about the profile; only a sign-in
          // or a user update warrants a refetch
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            const userId = newSession.user.id;
            setTimeout(() => {
              usersService
                .getById(userId)
                .then((profile) => setUserProfile(profile))
                .catch((err) => logError('Failed to fetch user profile:', err));
            }, 0);
          }
        });

        subscription = data.subscription;
      } catch (err) {
        logError('Auth init error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // =============================================================================
  // Sign In
  // =============================================================================
  const signIn = useCallback(async (email, password) => {
    setError(null);

    try {
      const data = await auth.signIn(email, password);
      const authUser = data.user;

      setUser(authUser);

      // Fetch user profile
      let profile = null;
      if (authUser) {
        try {
          profile = await usersService.getById(authUser.id);
          setUserProfile(profile);
        } catch (profileErr) {
          logError('Failed to fetch profile after login:', profileErr);
        }
      }

      return { user: profile || authUser, error: null };
    } catch (err) {
      logError('Sign in error:', err);
      setError(err);
      return { user: null, error: err };
    }
  }, []);

  // Admin-initiated user creation on an isolated client — never replaces the
  // current (admin) session. Throws on failure.
  const adminCreateUser = useCallback(async (email, password, name, roleId) => {
    setError(null);
    return auth.adminCreateUser(email, password, name, roleId);
  }, []);

  // =============================================================================
  // Sign Out
  // =============================================================================
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserProfile(null);
      setError(null);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // =============================================================================
  // Context Value
  // =============================================================================
  const value = useMemo(
    () => ({
      // State
      user,
      userProfile,
      loading,
      error,

      // Computed
      isAuthenticated: !!user,

      // Methods
      signIn,
      adminCreateUser,
      signOut,
    }),
    [user, userProfile, loading, error, signIn, adminCreateUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
