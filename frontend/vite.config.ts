import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app fetches from the deployed mock API by default (see src/lib/apiClient.ts).
// When VITE_API_BASE_URL is set to an empty string, requests use a same-origin
// /api path and this proxy forwards them. Point it at the local mock Express
// server (mock-server/server.js on :8787) for offline dev, or the deployed host.
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
