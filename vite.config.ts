import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  // IMPORTANT: must match exact deployed path casing for dynamic imports
  base: mode === 'production' ? '/AgeOfMax/' : '/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Disable source maps in production to reduce bundle size and parse time.
    sourcemap: mode !== 'production'
  }
}));