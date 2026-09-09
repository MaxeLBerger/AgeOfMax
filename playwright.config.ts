import { defineConfig, devices } from '@playwright/test';

import { existsSync } from 'node:fs';

const installedChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.QA_BROWSER_PATH || (existsSync(installedChrome) ? installedChrome : undefined);

export default defineConfig({
  testDir: './e2e',
  // Phaser/WebGL boot is resource-heavy and canvas-coordinate tests interfere
  // with each other when five browser instances initialize concurrently.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  globalSetup: './e2e/check-assets.ts',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5190',
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { ...(executablePath ? { executablePath } : {}) },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config e2e/vite.config.ts --host 127.0.0.1 --port 5190 --strictPort',
    url: 'http://127.0.0.1:5190',
    reuseExistingServer: !process.env.CI,
  },
});
