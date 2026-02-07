// =============================================================================
// Logger Utility
// Wraps console methods to only output in development mode.
// In production builds, debug/log calls are no-ops to keep the console clean
// and avoid leaking internal information (table names, user emails, etc.).
//
// Usage:
//   import { log, warn, error } from './lib/logger.js';
//   log('[App] User authenticated:', email);   // silent in production
//   warn('Community aliases not available');     // silent in production
//   error('Failed to save:', err);              // always outputs
// =============================================================================

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/** Debug-level logging — silent in production */
export const log = isDev
  ? console.log.bind(console)
  : () => {};

/** Info-level logging — silent in production */
export const info = isDev
  ? console.info.bind(console)
  : () => {};

/** Warning-level logging — silent in production */
export const warn = isDev
  ? console.warn.bind(console)
  : () => {};

/** Error-level logging — always outputs (errors should be visible) */
export const error = console.error.bind(console);
