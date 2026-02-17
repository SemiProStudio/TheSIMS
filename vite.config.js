import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Generate a short build ID from timestamp (e.g., "m1a2b3c")
const BUILD_ID = Date.now().toString(36);

// Plugin to inject BUILD_ID into the service worker after build
function swBuildHashPlugin() {
  return {
    name: 'sw-build-hash',
    closeBundle() {
      const swPath = resolve('dist', 'sw.js');
      try {
        let content = readFileSync(swPath, 'utf-8');
        content = content.replace(/__SIMS_BUILD_ID__/g, BUILD_ID);
        writeFileSync(swPath, content);
        console.log(`[sw-build-hash] Injected BUILD_ID: ${BUILD_ID}`);
      } catch (e) {
        console.warn('[sw-build-hash] Could not patch sw.js:', e.message);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), swBuildHashPlugin()],

  // Build optimization
  build: {
    // Generate sourcemaps for debugging
    sourcemap: true,

    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },

    // Warn on large chunks
    chunkSizeWarningLimit: 500,
  },

  // Dev server
  server: {
    port: 3000,
    open: true,
    cors: true,
  },

  // Preview server (for testing production build)
  preview: {
    port: 4173,
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/components',
      '@lib': '/lib',
    },
  },

  // Environment variables prefix
  envPrefix: 'VITE_',

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: [],
  },
});
