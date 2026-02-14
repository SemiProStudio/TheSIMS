import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'e2e/'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'e2e/',
        '**/*.d.ts',
        '**/*.config.*',
        'data.js', // Demo data
        'themes-data.ts', // Theme definitions
        'public/', // Static assets
      ],
      thresholds: {
        // Baseline thresholds — ratchet up as coverage improves
        statements: 40,
        branches: 40,
        functions: 35,
        lines: 40,
      },
    },
  },
});
