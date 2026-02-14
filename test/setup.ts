// =============================================================================
// Test Setup
// =============================================================================

import '@testing-library/jest-dom';

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

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
  constructor(cb) { this._cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollHeight/scrollTop/clientHeight for scroll tests (read-only in jsdom)
const scrollProps = ['scrollHeight', 'scrollTop', 'clientHeight'];
scrollProps.forEach(prop => {
  Object.defineProperty(HTMLElement.prototype, prop, {
    configurable: true,
    get() { return this[`_${prop}`] || 0; },
    set(val) { this[`_${prop}`] = val; },
  });
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
