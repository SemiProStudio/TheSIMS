// =============================================================================
// Test Setup
// =============================================================================

import '@testing-library/jest-dom';

// Set required env vars for modules that validate at load time (e.g., lib/env.ts)
import.meta.env.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
import.meta.env.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock localStorage — a REAL in-memory store wrapped in vi.fn so tests can
// both assert calls and rely on round-tripping values (browser semantics:
// getItem returns null for missing keys)
const localStorageStore = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => (localStorageStore.has(key) ? localStorageStore.get(key) : null)),
  setItem: vi.fn((key, value) => {
    localStorageStore.set(String(key), String(value));
  }),
  removeItem: vi.fn((key) => {
    localStorageStore.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageStore.clear();
  }),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this._cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollHeight/scrollTop/clientHeight for scroll tests (read-only in jsdom)
const scrollProps = ['scrollHeight', 'scrollTop', 'clientHeight'];
scrollProps.forEach((prop) => {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get() {
      return this[`_${prop}`] || 0;
    },
    set(val) {
      this[`_${prop}`] = val;
    },
  });
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  // Fresh device storage per test — the in-memory store would otherwise
  // leak state across tests within a file
  localStorageStore.clear();
});
