import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  reporter: [['line']],
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', video: 'off' },
  webServer: [
    { command: 'npm run dev:api', url: 'http://127.0.0.1:8787/api/site', reuseExistingServer: !process.env.CI },
    {
      command: 'npm run dev:web -- --host 127.0.0.1',
      url: 'http://127.0.0.1:5173',
      env: { VITE_API_BASE_URL: '' },
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 12'], browserName: 'chromium' } },
  ],
});
