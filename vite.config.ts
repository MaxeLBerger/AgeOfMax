import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
<<<<<<< HEAD
  // Use exact production base path matching deployment URL casing
=======
  // IMPORTANT: must match exact deployed path casing for dynamic imports
>>>>>>> bf1dc274795f6479591b83bc59a31ad29d129efe
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