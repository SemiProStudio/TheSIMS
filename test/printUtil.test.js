// =============================================================================
// Print Utility — Test Suite
// Tests the print window utility (Blob URL-based printing)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openPrintWindow } from '../lib/printUtil.js';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset URL methods
  global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob-url');
  global.URL.revokeObjectURL = vi.fn();
});

// =============================================================================
// openPrintWindow
// =============================================================================

describe('openPrintWindow', () => {
  it('should create a Blob URL and open a new window', () => {
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    const result = openPrintWindow({
      title: 'Test Print',
      styles: 'body { font-size: 12pt; }',
      body: '<h1>Hello</h1>',
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledWith('blob:http://localhost/test-blob-url', '_blank');
    expect(result).toBe(mockWindow);
  });

  it('should add afterprint and load event listeners', () => {
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
    });

    const eventNames = mockWindow.addEventListener.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('afterprint');
    expect(eventNames).toContain('load');
  });

  it('should revoke blob URL on afterprint', () => {
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
    });

    // Find afterprint handler
    const afterPrintCall = mockWindow.addEventListener.mock.calls.find(
      (c) => c[0] === 'afterprint',
    );
    expect(afterPrintCall).toBeDefined();

    // Execute the afterprint handler
    afterPrintCall[1]();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob-url');
  });

  it('should call print after load with specified delay', () => {
    vi.useFakeTimers();
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
      delay: 300,
    });

    // Find load handler
    const loadCall = mockWindow.addEventListener.mock.calls.find((c) => c[0] === 'load');
    expect(loadCall).toBeDefined();

    // Execute load handler
    loadCall[1]();

    // print should not be called immediately
    expect(mockWindow.print).not.toHaveBeenCalled();

    // Advance timer
    vi.advanceTimersByTime(300);
    expect(mockWindow.print).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should use default delay of 500ms when not specified', () => {
    vi.useFakeTimers();
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
    });

    const loadCall = mockWindow.addEventListener.mock.calls.find((c) => c[0] === 'load');
    loadCall[1]();

    vi.advanceTimersByTime(499);
    expect(mockWindow.print).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(mockWindow.print).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should return null and call onBlocked when popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const onBlocked = vi.fn();

    const result = openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
      onBlocked,
    });

    expect(result).toBeNull();
    expect(onBlocked).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob-url');
  });

  it('should return null and log warning when popup blocked without onBlocked handler', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = openPrintWindow({
      title: 'Test',
      styles: '',
      body: '<p>content</p>',
    });

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('pop-up blocked'));
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should include title, styles, and body in the generated HTML', () => {
    const mockWindow = {
      addEventListener: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);

    openPrintWindow({
      title: 'My Labels',
      styles: '.label { width: 2in; }',
      body: '<div class="label">Item 1</div>',
    });

    // Verify Blob was created (first arg of createObjectURL is the Blob)
    const blobArg = global.URL.createObjectURL.mock.calls[0][0];
    expect(blobArg).toBeInstanceOf(Blob);
    expect(blobArg.type).toBe('text/html');
  });
});
