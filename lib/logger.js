// =============================================================================
// Logger Utility
// Wraps console methods so debug chatter only outputs in development mode,
// while warnings and errors are always visible — warn() is the only signal
// for several persistence failures (checkout history, category syncs), and
// silencing it in production meant those failures were undetectable.
//
// Usage:
//   import { log, warn, error } from './lib/logger.js';
//   log('[App] User authenticated:', email);   // silent in production
//   warn('Checkout history not saved:', err);   // always outputs
//   error('Failed to save:', err);              // always outputs
// =============================================================================

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/** Debug-level logging — silent in production */
export const log = isDev ? console.log.bind(console) : () => {};

/** Info-level logging — silent in production */
export const info = isDev ? console.info.bind(console) : () => {};

/** Warning-level logging — always outputs (failed writes surface here) */
export const warn = console.warn.bind(console);

/** Error-level logging — always outputs (errors should be visible) */
export const error = console.error.bind(console);
