import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // 5s default flakes on starved CI runners under coverage instrumentation
    // (rolesManager "All Hide" timed out on run #203 while passing locally).
    // Tests still finish in ms — this only absorbs runner variance.
    testTimeout: 15000,
    setupFiles: ['./test/setup.js'],
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/', '.claude/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      // Measure against the WHOLE codebase, not just files that happen to be
      // imported by tests. Without an explicit include, Vitest 4 instruments
      // only loaded files — the old ~58% figure covered 55 files (~26% of the
      // source); real whole-app coverage is what this reports now.
      include: [
        '*.{js,jsx}',
        'components/**/*.{js,jsx}',
        'contexts/**/*.{js,jsx}',
        'hooks/**/*.{js,jsx}',
        'lib/**/*.{js,jsx,ts}',
        'modals/**/*.{js,jsx}',
        'utils/**/*.{js,jsx}',
        'views/**/*.{js,jsx}',
      ],
      exclude: [
        'node_modules/',
        'test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        'main.jsx', // App bootstrap — exercised only in a browser
        'data.js', // Demo data
        'themes-data.js', // Theme definitions
        'public/', // Static assets
      ],
      thresholds: {
        // HONEST baseline against the full codebase (was 40% against a
        // shrunken denominator of test-loaded files only — measured actuals
        // at the time of this change: 23.1 / 20.6 / 15.7 / 24.2).
        // Ratchet these up as real coverage improves — never down.
        statements: 22,
        branches: 19,
        functions: 14,
        lines: 23,
      },
    },
  },
});
