// =============================================================================
// SIMS Auth Context
// Provides authentication state and methods using Supabase Auth
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemoMode, auth } from './supabase.js';
import { usersService } from './services.js';

// Demo users for offline mode
const DEMO_USERS = [
  { id: 'demo-admin', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin', roleId: 'role_admin' },
  { id: 'demo-user', name: 'Demo User', email: 'user@demo.com', role: 'user', roleId: 'role_user' },
];

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
    const initAuth = async () => {
      setLoading(true);
      
      if (isDemoMode) {
        // In demo mode, check localStorage for saved demo user
        const savedDemoUser = safeLocalStorage.getItem('sims-demo-user');
        if (savedDemoUser) {
          try {
            const demoUser = JSON.parse(savedDemoUser);
            setUser(demoUser);
            setUserProfile(demoUser);
          } catch (e) {
            console.error('Failed to parse demo user:', e);
          }
        }
        setLoading(false);
        return;
      }

      try {
        // Get current session
        const currentSession = await auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          setUser(currentSession.user);
          
          // Fetch user profile from database
          const profile = await usersService.getById(currentSession.user.id);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes (production mode only)
    if (!isDemoMode && supabase) {
      const { data: { subscription } } = auth.onAuthStateChange(async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          try {
            const profile = await usersService.getById(newSession.user.id);
            setUserProfile(profile);
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
          }
        } else {
          setUserProfile(null);
        }

        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        } else if (event === 'USER_UPDATED') {
          // Refresh profile
          if (newSession?.user) {
            const profile = await usersService.getById(newSession.user.id);
            setUserProfile(profile);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // =============================================================================
  // Sign In
  // =============================================================================
  const signIn = useCallback(async (email, password) => {
    setError(null);
    
    if (isDemoMode) {
      // Demo mode: check against demo users
      const demoUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (demoUser && password === 'demo') {
        setUser(demoUser);
        setUserProfile(demoUser);
        safeLocalStorage.setItem('sims-demo-user', JSON.stringify(demoUser));
        return { user: demoUser, error: null };
      }
      
      // Also allow any email/password combo in demo mode for testing
      if (password === 'demo') {
        const customUser = {
          id: `demo-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: 'user',
          roleId: 'role_user',
        };
        setUser(customUser);
        setUserProfile(customUser);
        safeLocalStorage.setItem('sims-demo-user', JSON.stringify(customUser));
        return { user: customUser, error: null };
      }
      
      return { 
        user: null, 
        error: new Error('Invalid credentials. In demo mode, use password "demo"') 
      };
    }

    try {
      const { user: authUser, session: newSession, error: authError } = await auth.signIn(email, password);
      
      if (authError) {
        setError(authError);
        return { user: null, error: authError };
      }

      setUser(authUser);
      setSession(newSession);

      // Fetch user profile
      if (authUser) {
        const profile = await usersService.getById(authUser.id);
        setUserProfile(profile);
      }

      return { user: authUser, error: null };
    } catch (err) {
      setError(err);
      return { user: null, error: err };
    }
  }, []);

  // =============================================================================
  // Sign Up
  // =============================================================================
  const signUp = useCallback(async (email, password, name) => {
    setError(null);
    
    if (isDemoMode) {
      return { 
        user: null, 
        error: new Error('Sign up is not available in demo mode') 
      };
    }

    try {
      const { user: authUser, error: authError } = await auth.signUp(email, password, name);
      
      if (authError) {
        setError(authError);
        return { user: null, error: authError };
      }

      return { user: authUser, error: null };
    } catch (err) {
      setError(err);
      return { user: null, error: err };
    }
  }, []);

  // =============================================================================
  // Sign Out
  // =============================================================================
  const signOut = useCallback(async () => {
    setError(null);
    
    if (isDemoMode) {
      setUser(null);
      setUserProfile(null);
      safeLocalStorage.removeItem('sims-demo-user');
      return { error: null };
    }

    try {
      await auth.signOut();
      setUser(null);
      setSession(null);
      setUserProfile(null);
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    }
  }, []);

  // =============================================================================
  // Reset Password
  // =============================================================================
  const resetPassword = useCallback(async (email) => {
    setError(null);
    
    if (isDemoMode) {
      return { error: new Error('Password reset is not available in demo mode') };
    }

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
    
    if (isDemoMode) {
      return { error: new Error('Password update is not available in demo mode') };
    }

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
    if (!user) {
      return { error: new Error('Not authenticated') };
    }
    
    if (isDemoMode) {
      const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
      safeLocalStorage.setItem('sims-demo-user', JSON.stringify(updatedProfile));
      return { profile: updatedProfile, error: null };
    }

    try {
      const updatedProfile = await usersService.update(user.id, updates);
      setUserProfile(prev => ({ ...prev, ...updatedProfile }));
      return { profile: updatedProfile, error: null };
    } catch (err) {
      return { profile: null, error: err };
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
    isAuthenticated: !!user,
    isDemoMode,
    
    // Computed
    userRole: userProfile?.role || userProfile?.roleId || 'viewer',
    userName: userProfile?.name || user?.email?.split('@')[0] || 'User',
    userEmail: userProfile?.email || user?.email || '',
    
    // Methods
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
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

// =============================================================================
// Safe localStorage wrapper (handles private browsing mode)
// =============================================================================
const safeLocalStorage = {
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore - localStorage not available
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore - localStorage not available
    }
  },
};

// =============================================================================
// HOC for protected routes
// =============================================================================
export function withAuth(Component) {
  return function ProtectedComponent(props) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#1a1a2e',
          color: '#94a3b8',
        }}>
          Loading...
        </div>
      );
    }
    
    if (!isAuthenticated) {
      return null; // Or redirect to login
    }
    
    return <Component {...props} />;
  };
}

export default AuthContext;
