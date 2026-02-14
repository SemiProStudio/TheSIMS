// =============================================================================
// Error Tracking Service
// Sentry integration for error reporting and monitoring
// =============================================================================

/**
 * Error tracking configuration
 */
import { log, warn, error as logError } from './logger';

const config = {
  // Sentry DSN - should be set via environment variable
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  
  // Environment
  environment: import.meta.env.MODE || 'development',
  
  // Release version
  release: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Sample rate for performance monitoring (0-1)
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  
  // Sample rate for session replays (0-1)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Enable in production only by default
  enabled: import.meta.env.MODE === 'production' || import.meta.env.VITE_SENTRY_ENABLED === 'true',
  
  // Debug mode for development
  debug: import.meta.env.MODE === 'development',
  
  // Breadcrumb settings
  maxBreadcrumbs: 50,
  
  // Ignore common errors
  ignoreErrors: [
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'ChunkLoadError',
    
    // Browser extensions
    'chrome-extension',
    'moz-extension',
    
    // Resize observer
    'ResizeObserver loop',
    
    // Cancel errors
    'AbortError',
    'The operation was aborted',
    
    // Auth errors that are expected
    'User is not authenticated',
  ],
  
  // URLs to ignore
  denyUrls: [
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    
    // Firefox extensions
    /^moz-extension:\/\//i,
    
    // Safari extensions
    /^safari-extension:\/\//i,
  ],
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Error categories for grouping
 */
export const ErrorCategory = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTH: 'auth',
  UI: 'ui',
  DATA: 'data',
  UNKNOWN: 'unknown',
};

// =============================================================================
// In-Memory Error Queue (for when Sentry is not available)
// =============================================================================

const errorQueue = [];
const MAX_QUEUE_SIZE = 100;

function queueError(error, context) {
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    errorQueue.shift();
  }
  
  errorQueue.push({
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
  });
}

// =============================================================================
// Sentry Mock (when SDK is not loaded)
// =============================================================================

let Sentry = null;
let isInitialized = false;

/**
 * Initialize error tracking
 * Call this early in your app's lifecycle
 */
export async function initErrorTracking() {
  if (isInitialized) return;
  
  if (!config.enabled || !config.dsn) {
    log('[ErrorTracking] Disabled or no DSN configured');
    isInitialized = true;
    return;
  }
  
  try {
    // Dynamically import Sentry to reduce bundle size when not needed
    Sentry = await import('@sentry/react');
    
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      debug: config.debug,
      
      // Performance monitoring
      tracesSampleRate: config.tracesSampleRate,
      
      // Session replay
      replaysSessionSampleRate: config.replaysSessionSampleRate,
      replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
      
      // Integrations
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Error filtering
      ignoreErrors: config.ignoreErrors,
      denyUrls: config.denyUrls,
      
      // Breadcrumbs
      maxBreadcrumbs: config.maxBreadcrumbs,
      
      // Before send hook for additional filtering
      beforeSend(event, hint) {
        // Filter out development errors
        if (config.environment === 'development') {
          log('[Sentry] Would send:', event);
          return null; // Don't actually send in development
        }
        
        // Add additional context
        event.tags = {
          ...event.tags,
          component: hint?.originalException?.componentStack ? 'react' : 'javascript',
        };
        
        return event;
      },
      
      // Before breadcrumb hook
      beforeBreadcrumb(breadcrumb) {
        // Filter out noisy breadcrumbs
        if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
          return null;
        }
        return breadcrumb;
      },
    });
    
    isInitialized = true;
    log('[ErrorTracking] Initialized successfully');
  } catch (error) {
    warn('[ErrorTracking] Failed to initialize Sentry:', error);
    isInitialized = true; // Mark as initialized to prevent retries
  }
}

// =============================================================================
// Error Capture Functions
// =============================================================================

/**
 * Capture an exception
 * @param {Error} error - The error to capture
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  const enrichedContext = {
    ...context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  // Always log to console in development
  if (config.environment === 'development') {
    logError('[ErrorTracking] Exception:', error, enrichedContext);
  }
  
  // Queue for later if Sentry not available
  if (!Sentry || !config.enabled) {
    queueError(error, enrichedContext);
    return;
  }
  
  Sentry.withScope((scope) => {
    // Set context
    if (context.user) {
      scope.setUser(context.user);
    }
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    if (context.level) {
      scope.setLevel(context.level);
    }
    
    if (context.category) {
      scope.setTag('error_category', context.category);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture a message
 * @param {string} message - The message to capture
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = ErrorSeverity.INFO, context = {}) {
  if (config.environment === 'development') {
    log(`[ErrorTracking] Message (${level}):`, message, context);
  }
  
  if (!Sentry || !config.enabled) {
    queueError(new Error(message), { level, ...context });
    return;
  }
  
  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    Sentry.captureMessage(message);
  });
}

// =============================================================================
// Breadcrumbs
// =============================================================================

/**
 * Add a breadcrumb for debugging
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  if (Sentry && config.enabled) {
    Sentry.addBreadcrumb({
      timestamp: Date.now() / 1000,
      ...breadcrumb,
    });
  }
  
  if (config.environment === 'development') {
    log('[Breadcrumb]', breadcrumb);
  }
}

/**
 * Add a navigation breadcrumb
 * @param {string} from - Previous location
 * @param {string} to - New location
 */
export function addNavigationBreadcrumb(from, to) {
  addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    data: { from, to },
    level: 'info',
  });
}

/**
 * Add a user action breadcrumb
 * @param {string} action - Action description
 * @param {Object} data - Additional data
 */
export function addUserActionBreadcrumb(action, data = {}) {
  addBreadcrumb({
    category: 'user',
    message: action,
    data,
    level: 'info',
  });
}

/**
 * Add an API call breadcrumb
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {number} status - Response status
 */
export function addApiCallBreadcrumb(method, url, status) {
  addBreadcrumb({
    category: 'http',
    message: `${method} ${url}`,
    data: { method, url, status },
    level: status >= 400 ? 'error' : 'info',
  });
}

// =============================================================================
// User Context
// =============================================================================

/**
 * Set user context for error tracking
 * @param {Object} user - User data
 */
export function setUser(user) {
  if (!user) {
    if (Sentry) Sentry.setUser(null);
    return;
  }
  
  const userData = {
    id: user.id,
    email: user.email,
    username: user.name || user.username,
    role: user.role,
  };
  
  if (Sentry && config.enabled) {
    Sentry.setUser(userData);
  }
  
  if (config.environment === 'development') {
    log('[ErrorTracking] Set user:', userData);
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (Sentry) {
    Sentry.setUser(null);
  }
}

// =============================================================================
// Tags and Context
// =============================================================================

/**
 * Set a global tag
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export function setTag(key, value) {
  if (Sentry && config.enabled) {
    Sentry.setTag(key, value);
  }
}

/**
 * Set additional context
 * @param {string} name - Context name
 * @param {Object} context - Context data
 */
export function setContext(name, context) {
  if (Sentry && config.enabled) {
    Sentry.setContext(name, context);
  }
}

// =============================================================================
// React Integration
// =============================================================================

/**
 * Create an error boundary with Sentry integration
 * Usage: export default withErrorBoundary(MyComponent, { fallback: ErrorFallback })
 */
export function withSentryErrorBoundary(Component, options = {}) {
  if (Sentry) {
    return Sentry.withErrorBoundary(Component, {
      fallback: options.fallback || <DefaultErrorFallback />,
      showDialog: options.showDialog || false,
      ...options,
    });
  }
  
  // Return component unchanged if Sentry not available
  return Component;
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback() {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: '#94a3b8',
      backgroundColor: '#1a1a2e',
      borderRadius: '8px',
      margin: '20px',
    }}>
      <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Something went wrong</h2>
      <p style={{ marginBottom: '20px' }}>
        We've been notified and are working on a fix.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 20px',
          cursor: 'pointer',
        }}
      >
        Reload Page
      </button>
    </div>
  );
}

// =============================================================================
// Performance Monitoring
// =============================================================================

/**
 * Start a performance transaction
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {Object} Transaction object
 */
export function startTransaction(name, op = 'task') {
  if (!Sentry || !config.enabled) {
    return {
      finish: () => {},
      setStatus: () => {},
      setData: () => {},
    };
  }
  
  return Sentry.startTransaction({ name, op });
}

/**
 * Measure a function's performance
 * @param {string} name - Measurement name
 * @param {Function} fn - Function to measure
 * @returns {*} Function result
 */
export async function measurePerformance(name, fn) {
  const transaction = startTransaction(name, 'function');
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('error');
    throw error;
  } finally {
    transaction.finish();
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get queued errors (for debugging)
 */
export function getQueuedErrors() {
  return [...errorQueue];
}

/**
 * Clear queued errors
 */
export function clearQueuedErrors() {
  errorQueue.length = 0;
}

/**
 * Check if error tracking is enabled
 */
export function isErrorTrackingEnabled() {
  return config.enabled && !!Sentry;
}

/**
 * Get current configuration
 */
export function getConfig() {
  return { ...config };
}

// =============================================================================
// Export Error Boundary Wrapper
// =============================================================================

export { Sentry };

export default {
  init: initErrorTracking,
  captureException,
  captureMessage,
  addBreadcrumb,
  addNavigationBreadcrumb,
  addUserActionBreadcrumb,
  addApiCallBreadcrumb,
  setUser,
  clearUser,
  setTag,
  setContext,
  startTransaction,
  measurePerformance,
  isEnabled: isErrorTrackingEnabled,
};
