import { defineConfig } from 'vite';

// The QA server never opens a visible helper window or silently chooses another port.
export default defineConfig({
  base: '/',
  resolve: { preserveSymlinks: true },
  server: { host: '127.0.0.1', port: 5190, strictPort: true, open: false, hmr: false },
});
