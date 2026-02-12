// =============================================================================
// SIMS Auth Context
// Provides authentication state and methods using Supabase Auth
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase, auth } from '../lib/supabase.js';
import { usersService } from '../lib/services.js';
import { log, error as logError } from '../lib/logger.js';

// Context
const AuthContext = createContext(null);

// =============================================================================
// Auth Provider
// =============================================================================
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
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
        setSession(currentSession);
        
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
        const { data } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          log('Auth state changed:', event);
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          if (newSession?.user) {
            try {
              const profile = await usersService.getById(newSession.user.id);
              setUserProfile(profile);
            } catch (err) {
              logError('Failed to fetch user profile:', err);
            }
          } else {
            setUserProfile(null);
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
      const newSession = data.session;

      setUser(authUser);
      setSession(newSession);

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

  // =============================================================================
  // Sign Up
  // =============================================================================
  const signUp = useCallback(async (email, password, name) => {
    setError(null);
    
    try {
      const data = await auth.signUp(email, password, name);
      return { user: data.user, error: null };
    } catch (err) {
      setError(err);
      return { user: null, error: err };
    }
  }, []);

  // =============================================================================
  // Sign Out
  // =============================================================================
  const signOut = useCallback(async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserProfile(null);
      setSession(null);
      setError(null);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // =============================================================================
  // Password Reset
  // =============================================================================
  const resetPassword = useCallback(async (email) => {
    setError(null);
    
    try {
      await auth.resetPassword(email);
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    }
  }, []);

  // =============================================================================
  // Update Password
  // =============================================================================
  const updatePassword = useCallback(async (newPassword) => {
    setError(null);
    
    try {
      await auth.updatePassword(newPassword);
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    }
  }, []);

  // =============================================================================
  // Update Profile
  // =============================================================================
  const updateProfile = useCallback(async (updates) => {
    if (!user) return { error: new Error('Not authenticated') };
    
    try {
      await usersService.update(user.id, updates);
      const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    }
  }, [user, userProfile]);

  // =============================================================================
  // Context Value
  // =============================================================================
  const value = {
    // State
    user,
    userProfile,
    session,
    loading,
    error,
    
    // Computed
    isAuthenticated: !!user,
    userRole: userProfile?.role || userProfile?.roleId || 'viewer',
    userName: userProfile?.name || user?.email?.split('@')[0] || 'User',
    userEmail: userProfile?.email || user?.email || '',
    
    // Methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
