import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', fullyParallel: true, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4175', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run build && npm run preview -- --port 4175 --strictPort', url: 'http://127.0.0.1:4175', reuseExistingServer: false },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'ipad-webkit', use: { ...devices['iPad (gen 7)'] } },
    { name: 'phone-chromium', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
