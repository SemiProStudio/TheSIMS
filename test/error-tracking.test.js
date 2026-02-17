// =============================================================================
// Error Tracking Service Tests
// Tests for Sentry integration and error reporting
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
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
  getQueuedErrors,
  clearQueuedErrors,
  isErrorTrackingEnabled,
  getConfig,
  startTransaction,
  measurePerformance,
  withSentryErrorBoundary,
  ErrorSeverity,
  ErrorCategory,
} from '../lib/errorTracking.js';

// =============================================================================
// Test Setup
// =============================================================================

describe('Error Tracking Service', () => {
  beforeEach(() => {
    // Clear any queued errors before each test
    clearQueuedErrors();
    vi.clearAllMocks();
  });

  // =============================================================================
  // captureException Tests
  // =============================================================================

  describe('captureException', () => {
    it('should queue errors when Sentry is not available', () => {
      const error = new Error('Test error');
      captureException(error, { tags: { test: true } });

      const queued = getQueuedErrors();
      expect(queued.length).toBe(1);
      expect(queued[0].error.message).toBe('Test error');
    });

    it('should include error details in queue', () => {
      const error = new TypeError('Type error');
      error.stack = 'Error stack trace';

      captureException(error);

      const queued = getQueuedErrors();
      expect(queued[0].error.name).toBe('TypeError');
      expect(queued[0].error.stack).toBe('Error stack trace');
    });

    it('should include context in queue', () => {
      const error = new Error('Test');
      captureException(error, {
        user: { id: '123' },
        tags: { component: 'test' },
        extra: { data: 'value' },
      });

      const queued = getQueuedErrors();
      expect(queued[0].context.user).toEqual({ id: '123' });
      expect(queued[0].context.tags).toEqual({ component: 'test' });
    });

    it('should add timestamp and url to context', () => {
      const error = new Error('Test');
      captureException(error);

      const queued = getQueuedErrors();
      expect(queued[0].context.timestamp).toBeDefined();
      expect(queued[0].context.url).toBeDefined();
    });

    it('should limit queue size', () => {
      // Queue more than MAX_QUEUE_SIZE errors
      for (let i = 0; i < 150; i++) {
        captureException(new Error(`Error ${i}`));
      }

      const queued = getQueuedErrors();
      expect(queued.length).toBeLessThanOrEqual(100);
    });
  });

  // =============================================================================
  // captureMessage Tests
  // =============================================================================

  describe('captureMessage', () => {
    it('should queue messages when Sentry is not available', () => {
      captureMessage('Test message', ErrorSeverity.WARNING);

      const queued = getQueuedErrors();
      expect(queued.length).toBe(1);
      expect(queued[0].error.message).toBe('Test message');
      expect(queued[0].context.level).toBe('warning');
    });

    it('should use default level if not provided', () => {
      captureMessage('Info message');

      const queued = getQueuedErrors();
      expect(queued[0].context.level).toBe('info');
    });

    it('should accept all severity levels', () => {
      const levels = Object.values(ErrorSeverity);

      levels.forEach((level) => {
        clearQueuedErrors();
        captureMessage(`Message at ${level}`, level);

        const queued = getQueuedErrors();
        expect(queued[0].context.level).toBe(level);
      });
    });
  });

  // =============================================================================
  // Breadcrumb Tests
  // =============================================================================

  describe('Breadcrumbs', () => {
    it('should create navigation breadcrumb', () => {
      // Just ensure it doesn't throw
      expect(() => {
        addNavigationBreadcrumb('/dashboard', '/inventory');
      }).not.toThrow();
    });

    it('should create user action breadcrumb', () => {
      expect(() => {
        addUserActionBreadcrumb('Clicked button', { buttonId: 'submit' });
      }).not.toThrow();
    });

    it('should create API call breadcrumb', () => {
      expect(() => {
        addApiCallBreadcrumb('GET', '/api/items', 200);
      }).not.toThrow();
    });

    it('should create custom breadcrumb', () => {
      expect(() => {
        addBreadcrumb({
          category: 'custom',
          message: 'Custom event',
          level: 'info',
          data: { key: 'value' },
        });
      }).not.toThrow();
    });
  });

  // =============================================================================
  // User Context Tests
  // =============================================================================

  describe('User Context', () => {
    it('should set user context', () => {
      expect(() => {
        setUser({
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
        });
      }).not.toThrow();
    });

    it('should clear user context with null', () => {
      expect(() => {
        setUser(null);
      }).not.toThrow();
    });

    it('should clear user context', () => {
      expect(() => {
        clearUser();
      }).not.toThrow();
    });

    it('should handle user without all fields', () => {
      expect(() => {
        setUser({ id: '123' });
      }).not.toThrow();
    });
  });

  // =============================================================================
  // Tags and Context Tests
  // =============================================================================

  describe('Tags and Context', () => {
    it('should set tag', () => {
      expect(() => {
        setTag('environment', 'test');
      }).not.toThrow();
    });

    it('should set context', () => {
      expect(() => {
        setContext('app', {
          version: '1.0.0',
          build: '123',
        });
      }).not.toThrow();
    });
  });

  // =============================================================================
  // Error Queue Tests
  // =============================================================================

  describe('Error Queue', () => {
    it('should return copy of queued errors', () => {
      captureException(new Error('Test'));

      const queued1 = getQueuedErrors();
      const queued2 = getQueuedErrors();

      expect(queued1).not.toBe(queued2);
      expect(queued1).toEqual(queued2);
    });

    it('should clear queued errors', () => {
      captureException(new Error('Test 1'));
      captureException(new Error('Test 2'));

      expect(getQueuedErrors().length).toBe(2);

      clearQueuedErrors();

      expect(getQueuedErrors().length).toBe(0);
    });
  });

  // =============================================================================
  // Configuration Tests
  // =============================================================================

  describe('Configuration', () => {
    it('should report tracking as disabled without Sentry', () => {
      // Without actual Sentry SDK loaded, should return false
      expect(isErrorTrackingEnabled()).toBe(false);
    });
  });

  // =============================================================================
  // Error Categories Tests
  // =============================================================================

  describe('Error Categories', () => {
    it('should have all expected categories', () => {
      expect(ErrorCategory.NETWORK).toBe('network');
      expect(ErrorCategory.VALIDATION).toBe('validation');
      expect(ErrorCategory.AUTH).toBe('auth');
      expect(ErrorCategory.UI).toBe('ui');
      expect(ErrorCategory.DATA).toBe('data');
      expect(ErrorCategory.UNKNOWN).toBe('unknown');
    });

    it('should allow using category in context', () => {
      captureException(new Error('Network failed'), {
        category: ErrorCategory.NETWORK,
      });

      const queued = getQueuedErrors();
      expect(queued[0].context.category).toBe('network');
    });
  });

  // =============================================================================
  // Error Severity Tests
  // =============================================================================

  describe('Error Severity', () => {
    it('should have all expected severity levels', () => {
      expect(ErrorSeverity.FATAL).toBe('fatal');
      expect(ErrorSeverity.ERROR).toBe('error');
      expect(ErrorSeverity.WARNING).toBe('warning');
      expect(ErrorSeverity.INFO).toBe('info');
      expect(ErrorSeverity.DEBUG).toBe('debug');
    });
  });

  // =============================================================================
  // Integration Tests
  // =============================================================================

  describe('Integration', () => {
    it('should handle rapid error capturing', () => {
      // Capture many errors quickly
      for (let i = 0; i < 50; i++) {
        captureException(new Error(`Rapid error ${i}`));
      }

      const queued = getQueuedErrors();
      expect(queued.length).toBe(50);
    });

    it('should capture errors with full context', () => {
      const error = new RangeError('Value out of range');
      error.stack = 'RangeError: Value out of range\n    at test.js:1:1';

      captureException(error, {
        level: ErrorSeverity.ERROR,
        category: ErrorCategory.VALIDATION,
        user: { id: 'user-123', email: 'test@test.com' },
        tags: { component: 'form', action: 'submit' },
        extra: { value: 999, max: 100 },
      });

      const queued = getQueuedErrors();
      expect(queued.length).toBe(1);

      const captured = queued[0];
      expect(captured.error.name).toBe('RangeError');
      expect(captured.error.message).toBe('Value out of range');
      expect(captured.context.level).toBe('error');
      expect(captured.context.category).toBe('validation');
      expect(captured.context.user.id).toBe('user-123');
      expect(captured.context.tags.component).toBe('form');
      expect(captured.context.extra.value).toBe(999);
    });
  });

  // =============================================================================
  // getConfig Tests
  // =============================================================================

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(
        typeof config.dsn === 'string' || config.dsn === undefined || config.dsn === null,
      ).toBe(true);
      expect(config.maxBreadcrumbs).toBe(50);
    });

    it('should return a fresh copy each time', () => {
      const config1 = getConfig();
      const config2 = getConfig();
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should have ignoreErrors array', () => {
      const config = getConfig();
      expect(Array.isArray(config.ignoreErrors)).toBe(true);
      expect(config.ignoreErrors.length).toBeGreaterThan(0);
    });

    it('should have denyUrls array', () => {
      const config = getConfig();
      expect(Array.isArray(config.denyUrls)).toBe(true);
    });
  });

  // =============================================================================
  // startTransaction Tests (without Sentry)
  // =============================================================================

  describe('startTransaction (no Sentry)', () => {
    it('should return a no-op transaction', () => {
      const transaction = startTransaction('test-task', 'task');
      expect(transaction).toBeDefined();
      expect(typeof transaction.finish).toBe('function');
      expect(typeof transaction.setStatus).toBe('function');
      expect(typeof transaction.setData).toBe('function');

      // Should not throw when called
      transaction.finish();
      transaction.setStatus('ok');
      transaction.setData('key', 'value');
    });

    it('should default op to "task"', () => {
      const transaction = startTransaction('my-task');
      expect(transaction).toBeDefined();
    });
  });

  // =============================================================================
  // measurePerformance Tests (without Sentry)
  // =============================================================================

  describe('measurePerformance (no Sentry)', () => {
    it('should execute the function and return its result', async () => {
      const result = await measurePerformance('test', () => 42);
      expect(result).toBe(42);
    });

    it('should handle async functions', async () => {
      const result = await measurePerformance('async-test', async () => {
        return 'async-result';
      });
      expect(result).toBe('async-result');
    });

    it('should propagate errors', async () => {
      await expect(
        measurePerformance('error-test', () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');
    });
  });

  // =============================================================================
  // withSentryErrorBoundary Tests (without Sentry)
  // =============================================================================

  describe('withSentryErrorBoundary (no Sentry)', () => {
    it('should return the component unchanged when Sentry is not available', () => {
      const MyComponent = () => 'hello';
      const wrapped = withSentryErrorBoundary(MyComponent);
      expect(wrapped).toBe(MyComponent);
    });

    it('should return the component with options', () => {
      const MyComponent = () => 'hello';
      const wrapped = withSentryErrorBoundary(MyComponent, { showDialog: true });
      expect(wrapped).toBe(MyComponent);
    });
  });

  // =============================================================================
  // captureMessage with context
  // =============================================================================

  describe('captureMessage with tags', () => {
    it('should include tags in context', () => {
      captureMessage('Tagged message', ErrorSeverity.WARNING, {
        tags: { component: 'header', action: 'render' },
      });

      const queued = getQueuedErrors();
      expect(queued.length).toBe(1);
      expect(queued[0].context.tags.component).toBe('header');
    });
  });

  // =============================================================================
  // Error queue edge cases
  // =============================================================================

  describe('Error queue edge cases', () => {
    it('should FIFO drop oldest when exceeding 100 entries', () => {
      // Fill to 100
      for (let i = 0; i < 100; i++) {
        captureException(new Error(`Error ${i}`));
      }
      expect(getQueuedErrors().length).toBe(100);
      expect(getQueuedErrors()[0].error.message).toBe('Error 0');

      // Add one more — oldest should be dropped
      captureException(new Error('Error 100'));
      const queued = getQueuedErrors();
      expect(queued.length).toBe(100);
      expect(queued[0].error.message).toBe('Error 1');
      expect(queued[99].error.message).toBe('Error 100');
    });
  });
});
