import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
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
