// ============================================================================
// Login Component
// ============================================================================

import React, { memo, useState } from 'react';
import { colors, styles, spacing, borderRadius, typography } from './theme.js';
import { Spinner } from './components/Loading.jsx';

function Login({ loginForm, setLoginForm, onLogin, isLoading, error, isDemoMode }) {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bgDark,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: typography.fontFamily
    }}>
      <div style={{
        ...styles.card,
        width: '100%',
        maxWidth: 400,
        padding: spacing[8]
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing[3],
          marginBottom: spacing[8]
        }}>
          <img 
            src="/moe.png" 
            alt="SIMS Logo"
            style={{
              width: 56,
              height: 56,
              borderRadius: borderRadius.xl,
              objectFit: 'cover',
            }}
            onError={(e) => {
              // Fallback to gradient icon if image fails to load
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            width: 56,
            height: 56,
            borderRadius: borderRadius.xl,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: colors.textPrimary
            }}>
              SIMS
            </h1>
            <p style={{
              margin: 0,
              fontSize: typography.fontSize.xs,
              color: colors.textMuted
            }}>
              Studio Inventory Management System
            </p>
          </div>
        </div>
        
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: spacing[4],
            fontSize: typography.fontSize.xs,
            color: colors.accent,
            textAlign: 'center',
          }}>
            <strong>Demo Mode</strong> - Data is stored locally only
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: borderRadius.md,
            padding: spacing[3],
            marginBottom: spacing[4],
            fontSize: typography.fontSize.sm,
            color: colors.danger,
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={onLogin}>
          <div style={{ marginBottom: spacing[4] }}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={loginForm.email}
              onChange={e => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder={isDemoMode ? "admin@demo.com" : "email@example.com"}
              style={styles.input}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: spacing[6] }}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={isDemoMode ? "demo" : "Enter password"}
                style={{ ...styles.input, paddingRight: 40 }}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  padding: 4,
                }}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              ...styles.btn,
              width: '100%',
              justifyContent: 'center',
              padding: `${spacing[3]}px ${spacing[4]}px`,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? (
              <>
                <Spinner size={16} color="white" />
                <span style={{ marginLeft: 8 }}>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Demo credentials */}
        <p style={{
          textAlign: 'center',
          color: colors.textMuted,
          fontSize: typography.fontSize.xs,
          marginTop: spacing[6]
        }}>
          {isDemoMode 
            ? 'Demo: any email with password "demo"'
            : 'Contact admin for access'
          }
        </p>
      </div>
    </div>
  );
}

export default memo(Login);
