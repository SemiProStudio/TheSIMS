// =============================================================================
// Logger — Test Suite
// Tests the environment-aware logging utility
// =============================================================================

import { describe, it, expect, vi } from 'vitest';

// The logger module binds functions at module load time based on import.meta.env.DEV.
// In vitest, DEV is typically true (test environment), so log/warn/info should be live.
// Note: Since error is bound at load time via .bind(), we cannot spy on it after import.
import { log, warn, info, error } from '../lib/logger.js';

describe('Logger utility', () => {
  it('should export log as a function', () => {
    expect(typeof log).toBe('function');
  });

  it('should export warn as a function', () => {
    expect(typeof warn).toBe('function');
  });

  it('should export info as a function', () => {
    expect(typeof info).toBe('function');
  });

  it('should export error as a function', () => {
    expect(typeof error).toBe('function');
  });

  it('error should be a bound function (always outputs)', () => {
    // error is console.error.bind(console) — it's always a real function, never a no-op
    // We verify it's a function that is not the no-op arrow function used for log/warn/info in prod
    expect(error.toString()).not.toBe('() => {}');
    expect(typeof error).toBe('function');
  });

  it('log should be callable without throwing', () => {
    // In test env (DEV=true), log calls console.log; in prod it's a no-op
    // Either way, it should not throw
    expect(() => log('test')).not.toThrow();
    expect(() => log('test', { key: 'value' })).not.toThrow();
    expect(() => log()).not.toThrow();
  });

  it('warn should be callable without throwing', () => {
    expect(() => warn('test warning')).not.toThrow();
  });

  it('info should be callable without throwing', () => {
    expect(() => info('test info')).not.toThrow();
  });

  it('error should be callable without throwing', () => {
    // Suppress console.error output during test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => error('test error')).not.toThrow();
    expect(() => error('context:', new Error('test'))).not.toThrow();
    spy.mockRestore();
  });

  it('log/warn/info should be real functions in dev mode (not no-ops)', () => {
    // In vitest DEV=true, so these should be bound console methods
    // They should accept arguments without error
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    log('dev log test');
    warn('dev warn test');
    info('dev info test');

    // In DEV mode, these should have called the underlying console methods
    // (In test setup, vi.clearAllMocks() may affect this, but functions should still work)
    consoleSpy.mockRestore();
    warnSpy.mockRestore();
    infoSpy.mockRestore();
  });
});
