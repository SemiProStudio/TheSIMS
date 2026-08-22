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
        'themes-data.js', // Theme definitions
        'public/', // Static assets
      ],
      thresholds: {
        // Whole-codebase gate, kept ~3 points under measured actuals so it
        // catches a real regression without tripping on noise. History:
        //   2026-08-0x  22 / 19 / 14 / 23  (actuals 23.1 / 20.6 / 15.7 / 24.2)
        //   2026-08-22  50 / 45 / 42 / 51  (actuals 53.0 / 48.3 / 45.2 / 54.5
        //               after the mutation-hook suites)
        // Ratchet these up as real coverage improves — never down. Rule for
        // PRs touching hooks/ or lib/: the touched file's own coverage may
        // not drop (compare `npm run test:coverage` before/after).
        statements: 50,
        branches: 45,
        functions: 42,
        lines: 51,
      },
    },
  },
});
