import { defineConfig, devices } from '@playwright/test'

// Smoke tests drive the real app in a phone-sized browser. They use the system's
// Chrome (no browser download) and start the dev server themselves.
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    ...devices['iPhone 13'],
    // iPhone 13 ships as WebKit; the tests only need its viewport/touch profile in Chrome.
    defaultBrowserType: 'chromium',
  },
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
