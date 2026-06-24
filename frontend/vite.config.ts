import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies the read-only JSON API to the local mock Express server
// (mock-server/server.js on :8787) so the app fetches from a same-origin /api.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 so the dev server is reachable over the VM's network
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
